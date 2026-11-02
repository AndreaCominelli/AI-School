import "dotenv/config";
import { claudeClient } from "./src/clients.ts";
import { convertAllFilesInDir, readFileSync, writeFile } from "./src/utils.ts";
import VectorDB from "./src/VectorDB.ts";
import { buildEvaluationDataset, evaluate } from "./src/evaluation.ts";

const arg = process.argv[2];

const main = async (vectorDb: VectorDB) => {

    const query = 'What is introduction speaker representation learning?';
    
    await vectorDb.initDB();
    const contexts = await vectorDb.search(query);
    const topDocuments = contexts.ranking.map((doc) => doc.document.text).join('\n');

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

let vectorDb;

switch (arg) { 
    case 'infer':
        vectorDb = VectorDB.instance('../data/json/');
        main(vectorDb);
        break;
    case 'convert':
        convertAllFilesInDir('./data/papers', '../data/json');
        break;
    case 'evaluate':
        vectorDb = VectorDB.instance('../data/json/');
        const samplesString = readFileSync('./src/evaluation.json');
        const samples = JSON.parse(samplesString);
        const result = await evaluate(samples, vectorDb);
        console.log(result);
        break;
    case 'create-dataset':
        vectorDb = VectorDB.instance('../data/json/');
        const datasetSamples = await buildEvaluationDataset(vectorDb.getInputData());
        const datasetSamplesString = JSON.stringify(datasetSamples);
        await writeFile('./evaluation.json', datasetSamplesString);
        break;
    default:
        console.log("Command not implemented");
        break;
}
