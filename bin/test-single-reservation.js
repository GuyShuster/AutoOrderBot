import makeReservation from '../src/single-reservation.js';

makeReservation('20220505', '1230', '2', { testing: true }).then(() => { process.exit(0); });