import crypto from "node:crypto";
import { ethers } from "ethers";
import { WalletChallenge } from "../models/WalletChallenge.js";

export async function challenge(req, res) {
  const nonce = crypto.randomBytes(24).toString("hex");
  const message = `SecureVote wallet verification\nAccount: ${req.user.walletAddress}\nNonce: ${nonce}\nExpires: ${new Date(Date.now() + 5 * 60_000).toISOString()}`;
  const item = await WalletChallenge.create({ user: req.user._id, nonce, message, expiresAt: new Date(Date.now() + 5 * 60_000) });
  res.json({ challengeId: item.id, message });
}
export async function verify(req, res) {
  const item = await WalletChallenge.findOne({ _id: req.body.challengeId, user: req.user._id, used: false });
  if (!item || item.expiresAt < new Date()) throw Object.assign(new Error("Challenge expired"), { status: 400 });
  let recovered; try { recovered = ethers.verifyMessage(item.message, req.body.signature); } catch { throw Object.assign(new Error("Invalid signature"), { status: 400 }); }
  if (recovered.toLowerCase() !== req.user.walletAddress.toLowerCase()) throw Object.assign(new Error("Signature does not match registered wallet"), { status: 403 });
  item.used = true; await item.save(); res.json({ verified: true });
}
