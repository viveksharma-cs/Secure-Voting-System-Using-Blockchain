# Security Analysis

## Controls implemented

- Fake/duplicate registration: unique normalized email, SHA-256 voter-ID hash, and wallet; email OTP activation; wallet signature challenges.
- Credential abuse: bcrypt cost 12, generic login errors, five-attempt 15-minute lockout, short JWT expiry, and API rate limits.
- Authorization: server RBAC and Solidity `onlyAdmin`; the admin account is explicitly forbidden from casting.
- Input and web attacks: Zod allow-list validation, Helmet CSP/security headers, Mongo operator sanitization, strict JSON limits, origin-restricted CORS, bearer tokens rather than ambient cookies, and React output escaping.
- Ballot manipulation: contract eligibility, active schedule, valid commitment, and `hasVoted` checks; no update/delete vote operation exists.
- Receipt spoofing: the API fetches the successful chain receipt, checks the contract address, parses `VoteCasted`, and matches election, wallet, and commitment.
- Result manipulation: candidate counts exist in contract state and are returned only after `resultsPublished`.
- Privileged accountability: election/candidate/lifecycle API operations create audit entries.

## Privacy model

The first vote transaction contains a salted commitment, not a candidate identifier. The API stores candidate/salt recovery data under AES-256-GCM and refuses to return it before the recorded election end. Public contract storage contains neither voter names nor contact data.

## Prototype limitations and residual threats

- Email OTP and a voter-ID string are not authoritative civil identity proofing.
- Wallet addresses, timing, IP logs, and commitment/reveal relationships are metadata. A basic commitment scheme does not provide coercion resistance or unlinkability against a global observer.
- The API process possesses the ballot encryption key and temporarily sees the selected candidate during preparation. A production design needs threshold public-key encryption/HSM trustees or a zero-knowledge tally so no single operator can decrypt.
- Voters who lose recovery data or do not reveal can delay publication. A production threshold-encrypted tally avoids this liveness issue.
- No contract audit, formal verification, key ceremony, multisig/timelock governance, independent penetration test, DDoS protection, disaster recovery, or election-law certification has been completed.
- SHA-256 protects a high-entropy voter identifier but cannot safely anonymize low-entropy identifiers without a server-held pepper. Production should use a keyed hash.
- Sepolia is suitable only for testing. Public-chain fees, congestion, reorgs, and RPC availability must be handled operationally.

## Recommended production evolution

Use government-approved identity proofing, WebAuthn/MFA, HSM-managed keys, a trustee threshold-encryption or ZK voting protocol, relayers for metadata protection, multisig governance, formal verification, independent audits, monitored redundant RPCs, encrypted backups, privacy-preserving observability, and documented incident/key-recovery ceremonies.
