import "dotenv/config";
import { Anthropic } from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import readline from "readline/promises";
import { localTools } from "./tools.js";
class MCPClient {
    mcp;
    anthropic;
    transport = null;
    tools = [];
    prompts = [];
    messages = [];
    systemPrompt = [];
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
    async connectToServer(serverScriptPath) {
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
            console.log("Connected to server with tools:", this.tools.map(({ name }) => name));
            console.log("Connected to server with prompts:", this.prompts.map(({ name }) => name));
        }
        catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }
    async processQuery(query) {
        let response = {};
        let stop = false;
        this.messages.push({
            role: "user",
            content: query,
        });
        do {
            try {
                response = await this.anthropic.messages.create({
                    cache_control: { type: "ephemeral", ttl: "5m" },
                    model: process.env.MODEL,
                    max_tokens: 8192,
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
                    continue;
                }
                const toolResults = [];
                for (const block of response.content) {
                    if (block.type === "tool_use") {
                        const toolName = block.name;
                        const toolArgs = block.input;
                        let result = {};
                        const local = localTools.find((t) => t.definition.name === toolName);
                        if (local) {
                            result = await local.handler(block.input);
                        }
                        else {
                            result = await this.mcp.callTool({
                                name: toolName,
                                arguments: toolArgs,
                            });
                        }
                        const toolResultMsg = {
                            type: "tool_result",
                            tool_use_id: block.id,
                            content: result.content
                                .filter((block) => block.type === "text")
                                .map((block) => block.text)
                                .join("\n"),
                        };
                        toolResults.push(toolResultMsg);
                    }
                }
                this.messages.push({
                    role: 'user',
                    content: toolResults
                });
            }
            catch (err) {
                throw err;
            }
        } while (!stop);
        console.log('--- STOP REASON ---: ', response.stop_reason); // always log the stop reason to get more details on llm outcome
        return response;
    }
    async chatLoop() {
        const blocks = [];
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
        }
        finally {
            rl.close();
        }
    }
    async cleanup() {
        await this.mcp.close();
    }
}
export default MCPClient;
