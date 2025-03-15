import log from "loglevel";

// Set default logging level (change to "debug" during development)
log.setLevel(import.meta.env.MODE === "development" ? "debug" : "warn");

export default log;
