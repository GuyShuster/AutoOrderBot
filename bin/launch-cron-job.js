import cron from 'cron';
import TelegramBotWrapper from '../src/telegram-bot.js';
import config from '../src/config.js';

async function main() {
	telegramBotWrapper.sendMessage('Hey, from crontab!');
}

function sendAlert(minutesToGo) {
	telegramBotWrapper.sendMessage(`ALERT!\nBot will launch in ${minutesToGo} minutes`);
}

function normalizeAlertTime(minutesBack) {
	const minuteDifference = config.cronJob.startTimeMinutes - minutesBack;
	const hours = minuteDifference < 0 ? config.cronJob.startTimeHours - 1 : config.cronJob.startTimeHours;
	const minutes = minuteDifference < 0 ? 60 - (minuteDifference * -1) : minuteDifference;

	return { hours, minutes, minutesAsString };
}

function minutesAsString(minutes) {
	return minutes < 9 ? `0${minutes}` : `${minutes}`;
}

// Init telegram channel
const telegramBotWrapper = new TelegramBotWrapper();
telegramBotWrapper.init();
console.log('Started telegram bot');

// Schedule Alerts
const { hours: firstAlertHours, minutes: firstAlertMinutes } = normalizeAlertTime(config.cronJob.firstAlertMinutesBack);
const firstAlertMinutesAsString = minutesAsString(firstAlertMinutes);
new cron.CronJob(`00 ${firstAlertMinutes} ${firstAlertHours} * * *`, () => sendAlert(config.cronJob.firstAlertMinutesBack), null, true, 'Asia/Jerusalem');
console.log(`First alert will be sent at ${firstAlertHours}:${firstAlertMinutesAsString}`);

const { hours: secondAlertHours, minutes: secondAlertMinutes } = normalizeAlertTime(config.cronJob.secondAlertMinutesBack);
const secondAlertMinutesAsString = minutesAsString(secondAlertMinutes);
new cron.CronJob(`00 ${secondAlertMinutes} ${secondAlertHours} * * *`, () => sendAlert(config.cronJob.secondAlertMinutesBack), null, true, 'Asia/Jerusalem');
console.log(`Second alert will be sent at ${secondAlertHours}:${secondAlertMinutesAsString}`);

// Schedule main job
const cronJobMinutesAsString = minutesAsString(config.cronJob.startTimeMinutes);
new cron.CronJob(`00 ${config.cronJob.startTimeMinutes} ${config.cronJob.startTimeHours} * * *`, main, null, true, 'Asia/Jerusalem');
console.log(`Main cron job will be executed at ${config.cronJob.startTimeHours}:${cronJobMinutesAsString}`);
