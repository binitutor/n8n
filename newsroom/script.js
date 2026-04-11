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

const results = [];

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
	const success = results.filter(item => item.ok).length;
	const failed = results.length - success;

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

const POST_MONITOR_URL = "http://localhost:8888/practice/n8n/newsroom/";
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
loadWebhookUrlFromSession();
refreshLatestPostPanel();
setInterval(refreshLatestPostPanel, 3000);
