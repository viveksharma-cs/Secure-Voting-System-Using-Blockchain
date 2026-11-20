import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { env } from "../config/env.js";

export const sha256 = value => crypto.createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
export const hashOtp = value => crypto.createHmac("sha256", env.otpPepper).update(value).digest("hex");
export const signToken = user => jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, issuer: "secure-vote" });
const encryptionKey = () => env.ballotKey ? Buffer.from(env.ballotKey, "hex") : crypto.createHash("sha256").update(env.jwtSecret + env.otpPepper).digest();
export function encryptBallot(payload) { const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv); const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]); return [iv, cipher.getAuthTag(), encrypted].map(x => x.toString("base64url")).join("."); }
export function decryptBallot(value) { const [iv, tag, data] = value.split(".").map(x => Buffer.from(x, "base64url")); const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv); decipher.setAuthTag(tag); return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString()); }
export const makeCommitment = (electionId, candidateId, salt) => ethers.solidityPackedKeccak256(["uint256", "uint256", "bytes32"], [electionId, candidateId, salt]);
