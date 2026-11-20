import mongoose from "mongoose";
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, nonce: { type: String, required: true }, message: { type: String, required: true }, expiresAt: { type: Date, required: true, expires: 0 }, used: { type: Boolean, default: false } }, { timestamps: true });
export const WalletChallenge = mongoose.model("WalletChallenge", schema);
