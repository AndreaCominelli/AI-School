process.loadEnvFile();

import { Anthropic } from "@anthropic-ai/sdk/client.js";

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_KEY"] // This is the default and can be omitted
});

const params: Anthropic.MessageCreateParams = {
  max_tokens: 1024,
  messages: [{ role: "user", content: "Ciao, Claude" }],
  model: process.env["MODEL"] || "",
};

export const main = async () => {
    const message = await client.messages.create(params);

    for (const block of message.content) {
        if (block.type === "text") {
            console.log(block.text);
        }
    }
}