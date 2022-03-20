import { startOfMonth, endOfMonth, getYear, isWithinInterval, eachDayOfInterval, isSaturday, isSunday, format, isFriday, isThursday, isWednesday, isSameDay } from 'date-fns';
import { FullyBookedError, TimeoutError, getAvailableTimeOnDate, finalizeReservation } from './single-reservation.js';
import { describeDates, wrapLogger, formatDateToReadable, formatTimeToReadable } from './utils.js';
import config from './config.js';

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

async function placeOrder(order, availabilityObjectPriorityLists, logger, testing) {
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
				logger.log(`Found an available spot at ${readableTime} on ${readableDate}!\nStarting order attempt...`);

				for (let i = 0; i < config.scheduler.maxFinalizeRetries; i++) {
					try {
						const reservationUrl = await finalizeReservation(date, chosenTime, order.reservationData, additionalAvailabilityData, { requestTimeout: minFinalizationTimeout, testing });
						const splitDate = readableDate.split('/');
						return { reservationUrl, rawDate: new Date(splitDate[2], splitDate[1] - 1, splitDate[0]) };
					} catch (error) {
						if (error instanceof TimeoutError) {
							minFinalizationTimeout = Math.min(minFinalizationTimeout * 2, config.scheduler.maxTimeoutMS);
							logger.log(`Finalization attempt timed out. Increasing minimal timeout to ${minFinalizationTimeout / 1000} seconds...`);
						} else {
							logger.log(`Finalization attempt failed: ${error.message}`);
						}
					}
				}
			} catch (error) {
				const dateDescription = describeDates(availabilityObjectPriorityList);
				if (error.errors.every(err => err instanceof FullyBookedError)) {
					logger.log(`All ${dateDescription} are taken, moving on to the next priority...`);
					fullyBookedDates += error.errors.length;
				} else if (error.errors.every(err => err instanceof TimeoutError)) {
					minTimeSearchTimeout = Math.min(minTimeSearchTimeout * 2, config.scheduler.maxTimeoutMS);
					logger.log(`All ${dateDescription} requests timed out. Increasing minimal timeout to ${minTimeSearchTimeout / 1000} seconds...`);
				} else {
					logger.log('All the requests failed because of something other than a timeout or a full booking.\nThe bot might have gotten blocked.\nAborting order...');
					error.errors.forEach(err => console.log(err.message)); // Console on purpose, for post mortem
				}
			}
		}
	}

	// If all dates are fully booked, throw an error to finish the program
	throw new Error();
}

export async function startScheduler({ rawLogger = console.log, testing = false } = {}) {
	const logger = wrapLogger(rawLogger);
	const availabilityObjects = getAvailabilityObjects();
	const availabilityObjectPriorityLists = getAvailabilityObjectPriorityLists(availabilityObjects);
	const orders = config.orders;

	logger.log('Started ordering!');

	for (const [orderIndex, order] of orders.entries()) {
		try {
			logger.log(`Executing ${order.orderName}`);
			
			const { reservationUrl, rawDate } = await placeOrder(order, availabilityObjectPriorityLists, logger, testing);
			if (orderIndex + 1 < orders.length) {
				config.orders[orderIndex + 1].weekdaysToSkip.push(rawDate);
			}

			logger.log(`${order.orderName} was succesfull!\nHere is the URL: ${reservationUrl}`);
		} catch (error) {
			logger.log('No seats left in the restaurant at all, bot shutting down...');
			return;
		}
	}

	logger.log('All orders were successful!\nBot shutting down...');
}
