const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function benchmark(size) {
  const [admin, ...signers] = await ethers.getSigners();
  const wallets = [...signers];
  while (wallets.length < size) wallets.push(ethers.Wallet.createRandom().connect(ethers.provider));
  for (const wallet of wallets.slice(signers.length)) await admin.sendTransaction({ to: wallet.address, value: ethers.parseEther("1") });
  const factory = await ethers.getContractFactory("VotingSystem");
  const deployStart = performance.now(); const contract = await factory.deploy();
  const deployment = await contract.deploymentTransaction().wait(); const deploymentMs = performance.now() - deployStart;
  const block = await ethers.provider.getBlock("latest"); const start = block.timestamp + 1000; const end = start + 3600;
  await contract.createElection(`Benchmark ${size}`, "Performance run", start, end);
  await contract.addCandidate(1, "A", "P1", "", ""); await contract.addCandidate(1, "B", "P2", "", "");
  for (let i = 0; i < size; i++) await contract.registerEligibleVoter(1, wallets[i].address, ethers.keccak256(ethers.toUtf8Bytes(`voter-${i}`)));
  await ethers.provider.send("evm_setNextBlockTimestamp", [start]); await ethers.provider.send("evm_mine"); await contract.startElection(1);
  let totalMs = 0, totalGas = 0n, successes = 0;
  for (let i = 0; i < size; i++) {
    const commitment = ethers.keccak256(ethers.toUtf8Bytes(`ballot-${size}-${i}`)); const began = performance.now();
    try { const receipt = await (await contract.connect(wallets[i]).castVote(1, commitment)).wait(); totalMs += performance.now() - began; totalGas += receipt.gasUsed; successes++; } catch {}
  }
  const readStart = performance.now(); await contract.hasVoted(1, wallets[0].address); const readMs = performance.now() - readStart;
  return { voters: size, averageVoteMs: +(totalMs / successes).toFixed(2), averageGas: Number(totalGas / BigInt(successes)), deploymentGas: Number(deployment.gasUsed), deploymentMs: +deploymentMs.toFixed(2), successRate: `${((successes / size) * 100).toFixed(1)}%`, verificationReadMs: +readMs.toFixed(2) };
}

async function main() {
  const rows = []; for (const size of [10, 50, 100]) rows.push(await benchmark(size));
  console.table(rows);
  const report = `# Performance Report\n\nGenerated ${new Date().toISOString()} on an in-process Hardhat network. Times include local transaction mining and are not public-network predictions.\n\n| Simulated voters | Avg cast time (ms) | Avg gas/vote | Deployment gas | Success | Verification read (ms) |\n|---:|---:|---:|---:|---:|---:|\n${rows.map(r => `| ${r.voters} | ${r.averageVoteMs} | ${r.averageGas} | ${r.deploymentGas} | ${r.successRate} | ${r.verificationReadMs} |`).join("\n")}\n\n## Frontend load measurement\n\nRun a production build, serve it, and use Lighthouse. Record LCP, INP, CLS, transferred bytes, and device/network profile; page-load numbers are environment-dependent and are intentionally not fabricated by this blockchain harness.\n`;
  fs.writeFileSync(path.join(__dirname, "../../docs/performance-report.md"), report);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
