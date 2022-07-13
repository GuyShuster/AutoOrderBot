
import ReservationData from './reservation-data.js';

// https://ontopo.co.il/komarovskysummer - NOT AVAILABLE!
// https://ontopo.co.il/2918799/ (Full bot logic, 5 steps like OCD) - WORKING!
// https://ontopo.co.il/makura (Everything except credit card, 4 steps) - WORKING!
// https://ontopo.co.il/netofawinery (Everything except credit card, 4 steps) - WORKING!
// https://ontopo.co.il/galilmountain
//


const MONTH_OF_ORDER_ATTEMPT = 9; // TODO: change to actual...
const YEAR_OF_ORDER_ATTEMPT = 2022;
const ONTOPO_PAGE_ID = 'galilmountain';

export default {
	cronJob: {
		startTimeHours: 14, // TODO: change to actual...
		startTimeMinutes: 0,
		firstAlertMinutesBack: 5,
		secondAlertMinutesBack: 1,
	},
	order: {
		pageId: ONTOPO_PAGE_ID, // TODO: change to actual...
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
		month: MONTH_OF_ORDER_ATTEMPT,
		year: YEAR_OF_ORDER_ATTEMPT,
		minTimeoutMS: 1000 * 10, // 10 secs
		maxTimeoutMS: 1000 * 40, // 40 secs
		maxFinalizeRetries: 3,
		minutesUntilAllowedToExit: 12,
	},
	orders: [
		{
			orderName: 'May and Guy\'s order',
			weekdaysToSkip: [
				// new Date(YEAR, MONTH - 1, 2),
			],
			reservationData: new ReservationData(
				ONTOPO_PAGE_ID === '2918799' ? '12' : '2',
				'גיא',
				'שוסטר',
				'guygosha@gmail.com',
				'0549439700',
				'5118910001964376',
				'07',
				'26',
				'196',
			),
		},
		// TODO: Uncomment and add credit card
		// {
		// 	orderName: 'Eyal and Gali\'s order',
		// 	weekdaysToSkip: [
		// 		// new Date(YEAR, MONTH - 1, 10), // TODO: decide if needed
		// 	],
		// 	reservationData: new ReservationData( // TODO: update with actual info
		// 		'2',
		// 		'מאי',
		// 		'סבן',
		// 		'maysaban98@gmail.com',
		// 		'0545620381',
		// 	),
		// },
	],
};