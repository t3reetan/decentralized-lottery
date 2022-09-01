const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
// import { DECIMALS, INITIAL_PRICE } from "../helper-hardhat-config";

// 0.25 oracle gas is needed per request
// The reason why it costs gas as compared to the price feed which is free is because
// price feeds are being sponsored by certain protocols who are paying for their requests
const BASE_FEE = ethers.utils.parseEther("0.25");

// calculated value based on the gas price of the chain
const GAS_PRICE_LINK = 1e9; // think of it as link/gas

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const args = [BASE_FEE, GAS_PRICE_LINK];
  if (developmentChains.includes(network.name)) {
    console.log("Local network detected. Deploying mocks.");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args
    });

    log("Mock deployed.");
    log("-----------------------------------------------");
  }
};

module.exports.tags = ["all", "mocks"];
