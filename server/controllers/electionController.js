import { Election } from "../models/Election.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { contract, verifiedReceipt } from "../utils/blockchain.js";

export async function list(req, res) {
  // Recover the MongoDB display mirror from the active contract. This also
  // repairs successful on-chain creates whose follow-up API request failed.
  try { await syncChainElections(); } catch {}
  const elections = await Election.find().sort({ startTime: -1 });
  res.json({ elections });
}
export async function getOne(req, res) { const election = await Election.findOne({ onChainId: Number(req.params.id) }); if (!election) throw Object.assign(new Error("Election not found"), { status: 404 }); res.json({ election }); }
export async function create(req, res) {
  await verifiedReceipt(req.body.txHash);
  const chain = contract();
  const onChain = await chain.getElection(req.body.onChainId);
  if (onChain.title !== req.body.title) {
    throw Object.assign(new Error("On-chain election does not match"), { status: 400 });
  }

  // A local Hardhat restart resets on-chain IDs, while the embedded database
  // can intentionally persist. Upsert the authoritative freshly deployed
  // election so an old record with the same ID cannot produce a duplicate-key
  // 500 after a successful blockchain transaction.
  const election = await Election.findOneAndUpdate(
    { onChainId: req.body.onChainId },
    {
      $set: {
        title: req.body.title,
        description: req.body.description,
        startTime: new Date(Number(onChain.startTime) * 1000),
        endTime: new Date(Number(onChain.endTime) * 1000),
        candidates: [],
        status: "draft",
        createTxHash: req.body.txHash,
        published: false
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await audit(req, "ELECTION_CREATED", String(election.onChainId), { txHash: req.body.txHash });
  res.status(201).json({ election });
}
export async function addCandidate(req, res) { await verifiedReceipt(req.body.txHash); const election = await Election.findOne({ onChainId: Number(req.params.id) }); if (!election) throw Object.assign(new Error("Election not found"), { status: 404 }); const c = await contract().getCandidate(election.onChainId, req.body.chainId); election.candidates.push({ chainId: Number(c.id), name: c.name, party: c.party, description: c.description, photoUrl: c.photoUrl }); await election.save(); await audit(req, "CANDIDATE_ADDED", `${election.onChainId}:${c.id}`, { txHash: req.body.txHash }); res.status(201).json({ election }); }
export async function syncStatus(req, res) { await verifiedReceipt(req.body.txHash); const election = await Election.findOne({ onChainId: Number(req.params.id) }); if (!election) throw Object.assign(new Error("Election not found"), { status: 404 }); await audit(req, `ELECTION_${req.body.action.toUpperCase()}`, String(election.onChainId), { txHash: req.body.txHash }); res.json({ election, chain: serializeElection(await contract().getElection(election.onChainId)) }); }
export async function stats(_req, res) { const [totalElections, totalVoters] = await Promise.all([Election.countDocuments(), User.countDocuments({ role: "voter", isVerified: true })]); const items = await Election.find(); let active = 0, totalVotes = 0; const chain = contract(); for (const e of items) { try { const x = await chain.getElection(e.onChainId); if (Number(x.status) === 1) active++; totalVotes += Number(x.committedVoteCount); } catch {} } res.json({ totalElections, totalVoters, activeElections: active, totalVotes }); }
export async function results(req, res) { const election = await Election.findOne({ onChainId: Number(req.params.id) }); if (!election) throw Object.assign(new Error("Election not found"), { status: 404 }); const chain = contract(); const state = await chain.getElection(election.onChainId); if (!state.resultsPublished) throw Object.assign(new Error("Results are not published"), { status: 403 }); const rows = await chain.getElectionResult(election.onChainId); const total = rows.reduce((sum, x) => sum + Number(x.voteCount), 0); res.json({ election: election.title, totalVotes: total, totalEligible: Number(state.eligibleVoterCount), candidates: rows.filter(x => x.exists).map(x => ({ id: Number(x.id), name: x.name, party: x.party, votes: Number(x.voteCount), percentage: total ? +(Number(x.voteCount) * 100 / total).toFixed(2) : 0 })) }); }
export async function auditLogs(_req, res) { res.json({ logs: await AuditLog.find().populate("actor", "fullName email").sort({ createdAt: -1 }).limit(200) }); }
async function audit(req, action, target, metadata) { await AuditLog.create({ actor: req.user._id, action, target, metadata, ip: req.ip }); }
const serializeElection = x => ({ id: Number(x.id), title: x.title, status: Number(x.status), candidateCount: Number(x.candidateCount), eligibleVoterCount: Number(x.eligibleVoterCount), committedVoteCount: Number(x.committedVoteCount), revealedVoteCount: Number(x.revealedVoteCount), resultsPublished: x.resultsPublished });

async function syncChainElections() {
  const chain = contract();
  const count = Number(await chain.electionCount());
  const statuses = ["draft", "active", "paused", "ended"];
  for (let electionId = 1; electionId <= count; electionId++) {
    const state = await chain.getElection(electionId);
    const candidates = [];
    for (let candidateId = 1; candidateId <= Number(state.candidateCount); candidateId++) {
      const candidate = await chain.getCandidate(electionId, candidateId);
      if (candidate.exists) {
        candidates.push({
          chainId: Number(candidate.id),
          name: candidate.name,
          party: candidate.party,
          description: candidate.description,
          photoUrl: candidate.photoUrl
        });
      }
    }
    await Election.findOneAndUpdate(
      { onChainId: electionId },
      {
        $set: {
          title: state.title,
          description: state.description,
          startTime: new Date(Number(state.startTime) * 1000),
          endTime: new Date(Number(state.endTime) * 1000),
          candidates,
          status: statuses[Number(state.status)] || "draft",
          published: Boolean(state.resultsPublished)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
