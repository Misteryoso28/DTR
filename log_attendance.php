<?php
header('Content-Type: application/json');
include 'db_connection.php';

date_default_timezone_set('Asia/Manila');

$qrCodeData = $_GET['qrCodeData'];
$now = date('h:i:s A');
$currentDate = date('Y-m-d');

$sql = "SELECT id, time_in, time_out FROM attendance WHERE qr_code = ? AND date = ? ORDER BY id DESC LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $qrCodeData, $currentDate);
$stmt->execute();
$result = $stmt->get_result();
$attendance = $result->fetch_assoc();

if ($attendance) {
    if (is_null($attendance['time_out'])) {
        // Time-out is not set, so let's update the time_out and calculate hours worked
        $sql = "UPDATE attendance SET time_out = ?, hours_worked = TIMESTAMPDIFF(SECOND, STR_TO_DATE(time_in, '%h:%i:%s %p'), STR_TO_DATE(?, '%h:%i:%s %p')) / 3600 WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssi", $now, $now, $attendance['id']);  
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'action' => 'check-out', 'message' => 'Good work today']);
        } else {
            echo json_encode(['status' => 'error', 'action' => 'check-out', 'message' => 'Failed to update time_out', 'error' => $stmt->error]);
        }
    } else {
        echo json_encode(['status' => 'error', 'action' => 'check-out', 'message' => 'Already timed out for today']);
    }
} else {
    // No record found for today's date, so we insert a new check-in
    $sql = "INSERT INTO attendance (qr_code, time_in, date) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $qrCodeData, $now, $currentDate);
    
    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'action' => 'check-in', 'message' => 'Checked in']);
    } else {
        echo json_encode(['status' => 'error', 'action' => 'check-in', 'message' => 'Failed to log time_in', 'error' => $stmt->error]);
    }
}

$stmt->close();
$conn->close();
?>
