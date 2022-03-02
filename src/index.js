import TelegramBotWrapper from './telegram-bot.js';
import cron from 'cron';

async function main() {
	telegramBotWrapper.sendMessage('Hey, from crontab!');
}

// Init telegram channel
const telegramBotWrapper = new TelegramBotWrapper();
telegramBotWrapper.init();
console.log('Started telegram bot');

// Schedule main task to every day at ...
const hours = 22;
const minutes = 4;
new cron.CronJob(`00 ${minutes} ${hours} * * *`, main, null, true, 'Asia/Jerusalem');
