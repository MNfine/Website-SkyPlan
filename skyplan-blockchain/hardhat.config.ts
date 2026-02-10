import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: "0.8.24",
  networks: {
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
});