import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.PRIVATE_KEY!;
  const ticketAddress = process.env.TICKET_NFT_ADDRESS!;
  const tokenIdRaw = process.env.TICKET_TOKEN_ID || "1";
  const tokenId = BigInt(tokenIdRaw);

  if (!rpcUrl || !pk) throw new Error("Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env");
  if (!ticketAddress) throw new Error("Missing TICKET_NFT_ADDRESS in .env");

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
  console.log("Caller:", from);
  console.log("TicketNFT:", ticketAddress);
  console.log("TokenID:", tokenId);

  const currentOwner = await nft.ownerOf(tokenId);
  console.log("Current owner:", currentOwner);
  console.log("Soulbound mode is enabled: transferFrom/safeTransferFrom are expected to revert.");
  console.log("Use burnTicket(tokenId) when handling cancel/refund flow.");
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exitCode = 1;
});