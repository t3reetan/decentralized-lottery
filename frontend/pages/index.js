// imports work with FE but not with BE
// nodejs != ecmascript / javascript
// backend JS is a little different from frontend JS

import Head from "next/head";
import Image from "next/image";
import Header from "../components/Header";
import LotteryEntrance from "../components/LotteryEntrance";
import styles from "../styles/Home.module.css";

export default function Home() {
  // detect if u're on the right network

  return (
    <>
      <Head>
        <title>Smart Contract Lottery</title>
        <meta name="description" content="Decentralized Lottery" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <LotteryEntrance />
    </>
  );
}
