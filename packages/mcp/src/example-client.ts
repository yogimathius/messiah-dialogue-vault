#!/usr/bin/env node
/**
 * Example MCP Client for testing the Messiah Dialogue Vault server
 * 
 * This client demonstrates how to connect to and interact with the
 * vault MCP server via stdio transport.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

async function main() {
  console.log("🚀 Starting Messiah Dialogue Vault MCP Example Client\n");

  // Spawn the MCP server as a subprocess
  const serverProcess = spawn("tsx", ["src/server.ts"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "inherit"],
  });

  // Create the client transport
  const transport = new StdioClientTransport({
    command: "tsx",
    args: ["src/server.ts"],
  });

  // Create the client
  const client = new Client({
    name: "vault-example-client",
    version: "1.0.0",
  });

  try {
    // Connect to the server
    console.log("📡 Connecting to MCP server...");
    await client.connect(transport);
    console.log("✅ Connected!\n");

    // List available tools
    console.log("🔧 Available Tools:");
    const toolsResponse = await client.listTools();
    for (const tool of toolsResponse.tools) {
      console.log(`  - ${tool.name}: ${tool.description}`);
    }
    console.log();

    // List available resources
    console.log("📚 Available Resources (threads):");
    const resourcesResponse = await client.listResources();
    if (resourcesResponse.resources.length === 0) {
      console.log("  (no threads found)");
    } else {
      for (const resource of resourcesResponse.resources.slice(0, 5)) {
        console.log(`  - ${resource.name} (${resource.uri})`);
      }
      if (resourcesResponse.resources.length > 5) {
        console.log(`  ... and ${resourcesResponse.resources.length - 5} more`);
      }
    }
    console.log();

    // Test the list_threads tool
    console.log("📋 Testing list_threads tool:");
    const threadsResult = await client.callTool({
      name: "list_threads",
      arguments: { limit: 3 },
    });
    if (threadsResult.content[0].type === "text") {
      const threads = JSON.parse(threadsResult.content[0].text);
      console.log(`  Found ${threads.length} thread(s)`);
      for (const thread of threads) {
        console.log(`  - "${thread.title}" (${thread._count?.turns || 0} turns)`);
      }
    }
    console.log();

    // If threads exist, test get_thread
    if (resourcesResponse.resources.length > 0) {
      const firstThreadUri = resourcesResponse.resources[0].uri;
      const threadId = firstThreadUri.split("/").pop();
      
      console.log(`📖 Reading resource: ${firstThreadUri}`);
      const resourceResult = await client.readResource({ uri: firstThreadUri });
      if (resourceResult.contents[0].text) {
        const thread = JSON.parse(resourceResult.contents[0].text);
        console.log(`  Title: ${thread.title}`);
        console.log(`  Turns: ${thread.turns?.length || 0}`);
        console.log(`  Status: ${thread.status}`);
      }
      console.log();

      // Test get_recent_turns
      console.log(`🔄 Testing get_recent_turns for thread ${threadId}:`);
      const turnsResult = await client.callTool({
        name: "get_recent_turns",
        arguments: { threadId, n: 3 },
      });
      if (turnsResult.content[0].type === "text") {
        const turns = JSON.parse(turnsResult.content[0].text);
        console.log(`  Found ${turns.length} recent turn(s)`);
        for (const turn of turns) {
          const preview = turn.content.substring(0, 80).replace(/\n/g, " ");
          console.log(`  - [${turn.role}] ${preview}...`);
        }
      }
    }

    console.log("\n✨ Example client completed successfully!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    // Clean up
    await client.close();
    serverProcess.kill();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
