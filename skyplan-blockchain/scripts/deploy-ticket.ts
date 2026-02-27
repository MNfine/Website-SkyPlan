import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.PRIVATE_KEY!;
  const bookingRegistryAddress = process.env.BOOKING_REGISTRY_ADDRESS!;

  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env");
  }
  if (!bookingRegistryAddress) {
    throw new Error("Missing BOOKING_REGISTRY_ADDRESS in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  // Đọc ABI + bytecode từ artifacts do Hardhat compile tạo ra
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "TicketNFT.sol",
    "TicketNFT.json"
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("Deployer:", await wallet.getAddress());
  console.log("BookingRegistry:", bookingRegistryAddress);

  // constructor(address bookingRegistryAddress)
  const contract = await factory.deploy(bookingRegistryAddress);

  const tx = contract.deploymentTransaction();
  console.log("Deploy tx hash:", tx?.hash);

  await contract.waitForDeployment();
  console.log("TicketNFT deployed to:", await contract.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});