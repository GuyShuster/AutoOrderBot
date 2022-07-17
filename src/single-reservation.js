import config from './config.js';
import axios from 'axios';

export class FullyBookedError extends Error { }
export class TimeoutError extends Error { }

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

async function fillCreditCardDetails(checkoutId, cardNumber, expirationMonth, expirationYear, backOfTheCardCode, timeout) {
	const requestData = {
		checkout_id: checkoutId,
		remember_me: false,
		creditcard: {
			number: cardNumber,
			exp_month: expirationMonth,
			exp_year: expirationYear,
			csc: backOfTheCardCode,
		},
	};

	try {
		await axios.post('https://ontopo.co.il/api/checkout/checkoutCreditcard', requestData, { headers: config.headers, timeout });
	} catch (error) {
		if (error.code === 'ECONNABORTED') {
			throw new TimeoutError(`Axios request timed out after ${timeout}ms`);
		}
		throw new Error(`Fill contact details axios error: ${error.message}`);
	}
}

async function getMenu(checkoutId, timeout) {
	const requestData = {
		checkout_id: checkoutId,
		locale: config.order.locale,
	};

	try {
		const { data: responseData } = await axios.post('https://ontopo.co.il/api/checkout/getCheckout', requestData, { headers: config.headers, timeout });
		return responseData;
	} catch (error) {
		if (error.code === 'ECONNABORTED') {
			throw new TimeoutError(`Axios request timed out after ${timeout}ms`);
		}
		throw new Error(`Fill contact details axios error: ${error.message}`);
	}
}

async function chooseMenu(checkoutId, menuData, timeout) {
	const note = {
		note: {
			notices: [],
			noteComment: '',
			nameComment: '',
		}
	};
	const parentIndex = String(menuData?.package?.combo[0].index);
	const id = menuData?.package?.combo[0]?.items[0]?.product.product_id;
	const value = Number(menuData?.request?.size);

	const menuSize = menuData?.package?.combo.reduce((count, comboItem) => count + comboItem?.items.length, 0);

	const requestData = {
		checkout_id: checkoutId,
		selected_package: {
			...note,
			products: [
				{
					parentIndex,
					id,
					value,
					extras: [],
					...note,
					notes: [],
					includeLocked: null,
				},
				...Array(menuSize - 1).fill(null),
			],
		},
	};

	try {
		await axios.post('https://ontopo.co.il/api/checkout/checkoutPackage', requestData, { headers: config.headers, timeout });
	} catch (error) {
		if (error.code === 'ECONNABORTED') {
			throw new TimeoutError(`Axios request timed out after ${timeout}ms`);
		}
		throw new Error(`Fill contact details axios error: ${error.message}`);
	}
}

async function completeCheckout(checkoutId, phone, backOfTheCardCode, timeout) {
	const requestData = {
		checkout_id: checkoutId,
		phone,
		cart: {
			csc: backOfTheCardCode,
		},
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
		slug: config.order.slug,
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
		} else if (responseData.areas[0]?.id && responseData.areas[0]?.options[0]?.time) {
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
		slug: config.order.slug,
		locale: config.order.locale,
		criteria: {
			area: additionalAvailabilityData.area,
			date: chosenDate,
			time: chosenTime,
			size: amountOfPeople,
		},
		availabilityId: additionalAvailabilityData.availability_id,
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
	// Hamburger icon
	const menuData = await getMenu(checkoutId, requestTimeout);
	await chooseMenu(checkoutId, menuData, requestTimeout);

	// Person icon
	await fillContactDetails(checkoutId, reservationData.firstName, reservationData.lastName, reservationData.email, reservationData.phone, requestTimeout);

	if (testing) {
		console.log('Success! Found an available time and chose menu. Only thing left is credit card + to complete the reservation.');
		return;
	}

	// Credit card icon
	await fillCreditCardDetails(checkoutId, reservationData.creditCardNumber, reservationData.creditCardExpirationMonth,
		reservationData.creditCardExpirationYear, reservationData.backOfTheCardCode, requestTimeout);

	// Checklist icon (final reservation approval)
	const reservationUrl = await completeCheckout(checkoutId, reservationData.phone, reservationData.backOfTheCardCode, requestTimeout);
	return reservationUrl;
}
