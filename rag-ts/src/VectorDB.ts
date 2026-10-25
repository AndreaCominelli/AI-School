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
    type Chunk,
    computeAbsolutePath,
} from "./utils.ts";
import { embed, embedMany, rerank } from "ai";
import { BM25 } from 'fast-bm25';

const EMBEDDINGS_DIRECTORY = './data/document_embeddings';

class VectorDB {
    private static vectorDb: VectorDB | undefined = undefined;
    private embeddingModel: EmbeddingModel;
    private rerankingModel: RerankingModel;
    private inputData: Chunk[];
    private embeddings: Embedding[] = [];
    private embeddedQueryCache: Map<String, Embedding> = new Map();
    private bm25: BM25;

    private constructor(inputFilesString: string[], modelName?: string) {
        this.embeddingModel = voyageClient.embeddingModel(
            modelName || process.env.VOYAGE_MODEL || "voyage-3-lite",
        );
        this.rerankingModel = voyage.reranking('rerank-2.5');
        this.inputData = inputFilesString.flatMap((stringFile) => JSON.parse(stringFile) as Chunk[]);
        this.bm25 = new BM25(this.inputData.map(
            (chunk) => ({ title: chunk.context, content: chunk.text }) 
        ));
    }

    static instance(inputDataDirPath: string, modelName?: string): VectorDB {
        try {
            if (!this.vectorDb) {
                let inputFilesString: string[] = [];
                const coolPath = computeAbsolutePath(inputDataDirPath);
                fs.readdirSync(coolPath).forEach((fileName) => {
                    inputFilesString.push(readFileSync(path.resolve(coolPath, fileName)));
                })
                this.vectorDb = new VectorDB(inputFilesString, modelName);
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
            const chunksText = this.inputData.map((chunk) => chunk.context + '\n\n' + chunk.text);
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

        const chunkScoresEmbedded = this.embeddings
            .map((embedding, index) => ({
                index,
                score: cosineSimilarity(queryEmbedded, embedding),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, k);

        const chunkScoresBM25 = this.bm25.search(query, k);
        
        const bestDocuments: string[] = []

        // retrieve indexes by embedding similarity
        const indexesByEmbedding: number[] = []
        for (const chunkScore of chunkScoresEmbedded) {
            const { index } = chunkScore;
            indexesByEmbedding.push(index);
        }

        // retrieve indexes by BM25
        const indexesByBM25: number[] = []
        for (const chunkScore of chunkScoresBM25) {
            const { index } = chunkScore;
            indexesByBM25.push(index);
        }

        const chunkScores = this.rrf([indexesByEmbedding, indexesByBM25]);
        for (const chunkScore of chunkScores) {
            const { id } = chunkScore;
            const document = this.inputData[id].text;
            bestDocuments.push(document);
        }

        return this.rerank(bestDocuments, query);
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

    // reciprocal rank fusion -> used to combine embeddings and bm25 results
    private rrf(chunksIndexes: number[][], k = 60) {
        const scores = new Map();
        for (const chunkIndex of chunksIndexes) {
            chunkIndex.forEach((id: number, index: number) => {
                scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
            });
        }
        return [...scores.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id, score]) => ({ id, score } as {id: number, score: number}));
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
