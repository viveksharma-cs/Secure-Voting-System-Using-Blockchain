import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { env } from "../config/env.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const artifactPath = path.resolve(here, "../../blockchain/artifacts/contracts/VotingSystem.sol/VotingSystem.json");
const deploymentPath = path.resolve(here, "../../shared/deployment.json");
export function deployment() {
  const dep = fs.existsSync(deploymentPath) ? JSON.parse(fs.readFileSync(deploymentPath, "utf8")) : {};
  const abi = dep.abi || (fs.existsSync(artifactPath) ? JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi : []);
  return { address: env.contractAddress || dep.address, abi, chainId: env.chainId || dep.chainId };
}
export const provider = () => new ethers.JsonRpcProvider(env.rpcUrl);
export function contract() { const dep = deployment(); if (!dep.address || !dep.abi.length) throw Object.assign(new Error("Contract is not deployed or configured"), { status: 503 }); return new ethers.Contract(dep.address, dep.abi, provider()); }
export async function verifiedReceipt(txHash) { const receipt = await provider().getTransactionReceipt(txHash); if (!receipt || receipt.status !== 1) throw Object.assign(new Error("Successful transaction not found"), { status: 400 }); return receipt; }
