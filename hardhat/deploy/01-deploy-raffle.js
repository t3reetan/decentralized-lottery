const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  let vrfCoordinatorV2Mock;
  let vrfCoordinatorV2MockAddress;
  let subscriptionId;

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2MockAddress = vrfCoordinatorV2Mock.address;

    const txResponse = await vrfCoordinatorV2Mock.createSubscription();
    const txReceipt = await txResponse.wait(1);
    subscriptionId = txReceipt.events[0].args.subId;

    // Fund the subscription
    // Usually, we'd need LINK token on a real network to fund it
    // However, mocks allow u to fund a subscription without LINK
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  } else {
    vrfCoordinatorV2MockAddress = networkConfig[network.name].vrfCoordinatorV2Address;
    subscriptionId = networkConfig[network.name].subscriptionId;
  }

  const gasLane = networkConfig[network.name].gasLane;
  const callbackGasLimit = networkConfig[network.name].callbackGasLimit;
  const entranceFee = networkConfig[network.name].entranceFee;
  const interval = networkConfig[network.name].interval;

  // args have to follow contract's constructor mehtod signature
  const args = [
    vrfCoordinatorV2MockAddress,
    gasLane,
    subscriptionId,
    callbackGasLimit, // varies from chain to chain
    entranceFee,
    interval
  ];
  const raffle = await deploy("Raffle", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1
  });

  // adding our smartcontract as the consumer to the chainLink vrfCoordinator
  // this is only needed for local deployment, for testnet deployment Chainlink does it for you
  if (developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);

    log("Consumer is added");
  }

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(raffle.address, args);
  }

  log("-------------------------------------------------------");
};

module.exports.tags = ["all", "raffle"];
