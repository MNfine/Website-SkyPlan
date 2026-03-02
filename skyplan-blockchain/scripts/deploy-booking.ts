import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.PRIVATE_KEY!;

  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  // Đọc ABI + bytecode từ artifacts do Hardhat compile tạo ra
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "BookingRegistry.sol",
    "BookingRegistry.json"
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("Deployer:", await wallet.getAddress());

  const contract = await factory.deploy();
  const tx = contract.deploymentTransaction();
  console.log("Deploy tx hash:", tx?.hash);

  await contract.waitForDeployment();
  console.log("BookingRegistry deployed to:", await contract.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});