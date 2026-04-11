<?php
declare(strict_types=1);

function getRequestHeadersSafe(): array
{
	if (function_exists("getallheaders")) {
		$headers = getallheaders();
		return is_array($headers) ? $headers : [];
	}

	$headers = [];
	foreach ($_SERVER as $key => $value) {
		if (strpos($key, "HTTP_") === 0) {
			$normalized = str_replace(" ", "-", ucwords(strtolower(str_replace("_", " ", substr($key, 5)))));
			$headers[$normalized] = $value;
		}
	}

	return $headers;
}

function readLatestPostData(string $latestPostFile): ?array
{
	if (!is_readable($latestPostFile)) {
		return null;
	}

	$stored = file_get_contents($latestPostFile);
	if (!is_string($stored) || $stored === "") {
		return null;
	}

	$decoded = json_decode($stored, true);
	if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
		return null;
	}

	// Backward compat: old format stored a single object; new format stores an array of objects.
	if (!empty($decoded) && !isset($decoded[0])) {
		return [$decoded];
	}

	return empty($decoded) ? null : $decoded;
}

function handlePostRequest(string $latestPostFile): void
{
	if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
		return;
	}

	$rawBody = file_get_contents("php://input") ?: "";
	$contentType = $_SERVER["CONTENT_TYPE"] ?? "";
	$payload = null;

	if (!empty($_POST)) {
		$payload = $_POST;
	} elseif (stripos($contentType, "application/json") !== false) {
		$decoded = json_decode($rawBody, true);
		if (json_last_error() === JSON_ERROR_NONE) {
			$payload = $decoded;
		}
	}

	if ($payload === null) {
		$payload = $rawBody !== "" ? $rawBody : "(Empty body)";
	}

	$receivedRecord = [
		"message" => "HTTP POST received",
		"receivedAt" => date(DATE_ATOM),
		"method" => "POST",
		"contentType" => $contentType !== "" ? $contentType : "unknown",
		"sourceIp" => $_SERVER["REMOTE_ADDR"] ?? "unknown",
		"headers" => getRequestHeadersSafe(),
		"payload" => $payload,
		"rawBody" => $rawBody,
	];

	// Use an exclusive lock so concurrent POST requests don't overwrite each other.
	$fp = fopen($latestPostFile, "c+");
	if ($fp === false) {
		http_response_code(500);
		echo json_encode(["error" => "Could not open storage file"]);
		exit;
	}

	flock($fp, LOCK_EX);

	$existingRecords = [];
	$stored = stream_get_contents($fp);
	if (is_string($stored) && $stored !== "") {
		$decoded = json_decode($stored, true);
		if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
			// Handle both old single-object format and current array format.
			$existingRecords = (isset($decoded[0]) || empty($decoded)) ? $decoded : [$decoded];
		}
	}

	array_unshift($existingRecords, $receivedRecord);
	$newJson = json_encode($existingRecords, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

	ftruncate($fp, 0);
	rewind($fp);
	fwrite($fp, $newJson);
	fflush($fp);
	flock($fp, LOCK_UN);
	fclose($fp);

	header("Content-Type: application/json; charset=utf-8");
	http_response_code(200);
	echo json_encode([
		"message" => "POST data received",
		"receivedAt" => $receivedRecord["receivedAt"],
	], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
	exit;
}

function respondLatestPostJson(string $status, string $display, ?array $allPosts): void
{
	header("Content-Type: application/json; charset=utf-8");
	http_response_code(200);
	echo json_encode([
		"status" => $status,
		"display" => $display,
		"posts" => $allPosts ?? [],
	], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
	exit;
}
