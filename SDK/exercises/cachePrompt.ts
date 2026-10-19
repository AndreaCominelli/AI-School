process.loadEnvFile();

import { Anthropic } from "@anthropic-ai/sdk/client.js";

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_KEY"]
});

/**
 * La cache copre l'intero prefisso del prompt:
 * prefisso (in ordine di priorità) -> tools, system, messages
 * fino al blocco marcato con cache_control. Quindi tutti i blocchi fino all'ultimo cache_control
 * vengono letti dalla cache, a patto che il numero di token superi la soglia minima (es. 2048 per Haiku)
 * Un cambio tra tool, system e/o messages invalida la cache. Quindi, inserire cache_control prima che si scambino
 * questi blocchi. Un'operazione utile potrebbe essere quella di specificare un blocco system con cache_control, così
 * solo il system prompt viene cachato
 */

/**
 * La cache non è un blocco unico. A seconda del livello che viene invalidato, vengono invalidati i livelli successivi
 * se invalido messages, non invalido nient'altro
 * se invalido system, invalido anche messages
 * se invalido tools, invalido sia system che messages
 */

const params: Anthropic.MessageCreateParams = {
  max_tokens: 1024,
  model: process.env["MODEL"] || "",
  cache_control: { type: "ephemeral" }, // "global" cache: the model will remember the system prompt once 
  system: "You are a helpful assistant that remembers our conversation.",
  messages: [
    { role: "user", content: "My name is Alex. I work on machine learning." },
    {
      role: "assistant",
      content: "Nice to meet you, Alex! How can I help with your ML work today?"
    },
    { role: "user", content: "What did I say I work on?" }
  ]
};

export const main = async () => {
    const message = await client.messages.create(params);

    console.log(message.usage)
}