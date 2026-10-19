process.loadEnvFile();

import { Anthropic } from "@anthropic-ai/sdk/client.js";
import { Stream } from "@anthropic-ai/sdk/core/streaming.js";

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_KEY"] // This is the default and can be omitted
});

/**
 * Streaming experiment
 */

const params: Anthropic.MessageCreateParams = {
  max_tokens: 1024,
  messages: [{ role: "user", content: "Che ore sono?" }],
  model: process.env["MODEL"] || "",
  stream: true
};

export const main = async () => {
    const stream: Stream<Anthropic.Messages.RawMessageStreamEvent> = await client.messages.create(params);

    let streamedMessage: string = "";
    for await(const messageEvent of stream) {
        switch(messageEvent.type) {
            case "content_block_start":
                streamedMessage += messageEvent.content_block.type == "text" ? messageEvent.content_block.text : "";
                break;
            case "content_block_delta":
                streamedMessage += messageEvent.delta.type == "text_delta" ? messageEvent.delta.text : "";
                break;
            default:
                break;
        }
    }

    console.log(streamedMessage);
}