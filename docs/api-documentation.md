# API Documentation

Base URL: `http://localhost:4000/api`. JSON is used throughout. Protected routes require `Authorization: Bearer <JWT>`. Validation errors return `422`; authentication/authorization errors return `401`/`403`; conflicts return `409`; unexpected errors return a generic `500` body.

## Authentication

- `POST /auth/register` — `{fullName,email,voterId,password,walletAddress}`. Rate limited. Returns `201`; raw voter ID/password are never stored.
- `POST /auth/verify-otp` — `{email,code}`. Returns `{token,user}`.
- `POST /auth/login` — `{email,password}`. Returns `{token,user}`. Five failures cause a 15-minute lock.
- `GET /auth/me` — safe authenticated profile; sensitive hashes are excluded.

## Wallet proof

- `POST /wallet/challenge` — voter JWT; creates a five-minute, one-use message.
- `POST /wallet/verify` — `{challengeId,signature}`; recovered signer must equal the registered wallet.

## Elections

- `GET /elections` and `GET /elections/:onChainId` — public metadata.
- `GET /elections/:id/results` — public contract counts after publication.
- `GET /elections/stats` — admin overview.
- `POST /elections` — admin; sync confirmed contract creation.
- `POST /elections/:id/candidates` — admin; verify/sync candidate transaction.
- `POST /elections/:id/lifecycle` — admin; sync start/pause/end/publication.

## Voting

- `POST /votes/prepare` — voter; signed wallet challenge plus election/candidate; returns a commitment and ballot ID.
- `POST /votes/confirm` — `{ballotId,txHash}`; verifies receipt, contract, event, election, wallet, and commitment.
- `GET /votes/mine` — voter receipts.
- `GET /votes/:ballotId/reveal` — reveal package after election end only.
- `POST /votes/:ballotId/reveal` — records successful reveal.
- `GET /votes/verify/:txHash` — public transaction lookup.

Example receipt:

```json
{"receipt":{"electionId":1,"transactionHash":"0x...","blockNumber":42,"timestamp":"2026-11-19T12:00:00.000Z","walletAddress":"0x...","contractAddress":"0x...","status":"confirmed"}}
```

## Administration

- `GET /admin/voters` — directory without sensitive hashes.
- `GET /admin/transactions` — recent contract events.
- `GET /elections/audit` — privileged-action audit log.

Errors have shape `{"error":"Human-readable message"}`. Stack traces and secrets are never returned.
