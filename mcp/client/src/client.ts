import "dotenv/config";
import { Anthropic } from "@anthropic-ai/sdk";
import {
    type TextBlockParam,
    type MessageParam,
    type Tool,
    ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { CallToolResult, Client, Prompt } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import readline from "readline/promises";
import { localTools } from "./tools.ts";

class MCPClient {
    private mcp: Client;
    private anthropic: Anthropic;
    private transport: StdioClientTransport | null = null;
    private tools: Tool[] = [];
    private prompts: Prompt[] = [];
    private messages: MessageParam[] = [];
    private systemPrompt: TextBlockParam[] = [];

    constructor() {
        if (!process.env.MODEL_KEY) {
            throw new Error("ANTHROPIC_API_KEY is not set");
        }

        if (!process.env.MODEL) {
            throw new Error("ANTHROPIC_MODEL is not set");
        }
        this.anthropic = new Anthropic({
            apiKey: process.env.MODEL_KEY,
        });
        this.mcp = new Client({ name: "cms-mcp-client", version: "1.0.0" });
    }

    async connectToServer(serverScriptPath: string) {
        try {
            const isJs = serverScriptPath.endsWith(".js");
            const isPy = serverScriptPath.endsWith(".py");
            if (!isJs && !isPy) {
                throw new Error("Server script must be a .js or .py file");
            }
            const command = isPy
                ? process.platform === "win32"
                    ? "python"
                    : "python3"
                : process.execPath;

            this.transport = new StdioClientTransport({
                command,
                args: [serverScriptPath],
            });
            await this.mcp.connect(this.transport);

            const toolsResult = await this.mcp.listTools();
            const promptResult = await this.mcp.listPrompts();

            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                };
            });

            this.prompts = promptResult.prompts.map((prompt) => {
                return {
                    name: prompt.name,
                    title: prompt.title,
                    description: prompt.description,
                    arguments: prompt.arguments,
                };
            });
            console.log(
                "Connected to server with tools:",
                this.tools.map(({ name }) => name),
            );
            console.log(
                "Connected to server with prompts:",
                this.prompts.map(({ name }) => name),
            );
        } catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }

    private async loadSystemPrompt(
        args?: Record<string, string>,
    ): Promise<MessageParam[]> {
        // retrieve system prompt from mcp server
        // Only one system prompt can be defined by the user
        // Otherwise, must call getPrompt for each specified system-prompt
        // Not a problem but ugly.
        const systemPromptName = this.prompts
            .filter((prompt) => prompt.title?.includes("system-prompt"))
            .map((prompt) => prompt.name)[0];

        if (!systemPromptName) {
            throw new Error("System prompt unavailble");
        }

        const prompt = await this.mcp.getPrompt({
            name: systemPromptName,
            arguments: args,
        });

        // prompt.messages: [{ role: 'user' | 'assistant', content: { type: 'text', text: '...' } }]
        return prompt.messages.flatMap((m): MessageParam[] => {
            if (m.content.type !== "text") return []; // image/resource: da gestire a parte
            return [
                {
                    role: "user",
                    content: m.content.text,
                },
            ];
        });
    }

    // TODO: è possibile modificare l'output del blocco di thinking?

    private async processQuery(
        query: string,
    ): Promise<Anthropic.Messages.Message> {
        let response: Anthropic.Messages.Message =
            {} as Anthropic.Messages.Message;
        let stop: boolean = false;
        this.messages.push({
            role: "user",
            content: query,
        });

        do {
            try {
                response = await this.anthropic.messages.create({
                    cache_control: { type: "ephemeral", ttl: "5m" },
                    model: process.env.MODEL!,
                    max_tokens: 1024,
                    messages: this.messages,
                    tools: [
                        ...this.tools,
                        ...localTools.map(t => t.definition)
                    ],
                    system: this.systemPrompt,
                });

                this.messages.push({
                    role: "assistant",
                    content: response.content,
                });

                if (response.stop_reason !== "tool_use") {
                    stop = true;
                    continue; // con while(!stop) salta alla condizione ed esce
                }

                const toolResults: ToolResultBlockParam[] = [];

                for (const block of response.content) {
                    if (block.type === "tool_use") {
                        const toolName = block.name;
                        const toolArgs = block.input as
                            | { [x: string]: unknown }
                            | undefined;

                        let result: CallToolResult = {} as CallToolResult;
                        const local = localTools.find((t) => t.definition.name === toolName);
                        if (local) {
                            result = await local.handler(block.input);
                        } else {
                            result = await this.mcp.callTool({
                                name: toolName,
                                arguments: toolArgs,
                            });   
                        }

                        const toolResultMsg: ToolResultBlockParam = {
                            type: "tool_result",
                            tool_use_id: block.id,
                            content: result.content
                                .filter(
                                    (block) => block.type === "text",
                                )
                                .map((block) => block.text)
                                .join("\n"),
                        };

                        toolResults.push(toolResultMsg)
                    }
                }

                this.messages.push({
                    role: 'user',
                    content: toolResults
                });
            } catch (err) {
                throw err;
            }
        } while (!stop);

        return response;
    }

    async chatLoop() {
        const systemMessages = await this.loadSystemPrompt();
        const blocks: TextBlockParam[] = systemMessages.map((m) => ({
            type: "text",
            text: m.content as string,
        }));

        const instructions = this.mcp.getInstructions();
        if (instructions) {
            blocks.push({ type: "text", text: instructions });
        }

        this.systemPrompt = blocks;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            console.log("\nMCP Client Started!");
            console.log("Type your queries or 'quit' to exit.");

            while (true) {
                const message = await rl.question("\nQuery: ");
                if (message.toLowerCase() === "quit") {
                    break;
                }
                const response = await this.processQuery(message);
                for (const block of response.content) {
                    if (block.type === "text") {
                        console.log(block.text);
                    }
                }
            }
        } finally {
            rl.close();
        }
    }

    async cleanup() {
        await this.mcp.close();
    }
}

export default MCPClient;
