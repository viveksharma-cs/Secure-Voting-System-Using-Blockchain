const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VotingSystem", function () {
  let voting, admin, voter, other, start, end;
  const idHash = ethers.sha256(ethers.toUtf8Bytes("VOTER-001"));

  beforeEach(async () => {
    [admin, voter, other] = await ethers.getSigners();
    voting = await (await ethers.getContractFactory("VotingSystem")).deploy();
    await voting.waitForDeployment();
    const now = await time.latest(); start = now + 60; end = start + 600;
    await voting.createElection("Council Election", "Annual vote", start, end);
    await voting.addCandidate(1, "Aarav", "Innovation", "", "");
    await voting.addCandidate(1, "Priya", "Unity", "", "");
  });

  it("deploys with protected admin authority", async () => {
    expect(await voting.admin()).to.equal(admin.address);
    await expect(voting.connect(voter).createElection("x", "", start, end)).to.be.revertedWith("Admin only");
  });

  it("creates elections and candidates and emits events", async () => {
    const election = await voting.getElection(1);
    expect(election.title).to.equal("Council Election");
    expect(election.candidateCount).to.equal(2);
    await expect(voting.addCandidate(1, "Rahul", "Progress", "", "")).to.emit(voting, "CandidateAdded");
  });

  it("registers voters and rejects duplicates", async () => {
    await expect(voting.registerEligibleVoter(1, voter.address, idHash)).to.emit(voting, "VoterRegistered");
    await expect(voting.registerEligibleVoter(1, voter.address, idHash)).to.be.revertedWith("Invalid or duplicate voter");
  });

  it("enforces start, eligibility, candidates and duplicate voting", async () => {
    await voting.registerEligibleVoter(1, voter.address, idHash);
    const salt = ethers.randomBytes(32);
    const commitment = ethers.solidityPackedKeccak256(["uint256", "uint256", "bytes32"], [1, 1, salt]);
    await expect(voting.startElection(1)).to.be.revertedWith("Outside schedule");
    await expect(voting.connect(voter).castVote(1, commitment)).to.be.revertedWith("Election not active");
    await time.increaseTo(start);
    await voting.startElection(1);
    await expect(voting.connect(other).castVote(1, commitment)).to.be.revertedWith("Voter not eligible");
    await expect(voting.connect(voter).castVote(1, commitment)).to.emit(voting, "VoteCasted");
    await expect(voting.connect(voter).castVote(1, commitment)).to.be.revertedWith("Already voted");
  });

  it("prevents voting after the end and validates election ending", async () => {
    await voting.registerEligibleVoter(1, voter.address, idHash);
    await time.increaseTo(start); await voting.startElection(1);
    await expect(voting.endElection(1)).to.be.revertedWith("Election not finished");
    await time.increaseTo(end);
    const commitment = ethers.keccak256(ethers.randomBytes(32));
    await expect(voting.connect(voter).castVote(1, commitment)).to.be.revertedWith("Outside schedule");
    await expect(voting.endElection(1)).to.emit(voting, "ElectionEnded");
  });

  it("reveals valid candidates, rejects invalid ballots, and calculates final results", async () => {
    await voting.registerEligibleVoter(1, voter.address, idHash);
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const commitment = ethers.solidityPackedKeccak256(["uint256", "uint256", "bytes32"], [1, 1, salt]);
    await time.increaseTo(start); await voting.startElection(1);
    await voting.connect(voter).castVote(1, commitment);
    await time.increaseTo(end); await voting.endElection(1);
    await expect(voting.revealVote(1, 99, salt, voter.address)).to.be.revertedWith("Invalid candidate");
    await expect(voting.revealVote(1, 2, salt, voter.address)).to.be.revertedWith("Commitment mismatch");
    await expect(voting.revealVote(1, 1, salt, voter.address)).to.emit(voting, "VoteRevealed");
    expect(await voting.getCandidateVoteCount(1, 1)).to.equal(1);
    await voting.publishResults(1);
    const results = await voting.getElectionResult(1);
    expect(results[0].voteCount).to.equal(1);
  });
});
