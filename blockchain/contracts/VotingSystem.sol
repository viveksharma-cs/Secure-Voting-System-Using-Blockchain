// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VotingSystem {
    enum ElectionStatus { Draft, Active, Paused, Ended }

    struct Candidate {
        uint256 id;
        string name;
        string party;
        string description;
        string photoUrl;
        uint256 voteCount;
        bool exists;
    }

    struct Election {
        uint256 id;
        string title;
        string description;
        uint64 startTime;
        uint64 endTime;
        ElectionStatus status;
        uint256 candidateCount;
        uint256 eligibleVoterCount;
        uint256 committedVoteCount;
        uint256 revealedVoteCount;
        bool resultsPublished;
        bool exists;
    }

    address public immutable admin;
    uint256 public electionCount;
    mapping(uint256 => Election) private elections;
    mapping(uint256 => mapping(uint256 => Candidate)) private candidates;
    mapping(uint256 => mapping(address => bool)) public eligibleVoters;
    mapping(uint256 => mapping(address => bytes32)) public voterIdHashes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bytes32)) public ballotCommitments;
    mapping(uint256 => mapping(bytes32 => bool)) public commitmentRevealed;

    event ElectionCreated(uint256 indexed electionId, string title, uint64 startTime, uint64 endTime);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string name, string party);
    event CandidateUpdated(uint256 indexed electionId, uint256 indexed candidateId);
    event CandidateRemoved(uint256 indexed electionId, uint256 indexed candidateId);
    event VoterRegistered(uint256 indexed electionId, address indexed voter, bytes32 voterIdHash);
    event ElectionStarted(uint256 indexed electionId);
    event ElectionPaused(uint256 indexed electionId);
    event ElectionEnded(uint256 indexed electionId);
    event VoteCasted(uint256 indexed electionId, address indexed voter, bytes32 indexed commitment, uint256 timestamp);
    event VoteRevealed(uint256 indexed electionId, uint256 indexed candidateId, bytes32 indexed commitment);
    event ResultsPublished(uint256 indexed electionId);

    modifier onlyAdmin() { require(msg.sender == admin, "Admin only"); _; }
    modifier validElection(uint256 electionId) { require(elections[electionId].exists, "Election not found"); _; }

    constructor() { admin = msg.sender; }

    function createElection(string calldata title, string calldata description, uint64 startTime, uint64 endTime)
        external onlyAdmin returns (uint256 electionId)
    {
        require(bytes(title).length > 0, "Title required");
        require(startTime < endTime, "Invalid schedule");
        electionId = ++electionCount;
        elections[electionId] = Election(electionId, title, description, startTime, endTime, ElectionStatus.Draft, 0, 0, 0, 0, false, true);
        emit ElectionCreated(electionId, title, startTime, endTime);
    }

    function addCandidate(uint256 electionId, string calldata name, string calldata party, string calldata description, string calldata photoUrl)
        external onlyAdmin validElection(electionId) returns (uint256 candidateId)
    {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Draft && block.timestamp < election.startTime, "Candidate list locked");
        require(bytes(name).length > 0, "Name required");
        candidateId = ++election.candidateCount;
        candidates[electionId][candidateId] = Candidate(candidateId, name, party, description, photoUrl, 0, true);
        emit CandidateAdded(electionId, candidateId, name, party);
    }

    function updateCandidate(uint256 electionId, uint256 candidateId, string calldata name, string calldata party, string calldata description, string calldata photoUrl)
        external onlyAdmin validElection(electionId)
    {
        Election storage election = elections[electionId];
        Candidate storage candidate = candidates[electionId][candidateId];
        require(election.status == ElectionStatus.Draft && block.timestamp < election.startTime, "Candidate list locked");
        require(candidate.exists && bytes(name).length > 0, "Invalid candidate");
        candidate.name = name; candidate.party = party; candidate.description = description; candidate.photoUrl = photoUrl;
        emit CandidateUpdated(electionId, candidateId);
    }

    function removeCandidate(uint256 electionId, uint256 candidateId) external onlyAdmin validElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Draft && block.timestamp < election.startTime, "Candidate list locked");
        require(candidates[electionId][candidateId].exists, "Invalid candidate");
        candidates[electionId][candidateId].exists = false;
        emit CandidateRemoved(electionId, candidateId);
    }

    function registerEligibleVoter(uint256 electionId, address voter, bytes32 voterIdHash) external onlyAdmin validElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Draft || election.status == ElectionStatus.Paused, "Registration closed");
        require(voter != address(0) && !eligibleVoters[electionId][voter], "Invalid or duplicate voter");
        eligibleVoters[electionId][voter] = true;
        voterIdHashes[electionId][voter] = voterIdHash;
        election.eligibleVoterCount++;
        emit VoterRegistered(electionId, voter, voterIdHash);
    }

    function startElection(uint256 electionId) external onlyAdmin validElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Draft || election.status == ElectionStatus.Paused, "Cannot start");
        require(block.timestamp >= election.startTime && block.timestamp < election.endTime, "Outside schedule");
        require(election.candidateCount >= 2, "Need at least two candidates");
        election.status = ElectionStatus.Active;
        emit ElectionStarted(electionId);
    }

    function pauseElection(uint256 electionId) external onlyAdmin validElection(electionId) {
        require(elections[electionId].status == ElectionStatus.Active, "Not active");
        elections[electionId].status = ElectionStatus.Paused;
        emit ElectionPaused(electionId);
    }

    function endElection(uint256 electionId) external onlyAdmin validElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active || election.status == ElectionStatus.Paused, "Cannot end");
        require(block.timestamp >= election.endTime, "Election not finished");
        election.status = ElectionStatus.Ended;
        emit ElectionEnded(electionId);
    }

    function castVote(uint256 electionId, bytes32 commitment) external validElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Active, "Election not active");
        require(block.timestamp >= election.startTime && block.timestamp < election.endTime, "Outside schedule");
        require(eligibleVoters[electionId][msg.sender], "Voter not eligible");
        require(msg.sender != admin, "Admin cannot vote");
        require(!hasVoted[electionId][msg.sender], "Already voted");
        require(commitment != bytes32(0), "Invalid commitment");
        hasVoted[electionId][msg.sender] = true;
        ballotCommitments[electionId][msg.sender] = commitment;
        election.committedVoteCount++;
        emit VoteCasted(electionId, msg.sender, commitment, block.timestamp);
    }

    function revealVote(uint256 electionId, uint256 candidateId, bytes32 salt, address voter) external validElection(electionId) {
        Election storage election = elections[electionId];
        Candidate storage candidate = candidates[electionId][candidateId];
        require(election.status == ElectionStatus.Ended, "Election not ended");
        require(candidate.exists, "Invalid candidate");
        require(hasVoted[electionId][voter], "No committed vote");
        bytes32 commitment = keccak256(abi.encodePacked(electionId, candidateId, salt));
        require(commitment == ballotCommitments[electionId][voter], "Commitment mismatch");
        require(!commitmentRevealed[electionId][commitment], "Already revealed");
        commitmentRevealed[electionId][commitment] = true;
        candidate.voteCount++;
        election.revealedVoteCount++;
        emit VoteRevealed(electionId, candidateId, commitment);
    }

    function publishResults(uint256 electionId) external onlyAdmin validElection(electionId) {
        Election storage election = elections[electionId];
        require(election.status == ElectionStatus.Ended, "Election not ended");
        require(election.revealedVoteCount == election.committedVoteCount, "Pending reveals");
        election.resultsPublished = true;
        emit ResultsPublished(electionId);
    }

    function getElection(uint256 electionId) external view validElection(electionId) returns (Election memory) { return elections[electionId]; }
    function getCandidate(uint256 electionId, uint256 candidateId) external view validElection(electionId) returns (Candidate memory) { return candidates[electionId][candidateId]; }
    function getCandidateVoteCount(uint256 electionId, uint256 candidateId) external view returns (uint256) { return candidates[electionId][candidateId].voteCount; }
    function getElectionResult(uint256 electionId) external view validElection(electionId) returns (Candidate[] memory result) {
        Election storage election = elections[electionId];
        require(election.resultsPublished, "Results not published");
        result = new Candidate[](election.candidateCount);
        for (uint256 i = 1; i <= election.candidateCount; i++) result[i - 1] = candidates[electionId][i];
    }
}
