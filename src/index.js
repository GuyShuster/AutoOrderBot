import TelegramBotWrapper from './telegram-bot.js';

function main() {
	const telegramBotWrapper = new TelegramBotWrapper();
	telegramBotWrapper.init();
	
	console.log('started bot');

	setTimeout(() => {
		telegramBotWrapper.sendMessage('Update agter calculation');
		process.exit(0);
	}, 10000);
}

main();
