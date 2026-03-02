import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.PRIVATE_KEY!;
  const ticketAddress = process.env.TICKET_NFT_ADDRESS!;
  const receiver = process.env.RECEIVER_ADDRESS!;

  if (!rpcUrl || !pk) throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env");
  if (!ticketAddress) throw new Error("Missing TICKET_NFT_ADDRESS in .env");
  if (!receiver) throw new Error("Missing RECEIVER_ADDRESS in .env");

  const tokenId = 1; // token bạn vừa mint (ảnh Etherscan là Token ID 1)

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "contracts",
    "TicketNFT.sol",
    "TicketNFT.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const nft = new ethers.Contract(ticketAddress, artifact.abi, wallet);

  const from = await wallet.getAddress();
  console.log("From (owner):", from);
  console.log("To (receiver):", receiver);
  console.log("TicketNFT:", ticketAddress);
  console.log("TokenID:", tokenId);

  // Check owner trước khi transfer
  const currentOwner = await nft.ownerOf(tokenId);
  console.log("Current ownerOf(tokenId):", currentOwner);

  if (currentOwner.toLowerCase() !== from.toLowerCase()) {
    throw new Error("You are not the owner of this tokenId");
  }

  console.log("Transferring...");
  const tx = await nft.transferFrom(from, receiver, tokenId);
  console.log("Transfer tx hash:", tx.hash);

  await tx.wait();
  console.log("Transfer success!");

  const newOwner = await nft.ownerOf(tokenId);
  console.log("New ownerOf(tokenId):", newOwner);
}

main().catch((e) => {
  console.error("Transfer failed:", e);
  process.exitCode = 1;
});