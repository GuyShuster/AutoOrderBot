



// Launching orders:
// add telegram logs
// use Promise.race for single reservations: Launch them all, the one that gets back first wins
// increase request timeouts if a timeout error is received

// Scheduling:
// Use date-fns
// Make date priorities for each order
// Check date validity with intervals 
// If any of the config values don't pass the validity, throw error and dont launch bot at all.
// When the bot is "released" and running on it's own we need everything to be perfect and automatic, so checking stuff in config before the cron job is launched is key!