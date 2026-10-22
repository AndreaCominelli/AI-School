import type { BetaRunnableTool } from "@anthropic-ai/sdk/lib/tools/BetaRunnableTool";

export abstract class AbstractCms {
    protected abstract cmsKnowledge: string;
    abstract setup (): void;
    abstract getCmsKnowledge(): string;
    abstract getAllContentTypes (): BetaRunnableTool<any>;
    abstract getContentTypesByUID (): BetaRunnableTool<any>;
    abstract createContentType (): BetaRunnableTool<any>;
}