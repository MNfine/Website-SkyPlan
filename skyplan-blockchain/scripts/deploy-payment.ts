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

  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  // Read ABI + bytecode from artifacts
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "PaymentRegistry.sol",
    "PaymentRegistry.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}\nRun: npx hardhat compile`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("Deployer:", await wallet.getAddress());

  const contract = await factory.deploy();
  const tx = contract.deploymentTransaction();
  console.log("Deploy tx hash:", tx?.hash);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("PaymentRegistry deployed to:", address);

  // Optionally update .env
  console.log("\n📝 Add to .env:");
  console.log(`PAYMENT_REGISTRY_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
