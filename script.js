const WEBHOOK_STORAGE_KEY = "bt_n8n_webhook_url";
const webhookInput = document.getElementById("webhookUrl");
const saveUrlBtn = document.getElementById("saveUrlBtn");
const clearUrlBtn = document.getElementById("clearUrlBtn");
const batchCountInput = document.getElementById("batchCount");
const testBtn = document.getElementById("testBtn");
const batchBtn = document.getElementById("batchBtn");
const clearBtn = document.getElementById("clearBtn");
const responseContainer = document.getElementById("responseContainer");
const responseStatus = document.getElementById("responseStatus");
const latestPostStatus = document.getElementById("latestPostStatus");
const latestPostPre = document.getElementById("latestPostPre");
const totalCount = document.getElementById("totalCount");
const successRate = document.getElementById("successRate");
const historyBody = document.getElementById("historyBody");
const workstationSection = document.getElementById("workstation");
const workstationContent = document.getElementById("workstationContent");
const workstationTabLinks = Array.from(document.querySelectorAll("#testNavTabs .nav-link[data-workstation-tab]"));

const results = [];
let activeWorkstationTab = "mysql";
let detectedIp = "Detecting...";
let analyticsQueryResultText = "No query executed yet.";
let analyticsQueryResultError = false;
let analyticsDatasetCache = null;
let analyticsActionRunning = false;
let mysqlStatusLoaded = false;
let mysqlStatusLoading = false;
let mysqlStatusMarkup = `
	<div class="col-12">
		<div class="workstation-kpi" style="background-color: var(--primary-light);">
			<div class="text-muted small mb-2">Status</div>
			<div class="spinner-border spinner-border-sm me-2" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
			<span class="small">Checking MySQL connection and .env configuration...</span>
		</div>
	</div>
`;

const ANALYTICS_BUTTON_CONFIGS = {
	populate: {
		idle: '<i class="fa-solid fa-database me-2"></i>Populate Database With Test Data',
		loading: '<i class="fa-solid fa-spinner fa-spin me-2"></i>Populating...'
	},
	getJson: {
		idle: '<i class="fa-solid fa-code me-2"></i>Fetch Database JSON',
		loading: '<i class="fa-solid fa-spinner fa-spin me-2"></i>Fetching...'
	},
	clear: {
		idle: '<i class="fa-solid fa-trash me-2"></i>Clear Database Test Data',
		loading: '<i class="fa-solid fa-spinner fa-spin me-2"></i>Clearing...'
	},
	export: {
		idle: '<i class="fa-solid fa-file-arrow-down me-2"></i>Export Current Dataset JSON',
		loading: '<i class="fa-solid fa-spinner fa-spin me-2"></i>Exporting...'
	}
};

function getN8nTestPageBaseUrl() {
	const origin = window.location.origin;
	const normalizedPath = window.location.pathname.replace(/index\.php$/i, "");
	const pathWithTrailingSlash = normalizedPath.endsWith("/") ? normalizedPath : normalizedPath + "/";

	return origin + pathWithTrailingSlash;
}

function getResultBreakdown() {
	const success = results.filter(item => item.ok).length;
	const failed = results.length - success;

	return { success, failed };
}

function buildDatasetSummaryHtml(data) {
	if (!data) {
		return '';
	}

	const hours = Array.isArray(data.service_hours) ? data.service_hours.length : 0;
	const types = Array.isArray(data.service_types) ? data.service_types.length : 0;
	const appts = Array.isArray(data.appointments) ? data.appointments.length : 0;

	const statusCounts = { pending: 0, accepted: 0, rejected: 0, cancelled: 0 };
	if (Array.isArray(data.appointments)) {
		data.appointments.forEach(a => {
			if (a.status && statusCounts[a.status] !== undefined) {
				statusCounts[a.status]++;
			}
		});
	}

	return `
		<div class="row g-2 mb-3" id="analytics_dataset_summary">
			<div class="col-6 col-md-3">
				<div class="workstation-kpi text-center">
					<div class="text-muted small">Time Slots</div>
					<div class="fs-4 fw-bold" style="color:var(--secondary)">${hours}</div>
				</div>
			</div>
			<div class="col-6 col-md-3">
				<div class="workstation-kpi text-center">
					<div class="text-muted small">Services</div>
					<div class="fs-4 fw-bold" style="color:var(--primary)">${types}</div>
				</div>
			</div>
			<div class="col-6 col-md-3">
				<div class="workstation-kpi text-center">
					<div class="text-muted small">Appointments</div>
					<div class="fs-4 fw-bold" style="color:var(--secondary)">${appts}</div>
				</div>
			</div>
			<div class="col-6 col-md-3">
				<div class="workstation-kpi text-center small">
					<div class="text-muted small">Status Breakdown</div>
					<div><span class="text-success fw-semibold">${statusCounts.accepted}</span> accepted</div>
					<div><span class="text-warning fw-semibold">${statusCounts.pending}</span> pending</div>
					<div><span class="text-danger fw-semibold">${statusCounts.rejected}</span> rejected</div>
					<div><span class="text-muted fw-semibold">${statusCounts.cancelled}</span> cancelled</div>
				</div>
			</div>
		</div>`;
}

