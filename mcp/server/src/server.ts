import {
    McpServer,
} from "@modelcontextprotocol/server";
import { AbstractCms } from "./cms/AbstractCms.ts";

const server = new McpServer({
    name: "cms-mcp-server",
    version: "v1.0.0",
});

export const createServer = (cms: AbstractCms) => {
    const x = cms.getAllContentTypes()

    server.registerTool(x.name, x.config, x.cb);
    return server;
};
