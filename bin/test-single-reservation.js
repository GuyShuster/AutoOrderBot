import { finalizeReservation, getAvailableTimeOnDate, chooseAvailableTimeOnDate } from '../src/single-reservation.js';
import config from '../src/config.js';
import ReservationData from '../src/reservation-data.js';

const reservationData = new ReservationData('2', 'shlomo', 'shlomo', 'shlomo@gmail.com', '0541111111');
const { date, time: chosenTime, ...additionalAvailabilityData } = await getAvailableTimeOnDate('20220622', '2100', reservationData.amountOfPeople, config.scheduler.minTimeoutMS);
const checkoutId = await chooseAvailableTimeOnDate(date, chosenTime, reservationData.amountOfPeople, additionalAvailabilityData, config.scheduler.minTimeoutMS);
await finalizeReservation(checkoutId, reservationData, { testing: true, requestTimeout: config.scheduler.minTimeoutMS });
process.exit(0);
