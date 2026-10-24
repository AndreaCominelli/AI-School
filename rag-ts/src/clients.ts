import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { createVoyage } from 'voyage-ai-provider';

export const claudeClient = new Anthropic({
    apiKey: process.env.MODEL_KEY
})

export const voyageClient = createVoyage({
    apiKey: process.env.VOYAGE_API_KEY,
});