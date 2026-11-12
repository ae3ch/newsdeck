/** An API route: receives the request and a function that lets work finish after the response. */
export type Handler = (request: Request, waitUntil: (promise: Promise<unknown>) => void) => Promise<Response>;
