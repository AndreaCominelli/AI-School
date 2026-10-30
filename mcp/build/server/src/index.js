import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from './server.js';
import ContentstackCms from "./cms/contentstack/ContentstackCms.js";
const cms = new ContentstackCms([]);
serveStdio(() => createServer(cms), {
    onerror: (error) => console.error("Weather MCP Server error:", error),
});
