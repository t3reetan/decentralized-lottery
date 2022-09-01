// SPDX-License-Identifier: MIT

// Enter the lottery -> need to pay an amount
// Pick a random winner -> need to be verifiably random -> use Chainlink VRF
// Winner must be selected automatically every X minutes -> process to be completely automated -> use Chainlink keepers
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__InsufficientEntranceFee();
error Raffle_TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 contractBal, uint256 numPlayers, uint256 raffleState);

/** @title A sample Raffle contract
 *  @author Terry Tan
 *  @notice This contract creates an untemperable decentralized smart contract
 *  @dev This contract implements Chainlink VRF and Chainlink keepers
 *
 */
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /** Type declarations */
    // uint256: 0 = OPEN, 1 = CALCULATING
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    uint256 private immutable i_entranceFee;

    /** State variables */
    // will have to make the address array payable since when one of the players win, we'll have to pay them
    // notice how the syntax is a little weird, but that's just how it is
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    /** Lottery variables */
    address payable[] private s_players;
    address payable s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /** Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event RecentWinner(address indexed winner);

    /** Functions */
    // VRFConsumerBaseV2 is the constructor for the VRF contract
    // the vrfCoordinator is the address of the contract that does the random number verification
    constructor(
        address vrfCoordinatorV2, // VRF contract
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 entranceFee,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__InsufficientEntranceFee();
        }

        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }

        s_players.push(payable(msg.sender)); // msg.sender is not a payable address, requires type-casting

        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink keeper nodes call when they
     * look for the `upkeepNeeded` to return true.
     * The following conditions have to be true in order to return an upkeepNeeded of value true
     * 1. Time interval should have passed
     * 2. Lottery should have at least 1 player, and have some ETH
     * 3. Subscription ??? is funded with LINK
     * 4. Lottery should be in an "open" state, meaning that when we're picking a winner,
     * the lottery is "calculating", "closed", etc
     */
    // having the parameter be of bytes datatype allows us to use any kind of arguments (even another function) when calling this function
    // performData is what we use if we want checkUpKeep to do some other stuff
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool intervalPassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers = (s_players.length) > 0;
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = (isOpen && intervalPassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    /**
     * @dev Once `checkUpkeep` is returning `true`, this function is called
     * and it kicks off a Chainlink VRF call to get a random winner.
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            ); // add some arguments here to give the person running into the error some info
        }
        s_raffleState = RaffleState.CALCULATING;

        // Takes specified parameters and submits the request to the VRF coordinator contract
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit, // sets a limit for how much computation our fulfillRandomWords() can perform
            NUM_WORDS
        );

        // this is actually redundant coz VRF Coordinator itself emits an event called RandomWordsRequested
        emit RequestedRaffleWinner(requestId);
    }

    // Receives random values and stores them with your contract.
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;

        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;

        (bool success, ) = recentWinner.call{value: address(this).balance}("");

        if (!success) {
            revert Raffle_TransferFailed();
        }

        // we wanna emit an event so that there is always an easily query-able log of winners' addresses
        emit RecentWinner(recentWinner);
    }

    /** View/Pure functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 playerIndex) public view returns (address) {
        return s_players[playerIndex];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
