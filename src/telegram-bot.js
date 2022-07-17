/* eslint-disable no-fallthrough */
import TelegramBot from 'node-telegram-bot-api';

const TIMEOUT_BEFORE_SUICIDE = 10000;

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

			if (!this.chatIds.includes(chatId)) {
				this.chatIds.push(chatId);
			}

			switch (text) {
			case '/start':
				this.telegramBot.sendMessage(chatId, `Hey ${firstName.toLowerCase() === 'may' ? 'Baybz ❤' : firstName}!\nOCD bot updates here, stay tuned...`);
				break;
			case '/kill':
				this.telegramBot.sendMessage(chatId, `Terminating bot...\n${TIMEOUT_BEFORE_SUICIDE / 1000} seconds before suicide...`);
				setTimeout(() => {
					process.exit(0);
				}, TIMEOUT_BEFORE_SUICIDE);
			default:
				if (!this.sentWarning) {
					this.telegramBot.sendMessage(chatId, 'This channel is for updates only!\n All following messages here will be ignored...');
					this.sentWarning = true;
				}
				break;
			}
		});
	}

	sendMessage(message) {
		// TODO: test if two people can receive messages
		for (const chatId of this.chatIds) {
			this.telegramBot.sendMessage(chatId, message);
		}
	}
}

const telegramBotWrapper = new TelegramBotWrapper();
telegramBotWrapper.init();
console.log('Started telegram bot');

export default telegramBotWrapper;