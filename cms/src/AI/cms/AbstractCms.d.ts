import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";

export interface AbstractCms {
    protected cmsKnowledge: string;
    protected alreadyCreatedContents: string[];
    protected setup: () => void; 
    protected getAlreadyCreatedContents: () => string[];
    protected getCmsKnowledge: () => string;
    protected getAllContentTypes: () => BetaRunnableTool<any>;
    protected getContentTypesByUID: () => BetaRunnableTool<any>;
    protected createContentType: () => BetaRunnableTool<any>;
}