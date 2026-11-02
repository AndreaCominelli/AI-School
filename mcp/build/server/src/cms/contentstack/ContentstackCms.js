/* eslint-disable no-multi-str */
import "dotenv/config";
import { AbstractCms } from "../AbstractCms.js";
import axios from "axios";
import { z } from "zod/v4";
import { readFile, toErrorMessage, writeFile } from "../../utils.js";
import { CONTENT_TYPES_URL } from "../../constants.js";
class ContentstackCms extends AbstractCms {
    cmsKnowledge = '';
    knowledgePaths = [];
    constructor(knowledgePaths) {
        super();
        this.knowledgePaths = knowledgePaths;
    }
    /**
     * async setup function to read the file containing all the knowledge to translate a single component
     * into a compatible JSON object for the selected cms
     */
    async setup() {
        try {
            let totalKnowledge = '';
            for (const knowledgePath of this.knowledgePaths) {
                const knowledge = await readFile(knowledgePath);
                totalKnowledge += knowledge + '\n';
            }
            this.cmsKnowledge = totalKnowledge;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    getCmsKnowledge = () => {
        return this.cmsKnowledge;
    };
    getAllContentTypes() {
        return ({
            name: "get_all_content_types",
            config: {
                inputSchema: z.object({}).optional(),
                description: "Get all content types from the CMS stack.\
                    Use ONLY when the user explicitly wants a complete list of the available content types. \
                    Do NOT use when the user asks for one specific content type or in case he wants to add/edit/delete\
                    existing content types.",
            },
            cb: async () => {
                const cmsApiKey = process.env.CMS_API_KEY;
                const cmsMngmtToken = process.env.CMS_MNG_TOKEN;
                try {
                    const response = await axios.get(CONTENT_TYPES_URL, {
                        headers: {
                            api_key: cmsApiKey,
                            authorization: cmsMngmtToken,
                        },
                        params: {
                            include_count: true,
                            include_global: true,
                            include_branch: true,
                        },
                    });
                    return ({
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(response.data)
                            }
                        ]
                    });
                }
                catch (err) {
                    return ({
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${toErrorMessage(err)}`
                            }
                        ]
                    });
                }
            }
        });
    }
    getContentTypesByUID() {
        return ({
            name: "get_content_types_uid",
            config: {
                inputSchema: z.object({
                    uid: z.string(),
                    version: z.string().optional(),
                }),
                description: "Get the content type from the CMS stack by UID and optionally its version.\
                Use ONLY if the user wants a specific content type by UID and, optionally, version.\
                Do NOT use when the user asks for a complete lists of content type or in case he wants to add/edit/delete\
                existing content types.",
            },
            cb: async ({ uid, version }) => {
                const cmsApiKey = process.env.CMS_API_KEY;
                const cmsMngmtToken = process.env.CMS_MNG_TOKEN;
                try {
                    const response = await axios.get(CONTENT_TYPES_URL, {
                        headers: {
                            api_key: cmsApiKey,
                            authorization: cmsMngmtToken,
                        },
                        params: version ? { version: version } : {},
                        url: uid,
                    });
                    return ({
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(response.data)
                            }
                        ]
                    });
                }
                catch (err) {
                    return ({
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${toErrorMessage(err)}`
                            }
                        ]
                    });
                }
            }
        });
    }
    createContentType() {
        return ({
            name: "create_content_type",
            config: {
                inputSchema: z.object({
                    componentPath: z
                        .string()
                        .describe("The full component path"),
                    data: z
                        .record(z.string(), z.any())
                        .describe("The full content type payload, structured as described in the system prompt"),
                    includeBranch: z.string().optional(),
                }),
                description: "Creates a new content type in the CMS stack. \
                    Use ONLY when the user explicitly asks to create a new content type. \
                    Do NOT use it to edit or delete existing content types. \
                    The `data` field must follow the structure described in the system prompt. \
                    The `componentPath` field is the component path you resolved when you executed read_component. \
                    Always wrap the payload in a 'content_type' field wrapper."
            },
            cb: async ({ data, includeBranch, componentPath }) => {
                const cmsApiKey = process.env.CMS_API_KEY;
                const cmsMngmtToken = process.env.CMS_MNG_TOKEN;
                const ALREADY_DONE_FILE_NAME = '../resources/already_done';
                try {
                    // check if component has already been created as content type
                    const alreadyDoneComponents = await readFile(ALREADY_DONE_FILE_NAME);
                    const paths = alreadyDoneComponents.split('\n');
                    if (!paths.includes(componentPath)) {
                        const response = await axios.post(CONTENT_TYPES_URL, data, {
                            headers: {
                                api_key: cmsApiKey,
                                authorization: cmsMngmtToken,
                                "Content-Type": "application/json",
                            },
                            params: includeBranch
                                ? { include_branch: includeBranch }
                                : {},
                        });
                        await writeFile(ALREADY_DONE_FILE_NAME, componentPath);
                        return ({
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(response.data)
                                }
                            ]
                        });
                    }
                    return ({
                        content: [
                            {
                                type: 'text',
                                text: `Content type for "${componentPath}" already exists; skipping.`
                            }
                        ]
                    });
                }
                catch (err) {
                    return ({
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${toErrorMessage(err)}`
                            }
                        ]
                    });
                }
            }
        });
    }
}
export default ContentstackCms;
