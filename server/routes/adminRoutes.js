import { Router } from "express";
import { User } from "../models/User.js";
import { Ballot } from "../models/Ballot.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { contract, deployment, provider, verifiedReceipt } from "../utils/blockchain.js";
import { decryptBallot } from "../utils/security.js";
const router = Router(); router.use(authenticate, authorize("admin"));
router.get("/voters", async (_req, res) => res.json({ voters: await User.find({ role: "voter" }).select("fullName email walletAddress isVerified createdAt").sort({ createdAt: -1 }) }));
router.get("/voters/:id/eligibility-payload", async (req, res) => { const voter = await User.findById(req.params.id).select("+voterIdHash"); if (!voter || voter.role !== "voter" || !voter.isVerified) return res.status(404).json({ error: "Verified voter not found" }); res.json({ walletAddress: voter.walletAddress, voterIdHash: `0x${voter.voterIdHash}` }); });
router.get("/transactions", async (_req, res) => { const dep = deployment(); const current = await provider().getBlockNumber(); const logs = await contract().queryFilter("*", Math.max(0, current - 10_000), current); res.json({ transactions: logs.reverse().map(x => ({ event: x.fragment?.name || "ContractEvent", transactionHash: x.transactionHash, blockNumber: x.blockNumber, contractAddress: dep.address })) }); });
router.get("/elections/:id/pending-reveals", async (req, res) => {
  const electionId = Number(req.params.id);
  const chain = contract();
  const state = await chain.getElection(electionId);
  if (Number(state.status) !== 3) return res.status(400).json({ error: "Election must be ended before ballots can be revealed" });
  const ballots = await Ballot.find({ electionOnChainId: electionId, status: "confirmed" }).select("+encryptedPayload");
  const pending = [];
  for (const ballot of ballots) {
    if (await chain.commitmentRevealed(electionId, ballot.commitment)) continue;
    const payload = decryptBallot(ballot.encryptedPayload);
    pending.push({ ballotId: ballot.id, candidateId: payload.candidateId, salt: payload.salt, voter: ballot.walletAddress });
  }
  res.json({ pending });
});
router.post("/ballots/:id/confirm-reveal", async (req, res) => {
  const ballot = await Ballot.findById(req.params.id).select("+encryptedPayload");
  if (!ballot) return res.status(404).json({ error: "Ballot not found" });
  const receipt = await verifiedReceipt(req.body.txHash);
  const payload = decryptBallot(ballot.encryptedPayload);
  let matched = false;
  for (const log of receipt.logs) {
    try {
      const parsed = contract().interface.parseLog(log);
      if (parsed?.name === "VoteRevealed" && Number(parsed.args.electionId) === ballot.electionOnChainId && Number(parsed.args.candidateId) === payload.candidateId && parsed.args.commitment === ballot.commitment) matched = true;
    } catch {}
  }
  if (!matched) return res.status(400).json({ error: "Transaction does not reveal this ballot" });
  ballot.status = "revealed";
  ballot.revealTxHash = receipt.hash;
  await ballot.save();
  res.json({ revealed: true });
});
export default router;
