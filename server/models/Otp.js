import mongoose from "mongoose";
const otpSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, codeHash: { type: String, required: true }, expiresAt: { type: Date, required: true, expires: 0 }, attempts: { type: Number, default: 0 } }, { timestamps: true });
export const Otp = mongoose.model("Otp", otpSchema);
