import config from './config.js';
import axios from 'axios';

export class ReservationData {
	constructor(date, time, amountOfPeople, firstName, lastName, email, phone) {
		this.date = date;
		this.time = time;
		this.amountOfPeople = amountOfPeople;
		this.firstName = firstName;
		this.lastName = lastName;
		this.email = email;
		this.phone = phone;
	}
}

async function getAvailableTimeOnDate(requestedDate, requestedTime, amountOfPeople, timeout) {
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
			throw new Error('Get available time error: no available time was found');
		} else if (responseData.areas.length && responseData.areas[0].id && responseData.areas[0].options.length && responseData.areas[0].options[0].time) {
			return { time: responseData.areas[0].options[0].time, availability_id: responseData.availability_id, area: responseData.areas[0].id };
		} else {
			throw new Error('Get available time api error: responseData.areas had an unexpected format');
		}
	} catch (error) {
		throw new Error(`Get available time axios error: ${error.message}`);
	}
}

async function chooseAvailableTimeOnDate(chosenDate, chosenTime, amountOfPeople, additionalAvailabilityData, timeout) {
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
		throw new Error(`Choose available time axios error: ${error.message}`);
	}
}

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
		throw new Error(`Checkout completion axios error: ${error.message}`);
	}
}

export async function makeReservation(reservationData, { testing = false, requestTimeout = 0 } = {}) {
	if (!(reservationData instanceof ReservationData)) {
		throw new Error('The function must receive an reservation data instance');
	}

	const { time: chosenTime, ...additionalAvailabilityData } = await getAvailableTimeOnDate(reservationData.date, reservationData.time, reservationData.amountOfPeople, requestTimeout);
	const checkoutId = await chooseAvailableTimeOnDate(reservationData.date, chosenTime, reservationData.amountOfPeople, additionalAvailabilityData, requestTimeout);
	await fillContactDetails(checkoutId, reservationData.firstName, reservationData.lastName, reservationData.email, reservationData.phone, requestTimeout);

	if (testing) {
		console.log(`Success! got to one step before reservation completion. Checkout ID: ${checkoutId}`);
		return;
	}
	
	const reservationUrl = await completeCheckout(checkoutId, reservationData.phone);
	return reservationUrl;
}
