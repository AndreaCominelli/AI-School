import { serveStdio } from "@modelcontextprotocol/server/stdio";
import MCPServer from './server.js';
const main = async () => {
    const server = await MCPServer.create();
    serveStdio(server.createServer, {
        onerror: (error) => console.error("CMS MCP Server error:", error),
    });
};
main();
