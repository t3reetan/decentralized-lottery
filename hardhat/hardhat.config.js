require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");

module.exports = {
  solidity: "0.8.9",
  hardhat: {
    chainId: 31337,
    blockConfirmations: 1
  },
  rinkeby: {
    chainId: 4,
    url: process.env.RINKEBY_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    blockConfirmations: 6
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    player: {
      default: 1
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    token: "ETH",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
  mocha: {
    timeout: 500000 // 500 seconds max for running tests
  }
};
