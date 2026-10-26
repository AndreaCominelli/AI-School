import Anthropic from "@anthropic-ai/sdk";
import type { Chunk } from "./utils.ts";
import type VectorDB from "./VectorDB.ts";
import ProgressBar from 'progress';

const client = new Anthropic();

export type EvalItem = { question: string; chunkId: string; paper: string };
type Metric = { precision: number, mrr: number };

const isUsable = (c: Chunk) =>
    c.text.split(/\s+/).length > 80 && // niente chunk minuscoli
    !/[←≤≥∑∀∃]/.test(c.text.slice(0, 200)); // scarta pseudocodice/formule

// campionamento equilibrato tra paper
const sample = (chunks: Chunk[], perPaper = 13): Chunk[] => {
    const byPaper = Map.groupBy(chunks.filter(isUsable), (c) => c.context);
    return [...byPaper.values()].flatMap((cs) =>
        cs.sort(() => Math.random() - 0.5).slice(0, perPaper),
    );
};

const generateQuestion = async (c: Chunk): Promise<string | null> => {
    const res = await client.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 200,
        cache_control: { type: 'ephemeral', ttl: '5m' },
        messages: [
            {
                role: "user",
                content: `You are a researcher who has NOT read this text and wishes to locate it in an archive.
                Formulate ONE specific, self-contained question (avoiding phrases like "in the text" or "in this paper")
                that the passage below answers. Do NOT reuse the exact wording from the passage; paraphrase
                and use synonyms. If the passage contains no concrete information, write always the best possibile response.
                Respond with SKIP only if text contains code or bibliography.
                Passage: 
                ${c.text}
                Question:`,
            },
        ],
    });
    
    let out: string = '';
    if (res.content[0].type === 'text') {
        out = res.content[0].text.trim();
    }

    return out === "SKIP" ? null : out;
};

export const buildEvaluationDataset = async (totalChunks: Chunk[]): Promise<EvalItem[]> => {
    const samples = sample(totalChunks);
    const dataset: EvalItem[] = []
    const bar = new ProgressBar(':percentage', { total: samples.length, width: 100 })

    for (const sampleChunk of samples) {
        const question = await generateQuestion(sampleChunk);
        dataset.push(
            {
                question: question || '',
                chunkId: `${sampleChunk.context}-${sampleChunk.id}`,
                paper: sampleChunk.context,
            }
        );
        bar.tick();
    }

    return dataset.filter((item) => item.question);
}

export const evaluate = async (dataset: EvalItem[], vectorDb: VectorDB): Promise<Metric> => {
    let correctCount = 0;
    let rr = 0;

    for(const evalItem of dataset) {
        const q = evalItem.question;
        const groundThrouth = evalItem.chunkId;

        const documents = await vectorDb.search(q);
        const topDocumentsIds = documents.ranking.map((doc, rank) => ({
            chunkId: doc.document.context + '-' + doc.document.id,
            rank: rank + 1
        }));

        topDocumentsIds.forEach((doc) => {
            if(doc.chunkId === groundThrouth) {
                correctCount += 1;
                rr += 1 / doc.rank;
            }
        })
    }

    return {
        precision: correctCount / dataset.length,
        mrr: rr / dataset.length,
    };
}

export const test = async (allChunks: Chunk[]) => {
    const stats = { unusable: 0, skip: 0, error: 0, ok: 0 };

    for (const c of allChunks) {
        if (!isUsable(c)) { stats.unusable++; continue; }
        try {
            const q = await generateQuestion(c);
            q ? stats.ok++ : stats.skip++;
        } catch (e) { stats.error++; console.error(e); }
    }
    console.log(stats, 'chunk totali:', allChunks.length);
}
