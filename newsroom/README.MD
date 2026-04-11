# Newsroom n8n Webhook Test Page

This webpage is a **practice playground for n8n automation testing**.

It helps you test and observe how your n8n workflows behave when sending and receiving HTTP requests.

## Purpose

- Practice end-to-end n8n webhook automation testing in a local environment.
- Quickly verify webhook responses from n8n workflows.
- Inspect incoming POST payloads sent from n8n back to this page URL.

## What This Webpage Does

- Sends manual **GET** requests to an n8n webhook URL.
- Displays the latest GET response body in the UI.
- Tracks request metrics:
- Success vs failed responses.
- Response type breakdown (JSON, Text, HTML, Other, Error).
- Request history table with time, status, code, and type.
- Accepts incoming **POST** requests at:
- `http://localhost:8888/practice/n8n/newsroom/`
- Stores the latest received POST data and displays it in a dedicated panel.
- Auto-refreshes the latest POST panel every 3 seconds.
- Saves webhook URL in browser `sessionStorage` with **Save Link** and **Clear Link** controls.

## UI/Tech Stack

- PHP (request handling and JSON endpoint)
- Bootstrap 5.3 (responsive layout)
- SweetAlert2 (notifications)
- Chart.js (request analytics charts)
- Font Awesome (icons)

## Project Files

- `index.php`: Main page template and request flow wiring.
- `util.php`: Reusable backend helper functions for POST handling and latest-post JSON response.
- `style.css`: External styles.
- `script.js`: External frontend logic (testing actions, charts, session storage, polling).

## Basic Usage

1. Open `http://localhost:8888/practice/n8n/newsroom/`.
2. Enter your n8n webhook URL.
3. Click `Save Link` to keep it during the current browser session.
4. Click `Test Webhook` (single request) or `Run Batch Test` (multiple requests).
5. Watch charts, history, and latest response panels update.
6. Send POST data from n8n to this page URL and monitor it in `Latest POST Response`.

## n8n Workflow Setup Example

Use this example to practice a full request/response cycle.

### Example A: GET Webhook Test

1. In n8n, add a **Webhook** node.
2. Set `HTTP Method` to `GET`.
3. Add a **Set** node (or **Code** node) after it to prepare a JSON response, for example:

```json
{
	"message": "Workflow was started"
}
```

4. Add a **Respond to Webhook** node and return the JSON.
5. Copy the webhook URL from n8n.
6. Paste it into this page and click `Test Webhook`.

### Example B: POST Back to This Page

1. In n8n, add an **HTTP Request** node in your workflow.
2. Set `Method` to `POST`.
3. Set `URL` to:

`http://localhost:8888/practice/n8n/newsroom/`

4. Set the body type to JSON and send sample data, for example:

```json
{
	"event": "n8n-test",
	"status": "ok",
	"source": "workflow-practice"
}
```

5. Execute the workflow.
6. Return to this webpage and check `Latest POST Response`.

Notes:
- The POST panel auto-refreshes every 3 seconds.
- Your local server (MAMP) and n8n must both be running.
- If n8n runs in Docker, `localhost` may refer to the container itself; use the host-accessible address when needed.

## Troubleshooting

### Webhook returns 404 or "Not found"
- Make sure the workflow is **active** in n8n (not just saved). Inactive workflows only respond on the test URL, not the production URL.
- Confirm you are using the correct URL (test vs. production). The test URL only works while the workflow editor is open and listening.

### MAMP not receiving POST from n8n
- Confirm MAMP is running and the page is reachable at `http://localhost:8888/practice/n8n/newsroom/`.
- If n8n runs inside Docker, `localhost` resolves to the container, not your Mac. Use `host.docker.internal` instead:
  `http://host.docker.internal:8888/practice/n8n/newsroom/`

### Latest POST panel never updates
- Check that `latest_post.json` is being created in the `newsroom/` folder after a POST is sent.
- If the file is not created, the `newsroom/` directory may not be writable. Fix with:
  ```
  chmod 755 /Applications/MAMP/htdocs/practice/n8n/newsroom/
  ```

### CORS errors in browser console
- GET requests to external n8n URLs may be blocked by browser CORS policy if n8n is on a different origin.
- For local testing, make sure both MAMP and n8n are running on `localhost`; cross-origin issues are less likely in that setup.
- If CORS errors persist, use a server-side PHP proxy instead of a direct browser fetch.

### Webhook URL not persisting after closing the browser
- `sessionStorage` is cleared when the browser window or tab is closed.
- This is by design for session-scoped persistence. If you want the URL to survive a full browser restart, swap `sessionStorage` for `localStorage` in `script.js`.
