import fetch from 'isomorphic-fetch';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN as string, {
  polling: true,
});

bot.onText(/\/echo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, match?.[1] as string);
});

bot.onText(/\/price/, (msg) => {
  fetch('https://api.dex.guru/v2/tokens/', { method: 'post', body: '{"ids":["0xAe448cB5A3ec77BA4aDcc6C8f9621e5921DCd77a-bsc"]}' })
  .then(res => res.json())
  .then(res => {
    const data = [`💲 Current GRUMPYSHIB price is: <b>${Number(res.data[0].priceUSD).toFixed(18).replace(/\.?0+$/, '')} USD</b>`];
    if (res.data[0].priceUSDChange24h !== 0) {
      const isUp = res.data[0].priceUSDChange24h > 0;
      data.push(`${isUp ? '📈' : '📉'} GRUMPYSHIB today is <b>${isUp ? 'up' : 'down'}</b> for ${(res.data[0].priceUSDChange24h * 100).toFixed(2)}%`);
    }
    bot.sendMessage(msg.chat.id, data.join('\n'), { parse_mode : "HTML" });
  });
});

bot.on('message', (msg) => {
  console.log(msg.chat.id);
});
