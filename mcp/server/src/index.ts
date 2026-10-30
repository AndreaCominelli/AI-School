import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from './server.ts';
import { AbstractCms } from "./cms/AbstractCms.ts";
import ContentstackCms from "./cms/contentstack/ContentstackCms.ts";

const cms: AbstractCms = new ContentstackCms([]);

serveStdio(() => createServer(cms), {
  onerror: (error) => console.error("Weather MCP Server error:", error),
});

