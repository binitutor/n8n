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

	return $decoded;
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

	file_put_contents($latestPostFile, json_encode($receivedRecord, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

	header("Content-Type: application/json; charset=utf-8");
	http_response_code(200);
	echo json_encode([
		"message" => "POST data received",
		"receivedAt" => $receivedRecord["receivedAt"],
	], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
	exit;
}

function respondLatestPostJson(string $status, string $display, ?array $latestPostData): void
{
	header("Content-Type: application/json; charset=utf-8");
	http_response_code(200);
	echo json_encode([
		"status" => $status,
		"display" => $display,
		"data" => $latestPostData,
	], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
	exit;
}
