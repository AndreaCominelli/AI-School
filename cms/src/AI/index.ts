import "dotenv/config";
import { claudeClient } from "./client.ts";

const main = async () => {
    const claudeResponse = await claudeClient.messages.create({
        model: process.env["MODEL"] || '',
        messages: [{ role: 'user', content: 'Ciao claude'}],
        max_tokens: 1024
    })

    console.log(claudeResponse.content)
}

main()

