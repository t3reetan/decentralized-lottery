import React, { useEffect, useState } from "react";
import { useMoralis } from "react-moralis"; // we're using moralis here because they have some good plugins & optional functionlaities to hook into ur own BE

const ManualHeader = () => {
  const {
    enableWeb3,
    account,
    isWeb3Enabled,
    Moralis,
    deactivateWeb3,
    isWeb3EnableLoading,
  } = useMoralis();

  useEffect(() => {
    if (
      !isWeb3Enabled &&
      typeof window !== "undefined" &&
      window.localStorage.getItem("connected")
    ) {
      enableWeb3();
      // enableWeb3({provider: window.localStorage.getItem("connected")}) // add walletconnect
    }
  }, [isWeb3Enabled]);

  useEffect(() => {
    Moralis.onAccountChanged((account) => {
      console.log(`Account changed to ${account}`);
      if (account == null) {
        window.localStorage.removeItem("connected");
        deactivateWeb3();
        console.log("Null Account found");
      }
    });
  }, []);

  return (
    <div>
      {account ? (
        <>
          your account of{" "}
          <u>
            {account.slice(0, 6)}...{account.slice(account.length - 4)}
          </u>{" "}
          is connected
        </>
      ) : (
        <button
          onClick={async () => {
            await enableWeb3();

            // setting a memory in the local storage of the window object
            if (typeof window !== "undefined") {
              window.localStorage.setItem("connected", "injected");
              // window.localStorage.setItem("connected", "walletconnect")
            }
          }}
          disabled={isWeb3EnableLoading}
        >
          Connect
        </button>
      )}
    </div>
  );
};

export default ManualHeader;
