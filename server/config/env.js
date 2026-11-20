import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/secure_voting",
  useInMemoryDb: process.env.USE_IN_MEMORY_DB === "true",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret-change-this-now",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  otpPepper: process.env.OTP_PEPPER || "development-otp-pepper",
  ballotKey: process.env.BALLOT_ENCRYPTION_KEY || "",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  contractAddress: process.env.VOTING_CONTRACT_ADDRESS || "",
  chainId: Number(process.env.CHAIN_ID || 31338),
  allowDevOtp: process.env.ALLOW_DEV_OTP === "true",
  smtp: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.SMTP_FROM || "SecureVote <noreply@securevote.local>" }
};

if (env.nodeEnv === "production" && (env.jwtSecret.length < 32 || !env.ballotKey)) throw new Error("Secure JWT_SECRET and BALLOT_ENCRYPTION_KEY are required in production");
