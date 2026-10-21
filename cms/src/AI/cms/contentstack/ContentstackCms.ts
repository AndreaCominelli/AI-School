/* eslint-disable no-multi-str */
import "dotenv/config";
import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { AbstractCms } from "../AbstractCms.d.ts";
import axios, { AxiosError } from "axios";
import { ToolError } from "@anthropic-ai/sdk/lib/tools/ToolError";
import { z } from "zod/v4";
import { readFile, writeFile } from "../../utils.ts";

const CONTENT_TYPES_URL = "https://eu-api.contentstack.com/v3/content_types";
const ALREADY_DONE_FILE_NAME = 'already_done';

class ContentstackCms implements AbstractCms {
    cmsKnowledge: string = '';
    knowledgePaths: string[] = [];

    constructor(knowledgePaths: string[]) {
        this.knowledgePaths = knowledgePaths;
    }

    /**
     * async setup function to read the file containing all the knowledge to translate a single component
     * into a compatible JSON object for the selected cms
     */
    async setup () {
        try {
            let totalKnowledge: string = '';
            for (const knowledgePath of this.knowledgePaths) {
                const knowledge = await readFile(knowledgePath);
                totalKnowledge += knowledge + '\n';
            }
            this.cmsKnowledge = totalKnowledge;
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    getCmsKnowledge(): string {
        return this.cmsKnowledge;
    }

    getAllContentTypes(): BetaRunnableTool<any> {
        return betaZodTool({
            name: "get_all_content_types",
            inputSchema: z.object({}).optional(),
            description:
                "Get all content types from the CMS stack.\
                Use ONLY when the user explicitly wants a complete list of the available content types. \
                Do NOT use when the user asks for one specific content type or in case he wants to add/edit/delete\
                existing content types.",
            run: async () => {
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
                    return JSON.stringify(response.data);
                } catch (err) {
                    let errorMsg: string = "Something is broken";
                    if (err instanceof AxiosError) {
                        errorMsg = err.message;
                    }
                    throw new ToolError(errorMsg);
                }
            },
        });
    }

    getContentTypesByUID(): BetaRunnableTool<any> {
        return betaZodTool({
            name: "get_content_types_uid",
            inputSchema: z.object({
                uid: z.string(),
                version: z.string().optional(),
            }),
            description:
                "Get the content type from the CMS stack by UID and optionally its version.\
            Use ONLY if the user wants a specific content type by UID and, optionally, version.\
            Do NOT use when the user asks for a complete lists of content type or in case he wants to add/edit/delete\
            existing content types.",
            run: async ({ uid, version }) => {
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
                    return JSON.stringify(response.data);
                } catch (err) {
                    let errorMsg: string = "Something is broken";
                    if (err instanceof AxiosError) {
                        errorMsg = err.message;
                    }
                    throw new ToolError(errorMsg);
                }
            },
        });
    }

    createContentType(): BetaRunnableTool<any> {
        return betaZodTool({
            name: "create_content_type",
            inputSchema: z.object({
                componentPath: z
                    .string()
                    .describe("The full component path"),
                data: z
                    .record(z.string(), z.any())
                    .describe(
                        "The full content type payload, structured as described in the system prompt",
                    ),
                includeBranch: z.string().optional(),
            }),
            description:
                "Creates a new content type in the CMS stack. \
    Use ONLY when the user explicitly asks to create a new content type. \
    Do NOT use it to edit or delete existing content types. \
    The `data` field must follow the structure described in the system prompt. \
    The `componentPath` field is the component path you resolved when you executed read_component. \
    Always wrap the payload in a 'content_type' field wrapper. ",
            run: async ({ data, includeBranch, componentPath }) => {
                const cmsApiKey = process.env.CMS_API_KEY;
                const cmsMngmtToken = process.env.CMS_MNG_TOKEN;

                try {
                    // check if component has already been created as content type
                    const alreadyDoneComponents = await readFile(ALREADY_DONE_FILE_NAME);
                    const paths = alreadyDoneComponents.split('\n');

                    if (paths.includes(componentPath)) {
                        throw new ToolError('The component has already been created');
                    }

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
                    return JSON.stringify(response.data);
                } catch (err) {
                    let errorMsg: string = "";
                    if (err instanceof AxiosError) {
                        errorMsg = err.message;
                    } else if (err instanceof ToolError) {
                        errorMsg = err.message;
                    }
                    else {
                        errorMsg = "Something is broken";
                    }
                    throw new ToolError(errorMsg);
                }
            },
        });
    }
}

export default ContentstackCms;
