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

function handlePublicDatasetApiRequest(string $sqlDirectory, string $databaseName): void
{
	if (($_GET["page"] ?? "") !== "data-analytics") {
		return;
	}
	if (($_GET["apidatasetcall"] ?? "") !== "true") {
		return;
	}

	// Allow cross-origin GET requests from any external website or service.
	header("Access-Control-Allow-Origin: *");
	header("Access-Control-Allow-Methods: GET, OPTIONS");
	header("Access-Control-Allow-Headers: Content-Type, Authorization, api_auth_user");

	// Handle OPTIONS preflight immediately.
	if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "OPTIONS") {
		http_response_code(204);
		exit;
	}

	try {
		$connection = connectMampMysql($databaseName);
		$data = fetchHairSalonDataset($connection, $sqlDirectory);

		header("Content-Type: application/json; charset=utf-8");
		http_response_code(200);
		echo json_encode([
			"ok" => true,
			"message" => "HairSalon dataset loaded.",
			"endpoint" => "data-analytics",
			"data" => $data,
		], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
	} catch (Throwable $exception) {
		header("Content-Type: application/json; charset=utf-8");
		http_response_code(500);
		echo json_encode([
			"ok" => false,
			"message" => $exception->getMessage(),
		], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
	}
	exit;
}

function handleSqlActionRequest(string $sqlDirectory, string $databaseName): void
{
	$action = $_GET["sqlAction"] ?? "";
	if (!is_string($action) || $action === "") {
		return;
	}

	$allowedActions = ["populate", "getJson", "clear"];
	if (!in_array($action, $allowedActions, true)) {
		respondSqlActionJson([
			"ok" => false,
			"message" => "Unsupported SQL action.",
		], 400);
	}

	try {
		$connection = connectMampMysql($databaseName);

		if ($action === "populate") {
			executeSqlScript($connection, "DROP TABLE IF EXISTS bt_hairsalon_appointments; DROP TABLE IF EXISTS bt_hairsalon_service_types; DROP TABLE IF EXISTS bt_hairsalon_service_hours;", "Reset HairSalon tables");
			$files = [
				"HAIRSALON_TIMESLOTS.SQL",
				"HAIRSALON_SERVICES.SQL",
				"HAIRSALON_APPOINTMENTS.SQL",
			];

			foreach ($files as $fileName) {
				$sql = readSqlFileFromDirectory($sqlDirectory, $fileName);
				executeSqlScript($connection, $sql, $fileName);
			}

			respondSqlActionJson([
				"ok" => true,
				"message" => "Database populated from SQL files.",
				"files" => $files,
				"data" => fetchHairSalonDataset($connection, $sqlDirectory),
			]);
		}

		if ($action === "clear") {
			$dataset = [
				"service_hours" => [],
				"service_types" => [],
				"appointments" => [],
			];

			if (hairSalonTablesExist($connection)) {
				$sql = readSqlFileFromDirectory($sqlDirectory, "CLEAR_HAIRSALON_DATA.SQL");
				executeSqlScript($connection, $sql, "CLEAR_HAIRSALON_DATA.SQL");
				$dataset = fetchHairSalonDataset($connection, $sqlDirectory);
			}

			respondSqlActionJson([
				"ok" => true,
				"message" => "HairSalon test data cleared.",
				"files" => ["CLEAR_HAIRSALON_DATA.SQL"],
				"data" => $dataset,
			]);
		}

		respondSqlActionJson([
			"ok" => true,
			"message" => "HairSalon dataset loaded.",
			"files" => ["GET_HAIRSALON_DATA.SQL"],
			"data" => fetchHairSalonDataset($connection, $sqlDirectory),
		]);
	} catch (Throwable $exception) {
		respondSqlActionJson([
			"ok" => false,
			"message" => $exception->getMessage(),
		], 500);
	}
}

function respondSqlActionJson(array $payload, int $statusCode = 200): void
{
	header("Content-Type: application/json; charset=utf-8");
	http_response_code($statusCode);
	echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
	exit;
}

function connectMampMysql(string $databaseName): mysqli
{
	$attempts = [
		["host" => "127.0.0.1", "port" => 8889, "user" => "root", "password" => "root"],
		["host" => "localhost", "port" => 8889, "user" => "root", "password" => "root"],
		["host" => "127.0.0.1", "port" => 8889, "user" => "root", "password" => ""],
		["host" => "localhost", "port" => 8889, "user" => "root", "password" => ""],
		["host" => "127.0.0.1", "port" => 3306, "user" => "root", "password" => "root"],
		["host" => "localhost", "port" => 3306, "user" => "root", "password" => "root"],
		["host" => "127.0.0.1", "port" => 3306, "user" => "root", "password" => ""],
		["host" => "localhost", "port" => 3306, "user" => "root", "password" => ""],
	];

	foreach ($attempts as $attempt) {
		$connection = @new mysqli(
			$attempt["host"],
			$attempt["user"],
			$attempt["password"],
			$databaseName,
			$attempt["port"]
		);

		if ($connection->connect_errno === 0) {
			$connection->set_charset("utf8mb4");
			return $connection;
		}

		$connection->close();
	}

	throw new RuntimeException("Could not connect to MySQL. Check that MAMP MySQL is running and the root credentials are correct.");
}

function readSqlFileFromDirectory(string $sqlDirectory, string $fileName): string
{
	$fullPath = rtrim($sqlDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . basename($fileName);
	if (!is_readable($fullPath)) {
		throw new RuntimeException("SQL file not found: " . basename($fileName));
	}

	$sql = file_get_contents($fullPath);
	if (!is_string($sql) || trim($sql) === "") {
		throw new RuntimeException("SQL file is empty: " . basename($fileName));
	}

	return $sql;
}

function hairSalonTablesExist(mysqli $connection): bool
{
	$tables = [
		"bt_hairsalon_service_hours",
		"bt_hairsalon_service_types",
		"bt_hairsalon_appointments",
	];

	foreach ($tables as $tableName) {
		$result = $connection->query("SHOW TABLES LIKE '" . $connection->real_escape_string($tableName) . "'");
		if (!$result instanceof mysqli_result) {
			return false;
		}

		$exists = $result->num_rows > 0;
		$result->free();
		if (!$exists) {
			return false;
		}
	}

	return true;
}

function executeSqlScript(mysqli $connection, string $sql, string $label): array
{
	$resultSets = [];

	if (!$connection->multi_query($sql)) {
		throw new RuntimeException($label . " failed: " . $connection->error);
	}

	do {
		$result = $connection->store_result();
		if ($result instanceof mysqli_result) {
			$resultSets[] = $result->fetch_all(MYSQLI_ASSOC);
			$result->free();
		}
	} while ($connection->more_results() && $connection->next_result());

	if ($connection->errno !== 0) {
		throw new RuntimeException($label . " failed: " . $connection->error);
	}

	return $resultSets;
}

function fetchHairSalonDataset(mysqli $connection, string $sqlDirectory): array
{
	$sql = readSqlFileFromDirectory($sqlDirectory, "GET_HAIRSALON_DATA.SQL");
	$resultSets = executeSqlScript($connection, $sql, "GET_HAIRSALON_DATA.SQL");

	return [
		"service_hours" => $resultSets[0] ?? [],
		"service_types" => $resultSets[1] ?? [],
		"appointments" => $resultSets[2] ?? [],
	];
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
