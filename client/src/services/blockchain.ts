import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
export const ABI=[
 "function createElection(string,string,uint64,uint64) returns(uint256)","function electionCount() view returns(uint256)","function addCandidate(uint256,string,string,string,string) returns(uint256)","function registerEligibleVoter(uint256,address,bytes32)","function startElection(uint256)","function pauseElection(uint256)","function endElection(uint256)","function publishResults(uint256)","function castVote(uint256,bytes32)","function revealVote(uint256,uint256,bytes32,address)","function getElection(uint256) view returns((uint256 id,string title,string description,uint64 startTime,uint64 endTime,uint8 status,uint256 candidateCount,uint256 eligibleVoterCount,uint256 committedVoteCount,uint256 revealedVoteCount,bool resultsPublished,bool exists))","function getCandidate(uint256,uint256) view returns((uint256 id,string name,string party,string description,string photoUrl,uint256 voteCount,bool exists))"
];
export async function wallet(){
  if(!window.ethereum) throw new Error("MetaMask is required");
  let provider=new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts",[]);
  const expected=BigInt(import.meta.env.VITE_CHAIN_ID||31338);
  const chainId=`0x${expected.toString(16)}`;
  if((await provider.getNetwork()).chainId!==expected){
    try{
      await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId}]});
    }catch(error:any){
      if(error?.code!==4902) throw new Error("Approve the Hardhat Local network switch in MetaMask");
      await window.ethereum.request({method:"wallet_addEthereumChain",params:[{
        chainId,
        chainName:"Hardhat Local SecureVote",
        nativeCurrency:{name:"Test Ether",symbol:"ETH",decimals:18},
        rpcUrls:[import.meta.env.VITE_RPC_URL||"http://127.0.0.1:8545"]
      }]});
    }
    provider=new BrowserProvider(window.ethereum);
  }
  const signer=await provider.getSigner();
  const address=(await signer.getAddress()).toLowerCase();
  return{provider,signer,address};
}
export async function votingContract(){
  const w=await wallet();
  const address=import.meta.env.VITE_CONTRACT_ADDRESS;
  if(!address)throw new Error("VITE_CONTRACT_ADDRESS is not configured");
  const contract=new Contract(address,ABI,w.signer);
  // MetaMask can retain a stale nonce when the local Hardhat node is restarted.
  // On the local demo chain, advance Hardhat to MetaMask's cached nonce when
  // necessary. This keeps both transaction trackers in agreement and avoids
  // MetaMask showing a false failure for a transaction Hardhat already mined.
  const send=async(method:string,...args:any[])=>{
    const rpcUrl=import.meta.env.VITE_RPC_URL||"http://127.0.0.1:8545";
    const rpc=new JsonRpcProvider(rpcUrl);
    let nonce=await rpc.getTransactionCount(w.address,"pending");
    const isLocalDemo=(await rpc.getNetwork()).chainId===31338n && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(rpcUrl);
    if(isLocalDemo){
      const walletNonceHex=await w.provider.send("eth_getTransactionCount",[w.address,"pending"]);
      const walletNonce=Number(BigInt(walletNonceHex));
      if(walletNonce>nonce){
        await rpc.send("hardhat_setNonce",[w.address,`0x${walletNonce.toString(16)}`]);
        nonce=walletNonce;
      }
    }
    return contract.getFunction(method)(...args,{nonce});
  };
  return{...w,contract,send};
}

export function blockchainErrorMessage(error: unknown) {
  const value = error as any;
  const raw = String(
    value?.reason ||
    value?.shortMessage ||
    value?.info?.error?.message ||
    value?.message ||
    "Blockchain transaction failed"
  );

  if (/nonce too high|nonce too low|nonce has already been used/i.test(raw)) {
    return "Wallet transaction number was out of sync with the local blockchain. Refresh the page, reconnect MetaMask and try again.";
  }

  if (raw.includes("Admin only")) {
    return "Wrong administrator wallet. Select Hardhat Account #0 (0xf39F...92266) in MetaMask and reconnect it to this website.";
  }

  const knownReasons = [
    "Candidate list locked", "Election not active",
    "Outside schedule", "Voter not eligible", "Already voted",
    "Election not finished", "Commitment mismatch", "Pending reveals",
    "Admin cannot vote", "Need at least two candidates", "Cannot start",
    "Cannot end", "Election not ended", "Results not published"
  ];
  const reason = knownReasons.find((item) => raw.includes(item));
  if (reason) return reason;

  return raw.length > 220
    ? "Blockchain transaction failed. Confirm the selected wallet, local network and election schedule, then try again."
    : raw;
}