function setAnalyticsQueryResult(value, isError = false, data = null) {
	analyticsQueryResultText = value;
	analyticsQueryResultError = isError;

	const queryResult = document.getElementById("query_result");
	const queryResultWrapper = document.getElementById("query_result_wrapper");
	const summaryContainer = document.getElementById("analytics_summary_container");

	if (queryResult) {
		queryResult.textContent = analyticsQueryResultText;
	}
	if (queryResultWrapper) {
		queryResultWrapper.classList.toggle("border", analyticsQueryResultError);
		queryResultWrapper.classList.toggle("border-danger", analyticsQueryResultError);
	}
	if (summaryContainer) {
		const effectiveData = data || analyticsDatasetCache;
		summaryContainer.innerHTML = buildDatasetSummaryHtml(effectiveData);
	}
}

function setAnalyticsButtonsLoading(action, isLoading) {
	const allButtons = document.querySelectorAll("[data-analytics-action]");
	allButtons.forEach(btn => {
		const btnAction = btn.dataset.analyticsAction || "";
		const config = ANALYTICS_BUTTON_CONFIGS[btnAction];
		if (!config) {
			return;
		}
		if (btnAction === action) {
			btn.disabled = isLoading;
			btn.innerHTML = isLoading ? config.loading : config.idle;
		} else {
			btn.disabled = isLoading;
		}
	});
}

function getSqlActionUrl(action) {
	const endpoint = new URL(getN8nTestPageBaseUrl());
	endpoint.searchParams.set("sqlAction", action);
	endpoint.searchParams.set("_ts", String(Date.now()));
	return endpoint;
}

async function runSqlAction(action) {
	const endpoint = getSqlActionUrl(action);
	const response = await fetch(endpoint.toString(), {
		method: "POST",
		headers: {
			Accept: "application/json"
		}
	});

	const bodyText = await response.text();
	let payload = null;

	try {
		payload = JSON.parse(bodyText);
	} catch {
		throw new Error(bodyText || "Unexpected server response.");
	}

	if (!response.ok || !payload.ok) {
		throw new Error(payload.message || "SQL action failed.");
	}

	analyticsDatasetCache = payload.data || null;
	setAnalyticsQueryResult(JSON.stringify(payload, null, 2), false, payload.data || null);
	return payload;
}

async function exportAnalyticsDataset() {
	const payload = analyticsDatasetCache ? {
		ok: true,
		message: "Exported cached HairSalon dataset.",
		data: analyticsDatasetCache
	} : await runSqlAction("getJson");

	const now = new Date();
	const ts = now.getFullYear() +
		String(now.getMonth() + 1).padStart(2, "0") +
		String(now.getDate()).padStart(2, "0") + "_" +
		String(now.getHours()).padStart(2, "0") +
		String(now.getMinutes()).padStart(2, "0") +
		String(now.getSeconds()).padStart(2, "0");
	const filename = `bt_hairsalon_dataset_${ts}.json`;

	const blob = new Blob([JSON.stringify(payload.data || {}, null, 2)], { type: "application/json" });
	const downloadUrl = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = downloadUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(downloadUrl);

	const data = payload.data || {};
	const counts = {
		service_hours: Array.isArray(data.service_hours) ? data.service_hours.length : 0,
		service_types: Array.isArray(data.service_types) ? data.service_types.length : 0,
		appointments: Array.isArray(data.appointments) ? data.appointments.length : 0
	};
	setAnalyticsQueryResult(JSON.stringify({
		ok: true,
		message: `Current dataset exported as ${filename}.`,
		counts
	}, null, 2), false, data);
}

const ANALYTICS_ACTION_SUCCESS_MESSAGES = {
	populate: "Database populated successfully.",
	getJson: "Dataset loaded from database.",
	clear: "Database test data cleared.",
	export: "Dataset exported as JSON file."
};

