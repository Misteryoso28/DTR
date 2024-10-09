<?php
header('Content-Type: application/json');
include 'db_connection.php';

$qrCodeData = $_GET['qrCodeData'];
$sql = "SELECT name FROM employees WHERE qr_code = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $qrCodeData);
$stmt->execute();
$result = $stmt->get_result();
$employee = $result->fetch_assoc();

if ($employee) {
    echo json_encode(['name' => $employee['name']]);
} else {
    echo json_encode(['name' => 'Unknown Employee']);
}

$stmt->close();
$conn->close();
?>
