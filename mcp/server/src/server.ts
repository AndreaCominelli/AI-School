import 'dotenv/config';
import {
    McpServer,
} from "@modelcontextprotocol/server";
import { AbstractCms } from "./cms/AbstractCms.ts";
import ContentstackCms from './cms/contentstack/ContentstackCms.ts';
import { SYSTEM_PROMPT } from './constants.ts';

class MCPServer {
    private server: McpServer | undefined;
    private cms: AbstractCms | undefined;
    private static instance: MCPServer | undefined;

    private constructor(cms: AbstractCms) {
        this.cms = cms;
        this.server = new McpServer({
            name: "cms-mcp-server",
            version: "v1.0.0",
        }, {instructions: this.cms.getCmsKnowledge()})
    }

    static async create(): Promise<MCPServer> {
        if (!this.instance) {
            const cms = await MCPServer.spawnCmsClient();
            this.instance = new MCPServer(cms)
        }
        return this.instance;
    }

    private static async spawnCmsClient(): Promise<AbstractCms> {
        let cms: AbstractCms;
        if (!process.env.CMS) {
            throw new Error('CMS stack not selected');
        }

        switch(process.env.CMS) {
            case 'contentstack':
                cms = new ContentstackCms(['./knowledge/contentstack_create_content_type']);
                break;
            default:
                throw new Error('CMS stack not implemented');
        }

        await cms.setup();
        return cms;
    }

    getServer = () => {
        return this.server;
    }

    createServer = () => {
        if (!this.server) {
            throw new Error('MCP server not yet initialized');
        }
        if (!this.cms) {
            throw new Error('CMS client not yet initialized');
        }

        const cmsKnowledge = this.cms.getCmsKnowledge();
        const allContentTypesTool = this.cms.getAllContentTypes();
        const contentTypesByUID = this.cms.getContentTypesByUID();
        const createContentType = this.cms.createContentType();

        this.server.registerTool(
            allContentTypesTool.name,
            allContentTypesTool.config,
            allContentTypesTool.cb
        );

        this.server.registerTool(
            contentTypesByUID.name,
            contentTypesByUID.config,
            contentTypesByUID.cb
        );

        this.server.registerTool(
            createContentType.name,
            createContentType.config,
            createContentType.cb
        );

        this.server.registerPrompt(
            'cms-knowledge',
            {
                title: 'system-prompt',
                description: `
                    The CMS knowledge used to map javascript objects to compatible CMS content types.
                    It also includes the full tools guide to give the model the necessary steps to query the CMS.`
            },
            () => ({
                messages: [
                    {
                        role: 'user' as const,
                        content: {
                            type: 'text' as const,
                            text: SYSTEM_PROMPT,
                        }
                    }
                ]
            })
        )

        return this.server;
    };
}

export default MCPServer;
