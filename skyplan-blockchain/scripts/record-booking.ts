import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.PRIVATE_KEY!;
  const bookingRegistry = process.env.BOOKING_REGISTRY_ADDRESS!;

  const bookingCode = "SKY123";

  // Example hash (you can hash more fields)
  const bookingHash = ethers.keccak256(ethers.toUtf8Bytes(bookingCode));

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "BookingRegistry.sol",
    "BookingRegistry.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const contract = new ethers.Contract(bookingRegistry, artifact.abi, wallet);

  console.log("Recording booking...", bookingCode);

  const tx = await contract.recordBooking(bookingCode, bookingHash);
  console.log("Record tx:", tx.hash);
  await tx.wait();

  console.log("Recorded:", bookingCode);
}

main().catch(console.error);