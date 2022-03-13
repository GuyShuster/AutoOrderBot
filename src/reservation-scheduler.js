import { startOfMonth, endOfMonth, getYear, isWithinInterval, eachDayOfInterval, isSaturday, isSunday, format, isFriday } from 'date-fns';
import config from './config.js';

export function getDateRange() {
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

	const daysOfInterval = eachDayOfInterval(dateInterval);
	const formatedDays = daysOfInterval
		.filter(date => !isSaturday(date) && !isSunday(date))
		.map(rawDate => ({
			date: format(rawDate, 'yyyyMMdd'),
			times: isFriday(rawDate) ? ['1145', '1430'] : ['1845', '2130'],
		}));
	
	return formatedDays;
}

export async function startScheduler() {
	console.log('here');
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