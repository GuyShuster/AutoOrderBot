import TelegramBot from 'node-telegram-bot-api';

class TelegramBotWrapper {
	constructor() {
		this.sentWarning = false;
		this.token = '5148195383:AAEGKDymDRJ_SU7ONab3WW6mSvQsdfQeybo';
		this.telegramBot = new TelegramBot(this.token, { polling: true });
		this.chatIds = [];
	}

	init() {
		this.telegramBot.on('message', (message) => {
			const { from: { is_bot }, chat: { id: chatId, first_name: firstName }, text } = message;

			if (is_bot) {
				return;
			}

			if (text === '/start') {
				this.telegramBot.sendMessage(chatId, `Hey ${firstName.toLowerCase() === 'may' ? 'Baybz ❤' : firstName}\nOCD bot updates here, stay tuned...`);
				this.chatIds.push(chatId);
			} else if (!this.sentWarning) {
				this.telegramBot.sendMessage(chatId, 'All following messages here will be ignored, this channel is for updates only...');
				this.sentWarning = true;
			}
		});
	}

	sendMessage(message) {
		for (const chatId of this.chatIds) {
			this.telegramBot.sendMessage(chatId, message);
		}
	}
}

export default TelegramBotWrapper;