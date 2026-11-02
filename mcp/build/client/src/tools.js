/* eslint-disable no-multi-str */
import "dotenv/config";
import { ToolError } from "@anthropic-ai/sdk/helpers/beta/toolsets";
import { readFile } from "node:fs/promises";
import path from "node:path";
const readComponent = {
    definition: {
        name: "read_component",
        description: 'Reads the source of a single component from the src/components folder, so you can inspect its props.',
        input_schema: {
            type: "object",
            properties: { componentDirName: { type: "string", description: "File Name" } },
            required: ["componentDirName"],
        },
    },
    handler: async ({ componentDirName }) => {
        if (!process.env.MODEL_SRC_PATH)
            throw new ToolError('MODEL_SRC_PATH is not defined');
        const componentsDir = path.resolve(process.env.MODEL_SRC_PATH);
        const directoryName = String(componentDirName).charAt(0).toLowerCase() + String(componentDirName).slice(1);
        const fullPath = path.resolve(componentsDir, directoryName);
        // Evita path traversal (es. "../../.env")
        if (!fullPath.startsWith(componentsDir + path.sep)) {
            throw new ToolError('Invalid file name');
        }
        try {
            // Cerca il file tsx che si chiama come la cartella con prima lettera maiuscola
            const fileName = String(directoryName).charAt(0).toUpperCase() + String(directoryName).slice(1) + '.tsx';
            const filePath = path.join(fullPath, fileName);
            const fileToString = await readFile(filePath, 'utf-8');
            return ({
                content: [
                    {
                        type: 'text',
                        text: fileToString
                    }
                ]
            });
        }
        catch {
            throw new ToolError(`Component "${directoryName}" not found`);
        }
    },
};
export const localTools = [
    readComponent
];
