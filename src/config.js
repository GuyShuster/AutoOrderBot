const config = {
	cronJob: {
		startTimeHours: 12,
		startTimeMinutes: 0,
		firstAlertMinutesBack: 5,
		secondAlertMinutesBack: 1,
	},
	order: {
		pageId: 'babayaga', // TODO: test on different restaurants...
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
};

export default config;
