import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ethers } from "ethers";
import fs from "fs";
import path from "path";

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const pk = process.env.PRIVATE_KEY!;
  const ticketAddress = process.env.TICKET_NFT_ADDRESS!;

  const bookingCode = "SKY123"; // booking đã record trước đó
  const tokenURI = "https://example.com/metadata.json";

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

  const contract = new ethers.Contract(ticketAddress, artifact.abi, wallet);

  console.log("Minting NFT...");

  const tx = await contract.mintTicket(
    wallet.address,
    bookingCode,
    tokenURI
  );

  console.log("Mint tx:", tx.hash);
  await tx.wait();

  console.log("Mint success");
}

main().catch(console.error);