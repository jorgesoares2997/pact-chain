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
    throw new Error(sendResult.errorResultXdr || JSON.stringify(sendResult, null, 2));
  }

  let getResult: SorobanRpc.Api.GetTransactionResponse | undefined;
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function addressVal(addr: string) {
  return new Address(addr).toScVal();
}

export function i128Val(n: bigint) {
  return nativeToScVal(n, { type: "i128" });
}

export function u32Val(n: number) {
  return nativeToScVal(n, { type: "u32" });
}

export interface DeployAndInitParams {
  creatorAddress: string;
  stakeAmountStroops: bigint;
  maxParticipants: number;
  deadlineUnix: number;
  resolutionMode: ResolutionMode;
  judge?: string;
  optionsCount: number;      // number of vote options (2 = Yes/No)
  usdcToken: string;
  treasury: string;
  signTransaction: (xdr: string) => Promise<string>;
}

/** Derives the contract ID Soroban assigns to a newly deployed instance. */
function deriveContractId(sourceAddress: string, salt: Buffer): string {
  const networkId = hash(Buffer.from(NETWORK_PASSPHRASE));

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
 * Deploys a new pact contract from WASM_HASH, then calls initialize.
 * The creator is auto-joined (stakes USDC) inside initialize.
 * Returns the new contract's Stellar address.
 */
export async function deployAndInitializePact(
  params: DeployAndInitParams
): Promise<string> {
  const {
    creatorAddress,
    stakeAmountStroops,
    maxParticipants,
    deadlineUnix,
    resolutionMode,
    judge,
    optionsCount,
    usdcToken,
    treasury,
    signTransaction,
  } = params;

  if (!WASM_HASH) throw new Error("NEXT_PUBLIC_CONTRACT_WASM_HASH is not set");

  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));

  // Step 1: deploy contract instance
  const deployOp = Operation.createCustomContract({
    address: new Address(creatorAddress),
    wasmHash: Buffer.from(WASM_HASH, "hex"),
    salt,
  });

  const deployXdr = await buildAndSimulate(creatorAddress, deployOp);
  const signedDeployXdr = await signTransaction(deployXdr);
  await submitSigned(signedDeployXdr);

  const contractId = deriveContractId(creatorAddress, salt);

  // Step 2: call initialize (creator auto-joined inside the contract)
  const judgeScVal =
    resolutionMode === "JUDGE" && judge
      ? new Address(judge).toScVal()
      : xdr.ScVal.scvVoid();

  const resolutionModeScVal = xdr.ScVal.scvVec([
    nativeToScVal(
      resolutionMode === "MAJORITY" ? "Majority"
        : resolutionMode === "JUDGE" ? "Judge"
        : "Unanimity",
      { type: "symbol" }
    ),
  ]);

  const contract = new Contract(contractId);
  const initOp = contract.call(
    "initialize",
    new Address(creatorAddress).toScVal(),  // creator
    i128Val(stakeAmountStroops),             // stake_amount
    u32Val(maxParticipants),                 // max_participants
    nativeToScVal(BigInt(deadlineUnix), { type: "u64" }), // deadline
    resolutionModeScVal,                     // resolution_mode
    judgeScVal,                              // judge (Option<Address>)
    u32Val(optionsCount),                    // options_count
    new Address(usdcToken).toScVal(),        // usdc_token
    new Address(treasury).toScVal()          // treasury
  );

  const initXdr = await buildAndSimulate(creatorAddress, initOp);
  const signedInitXdr = await signTransaction(initXdr);
  await submitSigned(signedInitXdr);

  return contractId;
}

// ── Generic invoke helper ────────────────────────────────────────────────────

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

/** Join a pact — stakes USDC on-chain. Creator is auto-joined at deploy. */
export async function joinPact(
  contractId: string,
  participantAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(
    contractId, "join",
    [new Address(participantAddress).toScVal()],
    participantAddress, signTransaction
  );
}

/**
 * Vote on an option index: 0 = first option (Yes), 1 = second (No), etc.
 * For MAJORITY and UNANIMITY modes only — judge mode uses judgeResolvePact.
 */
export async function votePact(
  contractId: string,
  voterAddress: string,
  optionIndex: number,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(
    contractId, "vote",
    [new Address(voterAddress).toScVal(), u32Val(optionIndex)],
    voterAddress, signTransaction
  );
}

/** Judge picks the winning option index (JUDGE mode only). */
export async function judgeResolvePact(
  contractId: string,
  judgeAddress: string,
  winningOptionIndex: number,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(
    contractId, "judge_resolve",
    [new Address(judgeAddress).toScVal(), u32Val(winningOptionIndex)],
    judgeAddress, signTransaction
  );
}

/** Trigger resolution after deadline (MAJORITY / UNANIMITY). */
export async function resolvePact(
  contractId: string,
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(contractId, "resolve", [], callerAddress, signTransaction);
}

/** Refund all participants (after deadline, no consensus). */
export async function refundPact(
  contractId: string,
  callerAddress: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  await invokeContract(contractId, "refund", [], callerAddress, signTransaction);
}

export { Contract };
