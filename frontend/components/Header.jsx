import React from "react";
import { ConnectButton } from "web3uikit";

const Header = () => {
  return (
    <div className="flex justify-between py-4 px-8 bg-slate-300">
      <h1 className="text-3xl font-extrabold">Decentralized Lottery</h1>
      <ConnectButton moralisAuth={false} />
    </div>
  );
};

export default Header;
