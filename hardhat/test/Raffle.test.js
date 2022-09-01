const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", () => {
      let raffleContract, vrfCoordinatorV2Mock, deployer, raffleEntranceFee, interval;

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;

        await deployments.fixture(["all"]);

        raffleContract = await ethers.getContract("Raffle", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
        raffleEntranceFee = await raffleContract.getEntranceFee();
        interval = await raffleContract.getInterval();
      });

      describe("constructor", () => {
        it("initializes the raffle correctly", async () => {
          const raffleState = await raffleContract.getRaffleState();
          const raffleInterval = await raffleContract.getInterval();

          assert.equal(raffleState.toString(), "0");
          assert.equal(raffleInterval.toString(), networkConfig[network.name].interval);
        });
      });

      describe("enter lottery", () => {
        it("reverts if insufficient funds", async () => {
          await expect(raffleContract.enterLottery()).to.be.revertedWithCustomError(
            raffleContract,
            "Raffle__InsufficientEntranceFee"
          );
        });

        it("enters players into lottery", async () => {
          const txResponse = await raffleContract.enterLottery({ value: raffleEntranceFee });
          const txReceipt = await txResponse.wait(1);

          const player = await raffleContract.getPlayer(0);

          assert.equal(player, deployer);
        });

        it("emits an event on enter", async () => {
          await expect(raffleContract.enterLottery({ value: raffleEntranceFee })).to.emit(
            raffleContract,
            "RaffleEnter"
          );
        });

        it("doesn't allow entrance when raffle is calculating", async () => {
          await raffleContract.enterLottery({ value: raffleEntranceFee });

          // hardhat provides a "Time Travel" function so that we don't have to wait for a time interval to pass
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);

          // need to mine that block with the TX inside, otherwise there's no use having time passed
          await network.provider.send("evm_mine", []);
          // await network.provider.request({ method: "evm_mine", params: [] });

          // pretending to be a Chainlink keeper
          await raffleContract.performUpkeep([]);

          await expect(
            raffleContract.enterLottery({ value: raffleEntranceFee })
          ).to.be.revertedWithCustomError(raffleContract, "Raffle__NotOpen");
        });

        describe("checkUpKeep", () => {
          it("returns false if there's no one in the lottery", async () => {
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);

            // don't want to send a real tx, but wants the return value of a function -> use callStatic
            const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep([]);
            assert.equal(upkeepNeeded, false);
          });

          it("returns false if raffle isn't open", async () => {
            await raffleContract.enterLottery({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);

            await raffleContract.performUpkeep([]);

            const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep([]);
            assert.equal(upkeepNeeded, false);
          });
          it("returns false if enough time hasn't passed", async () => {
            await raffleContract.enterLottery({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 1]);
            await network.provider.send("evm_mine", []);
            const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep([]); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(upkeepNeeded, false);
          });
          it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await raffleContract.enterLottery({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            const { upkeepNeeded } = await raffleContract.callStatic.checkUpkeep([]); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(upkeepNeeded, true);
          });
        });

        describe("performUpkeep", () => {
          it("can only run if checkupkeep is true", async () => {
            await raffleContract.enterLottery({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            const tx = await raffleContract.performUpkeep([]);
            assert(tx, true);
          });
          it("reverts if checkup is false", async () => {
            await expect(raffleContract.performUpkeep([])).to.be.revertedWithCustomError(
              raffleContract,
              "Raffle__UpkeepNotNeeded"
            );
          });
          it("updates the raffle state and emits a requestId and calls the VRF coordinator", async () => {
            // Too many asserts in this test!
            await raffleContract.enterLottery({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
            const txResponse = await raffleContract.performUpkeep([]); // emits requestId
            const txReceipt = await txResponse.wait(1); // waits 1 block
            const raffleState = await raffleContract.getRaffleState(); // updates state
            const requestId = txReceipt.events[1].args.requestId; // index of 1 because we want the event emitted from VRF Coordinator instead of our own
            assert(requestId.toNumber() > 0);
            assert(raffleState.toString() === "1"); // 0 = open, 1 = calculating
          });
        });

        describe("fulfillRandomWords", function() {
          let accounts;
          beforeEach(async () => {
            accounts = await ethers.getSigners();
            await raffleContract.enterLottery({ value: raffleEntranceFee });
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
            await network.provider.send("evm_mine", []);
          });

          it("can only be called after performUpkeep", async () => {
            await expect(
              vrfCoordinatorV2Mock.fulfillRandomWords(0, raffleContract.address) // reverts if not fulfilled
            ).to.be.revertedWith("nonexistent request");
            await expect(
              vrfCoordinatorV2Mock.fulfillRandomWords(1, raffleContract.address) // reverts if not fulfilled
            ).to.be.revertedWith("nonexistent request");
          });

          // This test is too big...
          // This test simulates users entering the raffle and wraps the entire functionality of the raffle
          // inside a promise that will resolve if everything is successful.
          // An event listener for the WinnerPicked is set up
          // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
          // All the assertions are done once the WinnerPicked event is fired
          it("picks a winner, resets, and sends money", async () => {
            const additionalEntrances = 3; // to test
            const startingIndex = 2;
            for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
              // i = 2; i < 5; i=i+1
              raffle = raffleContract.connect(accounts[i]); // Returns a new instance of the Raffle contract connected to player
              await raffleContract.enterLottery({ value: raffleEntranceFee });
            }
            const startingTimeStamp = await raffleContract.getLastTimeStamp(); // stores starting timestamp (before we fire our event)

            // This will be more important for our staging tests...
            await new Promise(async (resolve, reject) => {
              // event listener for WinnerPicked
              raffleContract.once("RecentWinner", async () => {
                console.log("RecentWinner event fired!");
                // assert throws an error if it fails, so we need to wrap
                // it in a try/catch so that the promise returns event
                // if it fails.
                try {
                  // Now lets get the ending values...
                  const recentWinner = await raffleContract.getRecentWinner();
                  const raffleState = await raffleContract.getRaffleState();
                  const winnerBalance = await accounts[2].getBalance();
                  const endingTimeStamp = await raffleContract.getLastTimeStamp();
                  await expect(raffle.getPlayer(0)).to.be.reverted;
                  // Comparisons to check if our ending values are correct:
                  assert.equal(recentWinner.toString(), accounts[2].address);
                  assert.equal(raffleState, 0);
                  assert.equal(
                    winnerBalance.toString(),
                    startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                      .add(raffleEntranceFee.mul(additionalEntrances).add(raffleEntranceFee))
                      .toString()
                  );
                  assert(endingTimeStamp > startingTimeStamp);
                  resolve(); // if try passes, resolves the promise
                } catch (e) {
                  reject(e); // if try fails, rejects the promise
                }
              });

              // kicking off the event by mocking the chainlink keepers and vrf coordinator
              const txResponse = await raffleContract.performUpkeep([]);
              const txReceipt = await txResponse.wait(1);
              const startingBalance = await accounts[2].getBalance();
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                txReceipt.events[1].args.requestId,
                raffleContract.address
              );
            });
          });
        });
      });
    });
