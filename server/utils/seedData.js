import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { sha256 } from "./security.js";

const wallets = [
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
  "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
  "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65"
];
const voters = [
  ["Rohan Das", "rohan.das@example.test"],
  ["Ananya Gupta", "ananya.gupta@example.test"],
  ["Vikram Nair", "vikram.nair@example.test"],
  ["Meera Patel", "meera.patel@example.test"]
];

export async function seedData() {
  const passwordHash = await bcrypt.hash("DemoVoter123!", 12);
  for (let i = 0; i < voters.length; i++) {
    await User.updateOne(
      { email: voters[i][1] },
      { $setOnInsert: { fullName: voters[i][0], email: voters[i][1], voterIdHash: sha256(`DEMO-VOTER-${i + 1}`), walletAddress: wallets[i], passwordHash, isVerified: true, role: "voter" } },
      { upsert: true }
    );
  }
  const adminEmail = process.env.ADMIN_EMAIL || "admin@securevote.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  await User.updateOne(
    { email: adminEmail },
    { $setOnInsert: { fullName: "Election Commissioner", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: "admin", isVerified: true } },
    { upsert: true }
  );
}
