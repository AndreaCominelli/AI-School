/* eslint-disable no-multi-str */
import "dotenv/config";
import { claudeClient } from "./client.ts";
import { readComponent, listComponents } from "./tools.ts";
import type { AbstractCms } from "./cms/AbstractCms";
import ContentstackCms from "./cms/contentstack/ContentstackCms.ts";

const cmsSetup = async ():Promise<AbstractCms> => {
    let cms: AbstractCms = {} as AbstractCms;
    switch(process.env.CMS) {
        case 'contentstack':
            cms = new ContentstackCms(['cms/contentstack/create_content_type']);
            break;
        default:
            throw new Error('CMS not yet implemented');
    }
    await cms.setup();
    return cms;
}

const main = async () => {
    try {
        const cms = await cmsSetup();
        const claudeResponse = await claudeClient.beta.messages.toolRunner({
            model: process.env.MODEL || '',
            messages: [{ role: 'user', content: 'Create three new content types for badge, input and label components'}],
            max_tokens: 8192,
            tools: [
                cms.createContentType(),
                cms.getAllContentTypes(),
                cms.getContentTypesByUID(),
                listComponents,
                readComponent,
            ],
            system: [
                {
                    type: 'text',
                    cache_control: { type: 'ephemeral', ttl: '1h'},
                    text: cms.getCmsKnowledge()
                },
                {
                    type: 'text',
                    text: 'You have full knowledge on how to interact with a selected CMS stack. \
                    Your duty is to solve user needs which consist only in query the selected CMS APIs. \
                    If the user asks you something else, you MUST decline its request. \
                    If the user asks you to create a new content type from an existing component, you must:\
                    1 - Use list_components to see the available components and read_component to inspect their props.\
                    If the requested component is not listed, refuse.\
                    2 - Once you parsed the file which contains the component definition, pass the resulting Javascript object to the create_content_type tool in the "data" input object and the full component path in the "componentPath" field. \
                    3 - Use create_content_type to actually call the creation api on the cms. \
                    Do NOT read from the cms knowledge if the user asks you to retrieve one or more content types.\
                    In that case, use ONLY get_content_types_uid or get_all_content_types based on user needs.'
                }
            ]
        })

        for (const block of claudeResponse.content) {
            console.log(block);
        }
    } catch(err) {
        console.log(err);
        throw err;
    }
}

main()
