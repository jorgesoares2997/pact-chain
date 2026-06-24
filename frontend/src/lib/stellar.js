import {
  Contract,
  Networks,
  rpc as SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
  xdr,
} from "@stellar/stellar-sdk";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "";

export const rpcServer = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

export async function buildAndSimulate(sourcePublicKey, operation) {
  const account = await rpcServer.getAccount(sourcePublicKey);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await rpcServer.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(simResult.error);
  }

  return SorobanRpc.assembleTransaction(tx, simResult).build().toXDR();
}

export async function submitSigned(signedXdr) {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResult = await rpcServer.sendTransaction(tx);

  if (sendResult.status === "ERROR") {
    throw new Error(sendResult.errorResult?.toString() || "Transaction failed");
  }

  let getResult;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    getResult = await rpcServer.getTransaction(sendResult.hash);
    if (getResult.status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) break;
  }

  if (getResult?.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error("Transaction failed or timed out");
  }

  return getResult;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function addressVal(addr) {
  return new Address(addr).toScVal();
}

export function u64Val(n) {
  return xdr.ScVal.scvU64(xdr.Uint64.fromString(String(n)));
}

export function i128Val(n) {
  const big = BigInt(n);
  return nativeToScVal(big, { type: "i128" });
}
