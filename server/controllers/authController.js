import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { sha256, hashOtp, signToken } from "../utils/security.js";
import { sendOtp } from "../utils/sendOtp.js";
import { env } from "../config/env.js";

export async function register(req, res) {
  const { fullName, email, voterId, password, walletAddress } = req.body;
  const voterIdHash = sha256(voterId); const normalizedWallet = walletAddress.toLowerCase();
  if (await User.exists({ $or: [{ email }, { voterIdHash }, { walletAddress: normalizedWallet }] })) throw Object.assign(new Error("Email, voter ID, or wallet is already registered"), { status: 409 });
  const user = await User.create({ fullName, email, voterIdHash, walletAddress: normalizedWallet, passwordHash: await bcrypt.hash(password, 12) });
  const code = String(crypto.randomInt(100000, 1000000));
  await Otp.deleteMany({ user: user._id }); await Otp.create({ user: user._id, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + 10 * 60_000) });
  await sendOtp(email, code);
  res.status(201).json({ message: "Registration received. Verify the emailed OTP.", email, ...(env.allowDevOtp && env.nodeEnv !== "production" ? { devOtp: code } : {}) });
}

export async function verifyOtp(req, res) {
  const user = await User.findOne({ email: req.body.email }); if (!user) throw Object.assign(new Error("Invalid verification request"), { status: 400 });
  const record = await Otp.findOne({ user: user._id }).sort({ createdAt: -1 });
  if (!record || record.expiresAt < new Date() || record.attempts >= 5) throw Object.assign(new Error("OTP expired or locked"), { status: 400 });
  if (!crypto.timingSafeEqual(Buffer.from(record.codeHash), Buffer.from(hashOtp(req.body.code)))) { record.attempts++; await record.save(); throw Object.assign(new Error("Invalid OTP"), { status: 400 }); }
  user.isVerified = true; await user.save(); await Otp.deleteMany({ user: user._id });
  res.json({ token: signToken(user), user: safeUser(user) });
}

export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select("+passwordHash +failedLogins +lockedUntil");
  if (!user) throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  if (user.lockedUntil && user.lockedUntil > new Date()) throw Object.assign(new Error("Account temporarily locked"), { status: 423 });
  if (!await bcrypt.compare(req.body.password, user.passwordHash)) { user.failedLogins += 1; if (user.failedLogins >= 5) user.lockedUntil = new Date(Date.now() + 15 * 60_000); await user.save(); throw Object.assign(new Error("Invalid email or password"), { status: 401 }); }
  if (!user.isVerified) throw Object.assign(new Error("Email verification required"), { status: 403 });
  user.failedLogins = 0; user.lockedUntil = undefined; user.lastLoginAt = new Date(); await user.save();
  res.json({ token: signToken(user), user: safeUser(user) });
}
export const me = (req, res) => res.json({ user: safeUser(req.user) });
const safeUser = user => ({ id: user.id, fullName: user.fullName, email: user.email, walletAddress: user.walletAddress, role: user.role, isVerified: user.isVerified });
