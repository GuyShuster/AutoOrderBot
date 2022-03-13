import makeReservation from '../src/single-reservation.js';
import ReservationData from '../src/reservation-data.js';

const reservationData = new ReservationData('2', 'shlomo', 'shlomo', 'shlomo@gmail.com', '0541111111');
await makeReservation('20220505', '1230', reservationData, { testing: true });
process.exit(0);
