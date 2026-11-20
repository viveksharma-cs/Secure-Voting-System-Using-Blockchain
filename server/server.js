import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { seedData } from "./utils/seedData.js";

connectDb().then(async () => {
  if (env.useInMemoryDb) {
    await seedData();
    console.log("Using temporary in-memory MongoDB; demo accounts were seeded automatically.");
  }
  app.listen(env.port, () => console.log(`SecureVote API listening on http://localhost:${env.port}`));
}).catch(error => { console.error("Database connection failed", error); process.exit(1); });
