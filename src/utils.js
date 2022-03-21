import { isFriday, isThursday, isWednesday } from 'date-fns';

export function describeDates(dates) {
	const rawDate = dates[0].rawDate;
	if (isWednesday(rawDate)) {
		return 'wednesdays';
	} else if (isThursday(rawDate)) {
		return 'thursdays';
	} else if (isFriday(rawDate)) {
		return 'fridays';
	} else {
		return 'other dates';
	}
}

export function formatDateToReadable(date) {
	return `${date.substring(6, 8)}/${date.substring(4, 6)}/${date.substring(0, 4)}`;
}

export function formatTimeToReadable(time) {
	return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
}