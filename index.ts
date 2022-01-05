import express from 'express';
import fetch from 'isomorphic-fetch';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN as string, {
  polling: true,
});

// Handlers

const handlePrice = (msg: TelegramBot.Message) => {
  fetch('https://api.dex.guru/v2/tokens/', { method: 'post', body: '{"ids":["0xAe448cB5A3ec77BA4aDcc6C8f9621e5921DCd77a-bsc"]}' })
  .then(respose => respose.json())
  .then(result => {
    const data = [`💲 Current GRUMPYSHIB price is: <b>${Number(result.data[0].priceUSD).toFixed(18).replace(/\.?0+$/, '')} USD</b>`];
    if (result.data[0].priceUSDChange24h !== 0) {
      const isUp = result.data[0].priceUSDChange24h > 0;
      data.push(`${isUp ? '📈' : '📉'} GRUMPYSHIB today is <b>${isUp ? 'up' : 'down'}</b> for ${(result.data[0].priceUSDChange24h * 100).toFixed(2)}%`);
    }
    bot.sendMessage(msg.chat.id, data.join('\n'), { parse_mode : "HTML" });
  });
}

// All Messages

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, match?.[1] as string);
});

bot.onText(/\/price/, handlePrice);

// Private Messages

bot.onText(/\/start/, (msg) => {
  if (msg.chat.type !== 'private') { return; }
  bot.sendMessage(msg.chat.id, 'Hi there! Select any option from list', {
    reply_to_message_id: msg.message_id,
    reply_markup: {
      keyboard: 
      [
        [{text: '📈 Get Token Price'}],
        [{text: '🎁 Join Airdrop'}],
      ],
    }
  });
});

bot.onText(/📈 Get Token Price/, async (msg) => {
  if (msg.chat.type !== 'private') { return; }
  handlePrice(msg);
});

bot.onText(/🎁 Join Airdrop/, async (msg) => {
  if (msg.chat.type !== 'private') { return; }
  bot.sendMessage(msg.chat.id, 'Sorry, but currently there are no active airdrops. Stay tuned for updates!');
});

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
