import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.PRIVATE_KEY!;
  const skyTokenAddress = process.env.SKY_TOKEN_ADDRESS!;
  const user = process.env.REWARD_USER_ADDRESS!;
  const bookingCode = process.env.REWARD_BOOKING_CODE!;
  const amountHuman = process.env.REWARD_AMOUNT || "100";

  if (!rpcUrl || !pk) throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY");
  if (!skyTokenAddress) throw new Error("Missing SKY_TOKEN_ADDRESS");
  if (!user) throw new Error("Missing REWARD_USER_ADDRESS");
  if (!bookingCode) throw new Error("Missing REWARD_BOOKING_CODE");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "SkyToken.sol",
    "SkyToken.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const sky = new ethers.Contract(skyTokenAddress, artifact.abi, wallet);

  const amount = ethers.parseUnits(amountHuman, 18);

  console.log("Deployer:", await wallet.getAddress());
  console.log("SkyToken:", skyTokenAddress);
  console.log("Reward user:", user);
  console.log("BookingCode:", bookingCode);
  console.log("Amount:", amountHuman, "SKY");

  // 1) allowlist user (vì transfersRestricted = true)
  const tx1 = await sky.setAllowed(user, true);
  console.log("setAllowed tx:", tx1.hash);
  await tx1.wait();

  // 2) mint reward cho booking đã record
  const tx2 = await sky.mintForBooking(user, bookingCode, amount);
  console.log("mintForBooking tx:", tx2.hash);
  await tx2.wait();

  const bal = await sky.balanceOf(user);
  console.log("New balance:", ethers.formatUnits(bal, 18), "SKY");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});