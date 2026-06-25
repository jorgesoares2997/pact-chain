import {
  Contract,
  Networks,
  rpc as SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
  xdr,
  Operation,
  hash,
  StrKey,
} from "@stellar/stellar-sdk";
import type { ResolutionMode } from "@/types/pact";

export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
export const WASM_HASH = process.env.NEXT_PUBLIC_CONTRACT_WASM_HASH ?? "";

export const rpcServer = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

export async function buildAndSimulate(
  sourcePublicKey: string,
  operation: xdr.Operation
): Promise<string> {
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

export async function submitSigned(signedXdr: string) {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResult = await rpcServer.sendTransaction(tx);

  if (sendResult.status === "ERROR") {
    throw new Error(sendResult.errorResult?.toString() ?? "Transaction failed");
  }

  let getResult: SorobanRpc.Api.GetTransactionResponse | undefined;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    getResult = await rpcServer.getTransaction(sendResult.hash);
    if (
      getResult.status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND
    )
      break;
  }

  if (
    getResult?.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS
  ) {
    throw new Error("Transaction failed or timed out");
  }

  return getResult;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function addressVal(addr: string) {
  return new Address(addr).toScVal();
}

export function i128Val(n: bigint) {
  return nativeToScVal(n, { type: "i128" });
}

export interface DeployAndInitParams {
  creatorAddress: string;
  title: string;
  description: string;
  stakeAmountStroops: bigint;
  maxParticipants: number;
  deadlineUnix: number;
  resolutionMode: ResolutionMode;
  judge?: string;
  usdcToken: string;
  treasury: string;
  signTransaction: (xdr: string) => Promise<string>;
}

/** Derives the contract ID that Soroban will assign to a newly deployed instance. */
function deriveContractId(sourceAddress: string, salt: Buffer): string {
  const networkId = hash(Buffer.from(NETWORK_PASSPHRASE));
  const wasmHashBuf = Buffer.from(WASM_HASH, "hex");

  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId,
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
        new xdr.ContractIdPreimageFromAddress({
          address: xdr.ScAddress.scAddressTypeAccount(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (xdr as any).AccountId.publicKeyTypeEd25519(
              StrKey.decodeEd25519PublicKey(sourceAddress)
            )
          ),
          salt,
        })
      ),
    })
  );

  return StrKey.encodeContract(hash(preimage.toXDR()));
}

/**
 * Deploys a fresh contract instance from NEXT_PUBLIC_CONTRACT_WASM_HASH,
 * then calls `initialize` on it. Returns the new contract's Stellar address.
 */
export async function deployAndInitializePact(
  params: DeployAndInitParams
): Promise<string> {
  const {
    creatorAddress,
    title,
    description,
    stakeAmountStroops,
    maxParticipants,
    deadlineUnix,
    resolutionMode,
    judge,
    usdcToken,
    treasury,
    signTransaction,
  } = params;

  if (!WASM_HASH) throw new Error("NEXT_PUBLIC_CONTRACT_WASM_HASH is not set");

  const salt = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32))
  );

  // --- Step 1: deploy contract instance ---
  const deployOp = Operation.createCustomContract({
    address: new Address(creatorAddress),
    wasmHash: Buffer.from(WASM_HASH, "hex"),
    salt,
  });

  const deployXdr = await buildAndSimulate(creatorAddress, deployOp);
  const signedDeployXdr = await signTransaction(deployXdr);
  await submitSigned(signedDeployXdr);

  const contractId = deriveContractId(creatorAddress, salt);

  // --- Step 2: call initialize ---
  const resolutionModeScVal = (() => {
    switch (resolutionMode) {
      case "MAJORITY":
        return xdr.ScVal.scvVec([nativeToScVal("Majority", { type: "symbol" })]);
      case "JUDGE":
        return xdr.ScVal.scvVec([
          nativeToScVal("Judge", { type: "symbol" }),
          new Address(judge!).toScVal(),
        ]);
      case "UNANIMITY":
        return xdr.ScVal.scvVec([nativeToScVal("Unanimity", { type: "symbol" })]);
    }
  })();

  // Option<Address>: Some(addr) = raw address ScVal, None = Void
  const judgeScVal =
    resolutionMode === "JUDGE" && judge
      ? new Address(judge).toScVal()
      : xdr.ScVal.scvVoid();

  const contract = new Contract(contractId);
  const initOp = contract.call(
    "initialize",
    new Address(creatorAddress).toScVal(),
    nativeToScVal(title, { type: "string" }),
    nativeToScVal(description, { type: "string" }),
    i128Val(stakeAmountStroops),
    nativeToScVal(maxParticipants, { type: "u32" }),
    nativeToScVal(BigInt(deadlineUnix), { type: "u64" }),
    resolutionModeScVal,
    judgeScVal,
    new Address(usdcToken).toScVal(),
    new Address(treasury).toScVal()
  );

  const initXdr = await buildAndSimulate(creatorAddress, initOp);
  const signedInitXdr = await signTransaction(initXdr);
  await submitSigned(signedInitXdr);

  return contractId;
}

// ── Generic single-call helper ───────────────────────────────────────────────

async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  const contract = new Contract(contractId);
  const op = contract.call(method, ...args);
  const txXdr = await buildAndSimulate(callerAddress, op);
  const signedXdr = await signTransaction(txXdr);
  await submitSigned(signedXdr);
}

// ── Contract actions ─────────────────────────────────────────────────────────

/** participant calls join — transfers stake_amount USDC to contract */
export async function joinPact(
  contractId: string,
  participantAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(
    contractId,
    "join",
    [new Address(participantAddress).toScVal()],
    participantAddress,
    signTransaction
  );
}

/** creator locks the pact — requires ≥2 on-chain participants */
export async function lockPact(
  contractId: string,
  creatorAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(
    contractId,
    "lock",
    [new Address(creatorAddress).toScVal()],
    creatorAddress,
    signTransaction
  );
}

/** voter casts a vote for a candidate wallet */
export async function votePact(
  contractId: string,
  voterAddress: string,
  candidateAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(
    contractId,
    "vote",
    [new Address(voterAddress).toScVal(), new Address(candidateAddress).toScVal()],
    voterAddress,
    signTransaction
  );
}

/** judge picks the winner wallet (JUDGE mode only) */
export async function judgeResolvePact(
  contractId: string,
  judgeAddress: string,
  winnerAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(
    contractId,
    "judge_resolve",
    [new Address(judgeAddress).toScVal(), new Address(winnerAddress).toScVal()],
    judgeAddress,
    signTransaction
  );
}

/** anyone triggers resolution after deadline (MAJORITY / UNANIMITY) */
export async function resolvePact(
  contractId: string,
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(contractId, "resolve", [], callerAddress, signTransaction);
}

/** trigger refund — UNANIMITY mode after 48h timeout with no consensus */
export async function refundPact(
  contractId: string,
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(contractId, "refund", [], callerAddress, signTransaction);
}

export { Contract };
