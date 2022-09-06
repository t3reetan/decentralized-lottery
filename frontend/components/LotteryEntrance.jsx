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

  return (
    <div className="h-screen flex justify-around items-center py-4 px-8 bg-hero-image bg-no-repeat bg-cover">
      {raffleContractAddress ? (
        <>
          <div className="flex flex-col h-2/6 p-10 rounded-3xl bg-white">
            <h1 className="text-5xl font-bold mb-28">Lottery Entrance</h1>
            <button
              className="mb-4 p-3 w-40 rounded bg-blue-700 text-white text-xl font-semibold hover:bg-blue-600 transition duration-150 ease-out hover:ease-in"
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
            <p className="font-semibold">
              Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")} ETH
            </p>
          </div>

          <div className="flex flex-col h-2/6 p-10 rounded-3xl bg-white">
            <p className="text-2xl mb-10">
              Number of players in this lottery:{" "}
              <span className="mt-4 block text-4xl">{numPlayers}</span>
            </p>
            <p className="text-2xl">
              Most recent winner of the lottery:{" "}
              <span className="mt-4 block text-4xl">
                {recentWinner.slice(0, 6)}...
                {recentWinner.slice(recentWinner.length - 4)}
              </span>
            </p>
          </div>
        </>
      ) : (
        <div>
          No Raffle Contract detected! Make sure you're connected to the right
          network.
        </div>
      )}
    </div>
  );
};

export default LotteryEntrance;
