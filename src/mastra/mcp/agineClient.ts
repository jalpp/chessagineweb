import { MCPClient } from "@mastra/mcp";

// singleton — only one instance for the lifetime of the server process
let client: MCPClient | null = null;

export function getAgineMcpClient(): MCPClient {
  if (!client) {
    client = new MCPClient({
      id: "chessagine-mcp-client", 
      servers: {
        chessagine: {
          url: new URL("https://chessagine-mcp.vercel.app/mcp"),
        },
      },
    });
  }
  return client;
}