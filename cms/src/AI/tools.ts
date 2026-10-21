/* eslint-disable no-multi-str */
import "dotenv/config";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { ToolError } from "@anthropic-ai/sdk/helpers/beta/toolsets";
import { readdir, readFile as fsReadFile } from 'node:fs/promises';
import path from 'node:path';

const COMPONENTS_DIR = path.resolve('src/components');

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