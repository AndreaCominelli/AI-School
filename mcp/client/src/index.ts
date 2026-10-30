import MCPClient from "./client.ts";

const main = async () => {
    const mcpClient = new MCPClient();

    try {
        await mcpClient.connectToServer(process.argv[2]);
        await mcpClient.chatLoop();
    } catch (err) {
        console.error(err);
    }
}

main();