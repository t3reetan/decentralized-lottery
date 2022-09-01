const { run } = require("hardhat");

const verify = async (contractAddress, args) => {
  console.log("Verifying contract...");

  // wrap run() in a try-catch block to check for errors, especially whether the contract is already verified
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args
    });
  } catch (err) {
    if (err.message.toLowerCase().includes("already verified")) {
      console.log("Contract already verified!");
    } else {
      console.log(err);
    }
  }
};

module.exports = { verify };
