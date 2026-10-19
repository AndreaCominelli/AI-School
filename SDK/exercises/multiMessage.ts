process.loadEnvFile();

import { Anthropic } from "@anthropic-ai/sdk/client.js";

let messageHistory: Anthropic.Messages.MessageParam[] = [{ role: "user", content: "Ciao Claude" }]

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_KEY"] // This is the default and can be omitted
});

const params: Anthropic.MessageCreateParams = {
    max_tokens: 1024,
    messages: [...messageHistory],
    model: process.env["MODEL"] || ""
};

const chat = async (message: string): Promise<Anthropic.Messages.MessageParam> => {
    const userMessage: Anthropic.Messages.MessageParam = {
        role: 'user',
        content: message
    }

    messageHistory.push(userMessage)

    params.messages = [...messageHistory]
    const response = await client.messages.create(params)
    const reply = response.content.filter((block) => block.type == 'text')[0].text

    const modelMessage: Anthropic.Messages.MessageParam = {
        role: 'assistant',
        content: reply
    }

    messageHistory.push(modelMessage)

    return response
}

export const main = async () => {
    await chat('Di che colore era il cavallo bianco di Napoleone?')
    await chat('Ah okay grazie')
    await chat('Che cosa ti ho appena chiesto?')

    for (const block of messageHistory) {
        console.log(block.content);
    }
}