async function handleAnalyticsAction(action) {
	if (analyticsActionRunning) {
		return;
	}

	analyticsActionRunning = true;
	setAnalyticsButtonsLoading(action, true);
	setAnalyticsQueryResult(`Running ${action}...`);

	try {
		if (action === "export") {
			await exportAnalyticsDataset();
		} else {
			await runSqlAction(action);
		}

		const successMsg = ANALYTICS_ACTION_SUCCESS_MESSAGES[action] || "Done.";
		Swal.fire({
			icon: "success",
			title: successMsg,
			timer: 1800,
			showConfirmButton: false,
			toast: true,
			position: "top-end"
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown SQL action error.";
		setAnalyticsQueryResult(message, true);
		Swal.fire({
			icon: "error",
			title: "Action failed",
			text: message
		});
	} finally {
		analyticsActionRunning = false;
		setAnalyticsButtonsLoading(action, false);
	}
}

function renderWorkstationContent() {
	if (!workstationContent) {
		return;
	}

	const { success, failed } = getResultBreakdown();
	const totalRequests = results.length;
	const latestResult = results[results.length - 1] || null;
	const analyticsBaseUrl = getN8nTestPageBaseUrl();
	const analyticsWebhookUrl = `${analyticsBaseUrl}?page=data-analytics&datasetcall=true`;
	const analyticsWebhookUrlSecure = `${analyticsBaseUrl}?page=data-analytics&datasetcall=true&auth=1`;

	if (activeWorkstationTab === "mysql") {
		workstationContent.innerHTML = `
			<h2 class="h5 mb-3"><i class="fa-solid fa-database me-2" style="color: var(--primary);"></i>MySQL Workstation</h2>
			<div id="mysql_status_container" class="row g-3">
				${mysqlStatusMarkup}
			</div>
		`;
		if (!mysqlStatusLoaded && !mysqlStatusLoading) {
			void loadMysqlStatus();
		}
		return;
	}

	if (activeWorkstationTab === "analytics") {
		workstationContent.innerHTML = `
			<h2 class="h5 mb-3"><i class="fa-solid fa-chart-pie me-2" style="color: var(--secondary);"></i>Analytics Workstation</h2>
			

			<div class="row g-3">
				<div class="col-12 col-md-6">
					<div class="small mb-3">
						<div><strong>URL:</strong> <div class="workstation-kpi">${analyticsBaseUrl}</div></div>
						<div><strong>Unique ID:</strong> <div class="workstation-kpi">be164d70f0798dbb6fe80336dc268f82</div></div>
						<div><strong>Webhook URL:</strong> <div class="workstation-kpi">${analyticsWebhookUrl}</div></div>
						<div><strong>Webhook URL (Secure):</strong> <div class="workstation-kpi">${analyticsWebhookUrlSecure}</div></div>
						<div><strong>Header auth name:</strong> <div class="workstation-kpi">api_auth_user</div></div>
						<div><strong>Header auth value:</strong> <div class="workstation-kpi">j[vKYdY68H(:WFb</div></div>
					</div>
					
				</div>
				<div class="col-12 col-md-6">
					<div class="d-grid gap-2">
						<button type="button" class="btn btn-primary" data-analytics-action="populate">
							<i class="fa-solid fa-database me-2"></i>Populate Database With Test Data
						</button>
						<button type="button" class="btn btn-outline-primary" data-analytics-action="getJson">
							<i class="fa-solid fa-code me-2"></i>Fetch Database JSON
						</button>
						<button type="button" class="btn btn-outline-danger" data-analytics-action="clear">
							<i class="fa-solid fa-trash me-2"></i>Clear Database Test Data
						</button>
						<button type="button" class="btn btn-outline-secondary" data-analytics-action="export">
							<i class="fa-solid fa-file-arrow-down me-2"></i>Export Current Dataset JSON
						</button>
						<button type="button" class="btn btn-primary" data-analytics-action="testApi">
							<i class="fa-solid fa-plug me-2"></i>Test API Endpoint
						</button>
					</div>
				</div>
			</div>

			<div id="analytics_summary_container" class="mt-3"></div>

			<div class="row g-3 my-2">
				<div class="col-12 col-md-12">
					<div class="workstation-kpi" style="background-color: var(--primary-light);" id="query_result_wrapper">
						<div class="text-muted small mb-1">Response</div>
						<pre id="query_result" class="mb-0 small" style="white-space: pre-wrap; word-break: break-word; max-height: 260px; overflow-y: auto;"></pre>
					</div>
				</div>
			</div>

			<p class="small text-muted mb-0 mt-3">Run single or batch tests to update these metrics in real time.</p>
		`;
		setAnalyticsQueryResult(analyticsQueryResultText, analyticsQueryResultError);
		return;
	}

	if (activeWorkstationTab === "api") {
		const latestStatus = latestResult ? String(latestResult.statusCode) : "N/A";
		const latestType = latestResult ? latestResult.responseType : "N/A";

		workstationContent.innerHTML = `
			<h2 class="h5 mb-3"><i class="fa-solid fa-plug-circle-check me-2" style="color: var(--primary);"></i>API Endpoint Workstation</h2>
			<div class="row g-3">
				<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Latest Status Code</div><div class="fs-4 fw-bold">${latestStatus}</div></div></div>
				<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Latest Response Type</div><div class="fs-4 fw-bold">${latestType}</div></div></div>
			</div>
			<p class="small text-muted mb-0 mt-3">Use this mode to validate endpoint behavior and payload format consistency.</p>
		`;
		return;
	}

	if (activeWorkstationTab === "airtable") {
		const latestType = latestResult ? latestResult.responseType : "N/A";

		workstationContent.innerHTML = `
			<h2 class="h5 mb-3"><i class="fa-solid fa-table me-2" style="color: var(--secondary);"></i>Airtable Workstation</h2>
			<div class="row g-3">
				<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Saved Webhook URL</div><div class="fs-6 fw-semibold">${webhookInput.value.trim() || "Not saved yet"}</div></div></div>
				<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Latest Response Type</div><div class="fs-4 fw-bold">${latestType}</div></div></div>
			</div>
			<p class="small text-muted mb-0 mt-3">Use this tab while validating Airtable field mapping and response format.</p>
		`;
		return;
	}

	if (activeWorkstationTab === "discord") {
		const latestStatus = latestResult ? String(latestResult.statusCode) : "N/A";

		workstationContent.innerHTML = `
			<h2 class="h5 mb-3"><i class="fa-brands fa-discord me-2" style="color: var(--secondary);"></i>Discord Workstation</h2>
			<div class="row g-3">
				<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Total Test Requests</div><div class="fs-4 fw-bold">${totalRequests}</div></div></div>
				<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Latest Status Code</div><div class="fs-4 fw-bold">${latestStatus}</div></div></div>
			</div>
			<p class="small text-muted mb-0 mt-3">Use this tab for Discord notification workflow checks and delivery status validation.</p>
		`;
		return;
	}

	if (activeWorkstationTab === "telegram") {
		const latestPostSync = latestPostStatus.textContent || "No POST received yet";

		workstationContent.innerHTML = `
			<h2 class="h5 mb-3"><i class="fa-brands fa-telegram me-2" style="color: var(--secondary);"></i>Telegram Workstation</h2>
			<div class="row g-3">
				<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Latest POST Sync</div><div class="fs-6 fw-semibold">${latestPostSync}</div></div></div>
				<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Success vs Failed</div><div class="fs-6 fw-semibold"><span class="text-success">${success}</span> success / <span class="text-danger">${failed}</span> failed</div></div></div>
			</div>
			<p class="small text-muted mb-0 mt-3">Use this tab to monitor Telegram message workflow outcomes and POST sync recency.</p>
		`;
		return;
	}

	workstationContent.innerHTML = `
		<h2 class="h5 mb-3"><i class="fa-solid fa-newspaper me-2" style="color: var(--primary);"></i>Newsroom Workstation</h2>
		<div class="row g-3">
			<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Workstation IP</div><div class="fs-5 fw-semibold" id="workstationIp">${detectedIp}</div></div></div>
			<div class="col-12 col-md-6"><div class="workstation-kpi"><div class="text-muted small">Latest POST Sync</div><div class="fs-6 fw-semibold">${latestPostStatus.textContent || "No POST received yet"}</div></div></div>
		</div>
		<p class="small text-muted mb-0 mt-3">Monitor incoming newsroom-style POST payloads while testing GET webhooks.</p>
	`;
}

function setActiveWorkstationTab(tabName) {
	activeWorkstationTab = tabName;
	workstationTabLinks.forEach((link) => {
		const isActive = link.dataset.workstationTab === tabName;
		link.classList.toggle("active", isActive);
		if (isActive) {
			link.setAttribute("aria-current", "page");
		} else {
			link.removeAttribute("aria-current");
		}
	});
	renderWorkstationContent();
	if (workstationSection) {
		workstationSection.classList.add("show");
	}
}

function setupWorkstationTabs() {
	workstationTabLinks.forEach((link) => {
		link.addEventListener("click", (event) => {
			event.preventDefault();
			setActiveWorkstationTab(link.dataset.workstationTab || "newsroom");
		});
	});

	if (workstationContent) {
		workstationContent.addEventListener("click", (event) => {
			const mysqlButton = event.target.closest(".test-db-btn");
			if (mysqlButton) {
				event.preventDefault();
				const dbName = mysqlButton.dataset.db || "";
				if (dbName !== "") {
					void testDatabaseAccess(dbName, mysqlButton);
				}
				return;
			}

			const button = event.target.closest("[data-analytics-action]");
			if (!button) {
				return;
			}

			event.preventDefault();
			void handleAnalyticsAction(button.dataset.analyticsAction || "");
		});
	}
}

async function detectWorkstationIp() {
	try {
		const response = await fetch("https://api.ipify.org?format=json", { method: "GET" });
		if (!response.ok) {
			return;
		}
		const data = await response.json();
		if (typeof data.ip === "string" && data.ip.trim() !== "") {
			detectedIp = data.ip.trim();
			renderWorkstationContent();
		}
	} catch {
		detectedIp = "Unavailable";
		renderWorkstationContent();
	}
}

async function loadMysqlStatus() {
	mysqlStatusLoading = true;

	try {
		const baseUrl = getN8nTestPageBaseUrl();
		const response = await fetch(`${baseUrl}?mysqlStatus=1`, {
			method: "GET",
			headers: { "Accept": "application/json" }
		});

		const data = await response.json();

		if (data.envFileExists === false) {
			mysqlStatusMarkup = `
				<div class="col-12">
					<div class="alert alert-warning" role="alert">
						<h5 class="alert-heading"><i class="fa-solid fa-triangle-exclamation me-2"></i>⚠️ .env File Not Found</h5>
						<p class="mb-0">The <code>.env</code> file is missing or not readable.</p>
						<small class="text-muted d-block mt-2">Create a <code>.env</code> file in the root directory with your MySQL credentials.</small>
					</div>
				</div>
			`;
			mysqlStatusLoaded = true;
			if (activeWorkstationTab === "mysql") {
				renderWorkstationContent();
			}
			return;
		}

		if (data.envFileEmpty === true) {
			mysqlStatusMarkup = `
				<div class="col-12">
					<div class="alert alert-warning" role="alert">
						<h5 class="alert-heading"><i class="fa-solid fa-triangle-exclamation me-2"></i>⚠️ Missing Database Credentials</h5>
						<p class="mb-1">The <code>.env</code> file is missing required database credentials.</p>
						<p class="mb-0 small"><strong>Required variables:</strong> DB_HOST, DB_USER, DB_PASSWORD (optional)</p>
					</div>
				</div>
			`;
			mysqlStatusLoaded = true;
			if (activeWorkstationTab === "mysql") {
				renderWorkstationContent();
			}
			return;
		}

		if (data.connectionStatus === "success") {
			const databases = data.databases || [];
			let databasesHtml = "";

			if (databases.length === 0) {
				databasesHtml = `
					<div class="col-12">
						<div class="alert alert-info" role="alert">
							<i class="fa-solid fa-info-circle me-2"></i>No user databases found on this MySQL server.
						</div>
					</div>
				`;
			} else {
				databasesHtml = `
					<div class="col-12">
						<div class="mb-3">
							<h6 class="mb-3"><i class="fa-solid fa-database me-2"></i>Available Databases</h6>
							<div class="list-group" style="max-height: 400px; overflow-y: auto;">
								${databases.map(db => `
									<div class="list-group-item d-flex justify-content-between align-items-center" data-db="${db}">
										<div class="d-flex align-items-center flex-grow-1">
											<i class="fa-solid fa-circle me-2" style="color: #ccc; font-size: 0.5rem;"></i>
											<span class="db-name">${escapeHtml(db)}</span>
											<div class="db-status ms-3 small text-muted" style="display: none;">
												<span class="db-read-status"></span> | <span class="db-write-status"></span>
											</div>
										</div>
										<button type="button" class="btn btn-sm btn-outline-primary test-db-btn" data-db="${db}">
											<i class="fa-solid fa-vial-circle-check me-1"></i>Test
										</button>
									</div>
								`).join("")}
							</div>
						</div>
					</div>
				`;
			}

			mysqlStatusMarkup = `
				<div class="col-12">
					<div class="alert alert-success" role="alert">
						<h5 class="alert-heading"><i class="fa-solid fa-circle-check me-2"></i>✓ MySQL Connection Successful</h5>
						<div class="row g-3 mt-2">
							<div class="col-6 col-md-3">
								<div class="workstation-kpi text-center">
									<div class="text-muted small">MySQL Version</div>
									<div class="fs-6 fw-semibold">${data.mysqlVersion || 'Unknown'}</div>
								</div>
							</div>
							<div class="col-6 col-md-3">
								<div class="workstation-kpi text-center">
									<div class="text-muted small">Total Databases</div>
									<div class="fs-6 fw-semibold">${databases.length}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				${databasesHtml}
			`;
			mysqlStatusLoaded = true;
			if (activeWorkstationTab === "mysql") {
				renderWorkstationContent();
			}

			return;
		}

		// Connection failed
		mysqlStatusMarkup = `
			<div class="col-12">
				<div class="alert alert-danger" role="alert">
					<h5 class="alert-heading"><i class="fa-solid fa-circle-xmark me-2"></i>✗ MySQL Connection Failed</h5>
					<p class="mb-2"><strong>Error:</strong></p>
					<pre class="small" style="background: rgba(0,0,0,0.1); padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto; margin-bottom: 0;">${data.error || data.message || 'Unknown error'}</pre>
					<small class="text-muted d-block mt-2">Verify that:</small>
					<ul class="small text-muted mb-0 mt-1">
						<li>MySQL server is running (MAMP/WAMP)</li>
						<li>Credentials in .env file are correct</li>
						<li>Host and port settings are correct</li>
					</ul>
				</div>
			</div>
		`;
		mysqlStatusLoaded = true;
		if (activeWorkstationTab === "mysql") {
			renderWorkstationContent();
		}

	} catch (error) {
		mysqlStatusMarkup = `
			<div class="col-12">
				<div class="alert alert-danger" role="alert">
					<h5 class="alert-heading"><i class="fa-solid fa-circle-xmark me-2"></i>✗ Error Checking MySQL Status</h5>
					<p class="mb-0 small">${error?.message || 'Failed to fetch MySQL status'}</p>
				</div>
			</div>
		`;
		mysqlStatusLoaded = true;
		if (activeWorkstationTab === "mysql") {
			renderWorkstationContent();
		}
	} finally {
		mysqlStatusLoading = false;
	}
}

async function testDatabaseAccess(dbName, buttonElement) {
	const baseUrl = getN8nTestPageBaseUrl();
	const listItem = buttonElement.closest(".list-group-item");
	const statusDiv = listItem.querySelector(".db-status");
	const readSpan = statusDiv.querySelector(".db-read-status");
	const writeSpan = statusDiv.querySelector(".db-write-status");

	// Show loading state
	buttonElement.disabled = true;
	buttonElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Testing...';
	statusDiv.style.display = "block";
	readSpan.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Testing...';
	writeSpan.textContent = '';

	try {
		const response = await fetch(`${baseUrl}?testDbAccess=1&dbName=${encodeURIComponent(dbName)}`, {
			method: "GET",
			headers: { "Accept": "application/json" }
		});

		const data = await response.json();
		const testedUser = typeof data.testedUser === "string" ? data.testedUser.trim() : "";
		const testedUserHtml = testedUser !== ""
			? `<span class="text-muted">User: <code>${escapeHtml(testedUser)}</code></span>`
			: '<span class="text-muted">User: <code>unknown</code></span>';

		if (data.ok) {
			const readIcon = data.readable ? '<i class="fa-solid fa-circle-check" style="color: #28a745;"></i> Readable' : '<i class="fa-solid fa-circle-xmark" style="color: #dc3545;"></i> Not Readable';
			const writeIcon = data.writable ? '<i class="fa-solid fa-circle-check" style="color: #28a745;"></i> Writable' : '<i class="fa-solid fa-circle-xmark" style="color: #dc3545;"></i> Not Writable';

			readSpan.innerHTML = readIcon;
			writeSpan.innerHTML = `${writeIcon} | ${testedUserHtml}`;

			// Update checkmark
			const circleIcon = listItem.querySelector("i.fa-circle");
			if (data.readable && data.writable) {
				circleIcon.style.color = "#28a745";
				circleIcon.className = "fa-solid fa-circle-check";
			} else if (data.readable) {
				circleIcon.style.color = "#ffc107";
				circleIcon.className = "fa-solid fa-circle-minus";
			} else {
				circleIcon.style.color = "#dc3545";
				circleIcon.className = "fa-solid fa-circle-xmark";
			}
		} else {
			readSpan.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #dc3545;"></i> Error';
			writeSpan.innerHTML = testedUserHtml;
		}

		buttonElement.disabled = false;
		buttonElement.innerHTML = '<i class="fa-solid fa-vial-circle-check me-1"></i>Test';

	} catch (error) {
		readSpan.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: #dc3545;"></i> Error';
		writeSpan.textContent = error?.message || 'Failed to test';
		buttonElement.disabled = false;
		buttonElement.innerHTML = '<i class="fa-solid fa-vial-circle-check me-1"></i>Test';
	}
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

const statusChart = new Chart(document.getElementById("statusChart"), {
	type: "doughnut",
	data: {
		labels: ["Success", "Failed"],
		datasets: [{
			data: [0, 0],
			backgroundColor: ["#198754", "#dc3545"],
			borderWidth: 0
		}]
	},
	options: {
		responsive: true,
		maintainAspectRatio: false,
		animation: {
			duration: 350
		},
		plugins: {
			legend: { position: "bottom" }
		}
	}
});

const typeChart = new Chart(document.getElementById("typeChart"), {
	type: "bar",
	data: {
		labels: ["JSON", "Text", "HTML", "Other", "Error"],
		datasets: [{
			label: "Responses",
			data: [0, 0, 0, 0, 0],
			backgroundColor: ["#FF6602", "#36484F", "#5e7a84", "#8da3ab", "#dc3545"],
			borderRadius: 6
		}]
	},
	options: {
		responsive: true,
		maintainAspectRatio: false,
		animation: {
			duration: 350
		},
		plugins: {
			legend: { display: false }
		},
		scales: {
			y: {
				beginAtZero: true,
				ticks: { precision: 0 }
			}
		}
	}
});

function showLoadingState() {
	responseStatus.textContent = "Loading...";
	responseContainer.className = "shimmer";
	responseContainer.innerHTML = "";
}

function renderResponse(text, isError) {
	responseContainer.className = "response-box p-3";
	responseContainer.innerHTML = "<pre class=\"response-pre\"></pre>";
	responseContainer.querySelector("pre").textContent = text;
	responseStatus.textContent = isError ? "Failed" : "Success";
}

function detectResponseType(contentType, bodyText, isError) {
	if (isError) {
		return "Error";
	}
	const loweredContentType = (contentType || "").toLowerCase();
	const loweredBody = (bodyText || "").trim().toLowerCase();

	if (loweredContentType.includes("application/json") || (loweredBody.startsWith("{") || loweredBody.startsWith("["))) {
		return "JSON";
	}
	if (loweredContentType.includes("text/html") || loweredBody.startsWith("<!doctype html") || loweredBody.startsWith("<html")) {
		return "HTML";
	}
	if (loweredContentType.includes("text/plain")) {
		return "Text";
	}
	if (loweredBody.length > 0) {
		return "Other";
	}
	return "Other";
}

function updateChartsAndStats() {
	const { success, failed } = getResultBreakdown();

	const typeCounts = {
		JSON: 0,
		Text: 0,
		HTML: 0,
		Other: 0,
		Error: 0
	};

	results.forEach(item => {
		typeCounts[item.responseType] = (typeCounts[item.responseType] || 0) + 1;
	});

	statusChart.data.datasets[0].data = [success, failed];
	statusChart.update();

	typeChart.data.datasets[0].data = [
		typeCounts.JSON,
		typeCounts.Text,
		typeCounts.HTML,
		typeCounts.Other,
		typeCounts.Error
	];
	typeChart.update();

	totalCount.textContent = String(results.length);
	const rate = results.length ? Math.round((success / results.length) * 100) : 0;
	successRate.textContent = rate + "%";
	renderWorkstationContent();
}

function updateHistoryTable() {
	if (results.length === 0) {
		historyBody.innerHTML = "<tr><td colspan=\"5\" class=\"text-muted\">No requests yet.</td></tr>";
		return;
	}

	historyBody.innerHTML = results
		.slice()
		.reverse()
		.map((item, index) => {
			const badgeClass = item.ok ? "status-ok" : "status-fail";
			const label = item.ok ? "Success" : "Failed";
			return `
				<tr>
					<td>${results.length - index}</td>
					<td>${item.time}</td>
					<td><span class="status-badge ${badgeClass}">${label}</span></td>
					<td>${item.statusCode}</td>
					<td>${item.responseType}</td>
				</tr>
			`;
		})
		.join("");
}

function getValidatedUrl() {
	const url = webhookInput.value.trim();
	if (!url) {
		Swal.fire({
			icon: "warning",
			title: "Webhook URL required",
			text: "Please enter your n8n webhook URL before testing."
		});
		return null;
	}

	try {
		new URL(url);
	} catch {
		Swal.fire({
			icon: "error",
			title: "Invalid URL",
			text: "Please enter a valid URL format, for example https://example.com/webhook/test"
		});
		return null;
	}

	return url;
}

function loadWebhookUrlFromSession() {
	const savedUrl = sessionStorage.getItem(WEBHOOK_STORAGE_KEY);
	if (typeof savedUrl === "string" && savedUrl.trim() !== "") {
		webhookInput.value = savedUrl;
	}
}

function saveWebhookUrlToSession() {
	const url = getValidatedUrl();
	if (!url) {
		return;
	}

	sessionStorage.setItem(WEBHOOK_STORAGE_KEY, url);
	Swal.fire({
		icon: "success",
		title: "Webhook URL saved",
		text: "The URL is saved for this browser session."
	});
}

function clearWebhookUrlFromSession() {
	sessionStorage.removeItem(WEBHOOK_STORAGE_KEY);
	webhookInput.value = "";
	Swal.fire({
		icon: "info",
		title: "Webhook URL cleared",
		text: "Saved URL removed from this browser session."
	});
}

function setLoadingButtons(isLoading) {
	testBtn.disabled = isLoading;
	batchBtn.disabled = isLoading;
	clearBtn.disabled = isLoading;
}

async function runSingleTest(url) {
	const start = performance.now();
	const now = new Date().toLocaleTimeString();

	try {
		const response = await fetch(url, { method: "GET" });
		const contentType = response.headers.get("content-type") || "";
		const bodyText = await response.text();
		const elapsed = Math.round(performance.now() - start);

		const ok = response.ok;
		const responseType = detectResponseType(contentType, bodyText, false);

		let displayBody = bodyText;
		if (responseType === "JSON") {
			try {
				displayBody = JSON.stringify(JSON.parse(bodyText), null, 2);
			} catch {
				displayBody = bodyText;
			}
		}

		renderResponse(displayBody || "(Empty response body)", !ok);
		results.push({
			ok,
			statusCode: response.status,
			responseType,
			time: now
		});

		updateChartsAndStats();
		updateHistoryTable();

		return { ok, statusCode: response.status, elapsed };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown network error";
		renderResponse(errorMessage, true);
		results.push({
			ok: false,
			statusCode: "N/A",
			responseType: "Error",
			time: now
		});

		updateChartsAndStats();
		updateHistoryTable();

		return { ok: false, statusCode: "N/A", elapsed: Math.round(performance.now() - start) };
	}
}

async function runWebhookTest() {
	const url = getValidatedUrl();
	if (!url) {
		return;
	}

	setLoadingButtons(true);
	showLoadingState();
	const result = await runSingleTest(url);

	Swal.fire({
		icon: result.ok ? "success" : "warning",
		title: result.ok ? "Request successful" : "Request completed with error status",
		text: `Status ${result.statusCode} in ${result.elapsed} ms`
	});
	setLoadingButtons(false);
}

async function runBatchTest() {
	const url = getValidatedUrl();
	if (!url) {
		return;
	}

	const requestedCount = Number.parseInt(batchCountInput.value, 10);
	const count = Number.isFinite(requestedCount) ? Math.min(Math.max(requestedCount, 1), 50) : 1;
	batchCountInput.value = String(count);

	setLoadingButtons(true);
	showLoadingState();

	let batchSuccess = 0;
	let batchFailed = 0;
	let totalElapsed = 0;

	for (let i = 0; i < count; i++) {
		responseStatus.textContent = `Running batch ${i + 1}/${count}...`;
		const result = await runSingleTest(url);
		totalElapsed += result.elapsed;
		if (result.ok) {
			batchSuccess += 1;
		} else {
			batchFailed += 1;
		}
	}

	setLoadingButtons(false);

	Swal.fire({
		icon: batchFailed === 0 ? "success" : "info",
		title: "Batch test completed",
		html: `Sent <b>${count}</b> requests.<br>Success: <b>${batchSuccess}</b>, Failed: <b>${batchFailed}</b><br>Total time: <b>${totalElapsed} ms</b>`
	});
}

function clearResults() {
	results.length = 0;
	responseStatus.textContent = "No response yet";
	responseContainer.className = "response-box p-3";
	responseContainer.innerHTML = "<pre class=\"response-pre text-muted\">Run a test to see response details.</pre>";
	updateChartsAndStats();
	updateHistoryTable();

	Swal.fire({
		icon: "info",
		title: "Cleared",
		text: "All test results have been reset."
	});
}

function setupLazySections() {
	const sections = document.querySelectorAll(".lazy-section");
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				entry.target.classList.add("show");
				observer.unobserve(entry.target);
			}
		});
	}, { threshold: 0.12 });

	sections.forEach(section => observer.observe(section));
}

