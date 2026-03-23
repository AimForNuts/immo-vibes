import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import ws from "ws";

// Polyfill WebSocket for @neondatabase/serverless in Node.js environments (CI)
if (!globalThis.WebSocket) {
  (globalThis as unknown as Record<string, unknown>).WebSocket = ws;
}

config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
