import { finalizeReservation, getAvailableTimeOnDate} from '../src/single-reservation.js';
import config from '../src/config.js';
import ReservationData from '../src/reservation-data.js';

const reservationData = new ReservationData('2', 'shlomo', 'shlomo', 'shlomo@gmail.com', '0541111111');
const { date, time: chosenTime, ...additionalAvailabilityData } = await getAvailableTimeOnDate('20220505', '1230', reservationData.amountOfPeople, config.scheduler.minTimeoutMS);
await finalizeReservation(date, chosenTime, reservationData, additionalAvailabilityData, { testing: true, requestTimeout: config.scheduler.minTimeoutMS });
process.exit(0);
