import "dotenv/config";
import { connectDb, disconnectDb } from "../config/db.js";
import { seedData } from "../utils/seedData.js";

await connectDb();
await seedData();
console.log("Seed complete. Voter password: DemoVoter123!; admin credentials come from .env. Create elections through the admin dashboard so MongoDB and Ethereum stay synchronized."); await disconnectDb();
