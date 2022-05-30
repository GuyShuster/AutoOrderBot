import config from './config.js';
import axios from 'axios';

export class FullyBookedError extends Error {}
export class TimeoutError extends Error {}

async function fillContactDetails(checkoutId, firstName, lastName, email, phone, timeout) {
	const requestData = {
		checkout_id: checkoutId,
		region_code: config.order.regionCode,
		remember_me: config.order.rememberMe,
		first_name: firstName,
		last_name: lastName,
		email,
		phone,
	};

	try {
		await axios.post('https://ontopo.co.il/api/checkout/checkoutContact', requestData, { headers: config.headers, timeout });
	} catch (error) {
		if (error.code === 'ECONNABORTED') {
			throw new TimeoutError(`Axios request timed out after ${timeout}ms`);
		}
		throw new Error(`Fill contact details axios error: ${error.message}`);
	}
}

async function completeCheckout(checkoutId, phone, timeout) {
	const requestData = {
		checkout_id: checkoutId,
		phone,
	};

	try {
		const { data: responseData } = await axios.post('https://ontopo.co.il/api/checkout/checkoutComplete', requestData, { headers: config.headers, timeout });

		if (responseData.data && responseData.data.ticketUrl) {
			return responseData.data.ticketUrl;
		} else {
			throw new Error('Checkout completion error: no reservation url was returned');
		}
	} catch (error) {
		if (error.code === 'ECONNABORTED') {
			throw new TimeoutError(`Axios request timed out after ${timeout}ms`);
		}
		throw new Error(`Checkout completion axios error: ${error.message}`);
	}
}

function chooseTime(responseData) {
	for (const area of responseData.areas) {
		if (area.options) {
			const chosenOption = area.options.find(option => option.method === 'seat' || option.text === 'אישור מיידי');
			if (chosenOption && chosenOption.time && area.id) {
				return {
					time: chosenOption.time,
					availability_id: responseData.availability_id,
					area: area.id,
				};
			}
		}
	}
	
	throw new FullyBookedError('No imediate availability seats');
}

export async function getAvailableTimeOnDate(requestedDate, requestedTime, amountOfPeople, timeout) {
	const requestData = {
		page_id: config.order.pageId,
		locale: config.order.locale,
		criteria: {
			date: requestedDate,
			time: requestedTime,
			size: amountOfPeople,
		},
	};
	
	try {
		const { data: responseData } = await axios.post('https://ontopo.co.il/api/availability/searchAvailability', requestData, { headers: config.headers, timeout });

		if (!responseData.availability_id) {
			throw new Error('Get available time api error: wrong response format from server (no availability_id)');
		} else if (!responseData.areas) {
			throw new FullyBookedError('Get available time error: no available time was found');
		} else if (responseData.areas[0]?.id  && responseData.areas[0]?.options[0]?.time) {
			const chosenTimeObject = chooseTime(responseData);
			return { ...chosenTimeObject, date: requestedDate };
		} else {
			throw new Error('Get available time api error: responseData.areas had an unexpected format');
		}
	} catch (error) {
		if (error.code === 'ECONNABORTED') {
			throw new TimeoutError(`Axios request timed out after ${timeout}ms`);
		}
		throw new Error(`Get available time axios error: ${error.message}`);
	}
}

export async function chooseAvailableTimeOnDate(chosenDate, chosenTime, amountOfPeople, additionalAvailabilityData, timeout) {
	const requestData = {
		page_id: config.order.pageId,
		locale: config.order.locale,
		criteria: {
			date: chosenDate,
			time: chosenTime,
			size: amountOfPeople,
		},
		...additionalAvailabilityData,
	};

	try {
		const { data: responseData } = await axios.post('https://ontopo.co.il/api/availability/searchAvailability', requestData, { headers: config.headers, timeout });

		if (!responseData.checkout_id) {
			throw new Error('Choose available time error: no checkout_id was given from the server');
		}

		return responseData.checkout_id;
	} catch (error) {
		if (error.code === 'ECONNABORTED') {
			throw new TimeoutError(`Axios request timed out after ${timeout}ms`);
		}
		throw new Error(`Choose available time axios error: ${error.message}`);
	}
}

export async function finalizeReservation(checkoutId, reservationData, { testing = false, requestTimeout = 0 } = {}) {
	await fillContactDetails(checkoutId, reservationData.firstName, reservationData.lastName, reservationData.email, reservationData.phone, requestTimeout);

	if (testing) {
		console.log('Success! Found an available time. Only thing left is to complete the reservation.');
		return;
	}
	
	const reservationUrl = await completeCheckout(checkoutId, reservationData.phone);
	return reservationUrl;
}
