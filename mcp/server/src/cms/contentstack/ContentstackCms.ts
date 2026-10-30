/* eslint-disable no-multi-str */
import "dotenv/config";
import { type ITool, AbstractCms } from "../AbstractCms.ts";
import axios from "axios";
import { z } from "zod/v4";
import { readFile, toErrorMessage } from "../../utils.ts";
import { CONTENT_TYPES_URL } from "../../constants.ts";

class ContentstackCms extends AbstractCms {
    cmsKnowledge: string = '';
    knowledgePaths: string[] = [];

    constructor(knowledgePaths: string[]) {
        super();
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

    getAllContentTypes(): ITool<any> {
        return ({
            name: "get_all_content_types",
            config: {
                inputSchema: z.object({}).optional(),
                description:
                    "Get all content types from the CMS stack.\
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
                    })
                } catch (err) {
                    return ({
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${toErrorMessage(err)}`
                            }
                        ]
                    })
                }
            }
        })
    }
}

export default ContentstackCms;
