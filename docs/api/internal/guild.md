# Guild Page Proxy

`GET /api/idlemmo/guild/{id}/{resource}?page=N`

Requires an authenticated session and its IdleMMO token. Allowed guild IDs are 4, 697, and 161. Resource is `members` or `activity`; page must be a positive safe integer (default 1, ignored for members). Invalid input returns 400, missing authentication 401, and missing token 400.

Returns one upstream members or activity payload and its HTTP status. Forwards `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`. Responses are private/no-store. Tokens remain server-side; requests use the central server coordinator and receive the browser request's abort signal. Transport failures return 502.

Guild navigation authenticates and renders without fetching IdleMMO data. The browser loads members followed by individual activity pages through the existing session queue, publishing rows as pages arrive. Every mounted view gets a unique scope and cancels only its own requests on unmount. Cached snapshots are partitioned by API-key fingerprint and guild ID. Completed snapshots are reused for 60 seconds; interrupted histories resume at the next page. An API-key change aborts the view and rejects obsolete responses.

Counts are explicitly incomplete until the final page arrives. A refresh failure preserves loaded rows and shows a non-blocking warning. Guild data has no existing D1 table, so this change uses only session memory and adds no schema or distributed infrastructure. Snapshots do not survive reloads and represent one traversal of the upstream history, not an atomic historical snapshot.
