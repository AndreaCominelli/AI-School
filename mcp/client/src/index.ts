import MCPClient from "./client.ts";
import { getLangFuse } from "./langFuse.ts";

const main = async () => {
    const mcpClient = new MCPClient();
    const langFuseSDK = getLangFuse();

    try {
        langFuseSDK.start();
        await mcpClient.connectToServer(process.argv[2]);
        await mcpClient.chatLoop();
    } catch (err) {
        console.error(err);
    } finally {
        await mcpClient.cleanup();
        langFuseSDK.shutdown();
    }
}

main();