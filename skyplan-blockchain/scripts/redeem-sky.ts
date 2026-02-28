// Script này giả định:

// ví deployer/admin là người redeemer

// user sẽ approve cho admin được burn điểm

import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pkAdmin = process.env.PRIVATE_KEY!;
  const skyTokenAddress = process.env.SKY_TOKEN_ADDRESS!;
  const user = process.env.REWARD_USER_ADDRESS!;
  const amountHuman = process.env.REDEEM_AMOUNT || "10";
  const rewardRef = process.env.REWARD_REF || "VOUCHER-10";

  if (!rpcUrl || !pkAdmin) throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY");
  if (!skyTokenAddress) throw new Error("Missing SKY_TOKEN_ADDRESS");
  if (!user) throw new Error("Missing REWARD_USER_ADDRESS");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const admin = new ethers.Wallet(pkAdmin, provider);

  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "SkyToken.sol",
    "SkyToken.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const sky = new ethers.Contract(skyTokenAddress, artifact.abi, admin);

  const amount = ethers.parseUnits(amountHuman, 18);

  console.log("Admin (redeemer):", await admin.getAddress());
  console.log("User:", user);
  console.log("Redeem amount:", amountHuman, "SKY");

  // IMPORTANT: user phải approve cho admin trước.
  // Nếu user = chính admin thì approve bằng cùng private key được.
  // Nếu user là ví khác thì cần chạy approve bằng private key của user (hoặc approve trên MetaMask).

  console.log("⚠️ User must approve admin before redeemFrom()");
  console.log("Admin address to approve:", await admin.getAddress());
  console.log("Call approve(admin, amount) from user wallet, then run redeemFrom.");

  // Redeem (burn từ user) - chỉ chạy sau khi user approve
  const tx = await sky.redeemFrom(user, amount, rewardRef);
  console.log("redeemFrom tx:", tx.hash);
  await tx.wait();

  const bal = await sky.balanceOf(user);
  console.log("User balance after redeem:", ethers.formatUnits(bal, 18), "SKY");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});