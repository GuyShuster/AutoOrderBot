import config from './config.js';
import axios from 'axios';

async function getAvailableTimeOnDate(requestedDate, requestedTime, amoutOfPeople) {
	const requestData = {
		page_id: config.order.pageId,
		locale: config.order.locale,
		criteria: {
			date: requestedDate,
			time: requestedTime,
			size: amoutOfPeople,
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

async function chooseAvailableTimeOnDate(chosenDate, chosenTime, amoutOfPeople, additionalAvailabilityData) {
	if (!chosenTime) {
		throw new Error('Choose available time error: no available time was found');
	}

	const requestData = {
		page_id: config.order.pageId,
		locale: config.order.locale,
		criteria: {
			date: chosenDate,
			time: chosenTime,
			size: amoutOfPeople,
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

async function fillContactDetails(checkoutId, contactDetails) {
	const requestData = {
		checkout_id: checkoutId,
		region_code: config.order.regionCode,
		remember_me: config.order.rememberMe,
		...contactDetails
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

async function singleOrder(date, requestedTime, amoutOfPeople) {
	try {
		const { time: chosenTime, ...additionalAvailabilityData } = await getAvailableTimeOnDate(date, requestedTime, amoutOfPeople);
		const checkoutId = await chooseAvailableTimeOnDate(date, chosenTime, amoutOfPeople, additionalAvailabilityData);
		await fillContactDetails(checkoutId, {
			'first_name':'shlomo',
			'last_name':'shlomo',
			'email':'shlomo@gmail.com',
			'phone':'0549439700',
		});
		const ticketUrl = await completeCheckout(checkoutId, '0549439700');

		if (ticketUrl) {
			// TODO: Succeeded
		} else {
			// TODO: Failed
		}
	} catch (error) {
		console.log(error.message);
	}
}

async function launchOrderBot() {
	const date = '20220505';
	const time = '1230';
	const amoutOfPeople = '2';
	await singleOrder(date, time, amoutOfPeople);
}

export default launchOrderBot;

// TODO: dont forget not to have for await on axios request to searchAvailability.
// Launch them all, the one that gets back first wins
// TODO: add telegram logs
// TODO: maybe add request timeouts
