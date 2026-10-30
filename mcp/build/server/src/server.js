import { McpServer, } from "@modelcontextprotocol/server";
const server = new McpServer({
    name: "cms-mcp-server",
    version: "v1.0.0",
});
export const createServer = (cms) => {
    const x = cms.getAllContentTypes();
    server.registerTool(x.name, x.config, x.cb);
    return server;
};
