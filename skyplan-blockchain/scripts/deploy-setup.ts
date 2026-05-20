import path from "path";
import { fileURLToPath } from "url";
import { config as dotenvConfig } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenvConfig({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "ethers";
import fs from "fs";

/**
 * Complete deployment setup:
 * 1. Deploy BookingRegistry
 * 2. Deploy PaymentRegistry
 * 3. Deploy SkyToken (requires BookingRegistry)
 * 4. Deploy TicketNFT (requires BookingRegistry)
 * 5. Configure PaymentRegistry reference in SkyToken
 */

async function deployContract(
  wallet: ethers.Wallet,
  contractName: string,
  constructorArgs: any[] = []
) {
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}\nRun: npx hardhat compile`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log(`\n📦 Deploying ${contractName}...`);
  const contract = await factory.deploy(...constructorArgs);
  console.log(`   TX: ${contract.deploymentTransaction()?.hash}`);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`   ✅ ${contractName} → ${address}`);

  return { address, contract };
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.PRIVATE_KEY!;
  const adminAddress = process.env.ADMIN_ADDRESS || "";

  if (!rpcUrl || !pk) {
    throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const resolvedAdmin = adminAddress || (await wallet.getAddress());

  console.log("=".repeat(60));
  console.log("🚀 SKYPLAN BLOCKCHAIN DEPLOYMENT SETUP");
  console.log("=".repeat(60));
  console.log(`Deployer: ${await wallet.getAddress()}`);
  console.log(`Admin: ${resolvedAdmin}`);
  console.log(`Network: ${(await provider.getNetwork()).name}`);

  // 1. Deploy BookingRegistry
  const { address: bookingRegistryAddr } = await deployContract(wallet, "BookingRegistry");

  // 2. Deploy PaymentRegistry
  const { address: paymentRegistryAddr } = await deployContract(wallet, "PaymentRegistry");

  // 3. Deploy SkyToken
  const { address: skyTokenAddr, contract: skyTokenContract } = await deployContract(
    wallet,
    "SkyToken",
    [bookingRegistryAddr, resolvedAdmin]
  );

  // 4. Deploy TicketNFT
  const { address: ticketNftAddr, contract: ticketNftContract } = await deployContract(
    wallet,
    "TicketNFT",
    [bookingRegistryAddr, skyTokenAddr, resolvedAdmin]
  );

  // 5. Configure PaymentRegistry in SkyToken
  console.log("\n⚙️ Configuring SkyToken.setPaymentRegistry()...");
  const skySetPaymentTx = await skyTokenContract.setPaymentRegistry(paymentRegistryAddr);
  console.log(`   TX: ${skySetPaymentTx.hash}`);
  await skySetPaymentTx.wait();
  console.log("   ✅ SkyToken configured");

  // Print results
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("\n📝 Update .env with these values:\n");
  console.log(`BOOKING_REGISTRY_ADDRESS=${bookingRegistryAddr}`);
  console.log(`PAYMENT_REGISTRY_ADDRESS=${paymentRegistryAddr}`);
  console.log(`SKYTOKEN_ADDRESS=${skyTokenAddr}`);
  console.log(`TICKET_NFT_ADDRESS=${ticketNftAddr}`);
  console.log(`ADMIN_ADDRESS=${resolvedAdmin}\n`);

  // Save to .env.deployed (for reference)
  const envContent = `
# Auto-generated deployment addresses
BOOKING_REGISTRY_ADDRESS=${bookingRegistryAddr}
PAYMENT_REGISTRY_ADDRESS=${paymentRegistryAddr}
SKYTOKEN_ADDRESS=${skyTokenAddr}
TICKET_NFT_ADDRESS=${ticketNftAddr}
ADMIN_ADDRESS=${resolvedAdmin}
`;

  fs.writeFileSync(path.join(process.cwd(), ".env.deployed"), envContent.trim());
  console.log("💾 Saved to .env.deployed");

  console.log("\n📚 Next steps:");
  console.log("1. Copy the addresses above to your .env (backend)");
  console.log("2. Restart backend: npm start");
  console.log("3. Test payment flow");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
