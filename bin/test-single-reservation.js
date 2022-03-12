import { makeReservation, ReservationData } from '../src/single-reservation.js';

const reservationData = new ReservationData('20220505', '1230', '2', 'shlomo', 'shlomo', 'shlomo@gmail.com', '0541111111');
await makeReservation(reservationData, { testing: true });
process.exit(0);
