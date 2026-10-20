/* eslint-disable no-multi-str */
import "dotenv/config";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import axios, { AxiosError } from "axios";
import { ToolError } from "@anthropic-ai/sdk/helpers/beta/toolsets";
import { readdir, readFile as fsReadFile } from 'node:fs/promises';
import path from 'node:path';
import { writeFile } from './utils.ts'; 

const COMPONENTS_DIR = path.resolve('src/components');
const ALREADY_DONE_FILE_NAME = 'already_done';
const CONTENT_TYPES_URL = 'https://eu-api.contentstack.com/v3/content_types'

export const getAllContentTypes = betaZodTool({
    name: "get_all_content_types",
    inputSchema: z.object({}).optional(),
    description: "Get all content types from the CMS stack.\
    Use ONLY when the user explicitly wants a complete list of the available content types. \
    Do NOT use when the user asks for one specific content type or in case he wants to add/edit/delete\
    existing content types.",
    run: async () => {
        const cmsApiKey = process.env.CMS_API_KEY;
        const cmsMngmtToken = process.env.CMS_MNG_TOKEN;

        try {
            const response = await axios.get(
                CONTENT_TYPES_URL,
                {
                    headers: {
                        "api_key": cmsApiKey,
                        "authorization": cmsMngmtToken
                    },
                    params: {
                        "include_count": true,
                        "include_global": true,
                        "include_branch": true
                    }
                }
            )
            return JSON.stringify(response.data);
        } catch (err) {
            let errorMsg: string = "Something is broken";
            if (err instanceof AxiosError) {
                errorMsg = err.message;
            }
            throw new ToolError(errorMsg);
        }
    }
})

export const getContentTypesByUID = betaZodTool({
    name: "get_content_types_uid",
    inputSchema: z.object({
        uid: z.string(),
        version: z.string().optional(),
    }),
    description: "Get the content type from the CMS stack by UID and optionally its version.\
    Use ONLY if the user wants a specific content type by UID and, optionally, version.\
    Do NOT use when the user asks for a complete lists of content type or in case he wants to add/edit/delete\
    existing content types.",
    run: async ({ uid, version }) => {
        const cmsApiKey = process.env.CMS_API_KEY;
        const cmsMngmtToken = process.env.CMS_MNG_TOKEN;

        try {
            const response = await axios.get(
                CONTENT_TYPES_URL,
                {
                    headers: {
                        "api_key": cmsApiKey,
                        "authorization": cmsMngmtToken
                    },
                    params: version ? { "version": version } : {},
                    url: uid
                }
            )
            return JSON.stringify(response.data);
        } catch (err) {
            let errorMsg: string = "Something is broken";
            if (err instanceof AxiosError) {
                errorMsg = err.message;
            }
            throw new ToolError(errorMsg);
        }
    }
})

export const createContentType = betaZodTool({
    name: 'create_content_type',
    inputSchema: z.object({
        componentPath: z.string(),
        data: z.record(z.string(), z.any()).describe(
            'The full content type payload, structured as described in the system prompt'
        ),
        includeBranch: z.string().optional(),
    }),
    description: 'Creates a new content type in the CMS stack. \
    Use ONLY when the user explicitly asks to create a new content type. \
    Do NOT use it to edit or delete existing content types. \
    The `data` field must follow the structure described in the system prompt. \
    The `componentPath` field is the component path you resolved when you executed read_component.',
    run: async ({ data, includeBranch, componentPath }) => {
        const cmsApiKey = process.env.CMS_API_KEY;
        const cmsMngmtToken = process.env.CMS_MNG_TOKEN;

        try {
            const response = await axios.post(
                CONTENT_TYPES_URL,
                data,
                {
                    headers: {
                        "api_key": cmsApiKey,
                        "authorization": cmsMngmtToken,
                        "Content-Type": "application/json",
                    },
                    params: includeBranch ? { "include_branch": includeBranch } : {},
                }
            )
            writeFile(ALREADY_DONE_FILE_NAME, componentPath)
            return JSON.stringify(response.data);
        } catch (err) {
            let errorMsg: string = "Something is broken";
            if (err instanceof AxiosError) {
                errorMsg = err.message;
            }
            throw new ToolError(errorMsg);
        }
    }
})

export const listComponents = betaZodTool({
    name: 'list_components',
    description: 'Lists the file names of all available components in the src/components folder. ' +
        'Call this first to check whether a component requested by the user exists.',
    inputSchema: z.object({}),
    run: async () => JSON.stringify(await readdir(COMPONENTS_DIR)),
});

export const readComponent = betaZodTool({
    name: 'read_component',
    description: 'Reads the source of a single component from the src/components folder, ' +
        'so you can inspect its props. Use the exact file name returned by list_components.',
    inputSchema: z.object({
        componentDirName: z.string().describe('The directory name containing the component definition.'),
    }),
    run: async ({ componentDirName }) => {
        const directoryName = String(componentDirName).charAt(0).toLowerCase() + String(componentDirName).slice(1);
        const fullPath = path.resolve(COMPONENTS_DIR, directoryName);

        // Evita path traversal (es. "../../.env")
        if (!fullPath.startsWith(COMPONENTS_DIR + path.sep)) {
            throw new ToolError('Invalid file name');
        }

        try {
            // Cerca il file tsx che si chiama come la cartella con prima lettera maiuscola
            const fileName = String(directoryName).charAt(0).toUpperCase() + String(directoryName).slice(1) + '.tsx';
            const filePath = path.join(fullPath, fileName);
            return await fsReadFile(filePath, 'utf-8');
        } catch {
            throw new ToolError(`Component "${directoryName}" not found`);
        }
    },
});