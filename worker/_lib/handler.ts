/** Eine API-Route: erhält die Anfrage und eine Funktion, die Arbeit nach der Antwort zu Ende laufen lässt. */
export type Handler = (request: Request, waitUntil: (promise: Promise<unknown>) => void) => Promise<Response>;
