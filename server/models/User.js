import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  voterIdHash: { type: String, unique: true, sparse: true, select: false },
  passwordHash: { type: String, required: true, select: false },
  walletAddress: { type: String, unique: true, sparse: true, lowercase: true },
  role: { type: String, enum: ["voter", "admin"], default: "voter" },
  isVerified: { type: Boolean, default: false },
  failedLogins: { type: Number, default: 0, select: false },
  lockedUntil: { type: Date, select: false },
  lastLoginAt: Date
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
