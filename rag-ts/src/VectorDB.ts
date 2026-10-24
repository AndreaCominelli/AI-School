import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { voyageClient } from "./clients.ts";
import { voyage } from 'voyage-ai-provider';
import type { Embedding, EmbeddingModel, RerankingModel, RerankResult } from "ai";
import { cosineSimilarity } from "ai";
import {
    toErrorMessage,
    writeEmbeddings,
    loadEmbeddings,
    readFileSync,
} from "./utils.ts";
import { embed, embedMany, rerank } from "ai";

const EMBEDDINGS_DIRECTORY = './data/document_embeddings';

interface Chunk {
    chunk_link: string;
    chunk_heading: string;
    text: string;
}

class VectorDB {
    private static vectorDb: VectorDB | undefined = undefined;
    private embeddingModel: EmbeddingModel;
    private rerankingModel: RerankingModel;
    private inputData: Chunk[];
    private embeddings: Embedding[] = [];
    private embeddedQueryCache: Map<String, Embedding> = new Map();

    private constructor(inputFileString: string, modelName?: string) {
        this.embeddingModel = voyageClient.embeddingModel(
            modelName || process.env.VOYAGE_MODEL || "voyage-3-lite",
        );
        this.rerankingModel = voyage.reranking('rerank-2.5');
        this.inputData = JSON.parse(inputFileString);
    }

    static instance(inputDataPath: string, modelName?: string): VectorDB {
        try {
            if (!this.vectorDb) {
                const inputFileString: string = readFileSync(inputDataPath);
                this.vectorDb = new VectorDB(inputFileString, modelName);
            }
            return this.vectorDb;
        } catch (err) {
            console.log(err);
            throw new Error(toErrorMessage(err));
        }
    }

    public async initDB() {
        if (
            fs.existsSync(path.resolve(path.join(EMBEDDINGS_DIRECTORY, "emb.meta.json"))) &&
            fs.existsSync(path.resolve(path.join(EMBEDDINGS_DIRECTORY, "emb.f32")))
        ) {
            console.log("Reading embeddings from local file...\n");
            this.embeddings = loadEmbeddings(EMBEDDINGS_DIRECTORY);
        } else {
            if (!this.inputData || this.inputData.length === 0) {
                throw new Error(
                    "Cannot initialize DB: input data not provided",
                );
            }
            console.log("Saving embeddings on local file...\n");
            const chunksText = this.inputData.map((chunk) => chunk.text);
            const { embeddings } = await embedMany({
                model: this.embeddingModel,
                values: chunksText,
                providerOptions: {
                    voyage: {
                        inputType: "document",
                        outputDimension: 1024,
                        outputDtype: "float",
                    },
                },
            });

            this.embeddings = embeddings;
            writeEmbeddings(EMBEDDINGS_DIRECTORY, this.embeddings);
        }
    }

    public async search(query: string, k = 10): Promise<RerankResult<string>> {
        let queryEmbedded: number[] = [];
        if (this.embeddedQueryCache.has(query)) {
            queryEmbedded = this.embeddedQueryCache.get(query) as Embedding;
        } else {
            const { embedding } = await embed({
                model: this.embeddingModel,
                value: query,
                providerOptions: {
                    voyage: {
                        inputType: "query",
                        outputDimension: 1024,
                        outputDtype: "float",
                    },
                },
            });
            queryEmbedded = embedding;
            this.embeddedQueryCache.set(query, queryEmbedded);
        }

        const chunkScores = this.embeddings
            .map((embedding, index) => ({
                index,
                score: cosineSimilarity(queryEmbedded, embedding),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, k);

        const documents: string[] = []
        for (const chunkScore of chunkScores) {
            const { index } = chunkScore;
            const chunkText = this.inputData[index].text;
            documents.push(chunkText)
        }

        return this.rerank(documents, query);
    }

    private async rerank(documents: string[], query: string, topK=3) {
        const rankedDocuments = await rerank({
            model: this.rerankingModel,
            documents: documents,
            query: query,
            topN: topK
        })

        return rankedDocuments;
    }

    public getInputData(): Chunk[] {
        return this.inputData;
    }

    public getEmbeddingModel(): EmbeddingModel {
        return this.embeddingModel;
    }

    public getEmbeddings(): Embedding[] {
        return this.embeddings;
    }
}

export default VectorDB;
