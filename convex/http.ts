import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Registers the Convex Auth HTTP endpoints (sign-in, callbacks, etc.).
auth.addHttpRoutes(http);

export default http;
