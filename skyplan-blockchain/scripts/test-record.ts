import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

const CONTRACT = "0x4B97d6b3368fBbdc3Fa1A83b9FB2cFAF9024c756";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL!);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "BookingRegistry.sol",
    "BookingRegistry.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const c = new ethers.Contract(CONTRACT, artifact.abi, wallet);

  const bookingCode = "SP-001";
  const bookingHash = ethers.keccak256(ethers.toUtf8Bytes("demo-booking"));

  const tx = await c.recordBooking(bookingCode, bookingHash);
  console.log("recordBooking tx:", tx.hash);

  const receipt = await tx.wait();
  console.log("Mined in block:", receipt.blockNumber);

  const data = await c.getBooking(bookingCode);
  console.log("getBooking:", data);
}

main().catch(console.error);