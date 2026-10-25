import "dotenv/config";
import { claudeClient } from "./src/clients.ts";
import { readPdf, convertAllFilesInDir } from "./src/utils.ts";
import VectorDB from "./src/VectorDB.ts";
import fs from 'fs';
import path from "path";

const vectorDb: VectorDB= VectorDB.instance('../data/json/');

const main = async () => {

    // convertAllFilesInDir('./data/papers', '../data/json');
    // const chunksPerPage = await readPdf('./data/papers/first_test.pdf')
    // convertChunksToJson('../data/json/first_test.json', chunksPerPage);

    const query = 'What is introduction speaker representation learning?';
    
    await vectorDb.initDB();
    const contexts = await vectorDb.search(query);
    const topDocuments = contexts.ranking.map((doc) => doc.document).join('\n');

    const prompt = `\
        You have been tasked with helping us to answer the following query:
        <query>
        ${query}
        </query>
        You have access to the following documents which are meant to provide context as you answer the query:
        <documents>
        ${topDocuments}
        </documents>
        Please remain faithful to the underlying context, never deviate from it. If you do not know the answer, please just tell me.
        Answer the question now, and avoid providing preamble such as 'Here is the answer', etc. \
        You must not mentioned the document in the output. Just use it to build a good response. \
    `;

    const response = await claudeClient.messages.create({
        max_tokens: 1024,
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
        messages: [{ role: 'user', content: prompt }],
        cache_control: { type: 'ephemeral', ttl: '1h' }
    })

    for(const block of response.content) {
        if (block.type === 'text') {
            console.log(block.text);
        }
    }
};

main();
