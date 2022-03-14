import { startOfMonth, endOfMonth, getYear, isWithinInterval, eachDayOfInterval, isSaturday, isSunday, format, isFriday, isThursday, isWednesday } from 'date-fns';
import { FullyBookedError } from './single-reservation.js';
import config from './config.js';

function wrapLogger(logger) {
	return {
		log: logger,
	};
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

export function getAvailabilityObjectPriorityLists(availabilityObjects) {
	const wednesdays = availabilityObjects.filter(availabilityObject => isWednesday(availabilityObject.rawDate));
	const thursdays = availabilityObjects.filter(availabilityObject => isThursday(availabilityObject.rawDate));
	const fridays = availabilityObjects.filter(availabilityObject => isFriday(availabilityObject.rawDate));
	const rest = availabilityObjects.filter(availabilityObject =>
		!isWednesday(availabilityObject.rawDate) && !isThursday(availabilityObject.rawDate) && !isFriday(availabilityObject.rawDate));

	return [wednesdays, thursdays, fridays, rest];
}

async function placeOrder(order, availabilityObjectPriorityLists, logger) {
	let fullyBookedDates = 0;
	const fullyBookedDatesLimit = availabilityObjectPriorityLists.flatMap(availabilityObjectPriorityList => availabilityObjectPriorityList).length;

	// Attempt all dates until fully booked
	while (fullyBookedDates < fullyBookedDatesLimit) {
		for (const availabilityObjectPriorityList of availabilityObjectPriorityLists) {
			for (const availabilityObject of availabilityObjectPriorityList) {
				try {
					// TODO: order + return value
				} catch (error) {
					if (error instanceof FullyBookedError) {
						fullyBookedDates += 1;
					}
					logger.log(error.message);
				}
			}
		}
	}

	// If all dates are fully booked, throw an error to finish the program
	throw new Error();
}

export async function startScheduler({ rawLogger = console.log } = {}) {
	const logger = wrapLogger(rawLogger);
	const availabilityObjects = getAvailabilityObjects(); // TODO: maybe generate one minute before for better timing
	const availabilityObjectPriorityLists = getAvailabilityObjectPriorityLists(availabilityObjects);
	const orders = config.orders;

	logger.log('Started ordering!');

	for (const order of orders) {
		try {
			const orderUrl = await placeOrder(order, availabilityObjectPriorityLists, logger);
			logger.log(`${order.orderName} was succesfull!\nHere is the URL: ${orderUrl}\nExcecuting the next order...`);
		} catch (error) {
			logger.log('No seats left in the restaurant at all, bot shutting down...');
			return;
		}
	}
	
	logger.log('All orders were successful!\nBot shutting down...');
}


// Launching orders:
// add telegram logs
// use Promise.race for single reservations: Launch them all, the one that gets back first wins
// increase request timeouts if a timeout error is received

// Scheduling:
// Use date-fns
// Make date priorities for each order, and add specific times to these dates because ontopo only answers to times when the restaurant is working
// Check date validity with intervals 
// If any of the config values don't pass the validity, throw error and dont launch bot at all.
// When the bot is "released" and running on it's own we need everything to be perfect and automatic, so checking stuff in config before the cron job is launched is key!