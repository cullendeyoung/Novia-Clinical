import { httpRouter } from "convex/server";
import { authClient, createAuth } from "./auth";

const http = httpRouter();

authClient.registerRoutes(http, createAuth, { cors: true });

export default http;
