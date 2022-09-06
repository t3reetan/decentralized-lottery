const { ethers } = require("hardhat");

async function enterLottery() {
  const raffleContract = await ethers.getContract("Raffle");
  const entranceFee = await raffleContract.getEntranceFee();
  await raffleContract.enterLottery({ value: entranceFee + 1 });
  console.log("Entered!");
}

enterLottery()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
