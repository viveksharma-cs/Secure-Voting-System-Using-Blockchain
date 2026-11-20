# Research Gap Analysis

| Research gap | Prototype response |
|---|---|
| Weak authentication / fake voters | Email OTP, hashed voter ID uniqueness, bcrypt credentials, wallet ownership signatures, and admin-controlled on-chain eligibility. |
| Duplicate voting / manipulation | One database account per ID/wallet plus Solidity `hasVoted`; immutable receipts and no vote mutation function. |
| Sensitive data on-chain | Personal information remains in MongoDB; the chain receives wallets, hashes, and ballot commitments only. |
| Poor end-to-end verification | Every ballot yields a receipt; public transaction lookup queries the configured chain; API confirmation matches the exact event. |
| Centralized counting | Final candidate totals are read from contract state and cannot be edited in the admin UI/API. |
| Cost and usability | One compact commitment write, optimized contract bytecode, responsive guided UI, clear MetaMask states, and local Hardhat defaults. |
| Limited implementation evidence | Executable frontend/API/contract, automated unit/integration tests, benchmark harness, audit logging, and documented limits. |

The prototype improves these gaps but does not claim production-grade anonymous or coercion-resistant voting. The commit/reveal correlation and server-side encryption-key limitation are explicit research opportunities for threshold encryption and zero-knowledge proofs.
