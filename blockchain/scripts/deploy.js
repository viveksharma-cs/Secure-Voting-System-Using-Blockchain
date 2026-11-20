const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  const contract = await VotingSystem.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const artifact = await hre.artifacts.readArtifact("VotingSystem");
  const deployment = { address, chainId: Number((await hre.ethers.provider.getNetwork()).chainId), abi: artifact.abi };
  fs.mkdirSync(path.join(__dirname, "../../shared"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "../../shared/deployment.json"), JSON.stringify(deployment, null, 2));
  console.log(`VotingSystem deployed to ${address}`);
  console.log("Deployment metadata written to shared/deployment.json");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
