require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const sepolia = process.env.SEPOLIA_RPC_URL && process.env.SEPOLIA_PRIVATE_KEY
  ? { url: process.env.SEPOLIA_RPC_URL, accounts: [process.env.SEPOLIA_PRIVATE_KEY] }
  : { url: "http://127.0.0.1:8545", accounts: [] };

module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: { hardhat: { chainId: 31338 }, localhost: { url: "http://127.0.0.1:8545", chainId: 31338 }, sepolia },
  paths: { sources: "./contracts", tests: "./test", cache: "./cache", artifacts: "./artifacts" }
};