const POST_MONITOR_URL = getN8nTestPageBaseUrl();
const previewPostsBtn = document.getElementById("previewPostsBtn");
let cachedPosts = [];

function renderPostPreviewModal() {
	const postPreviewList = document.getElementById("postPreviewList");
	if (cachedPosts.length === 0) {
		postPreviewList.innerHTML = "<p class=\"text-muted\">No POST items available.</p>";
		return;
	}
	postPreviewList.innerHTML = cachedPosts.map((post) => {
		const payload = post.payload || {};
		const title = payload.title || "(no title)";
		const author = payload.author || "unknown author";
		const createdAt = payload.created_at ? new Date(payload.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
		const url = payload.url || "";
		const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		const safeAuthor = author.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const safeUrl = url.startsWith("http://") || url.startsWith("https://") ? url : "";
		const safeUrlDisplay = safeUrl.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

		if (safeUrl) {
			return `
				<div class="col-12 col-md-6">
					<a class="post-card" href="${safeUrlDisplay}" target="_blank" rel="noopener noreferrer">
						<div class="post-title">${safeTitle}</div>
						<div class="post-meta"><i class="fa-solid fa-user me-1"></i>${safeAuthor}${createdAt ? " &middot; " + createdAt : ""}</div>
						<div class="post-url"><i class="fa-solid fa-arrow-up-right-from-square me-1"></i>${safeUrlDisplay}</div>
					</a>
				</div>`;
		}
		return `
				<div class="col-12 col-md-6">
					<div class="post-card">
						<div class="post-title">${safeTitle}</div>
						<div class="post-meta"><i class="fa-solid fa-user me-1"></i>${safeAuthor}${createdAt ? " &middot; " + createdAt : ""}</div>
					</div>
				</div>`;
	}).join("");
}

previewPostsBtn.addEventListener("click", () => {
	renderPostPreviewModal();
	new bootstrap.Modal(document.getElementById("postPreviewModal")).show();
});

async function refreshLatestPostPanel() {
	try {
		const endpoint = new URL(POST_MONITOR_URL);
		endpoint.searchParams.set("latestPost", "1");
		endpoint.searchParams.set("_ts", String(Date.now()));

		const response = await fetch(endpoint.toString(), { method: "GET" });
		if (!response.ok) {
			return;
		}

		const data = await response.json();
		const posts = Array.isArray(data.posts) ? data.posts : [];
		cachedPosts = posts;
		previewPostsBtn.disabled = posts.length === 0;
		previewPostsBtn.textContent = "";
		previewPostsBtn.innerHTML = `<i class="fa-solid fa-table-list me-1"></i>Preview Posts${posts.length > 0 ? " (" + posts.length + ")" : ""}`;

		latestPostStatus.textContent = data.status || "No POST received yet";

		if (posts.length === 0) {
			latestPostPre.textContent = "No POST request received yet.";
		} else {
			latestPostPre.textContent = posts
				.map((post, i) => {
					const num = posts.length - i;
					const header = `=== POST #${num} — ${post.receivedAt || "unknown time"} ===`;
					return `${header}\n${JSON.stringify(post, null, 2)}`;
				})
				.join("\n\n");
		}
	} catch {
		// Silent fail so periodic polling does not interrupt user interactions.
	}

	renderWorkstationContent();
}

testBtn.addEventListener("click", runWebhookTest);
batchBtn.addEventListener("click", runBatchTest);
clearBtn.addEventListener("click", clearResults);
saveUrlBtn.addEventListener("click", saveWebhookUrlToSession);
clearUrlBtn.addEventListener("click", clearWebhookUrlFromSession);

webhookInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		runWebhookTest();
	}
});

setupLazySections();
setupWorkstationTabs();
setActiveWorkstationTab(activeWorkstationTab);
loadWebhookUrlFromSession();
refreshLatestPostPanel();
detectWorkstationIp();
setInterval(refreshLatestPostPanel, 3000);
