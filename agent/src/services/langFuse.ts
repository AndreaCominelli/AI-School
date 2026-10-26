import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { AnthropicInstrumentation } from "@arizeai/openinference-instrumentation-anthropic";
import Anthropic from "@anthropic-ai/sdk";

let sdk: NodeSDK | undefined = undefined;

export const getLangFuse = ():NodeSDK => {
    if (!sdk) {
        // setup langfuse tracer
        const instrumentation = new AnthropicInstrumentation();
        instrumentation.manuallyInstrument(Anthropic);

        // Initialize the OpenTelemetry SDK with Langfuse as the span processor
        sdk = new NodeSDK({
            spanProcessors: [new LangfuseSpanProcessor()],
            instrumentations: [instrumentation],
        });
    }

    return sdk;
}
