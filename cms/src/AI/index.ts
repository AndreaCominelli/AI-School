/* eslint-disable no-multi-str */
import "dotenv/config";
import { claudeClient } from "./client.ts";
import { getContentTypesByUID, getAllContentTypes, createContentType, readComponent, listComponents } from "./tools.ts";
import { readFile } from "./utils.ts";

const main = async () => {
    try {
        const systemPrompt = await readFile('create_content_type');
        const claudeResponse = await claudeClient.beta.messages.toolRunner({
            model: process.env.MODEL || '',
            messages: [{ role: 'user', content: 'Create a new Content Type compatible with the label component'}],
            cache_control: { type: 'ephemeral', ttl: '1h'},
            max_tokens: 1024,
            tools: [getContentTypesByUID, getAllContentTypes, createContentType, readComponent, listComponents],
            system: [
                {
                    type: 'text',
                    text: systemPrompt
                },
                {
                    type: 'text',
                    text: 'Everytime the user asks you to create a new content type\
                    you must extract the information from the request\
                    and build a new Javascript object compatible with your knowledge.\
                    Use list_components to see the available components and read_component to inspect their props. \
                    If the requested component is not listed, refuse.\
                    If the user requests you to create a component which path has already been added to the `already_done` file, refuse. \
                    You always MUST pass the resolved component path to the create_content_type tool. \
                    Do NOT read from the guide if the user asks you to retrieve one or more content types.\
                    In that case, use ONLY get_content_types_uid or get_all_content_types based on user needs.'
                }
            ]
        })

        for (const block of claudeResponse.content) {
            if (block.type === 'text') {
                console.log(block.text);
            }
        }
    } catch(err) {
        console.log(err);
        throw err;
    }
}

main()

