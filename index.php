<?php
declare(strict_types=1);

require_once __DIR__ . "/util.php";

$latestPostFile = __DIR__ . "/latest_post.json";
$sqlDirectory = __DIR__ . "/SQL";
$envFile = __DIR__ . "/.env";
handleSecureDatasetApiRequest($sqlDirectory, "bt_hairsalon_test", $envFile);
handlePublicDatasetApiRequest($sqlDirectory, "bt_hairsalon_test");
handleSqlActionRequest($sqlDirectory, "bt_hairsalon_test");
handlePostRequest($latestPostFile);

$latestPostData = readLatestPostData($latestPostFile);

$latestPostDisplay = !empty($latestPostData)
	? json_encode($latestPostData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
	: "No POST request received yet.";
$latestPostStatus = !empty($latestPostData)
	? count($latestPostData) . " POST(s), last at " . ($latestPostData[0]["receivedAt"] ?? "unknown")
	: "No POST received yet";

if (($_GET["latestPost"] ?? "") === "1") {
	respondLatestPostJson($latestPostStatus, $latestPostDisplay, $latestPostData);
}
?>

<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="author" content="Biniam Alemayehu">
	<meta name="description" content="Simple n8n integration test page for sending GET requests to a webhook URL and visualizing response metrics.">
	<link rel="canonical" href="https://binitutor.com">
	<meta property="og:url" content="https://binitutor.com">
	<title>BT n8n Webhook Test</title>

	<link
		href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
		rel="stylesheet"
		integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
		crossorigin="anonymous"
	>
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
		integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A=="
		crossorigin="anonymous"
		referrerpolicy="no-referrer"
	>
	<link rel="stylesheet" href="style.css">
</head>
<body>
	<header class="hero py-4 py-md-5 mb-4 mb-md-5">
		<div class="container">
			<div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
				<div>
					<h1 class="mb-1 fw-bold">
						<i class="fa-solid fa-plug-circle-bolt me-2 brand-dot"></i>
						BT n8n Integration Tests
					</h1>
					<p class="mb-0 text-white-50">Send HTTP GET calls to your webhook and inspect both GET and incoming POST behavior quickly.</p>
				</div>
				<div class="d-flex gap-2">
					<span class="stat-pill pill-primary"><i class="fa-solid fa-rocket"></i> Fast Testing</span>
					<span class="stat-pill pill-secondary"><i class="fa-solid fa-chart-line"></i> Live Metrics</span>
				</div>
			</div>
		</div>
	</header>

	<main class="container pb-5">
		<section class="row g-4 my-4 lazy-section">
			<div class="row g-3 align-items-end">
				<div class="col-12">
					<ul class="nav nav-tabs" id="testNavTabs" role="tablist">
						<li class="nav-item">
							<a class="nav-link active" aria-current="page" href="#" data-workstation-tab="newsroom" role="button">
								<span class="stat-pill pill-primary">
									<i class="fa-solid fa-rocket"></i> Newsroom Test
								</span>
							</a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#" data-workstation-tab="analytics" role="button">
								<span class="stat-pill pill-secondary">
									<i class="fa-solid fa-chart-line"></i> Data Analytics Test
								</span>
							</a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#" data-workstation-tab="api" role="button">
								<span class="stat-pill pill-secondary">
									<i class="fa-solid fa-chart-line"></i> API Endpoint Test
								</span>
							</a>
						</li>
						<li class="nav-item">
							<a class="nav-link disabled" aria-disabled="true" role="button" tabindex="-1">
								<span class="stat-pill pill-secondary">
									<i class="fa-solid fa-chart-line"></i> Future Test
								</span>
							</a>
						</li>
					</ul>
				</div>
			</div>
		</section>

		<section class="row g-4 my-4 lazy-section" id="workstation">
			<div class="col-12">
				<div id="workstationContent" class="card card-soft p-3 p-md-4">
					Loading workstation details...
				</div>
			</div>

		</section>


		<section class="card card-soft p-3 p-md-4 mb-4 lazy-section">
			<div class="row g-3 align-items-end">
				<div class="col-12">
					<label for="webhookUrl" class="form-label fw-semibold">
						<i class="fa-solid fa-link me-1" style="color: var(--primary);"></i>
						n8n Webhook URL
					</label>
					<div class="input-group input-group-lg">
						<input
							id="webhookUrl"
							type="url"
							class="form-control"
							placeholder="https://your-n8n-domain/webhook/your-id"
							aria-label="Webhook URL"
						>
						<button id="saveUrlBtn" type="button" class="btn btn-outline-secondary">
							<i class="fa-solid fa-floppy-disk me-1"></i>
							Save Link
						</button>
						<button id="clearUrlBtn" type="button" class="btn btn-outline-secondary">
							<i class="fa-solid fa-xmark me-1"></i>
							Clear Link
						</button>
					</div>
				</div>
				<div class="col-12 col-md-4 col-lg-3">
					<label for="batchCount" class="form-label fw-semibold">
						<i class="fa-solid fa-layer-group me-1" style="color: var(--secondary);"></i>
						Batch Count
					</label>
					<input
						id="batchCount"
						type="number"
						class="form-control form-control-lg"
						min="1"
						max="50"
						step="1"
						value="1"
					>
				</div>
				<div class="col-12 d-flex flex-wrap gap-2">
					<button id="testBtn" class="btn btn-primary btn-lg">
						<i class="fa-solid fa-vial-circle-check me-2"></i>
						Test Webhook
					</button>
					<button id="batchBtn" class="btn btn-outline-secondary btn-lg">
						<i class="fa-solid fa-bolt me-2"></i>
						Run Batch Test
					</button>
					<button id="clearBtn" class="btn btn-outline-secondary btn-lg">
						<i class="fa-solid fa-eraser me-2"></i>
						Clear Results
					</button>
				</div>
			</div>
		</section>

		<section class="row g-4 lazy-section">

			<div class="col-12 col-xl-4">
				<div class="card card-soft h-100 p-3 p-md-4">
					<div class="d-flex justify-content-between align-items-center mb-3">
						<h2 class="h5 mb-0"><i class="fa-solid fa-inbox me-2" style="color: var(--secondary);"></i>Latest Response</h2>
						<span id="responseStatus" class="text-muted small">No response yet</span>
					</div>

					<div id="responseContainer" class="response-box p-3">
						<pre class="response-pre text-muted">Run a test to see response details.</pre>
					</div>
				</div>
			</div>

			<div class="col-12 col-xl-4">
				<div class="card card-soft h-100 p-3 p-md-4">
					<h2 class="h5 mb-3"><i class="fa-solid fa-gauge-high me-2" style="color: var(--primary);"></i>Live Summary</h2>
					<div class="row g-3 mb-2">
						<div class="col-6">
							<div class="p-3 rounded-3" style="background: #fff3eb;">
								<div class="text-muted small">Total Requests</div>
								<div id="totalCount" class="fs-4 fw-bold" style="color: var(--primary);">0</div>
							</div>
						</div>
						<div class="col-6">
							<div class="p-3 rounded-3" style="background: #edf2f4;">
								<div class="text-muted small">Success Rate</div>
								<div id="successRate" class="fs-4 fw-bold" style="color: var(--secondary);">0%</div>
							</div>
						</div>
					</div>
					<p class="small text-muted mb-0">Charts update after each test call.</p>
				</div>
			</div>

			<div class="col-12 col-xl-4">
				<div class="card card-soft h-100 p-3 p-md-4">
					<div class="d-flex justify-content-between align-items-center mb-3">
						<h2 class="h5 mb-0"><i class="fa-solid fa-paper-plane me-2" style="color: var(--primary);"></i>Latest POST Response</h2>
						<span id="latestPostStatus" class="text-muted small"><?php echo htmlspecialchars($latestPostStatus, ENT_QUOTES, "UTF-8"); ?></span>
					</div>

					<div class="response-box p-3" style="max-height: 320px;">
						<pre id="latestPostPre" class="response-pre"><?php echo htmlspecialchars($latestPostDisplay, ENT_QUOTES, "UTF-8"); ?></pre>
					</div>

					<div class="mt-3">
						<button id="previewPostsBtn" type="button" class="btn btn-sm btn-outline-secondary w-100" disabled>
							<i class="fa-solid fa-table-list me-1"></i>
							Preview Posts
						</button>
					</div>
				</div>
			</div>
		</section>

		<section class="row g-4 mt-1 lazy-section">
			<div class="col-12 col-xl-6">
				<div class="card card-soft p-3 p-md-4 h-100">
					<h3 class="h6 mb-3"><i class="fa-solid fa-circle-check me-2" style="color: var(--secondary);"></i>Success vs Failed</h3>
					<div class="chart-wrap">
						<canvas id="statusChart"></canvas>
					</div>
				</div>
			</div>
			<div class="col-12 col-xl-6">
				<div class="card card-soft p-3 p-md-4 h-100">
					<h3 class="h6 mb-3"><i class="fa-solid fa-code me-2" style="color: var(--primary);"></i>Response Types</h3>
					<div class="chart-wrap">
						<canvas id="typeChart"></canvas>
					</div>
				</div>
			</div>
		</section>

		<section class="card card-soft p-3 p-md-4 mt-4 lazy-section">
			<h2 class="h5 mb-3"><i class="fa-solid fa-clock-rotate-left me-2" style="color: var(--secondary);"></i>Request History</h2>
			<div class="table-responsive">
				<table class="table align-middle mb-0">
					<thead>
						<tr>
							<th>#</th>
							<th>Time</th>
							<th>Status</th>
							<th>Code</th>
							<th>Type</th>
						</tr>
					</thead>
					<tbody id="historyBody">
						<tr><td colspan="5" class="text-muted">No requests yet.</td></tr>
					</tbody>
				</table>
			</div>
		</section>
	</main>

	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
	<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
	<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
	<script src="script.js"></script>

	<!-- POST preview modal -->
	<div class="modal fade" id="postPreviewModal" tabindex="-1" aria-labelledby="postPreviewModalLabel" aria-hidden="true">
		<div class="modal-dialog modal-lg modal-dialog-scrollable">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="postPreviewModalLabel">
						<i class="fa-solid fa-paper-plane me-2" style="color: var(--primary);"></i>
						Received POST Items
					</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div id="postPreviewList" class="row g-3"></div>
				</div>
			</div>
		</div>
	</div>
</body>
</html>
