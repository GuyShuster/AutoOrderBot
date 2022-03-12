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

async function getAvailableTimeOnDate(requestedDate, requestedTime, amountOfPeople) {
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
		const { data: responseData } = await axios.post('https://ontopo.co.il/api/availability/searchAvailability', requestData, { headers: config.headers });

		if (!responseData.availability_id) {
			throw new Error('Get available time api error: wrong response format from server (no availability_id)');
		} else if (!responseData.areas) {
			return {};
		} else if (responseData.areas.length && responseData.areas[0].id && responseData.areas[0].options.length && responseData.areas[0].options[0].time) {
			return { time: responseData.areas[0].options[0].time, availability_id: responseData.availability_id, area: responseData.areas[0].id };
		} else {
			throw new Error('Get available time api error: responseData.areas has a wrong format');
		}
	} catch (error) {
		throw new Error(`Get available time native axios error: ${error.message}`);
	}
}

async function chooseAvailableTimeOnDate(chosenDate, chosenTime, amountOfPeople, additionalAvailabilityData) {
	if (!chosenTime) {
		throw new Error('Choose available time error: no available time was found');
	}

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
		const { data: responseData } = await axios.post('https://ontopo.co.il/api/availability/searchAvailability', requestData, { headers: config.headers });

		if (!responseData.checkout_id) {
			throw new Error('Choose available time error: no checkout_id was given from the server');
		}

		return responseData.checkout_id;
	} catch (error) {
		throw new Error(`Choose available time error: ${error.message}`);
	}
}

async function fillContactDetails(checkoutId, firstName, lastName, email, phone) {
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
		await axios.post('https://ontopo.co.il/api/checkout/checkoutContact', requestData, { headers: config.headers });
	} catch (error) {
		throw new Error(`Fill contact details error: ${error.message}`);
	}
}

async function completeCheckout(checkoutId, phone) {
	const requestData = {
		checkout_id: checkoutId,
		phone,
	};

	try {
		const { data: responseData } = await axios.post('https://ontopo.co.il/api/checkout/checkoutComplete', requestData, { headers: config.headers });

		if (responseData.data && responseData.data.ticketUrl) {
			return responseData.data.ticketUrl;
		}
	} catch (error) {
		throw new Error(`Checkout completion error: ${error.message}`);
	}
}

export async function makeReservation(reservationData, { testing = false, logger = { log: console.log } } = {}) {
	if (!(reservationData instanceof ReservationData)) {
		throw new Error('The function must receive an reservation data instance');
	}

	try {
		const { time: chosenTime, ...additionalAvailabilityData } = await getAvailableTimeOnDate(reservationData.date, reservationData.time, reservationData.amountOfPeople);
		const checkoutId = await chooseAvailableTimeOnDate(reservationData.date, chosenTime, reservationData.amountOfPeople, additionalAvailabilityData);
		await fillContactDetails(checkoutId, reservationData.firstName, reservationData.lastName, reservationData.email, reservationData.phone);

		if (testing) {
			logger.log(`Success! got to one step before reservation completion. Checkout ID: ${checkoutId}`);
		} else {
			const ticketUrl = await completeCheckout(checkoutId, '0549439700');
	
			if (ticketUrl) {
				// TODO: Succeeded
			} else {
				// TODO: Failed
			}
		}
	} catch (error) {
		logger.log(error.message);
	}
}

// TODO: dont forget not to have for await on axios request to searchAvailability.
// Launch them all, the one that gets back first wins
// TODO: add telegram logs
// TODO: maybe add request timeouts
