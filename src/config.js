
import ReservationData from './reservation-data.js';


// https://ontopo.co.il/2918799/ (Full bot logic, 5 steps like OCD)
// https://ontopo.co.il/komarovskysummer
// https://ontopo.co.il/makura (Everything except credit card, 4 steps) - CHANGE TIME TO NOON
// https://ontopo.co.il/netofawinery (Everything except credit card, 4 steps) - CHANGE TIME TO NOON

const MONTH = 6; // TODO: change to actual...
const YEAR = 2022;

export default {
	cronJob: {
		startTimeHours: 12, // TODO: change to actual...
		startTimeMinutes: 0,
		firstAlertMinutesBack: 5,
		secondAlertMinutesBack: 1,
	},
	order: {
		pageId: 'mashya', // TODO: change to actual...
		locale: 'he',
		regionCode: 'il',
		rememberMe: false,
	},
	headers: {
		'accept': 'application/json, text/plain, */*',
		'accept-language': 'en-US,en;q=0.9',
		'content-type': 'application/json;charset=UTF-8',
		'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="99", "Google Chrome";v="99"',
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
		'sec-fetch-dest': 'empty',
		'sec-fetch-mode': 'cors',
		'sec-fetch-site': 'same-origin',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
	},
	scheduler: {
		month: MONTH,
		year: YEAR,
		minTimeoutMS: 1000 * 10, // 10 secs
		maxTimeoutMS: 1000 * 40, // 40 secs
		maxFinalizeRetries: 3,
	},
	orders: [
		{
			orderName: 'May and Guy\'s order',
			weekdaysToSkip: [
				// new Date(YEAR, MONTH - 1, 2),
			],
			reservationData: new ReservationData(
				'2',
				'גיא',
				'שוסטר',
				'guygosha@gmail.com',
				'0549439700',
			),
		},
		{
			orderName: 'Eyal and Gali\'s order',
			weekdaysToSkip: [
				// new Date(YEAR, MONTH - 1, 10), // TODO: decide if needed
			],
			reservationData: new ReservationData( // TODO: update with actual info
				'2',
				'מאי',
				'סבן',
				'maysaban98@gmail.com',
				'0545620381',
			),
		},
	],
};