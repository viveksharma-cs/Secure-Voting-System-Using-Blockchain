export type User={id:string;fullName:string;email:string;walletAddress?:string;role:"voter"|"admin"};
export type Candidate={chainId:number;name:string;party:string;description?:string;photoUrl?:string};
export type Election={_id:string;onChainId:number;title:string;description:string;startTime:string;endTime:string;candidates:Candidate[];status?:"draft"|"active"|"paused"|"ended";published?:boolean};
export type Receipt={id:string;election?:Election|{title:string;endTime:string};electionId:number;walletAddress:string;commitment:string;transactionHash:string;blockNumber:number;timestamp:string;contractAddress:string;status:string;revealTransactionHash?:string};
declare global { interface Window { ethereum?: { request(args:{method:string;params?:unknown[]}):Promise<unknown> } } }
