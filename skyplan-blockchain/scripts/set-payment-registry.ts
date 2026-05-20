import path from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "ethers";
import fs from "fs";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "";
  const pk = process.env.PRIVATE_KEY || "";
  const skyTokenAddress = process.env.SKY_TOKEN_ADDRESS || process.env.SKYTOKEN_ADDRESS || "";
  const paymentRegistryAddress = process.argv[2] || process.env.PAYMENT_REGISTRY_ADDRESS || "";

  if (!rpcUrl || !pk || !skyTokenAddress || !paymentRegistryAddress) {
    throw new Error("Missing SEPOLIA_RPC_URL, PRIVATE_KEY, SKY_TOKEN_ADDRESS, or PAYMENT_REGISTRY_ADDRESS");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "SkyToken.sol",
    "SkyToken.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}\nRun: npx hardhat compile`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const skyToken = new ethers.Contract(skyTokenAddress, artifact.abi, wallet);

  console.log("Deployer:", await wallet.getAddress());
  console.log("SkyToken:", skyTokenAddress);
  console.log("PaymentRegistry:", paymentRegistryAddress);

  const tx = await skyToken.setPaymentRegistry(paymentRegistryAddress);
  console.log("setPaymentRegistry tx:", tx.hash);
  await tx.wait();
  console.log("PaymentRegistry configured.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
