## Configuration

All configuration is in `config.js`:

- `server.port` – API server port
- `mockServerBaseUrl` – Base URL for the external mock server
- `retry.maxFailures` – Number of allowed failures in a sliding window
- `retry.windowSeconds` – Duration of the sliding window in seconds
- `retry.backoffMs` – Delay before retrying after repeated failures
- `throttle.maxConcurrency` – Maximum concurrent outgoing calls to the external server

## Current Implementation

### Performance Improvements

**Endpoint:** `/getEventsByUserId/:id`  
**Issue:** Sequential fetching caused slowness for users with many events  
**Solution:** Events fetched in parallel with `Promise.all()` respecting the mock server's intentional delays  
**Benefit:** Faster responses for users with multiple events  

### Resilience Improvements

**Endpoint:** `/addEvent`  
**Issue:** External service `http://event.com/addEvent` fails under load  
**Solution:**  
- Tracks failures in a `failureLog` array  
- If 3+ failures occur within 30 seconds:
  - Apply backoff delay (`retry.backoffMs`) before sending more requests  
  - Reduces load on the external service during failure periods  
- Clients receive HTTP 500 with error details if the service is unavailable  
**Benefit:** Handles external service instability gracefully and avoids cascading failures  

**Sample Failure Flow:**  
1. Client POSTs to `/addEvent` with payload: `{ "userId": 1, "name": "New Event", "details": "Event details" }`  
2. External service fails (returns `success: false`)  
3. Failure logged in `failureLog`  
4. If 3+ failures in 30s, server waits `retry.backoffMs` ms before next request  
5. Normal operations resume once the service responds successfully  

### Concurrency Throttling

Limits simultaneous outgoing calls to the mock server (configured in `config.js`) to keep `/getEventsByUserId` and `/addEvent` performant under load.

## Future Improvements

- IP-based rate limiting to prevent API abuse  
- Pagination for `/getUsers` and `/getEvents` for large datasets  
- Advanced circuit breaker for `/addEvent` to pause requests during persistent failures and probe recovery  

## How to Run

1. Install dependencies:

npm install

2. Start the server:

npm start

API Endpoints and Sample curl Requests

1. GET /getUsers – Returns a list of users

curl -X GET http://localhost:3000/getUsers

2. GET /getEvents – Returns a list of all events

curl -X GET http://localhost:3000/getEvents

3. GET /getEventsByUserId/:id – Returns all events for a given user

curl -X GET http://localhost:3000/getEventsByUserId/1

4. POST /addEvent – Adds a new event
Payload example: { "userId": 1, "name": "Birthday Party", "details": "At my house" }

curl -X POST http://localhost:3000/addEvent \
  -H "Content-Type: application/json" \
  -d '{ "userId": 1, "name": "Birthday Party", "details": "At my house" }'