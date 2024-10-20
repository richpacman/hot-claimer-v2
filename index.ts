import * as nearAPI from 'near-api-js';
import * as fs from 'fs';
import chalk from 'chalk';

const { keyStores, KeyPair, Contract, utils } = nearAPI;
const keyStore = new keyStores.InMemoryKeyStore();

const { connect } = nearAPI;

const connectionConfig = {
  networkId: 'mainnet',
  keyStore: keyStore,
  nodeUrl: 'https://rpc.mainnet.near.org',
  explorerUrl: 'https://nearblocks.io',
};

function timeLeft(timeLeft: number) {
  const hoursLeft = Math.floor(timeLeft / 3600);
  const minutesLeft = Math.floor((timeLeft % 3600) / 60);
  const secondsLeft = Math.floor(timeLeft % 60);

  console.log(
    chalk.yellow(
      `⏳ Time left until next claim: ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`
    )
  );
}

async function transferNEAR(
  fromAccount: nearAPI.Account,
  toAccountId: string,
  amount: string
) {
  try {
    const result = await fromAccount.sendMoney(
      toAccountId,
      BigInt(utils.format.parseNearAmount(amount)!)
    );
    console.log(
      chalk.green(
        `✅ Transferred ${amount} NEAR from ${fromAccount.accountId} to ${toAccountId}`
      )
    );
    console.log(chalk.cyan(`   Transaction Hash: ${result.transaction.hash}`));
  } catch (error) {
    console.error(chalk.red('❌ Error transferring NEAR:'), error);
  }
}

async function main() {
  const HOT_CONTRACT_ID = 'game.hot.tg';

  const ACCOUNTS = fs
    .readFileSync('data.txt', 'utf-8')
    .split('\n')
    .filter(Boolean);

  console.log(chalk.magenta(`🚀 Starting NEAR transfer and claim script`));
  console.log(
    chalk.magenta(`📁 Loaded ${ACCOUNTS.length} accounts from data.txt`)
  );

  // Initialize the first account (index 0) for transfers
  const [firstAccountId, firstAccountKey] = ACCOUNTS[0].split('/');
  // @ts-ignore
  const firstKeypair = KeyPair.fromString(firstAccountKey);
  await keyStore.setKey('mainnet', firstAccountId, firstKeypair);
  const nearConnection = await connect(connectionConfig);
  const firstAccount = await nearConnection.account(firstAccountId);

  console.log(
    chalk.cyan(
      `🏦 First account (for transfers) initialized: ${firstAccountId}`
    )
  );

  while (true) {
    try {
      for (let i = 0; i < ACCOUNTS.length; i++) {
        const accountNumber = i + 1;
        const account = ACCOUNTS[i].split('/');
        const [accountId, accountKey, cooldown] = account;

        console.log(
          chalk.blue(
            `\n📊 Processing Account ${accountNumber}/${ACCOUNTS.length}`
          )
        );
        console.log(chalk.blue(`   ID: ${accountId}`));

        // @ts-ignore
        const keypair = KeyPair.fromString(accountKey);
        await keyStore.setKey('mainnet', accountId, keypair);

        const accountConnection = await nearConnection.account(accountId);

        const balance = utils.format.formatNearAmount(
          (await accountConnection.getAccountBalance()).available
        );

        console.log(chalk.green(`💰 Current Balance: ${balance} NEAR`));

        if (parseFloat(balance) < 0.003) {
          console.log(
            chalk.yellow(`⚠️  Low balance detected. Transferring funds...`)
          );
          await transferNEAR(firstAccount, accountId, '0.02');
        }

        const contract = new Contract(accountConnection, HOT_CONTRACT_ID, {
          viewMethods: ['get_user'],
          changeMethods: ['claim'],
          useLocalViewExecution: false,
        });

        // @ts-ignore
        const user = await contract.get_user({
          account_id: accountId,
        });

        const now = Date.now() * 1e6;
        const lastClaim = user?.last_claim ?? 0;
        const diffInSeconds = Math.floor((now - lastClaim) / 1e9);

        if (diffInSeconds >= Number(cooldown)) {
          console.log(chalk.green(`🎉 Claiming rewards...`));
          // @ts-ignore
          await contract.claim({
            csrf: accountId,
          });
          console.log(chalk.green(`✅ Claimed successfully`));
        } else {
          timeLeft(Number(cooldown) - diffInSeconds);

          console.log(chalk.yellow(`⏳ Waiting 5 seconds...`));
          await new Promise((resolve) => setTimeout(resolve, 5000));

          if (i < ACCOUNTS.length - 1) {
            continue;
          } else {
            console.log(
              chalk.magenta(
                `🔄 Finished processing all accounts. Starting over...`
              )
            );
            i = -1;
            continue;
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ An error occurred:`), error);
      console.log(chalk.yellow(`🔄 Restarting in 5 seconds...`));

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main();
