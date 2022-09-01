const { ethers } = require("hardhat");

const networkConfig = {
  hardhat: {
    chainId: 31337,
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    callbackGasLimit: "500000", // 500,000
    interval: "30" // 30 seconds
  },
  rinkeby: {
    chainId: 4,
    vrfCoordinatorV2Address: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    entranceFee: ethers.utils.parseEther("0.01"), // based on the blockchain, higher gas fees chain = more expensive entrance fee
    gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    subscriptionId: "0", // to change when we have the subId
    callbackGasLimit: "500000", // 500,000
    interval: "30" // 30 seconds
  }
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains
};
