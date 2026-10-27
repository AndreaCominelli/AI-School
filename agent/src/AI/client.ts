import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

export const claudeClient = new Anthropic({
    apiKey: process.env.MODEL_KEY
})