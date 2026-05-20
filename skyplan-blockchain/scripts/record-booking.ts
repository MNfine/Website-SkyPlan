import path from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "ethers";
import fs from "fs";

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