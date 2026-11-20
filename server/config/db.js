import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";

let memoryServer;
const here = path.dirname(fileURLToPath(import.meta.url));

export async function connectDb(uri = env.mongoUri) {
  if (env.useInMemoryDb && env.nodeEnv !== "production" && uri === env.mongoUri) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const dbPath = path.resolve(here, "../data/embedded-mongodb");
    fs.mkdirSync(dbPath, { recursive: true });
    memoryServer = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: "wiredTiger" } });
    return mongoose.connect(memoryServer.getUri("secure_voting"));
  }
  return mongoose.connect(uri);
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
