import * as nearAPI from 'near-api-js';
import * as fs from 'fs';

const { keyStores, KeyPair, Contract } = nearAPI;
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
    `Time left until next claim: ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s`
  );
}

async function main() {
  const HOT_CONTRACT_ID = 'game.hot.tg';

  const ACCOUNTS = fs
    .readFileSync('data.txt', 'utf-8')
    .split('\n')
    .filter(Boolean);

  while (true) {
    try {
      for (let i = 0; i < ACCOUNTS.length; i++) {
        const accountNumber = i + 1;
        const account = ACCOUNTS[i].split('/');
        const [accountId, accountKey, cooldown] = account;

        // @ts-ignore
        const keypair = KeyPair.fromString(accountKey);
        await keyStore.setKey('mainnet', accountId, keypair);

        const nearConnection = await connect(connectionConfig);
        const accountConnection = await nearConnection.account(accountId);

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

        console.log('Account Number:', accountNumber);
        console.log('Acccount ID:', accountId);

        if (diffInSeconds >= Number(cooldown)) {
          // @ts-ignore
          await contract.claim({
            csrf: accountId,
          });
          console.log('Claimed successfully');
        } else {
          timeLeft(Number(cooldown) - diffInSeconds);

          console.log('Waiting 5 seconds...');
          await new Promise((resolve) => setTimeout(resolve, 5000));

          if (i < ACCOUNTS.length) {
            continue;
          } else {
            i = -1;
            continue;
          }
        }
      }
    } catch (error) {
      console.error('An error occurred:', error);
      console.log('Restarting in 5 seconds...');

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main();
