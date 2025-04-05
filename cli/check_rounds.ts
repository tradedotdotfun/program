import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { connection, program } from "./helper";

// Round state enum
enum RoundState {
  Started = 0,
  Closed = 1,
}

// Function to check if an account exists
const accountExists = async (address: PublicKey): Promise<boolean> => {
  try {
    const account = await connection.getAccountInfo(address);
    return account !== null;
  } catch (error) {
    return false;
  }
};

// Function to check a specific round
const checkRound = async (roundNumber: number): Promise<void> => {
  try {
    console.log(`Checking round ${roundNumber}...`);

    // Convert round number to BN
    const roundNumberBN = new BN(roundNumber);

    // Find the round PDA
    const [roundPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("round"), roundNumberBN.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log(`Round PDA: ${roundPDA.toString()}`);

    // Check if round account exists
    const roundExists = await accountExists(roundPDA);
    if (!roundExists) {
      console.log(`Round ${roundNumber} does not exist.`);
      return;
    }

    // Fetch round data
    const roundAccount = await program.account.round.fetch(roundPDA);

    // Format state based on the program's round state (0 = Started, 1 = Closed)
    const stateString =
      roundAccount.state.started !== undefined ? "Started" : "Closed";

    // Format timestamps - convert from seconds to milliseconds
    const startTimeDate = new Date(Number(roundAccount.startTime) * 1000);
    const startTime = startTimeDate.toLocaleString();

    let endTime = "Not ended yet";
    if (Number(roundAccount.endTime) > 0) {
      const endTimeDate = new Date(Number(roundAccount.endTime) * 1000);
      endTime = endTimeDate.toLocaleString();
    }

    console.log(`Round ${roundNumber} details:`);
    console.log(`State: ${stateString}`);
    console.log(
      `Total SOL deposited: ${roundAccount.totalSolDeposited.toString()} lamports`
    );
    console.log(
      `Total INF received: ${roundAccount.totalInfReceived.toString()}`
    );
    console.log(`Start time: ${startTime}`);
    console.log(`End time: ${endTime}`);
    console.log(
      `Total reward tokens minted: ${roundAccount.totalRewardTokensMinted.toString()}`
    );
    console.log(`Total chips: ${roundAccount.totalChips.toString()}`);
  } catch (error) {
    console.error(`Error checking round ${roundNumber}:`, error);
  }
};

// Function to find active rounds (rounds where state is Started)
const findActiveRounds = async (
  maxRoundToCheck: number = 10
): Promise<void> => {
  console.log(
    `Searching for active rounds (checking rounds 1-${maxRoundToCheck})...`
  );

  const activeRounds = [];

  for (let i = 1; i <= maxRoundToCheck; i++) {
    try {
      const roundNumberBN = new BN(i);
      const [roundPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("round"), roundNumberBN.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const roundExists = await accountExists(roundPDA);
      if (roundExists) {
        const roundAccount = await program.account.round.fetch(roundPDA);
        // Check if the round is in "Started" state (check for started property)
        if (roundAccount.state.started !== undefined) {
          activeRounds.push({
            number: i,
            solDeposited: roundAccount.totalSolDeposited.toString(),
            infReceived: roundAccount.totalInfReceived.toString(),
            totalChips: roundAccount.totalChips.toString(),
          });
        }
      }
    } catch (error) {
      // Silently skip errors when checking rounds
    }
  }

  if (activeRounds.length > 0) {
    console.log("Active rounds found:");
    activeRounds.forEach((round) => {
      console.log(
        `Round ${round.number} - SOL deposited: ${round.solDeposited} lamports, INF received: ${round.infReceived}, Total chips: ${round.totalChips}`
      );
    });
  } else {
    console.log("No active rounds found.");
  }
};

// Main function to parse command line arguments and execute the appropriate function
async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log("Usage:");
    console.log("  ts-node check_rounds.ts active [max_round_to_check]");
    console.log("  ts-node check_rounds.ts check <round_number>");
    process.exit(1);
  }

  if (command === "active") {
    const maxRound = parseInt(process.argv[3]) || 10;
    await findActiveRounds(maxRound);
  } else if (command === "check") {
    const roundNumber = parseInt(process.argv[3]);
    if (isNaN(roundNumber)) {
      console.error("Invalid round number. Please provide a valid number.");
      process.exit(1);
    }
    await checkRound(roundNumber);
  } else {
    console.log("Unknown command. Use 'active' or 'check'.");
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export functions for use in other files
export { checkRound, findActiveRounds };
