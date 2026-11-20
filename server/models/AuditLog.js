import mongoose from "mongoose";
const schema = new mongoose.Schema({ actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, action: { type: String, required: true }, target: String, ip: String, metadata: mongoose.Schema.Types.Mixed }, { timestamps: true });
export const AuditLog = mongoose.model("AuditLog", schema);
