// this file programmatically generates the abi and contractAddresses on a connected network
const fs = require("fs");
const { network } = require("hardhat");

const frontEndContractsFile = "../frontend/constants/contractAddresses.json";
const frontEndAbiFile = "../frontend/constants/abi.json";

module.exports = async () => {
  if (process.env.UPDATE_FRONTEND) {
    console.log("Writing to front end...");
    await updateContractAddresses();
    await updateAbi();
    console.log("Front end written!");
  }
};

async function updateAbi() {
  const raffleContract = await ethers.getContract("Raffle");

  // raffleContract.interface.format(ethers.utils.FormatTypes.json is for getting the abi from the contract
  fs.writeFileSync(frontEndAbiFile, raffleContract.interface.format(ethers.utils.FormatTypes.json));
}

async function updateContractAddresses() {
  const raffleContract = await ethers.getContract("Raffle");
  const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"));
  if (network.config.chainId.toString() in contractAddresses) {
    if (!contractAddresses[network.config.chainId.toString()].includes(raffleContract.address)) {
      contractAddresses[network.config.chainId.toString()].push(raffleContract.address);
    }
  } else {
    contractAddresses[network.config.chainId.toString()] = [raffleContract.address];
  }
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses));
}
module.exports.tags = ["all", "frontend"];
