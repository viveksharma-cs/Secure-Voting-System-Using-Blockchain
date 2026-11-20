# Performance Report

Generated 2026-11-19T16:15:24.345Z on an in-process Hardhat network. Times include local transaction mining and are not public-network predictions.

| Simulated voters | Avg cast time (ms) | Avg gas/vote | Deployment gas | Success | Verification read (ms) |
|---:|---:|---:|---:|---:|---:|
| 10 | 2.11 | 82992 | 2695821 | 100.0% | 3.91 |
| 50 | 6.69 | 81623 | 2695821 | 100.0% | 0.81 |
| 100 | 9.98 | 81451 | 2695821 | 100.0% | 1.16 |

## Frontend load measurement

Run a production build, serve it, and use Lighthouse. Record LCP, INP, CLS, transferred bytes, and device/network profile; page-load numbers are environment-dependent and are intentionally not fabricated by this blockchain harness.
