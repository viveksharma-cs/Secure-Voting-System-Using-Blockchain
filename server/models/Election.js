import mongoose from "mongoose";
const candidateSchema = new mongoose.Schema({ chainId: Number, name: String, party: String, description: String, photoUrl: String }, { _id: false });
const electionSchema = new mongoose.Schema({
  onChainId: { type: Number, required: true, unique: true }, title: { type: String, required: true }, description: String,
  startTime: { type: Date, required: true }, endTime: { type: Date, required: true }, candidates: [candidateSchema],
  status: { type: String, enum: ["draft", "active", "paused", "ended"], default: "draft" },
  createTxHash: String, published: { type: Boolean, default: false }
}, { timestamps: true });
export const Election = mongoose.model("Election", electionSchema);
