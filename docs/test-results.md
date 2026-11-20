# Automated Test Results

Verified on 19 November 2026 with Node.js 22.23.4.

## Smart contract — Hardhat / Chai

Command: `npm run test -w blockchain`

Result: **6 passing**.

- Deployment and administrator authorization
- Election/candidate creation and events
- Eligible-voter registration and duplicate rejection
- Schedule, eligibility, and duplicate-vote enforcement
- Voting-after-end and early-ending rejection
- Commitment validation, reveal event, tally, and final result retrieval

## Backend — Vitest / Supertest / temporary MongoDB

Command: `npm run test -w server`

Result: **4 passing**.

- Registration, voter-ID hashing, and duplicate prevention
- OTP activation and login
- JWT and role-based authorization
- One-use wallet challenge and cryptographic signature recovery

## Frontend — Vitest / Testing Library

Command: `npm run test -w client`

Result: **1 passing** for the public entry experience and registration route.

## Production build

Command: `npm run build`

Result: **successful**. Vite emitted the production application in `client/dist`. The main bundle is approximately 543 kB minified (187 kB gzip); route-level code splitting is a recommended optimization, not a build failure.

## Full suite

`npm test` completed successfully with **11 tests passing and zero failures**.
