import React, { useEffect, useState } from "react";
import { useMoralis, useWeb3Contract } from "react-moralis";
import { abi, contractAddresses } from "../constants/";
import { ethers } from "ethers";

const LotteryEntrance = () => {
  const { chainId: chainIdHex, isWeb3Enabled } = useMoralis();
  const chainId = parseInt(chainIdHex);
  const raffleContractAddress =
    chainId in contractAddresses ? contractAddresses[chainId][0] : null;

  const [entranceFee, setEntranceFee] = useState("0");

  const { runContractFunction: enterLottery } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleContractAddress,
    functionName: "enterLottery",
    params: {},
    msgValue: entranceFee,
  });

  const { runContractFunction: getEntranceFee } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleContractAddress,
    functionName: "getEntranceFee",
    params: {},
  });

  useEffect(() => {
    if (isWeb3Enabled) {
      const getUpdatedEntranceFee = async () => {
        const updatedEntranceFee = (await getEntranceFee()).toString();
        setEntranceFee(updatedEntranceFee);
      };
      getUpdatedEntranceFee();
    }
  }, [isWeb3Enabled]);

  return raffleContractAddress ? (
    <div>
      <h1>Lottery Entrance</h1>
      <button onClick={async () => await enterLottery()}>Enter Lottery</button>
      <p>Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")} ETH</p>
    </div>
  ) : (
    <div>
      No Raffle Contract detected! Make sure you're connected to the right
      network.
    </div>
  );
};

export default LotteryEntrance;
