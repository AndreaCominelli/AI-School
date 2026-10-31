import {
    type ToolAnnotations,
    type StandardSchemaWithJSON,
    type Icon,
    type ScopeChallengeHandler,
    type ServerContext,
} from "@modelcontextprotocol/server";
import { type ZodRawShape } from "zod/v4";

export interface ITool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape | StandardSchemaWithJSON | undefined = undefined> {
    name: string;
    config: {
        title?: string;
        description?: string;
        inputSchema?: InputArgs;
        outputSchema?: OutputArgs;
        annotations?: ToolAnnotations;
        icons?: Icon[];
        scopeChallenge?: ScopeChallengeHandler;
        _meta?: Record<string, unknown>;
    };
    cb: (input: InputArgs, ctx: ServerContext) => any // real type not exported from zod
};

export abstract class AbstractCms {
    protected abstract cmsKnowledge: string;
    abstract setup (): Promise<void>;
    abstract getCmsKnowledge(): string;
    abstract getAllContentTypes (): ITool<any>;
    abstract getContentTypesByUID (): ITool<any>;
    abstract createContentType (): ITool<any>;
}