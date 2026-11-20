# Secure Digital Voting System Using Blockchain

A working research prototype that combines identity verification in an Express/MongoDB service with wallet authorization and immutable voting on Ethereum. Personal data stays off-chain; the contract stores only election state, wallet eligibility, commitments, and aggregate counts.

## What is implemented

- Email OTP registration, SHA-256 voter-ID hashing, bcrypt passwords, short-lived JWTs, RBAC, rate limits, input validation, account lockout, and audit logs.
- One verified account per voter ID and wallet; signed wallet challenge before ballot preparation.
- Admin election/candidate/voter workflows and lifecycle control.
- Solidity access control, eligibility, time/status enforcement, and one vote per wallet per election.
- Commit/reveal ballot workflow. The cast transaction records a salted commitment; the reveal transaction tallies it after the election closes. Ballot metadata stored by the API is AES-256-GCM encrypted and cannot be returned before the election ends.
- Transaction receipts and public chain verification, with Sepolia/Etherscan links when configured.
- Responsive React dashboards, election views, vote flow, receipt, verification, results, security, audit and transaction pages.
- Contract, API, and component tests plus a gas/performance harness.

## Prerequisites

- Node.js 20+
- MongoDB 7+ (local or Atlas)
- MetaMask

For a zero-install demonstration, set `USE_IN_MEMORY_DB=true` in `.env`. The API starts an embedded MongoDB, seeds demo accounts automatically, and keeps development data under the ignored `server/data/` directory.

## Install and run locally

```bash
npm install
copy .env.example .env
npm run dev:chain
```

In a second terminal, deploy the contract:

```bash
npm run deploy:local
```

Copy the printed address into `VOTING_CONTRACT_ADDRESS` and `VITE_CONTRACT_ADDRESS` in the root `.env`, then:

```bash
npm run seed
npm run dev
```

Open `http://localhost:5173`. Import a Hardhat test account into MetaMask, add network `Hardhat Local SecureVote` with RPC `http://127.0.0.1:8545`, chain ID `31338`, currency `ETH`, and no explorer URL. Use the seeded admin credentials from `.env`. In development, if SMTP is not configured and `ALLOW_DEV_OTP=true`, the OTP is returned only in the registration API response and printed by the server.

The seed command creates the administrator and four verified demo voters, but intentionally leaves elections empty. Create elections through the admin dashboard so every MongoDB election has a matching on-chain ID.

## End-to-end demo

1. An admin creates an election, adds candidates and registers the voter's wallet on-chain.
2. The voter registers, verifies the OTP, signs in, and connects that exact MetaMask account.
3. The voter signs a one-time wallet challenge and submits a ballot commitment in MetaMask.
4. The receipt contains the transaction hash, block, contract, timestamp, and a secret recovery package. Keep it: the secret is required to reveal.
5. After the election ends, open the receipt and reveal the vote. Results are read from contract vote counts and can then be published.

The two-transaction commit/reveal design deliberately prevents a candidate choice from appearing in the initial vote transaction. As with any basic commit/reveal scheme, revealing can be correlated with a known commitment by a determined chain analyst; production privacy requires threshold encryption or zero-knowledge proofs (see `docs/security-analysis.md`).

## Commands

```bash
npm run build                 # production frontend build
npm test                      # contract, API and UI tests
npm run performance           # 10/50/100 wallet benchmark
npm run seed                  # demo users and off-chain election metadata
```

## Sepolia

Set `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY` (a funded deployer test key only), and optionally `ETHERSCAN_API_KEY`, then run `npm run deploy:sepolia -w blockchain`. Set both contract-address variables to the result and change the chain IDs to `11155111`. Never commit `.env` or a private key.

## Architecture and API

- [Architecture](docs/architecture.md)
- [API documentation](docs/api-documentation.md)
- [Security analysis](docs/security-analysis.md)
- [Research gap analysis](docs/gap-analysis.md)
- [Performance report](docs/performance-report.md)
- [Automated test results](docs/test-results.md)

## Important prototype boundaries

This is research software, not certified election infrastructure. Email OTP is not government identity proofing; public Ethereum metadata remains observable; availability depends on RPC and MongoDB; and key management, formal verification, independent audits, accessibility certification, coercion resistance, threshold trustees, ZK privacy, disaster recovery, and election-law compliance are required before any real election.
