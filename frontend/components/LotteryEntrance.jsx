import React, { useEffect, useState } from "react";
import { useMoralis, useWeb3Contract } from "react-moralis";
import { abi, contractAddresses } from "../constants/";
import { ethers } from "ethers";
import { useNotification } from "web3uikit";

const LotteryEntrance = () => {
  const { chainId: chainIdHex, isWeb3Enabled } = useMoralis();
  const chainId = parseInt(chainIdHex);
  const raffleContractAddress =
    chainId in contractAddresses ? contractAddresses[chainId][0] : null;

  const [entranceFee, setEntranceFee] = useState("0");
  const [numPlayers, setNumPlayers] = useState("0");
  const [recentWinner, setRecentWinner] = useState("");

  const dispatch = useNotification(); // dispatch triggers a pop up

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

  const { runContractFunction: getNumPlayers } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleContractAddress,
    functionName: "getNumPlayers",
    params: {},
  });

  const { runContractFunction: getRecentWinner } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleContractAddress,
    functionName: "getRecentWinner",
    params: {},
  });

  const getUpdatedEntranceFee = async () => {
    const updatedEntranceFee = (await getEntranceFee()).toString();
    const updatedNumPlayers = (await getNumPlayers()).toString();
    const updatedRecentWinner = await getRecentWinner();

    setEntranceFee(updatedEntranceFee);
    setNumPlayers(updatedNumPlayers);
    setRecentWinner(updatedRecentWinner);
  };

  useEffect(() => {
    if (isWeb3Enabled) {
      getUpdatedEntranceFee();
    }
  }, [isWeb3Enabled]);

  // const filter = {
  //   address: raffleAddress,
  //   topics: [
  //     // the name of the event, parnetheses containing the data type of each event, no spaces
  //     utils.id("RaffleEnter(address)"),
  //   ],
  // };

  const handleTransactionSentSuccess = async (tx) => {
    await tx.wait(1); // for the tx to have 1 block confirmation
    getUpdatedEntranceFee();
    handleNewNotification(tx);
  };

  const handleNewNotification = () => {
    dispatch({
      // pops up a new notification
      type: "info",
      message: "Transaction Completed!",
      title: "Tx Notification",
      position: "topR",
    });
  };

  return raffleContractAddress ? (
    <div>
      <h1>Lottery Entrance</h1>
      <button
        onClick={async () =>
          await enterLottery({
            // onSuccess checks if a TX was successfully sent to metamask,
            // NOT a successful block confirmation. That's why we do tx.wait(1) on top
            onSuccess: handleTransactionSentSuccess,
            onError: (err) => console.log(err),
          })
        }
      >
        Enter Lottery
      </button>
      <p>Number of players in this lottery: {numPlayers}</p>
      <p>Most recent winner of the lottery: {recentWinner}</p>
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
