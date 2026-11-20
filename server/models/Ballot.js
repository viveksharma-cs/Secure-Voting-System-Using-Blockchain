import mongoose from "mongoose";
const ballotSchema = new mongoose.Schema({
  voter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, select: false }, election: { type: mongoose.Schema.Types.ObjectId, ref: "Election", required: true },
  electionOnChainId: { type: Number, required: true }, walletAddress: { type: String, required: true, lowercase: true }, commitment: { type: String, required: true },
  encryptedPayload: { type: String, required: true, select: false }, txHash: { type: String, unique: true, sparse: true }, blockNumber: Number, blockTimestamp: Date,
  contractAddress: String, status: { type: String, enum: ["prepared", "confirmed", "revealed"], default: "prepared" }, revealTxHash: String
}, { timestamps: true });
ballotSchema.index({ voter: 1, election: 1 }, { unique: true });
ballotSchema.index({ walletAddress: 1, election: 1 }, { unique: true });
export const Ballot = mongoose.model("Ballot", ballotSchema);
