import { startOfMonth, endOfMonth, getYear, isWithinInterval, eachDayOfInterval, isSaturday, isSunday, format, isFriday, isThursday, isWednesday, isSameDay } from 'date-fns';
import { FullyBookedError, TimeoutError, getAvailableTimeOnDate, finalizeReservation, chooseAvailableTimeOnDate } from './single-reservation.js';
import { describeDates, formatDateToReadable, formatTimeToReadable } from './utils.js';
import config from './config.js';
import telegramBotWrapper from './telegram-bot.js';

function log(message) {
	console.log(message);

	try {
		telegramBotWrapper.sendMessage(message);
	} catch (error) {
		// Best effort, do nothing
	}
}

export function getAvailabilityObjects() {
	// Check if defined
	if (!config?.scheduler?.month || !config?.scheduler?.year) {
		throw new Error('No month or year provided');
	}

	// Check if month is valid
	const monthIndex = config.scheduler.month - 1;
	const year = config.scheduler.year;
	if (year < getYear(Date.now()) || monthIndex < 0 || monthIndex > 11) {
		throw new Error(`Month ${monthIndex + 1} and year ${year} are invalid`);
	}

	// Create interval
	const randomDateInMonth = new Date(year, monthIndex, monthIndex);
	const dateInterval = {
		start: startOfMonth(randomDateInMonth),
		end: endOfMonth(randomDateInMonth),
	};

	// Check if all weekdays to skip are within range
	const weekdaysToSkip = config?.orders.map(order => order.weekdaysToSkip).flatMap(weekDay => weekDay);
	const datesOutsideOfRange = weekdaysToSkip.filter(date => !isWithinInterval(date, dateInterval));
	if (datesOutsideOfRange.length) {
		throw new Error(`Some dates are not in within ${monthIndex + 1}/${year}`);
	}

	// Create date range
	const daysOfInterval = eachDayOfInterval(dateInterval);
	const availabilityObjects = daysOfInterval
		.filter(date => !isSaturday(date) && !isSunday(date))
		.map(rawDate => ({
			rawDate,
			formattedDate: format(rawDate, 'yyyyMMdd'),
			times: isFriday(rawDate) ? ['1145', '1430'] : ['1845', '2130'],
		}));

	return availabilityObjects;
}

function getAvailabilityObjectPriorityLists(availabilityObjects) {
	const wednesdays = availabilityObjects.filter(availabilityObject => isWednesday(availabilityObject.rawDate));
	const thursdays = availabilityObjects.filter(availabilityObject => isThursday(availabilityObject.rawDate));
	const fridays = availabilityObjects.filter(availabilityObject => isFriday(availabilityObject.rawDate));
	const rest = availabilityObjects.filter(availabilityObject =>
		!isWednesday(availabilityObject.rawDate) && !isThursday(availabilityObject.rawDate) && !isFriday(availabilityObject.rawDate));

	return [wednesdays, thursdays, fridays, rest];
}

function checkForAllAvailableTimes(availabilityObjectPriorityList, order, timeout) {
	const promises = [];

	for (const availabilityObject of availabilityObjectPriorityList) {
		if (order.weekdaysToSkip.some(day => isSameDay(day, availabilityObject.rawDate))) {
			continue;
		}

		for (const time of availabilityObject.times) {
			const promise = getAvailableTimeOnDate(availabilityObject.formattedDate, time, order.reservationData.amountOfPeople, timeout);
			promises.push(promise);
		}
	}

	return promises;
}

async function placeOrder(order, availabilityObjectPriorityLists, testing) {
	let fullyBookedDates = 0;
	let minTimeSearchTimeout = config.scheduler.minTimeoutMS;
	let minFinalizationTimeout = config.scheduler.minTimeoutMS;
	const fullyBookedDatesLimit = availabilityObjectPriorityLists.flatMap(availabilityObjectPriorityList => availabilityObjectPriorityList).length;

	// Attempt all dates until fully booked
	while (fullyBookedDates < fullyBookedDatesLimit) {
		for (const availabilityObjectPriorityList of availabilityObjectPriorityLists) {
			const promises = checkForAllAvailableTimes(availabilityObjectPriorityList, order, minTimeSearchTimeout);

			try {
				const { date, time: chosenTime, ...additionalAvailabilityData } = await Promise.any(promises);
				const readableDate = formatDateToReadable(date);
				const readableTime = formatTimeToReadable(chosenTime);

				for (let i = 0; i < config.scheduler.maxFinalizeRetries; i++) {
					try {
						const checkoutId = await chooseAvailableTimeOnDate(date, chosenTime, order.reservationData.amountOfPeople, additionalAvailabilityData, minFinalizationTimeout);
						log(`Found an available spot at ${readableTime} on ${readableDate}: https://ontopo.co.il/checkout/${checkoutId}`);
						const reservationUrl = await finalizeReservation(checkoutId, order.reservationData, { requestTimeout: minFinalizationTimeout, testing });
						const splitDate = readableDate.split('/');
						return { reservationUrl, rawDate: new Date(splitDate[2], splitDate[1] - 1, splitDate[0]) };
					} catch (error) {
						if (error instanceof TimeoutError) {
							minFinalizationTimeout = Math.min(minFinalizationTimeout * 2, config.scheduler.maxTimeoutMS);
							log(`Finalization attempt timed out. Increasing minimal timeout to ${minFinalizationTimeout / 1000} seconds...`);
						} else {
							log(`Finalization attempt failed: ${error.message}`);
						}
					}
				}
			} catch (error) {
				const dateDescription = describeDates(availabilityObjectPriorityList);
				if (error.errors.every(err => err instanceof FullyBookedError)) {
					log(`All ${dateDescription} are taken, moving on to the next priority...`);
					fullyBookedDates += error.errors.length;
				} else if (error.errors.every(err => err instanceof TimeoutError)) {
					minTimeSearchTimeout = Math.min(minTimeSearchTimeout * 2, config.scheduler.maxTimeoutMS);
					log(`All ${dateDescription} requests timed out. Increasing minimal timeout to ${minTimeSearchTimeout / 1000} seconds...`);
				} else {
					log('All the requests failed because of something other than a timeout or a full booking. The bot might have gotten blocked...\nAborting order...');
					error.errors.forEach(err => console.log(err.message)); // Console on purpose, for post mortem
				}
			}
		}
	}

	// If all dates are fully booked, throw an error to finish the program
	throw new Error();
}

export async function startScheduler({ testing = false } = {}) {
	const availabilityObjects = getAvailabilityObjects();
	const availabilityObjectPriorityLists = getAvailabilityObjectPriorityLists(availabilityObjects);
	const orders = config.orders;

	for (const [orderIndex, order] of orders.entries()) {
		try {
			log(`Executing ${order.orderName}`);
			
			const { reservationUrl, rawDate } = await placeOrder(order, availabilityObjectPriorityLists, testing);
			if (orderIndex + 1 < orders.length) {
				config.orders[orderIndex + 1].weekdaysToSkip.push(rawDate);
			}

			log(`${order.orderName} was succesfull!\nHere is the URL: ${reservationUrl}`);
		} catch (error) {
			log('No seats left in the restaurant at all, bot shutting down...');
			return;
		}
	}

	log('All orders were successful!\nBot shutting down...');
}
