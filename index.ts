import fs from 'fs';
import express from 'express';
import FormData from 'form-data';
import fetch from 'isomorphic-fetch';
import TelegramBot from 'node-telegram-bot-api';

const tagline = fs.readFileSync('./tagline.txt', 'utf8').split('\n');

const TOTAL_SUPPLY = Math.pow(10, 12);
const CHARITY_WALLET_ADDRESS = '0x45a164217DA69B98f9cCa828cF0f22dDe0E95582';

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN as string, {
  polling: true,
});

const privateOnly = (fn: any) => (msg: TelegramBot.Message, ...args: any) => {
  if (msg.chat.type !== 'private') { return; }
  return fn(msg, ...args);
};

const getTokenInfo = () => {
  return fetch('https://api.dex.guru/v2/tokens/', { method: 'post', body: '{"ids":["0xAe448cB5A3ec77BA4aDcc6C8f9621e5921DCd77a-bsc"]}' })
    .then(respose => respose.json());
};

const getTokenData = () => {
  const body: any = new FormData();
  body.append('id', '41804');
  return fetch('https://jobapi.thebittimes.com/token/updatedata?time=' + new Date().getTime(), { method: 'post', body })
    .then((result) => result.json());
};

const getTop10 = () => {
  return fetch('https://graphql.bitquery.io/', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': 'BQYuFrEvrfKvBjd35LxeKGREifNFY6q2'
    },
    body: JSON.stringify({ query: `
      {
        ethereum(network: bsc) {
          transfers(
            options: {desc: "sum_in", limit: 10}, amount: {gt: 0}, currency: { is: "0xAe448cB5A3ec77BA4aDcc6C8f9621e5921DCd77a" }, receiver: {is: "${CHARITY_WALLET_ADDRESS}"}
          ) {
            sum_in: amount(calculate: sum)
            address: sender {
              address
              annotation
            }
            external
          }
        }
      }
    `})
  }).then((response) => response.json());
};

// Handlers

const handleCharity = async (msg: TelegramBot.Message) => {
  const data = [
    `Charity Wallet: <b>${CHARITY_WALLET_ADDRESS}</b>`,
    ''
  ];

  try {
    const top10 = await getTop10();
    data.push('<b>☮️ Top 10 Funders</b>\n');
    top10.data.ethereum.transfers.map((tx: any, index: number) => {
      data.push(`<b>#${index + 1}</b>. ${tx.sum_in} GRUMPYSHIB (<i>${tx.address.address}</i>)`);
    });
  } catch(e) {
    console.error(e);
  }

  bot.sendMessage(msg.chat.id, data.join('\n'), {
    reply_markup: {
      inline_keyboard: [
        [ { text: 'Donate GrumpyShiba', url: 'https://shibhope.com/donate' } ]]
    },
    parse_mode: 'HTML'
  });
};

const handlePrice = async (msg: TelegramBot.Message) => {
  const result = await getTokenInfo();

  const data = [`💲 Current GRUMPYSHIB price is: <b>${Number(result.data[0].priceUSD).toFixed(18).replace(/\.?0+$/, '')} USD</b>`];
  if (result.data[0].priceUSDChange24h !== 0) {
    const isUp = result.data[0].priceUSDChange24h > 0;
    data.push(`${isUp ? '📈' : '📉'} GRUMPYSHIB today is <b>${isUp ? 'up' : 'down'}</b> for ${(result.data[0].priceUSDChange24h * 100).toFixed(2)}%`);
  }

  try {
    const tokenInfo = await getTokenData();
    if (tokenInfo) {
      data.push(`📊 Market cap is ${(TOTAL_SUPPLY * result.data[0].priceUSD).toFixed(2)} USD (${tokenInfo.holders} ${String(tokenInfo.holders).substring(-1) === '1' ? 'holder' : 'holders'})`);
    }
  } catch(e) {
    console.log('Unable to fetch token data', e);
  }

  data.push('🔥 Next Burn: <b>50B GRUMPYSHIB</b> (250 holders / 100k market cap)');

  bot.sendMessage(msg.chat.id, data.join('\n'), {
    reply_markup: {
      inline_keyboard: [
        [ { text: 'View Chart', url: 'https://charts.bogged.finance/?c=bsc&t=0xAe448cB5A3ec77BA4aDcc6C8f9621e5921DCd77a' }, { text: 'Buy Now', url: 'https://www.flooz.trade/embedded/0xAe448cB5A3ec77BA4aDcc6C8f9621e5921DCd77a' } ]]
    },
    parse_mode : "HTML"
  });
}

// All Messages

bot.onText(/\/grumpy/, (msg) => {
  bot.sendMessage(msg.chat.id, tagline[Math.floor(Math.random() * tagline.length)]);
});
bot.onText(/\/token/, handlePrice);
bot.onText(/\/charity/, handleCharity);

// Private Messages

bot.onText(/\/start/, privateOnly((msg: TelegramBot.Message) => {
  bot.sendMessage(msg.chat.id, 'Hi there! Select any option from list', {
    reply_to_message_id: msg.message_id,
    reply_markup: {
      keyboard: 
      [
        [{text: '📈 Get Token Price'}],
        [{text: '☮️ Charity Wallet'}],
        [{text: '🎁 Join Airdrop'}],
      ],
    }
  });
}));
bot.onText(/📈 Get Token Price/, privateOnly(handlePrice));
bot.onText(/☮️ Charity Wallet/, privateOnly(handleCharity));
bot.onText(/🎁 Join Airdrop/, privateOnly(async (msg: TelegramBot.Message) => {
  bot.sendMessage(msg.chat.id, 'Sorry, but currently there are no active airdrops. Stay tuned for updates!');
}));

bot.on('message', (msg) => {
  console.log(msg.chat.id);
});

// Start bot API

const app = express()

app.get('/', function (_, res) {
  res.json({ status: 'ok' });
});

// Start server

app.listen(process.env.PORT || 3000, () => console.log('Server is running...'));
