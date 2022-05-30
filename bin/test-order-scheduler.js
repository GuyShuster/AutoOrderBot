import { startScheduler } from '../src/order-scheduler.js';

await startScheduler({ testing: true });
process.exit(0);