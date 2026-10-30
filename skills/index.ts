import "dotenv/config";
import { Anthropic } from "@anthropic-ai/sdk";
import { createInterface } from "node:readline/promises";
import { handleErrorCode, toErrorMessage } from "./utils.ts";

let messages: Anthropic.Messages.MessageParam[] = [
    {
        role: 'user',
        content: 'analyze this web page https://www.linkedin.com/jobs/view/4476166354'
    }
];

let containerId: string | null | undefined;
let maxPauseTurnContinuation = 5;

const client = new Anthropic({
    apiKey: process.env.MODEL_KEY,
});

const listSkills = async () => {
    // List Anthropic-managed Skills
    const skills = await client.skills.list();

    for (const skill of skills.data) {
        console.log(`${skill.id}: ${skill.display_name}`);
    }
};

const queryClaude = async (q: string): Promise<Anthropic.Messages.Message> => {
    let response: Anthropic.Messages.Message = {} as Anthropic.Messages.Message;
    messages.push({ role: "user", content: q });

    try {
        do {
            response = await client.messages.create({
                model: process.env.MODEL || "claude-haiku-5-5",
                max_tokens: 1024,
                messages,
                cache_control: { type: 'ephemeral', ttl: '5m' },
                /*
                container: {
                    id: containerId, // recycle the same sandbox container
                    skills: [
                        {
                            type: "custom",
                            skill_id: "skill_01DGbfkPABpMERfQaAAKcwLr", // weatherman skill
                            version: "latest",
                        },
                    ],
                },
                */
                tools: [
                    // { type: "code_execution_20260521", name: "code_execution" },
                    { type: 'web_fetch_20260318', name: 'web_fetch', allowed_domains: ["linkedin.com"]}
                ],
            });

            // se response.container è valorizzato, il container è stato utilizzato e ne riciclo l'id
            // stessa cosa del controllo sul block.type === 'server_tool_use'
            if (response.container) {
                containerId = response.container.id;
            }

            if (response.stop_reason === 'pause_turn') {
                maxPauseTurnContinuation -= 1;
                if (maxPauseTurnContinuation === 0) {
                    break;
                } else {
                    messages.push({ role: 'assistant', content: response.content });
                }
            }
        } while (response.stop_reason === 'pause_turn')

        messages.push({ role: 'assistant', content: response.content })

        // ricicla il container solo nel caso in cui il server tool sia stato usato
        // se non è stato usato, sto riciclando il container inutilmente fino a quando
        // scade e magari mi servirebbe riutilizzarlo (?)

        for (const block of response.content) {
            // se ci sono stati errori -> logga la descrizione dell'errore
            console.log('--- BLOCK --- ', block);
            if (block.type === 'bash_code_execution_tool_result' ||
                block.type === 'text_editor_code_execution_tool_result' ||
                block.type === 'web_fetch_tool_result'
            ) {
                if (block.content.type === 'bash_code_execution_tool_result_error' ||
                    block.content.type === 'text_editor_code_execution_tool_result_error' ||
                    block.content.type === 'web_fetch_tool_result_error'
                ) {
                    const error = block.content.error_code;
                    const errorDescription = handleErrorCode(error);
                    console.log(error + '---', errorDescription);
                }
            }

            if (block.type === "text") {
                console.log(block.text + "\n")
            }
        }

        return response;
    } catch (err) {
        // se ci sono errori, rimuovo il messaggio dell'utente
        messages = messages.filter(message => message.content !== q);
        console.log(err);
        throw new Error(toErrorMessage(err));
    }
};

const main = async () => {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log("Chat with Claude\n");
    while (true) {
        const query = await rl.question("");
        await queryClaude(query);
    }
};

main();
// listSkills();
