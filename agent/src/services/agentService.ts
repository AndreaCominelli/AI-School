import "dotenv/config";
import { claudeClient } from "../AI/client.ts";
import { AbstractCms } from "../AI/cms/AbstractCms.ts";
import ContentstackCms from "../AI/cms/contentstack/ContentstackCms.ts";
import { readComponent } from "../AI/tools.ts";
import { SYSTEM_PROMPT } from "../AI/constants.ts";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta.mjs";

class AgentService {
    private static service: any = null;
    private cms: AbstractCms = {} as AbstractCms;

    private constructor(cmsName: string) {
        this.cmsSetup(cmsName)
            .then((abstractCms) => this.cms = abstractCms)
            .catch((err) => console.log(err));
    }

    static buildService(cms: string | undefined) {
        if (!cms) throw new Error("CMS not set");
        if (!this.service) {
            this.service = new AgentService(cms);
        }
        return this.service;
    }

    private async cmsSetup(cmsName: string): Promise<AbstractCms> {
        let cms: AbstractCms = {} as AbstractCms;
        switch (cmsName) {
            case "contentstack":
                cms = new ContentstackCms([
                    "knowledge/contentstack_create_content_type",
                ]);
                break;
            default:
                throw new Error("CMS not yet implemented");
        }
        await cms.setup();
        return cms;
    }

    async callModel(req: string): Promise<BetaMessage> {
        try {
            const response = await claudeClient.beta.messages.toolRunner({
                model: process.env.MODEL || "claude-haiku-5-5",
                messages: [{ role: "user", content: req }],
                max_tokens: 8192,
                max_iterations: 2,
                cache_control: {type: 'ephemeral', ttl: '1h'},
                system: [
                    {
                        type: 'text',
                        text: this.cms.getCmsKnowledge(),
                    },
                    {
                        type: 'text',
                        text: SYSTEM_PROMPT
                    }
                ],
                tools: [
                    this.cms.getAllContentTypes(),
                    this.cms.getContentTypesByUID(),
                    this.cms.createContentType(),
                    readComponent
                ],
            });

            return response;
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}

export default AgentService;
