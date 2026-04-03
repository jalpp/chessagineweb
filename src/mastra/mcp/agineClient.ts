import { MCPClient } from "@mastra/mcp";

let client: MCPClient | null = null;


export function getAgineMcpClient(): MCPClient {
  if (!client) {
    client = new MCPClient({
      id: "chessagine-mcp-client",
      timeout: 120_000,
      servers: {
        chessagine: {
          url: new URL("https://chessagine-mcp.vercel.app/mcp"),
          
        },
        
      },
    });
  }
  return client;
}

export function resetAgineMcpClient(): void {
  client = null;
}
