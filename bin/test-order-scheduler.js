import { startScheduler } from '../src/order-scheduler.js';

await startScheduler({ testing: false });
process.exit(0);