<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "user_registration";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$email = $_POST['email'];
$username = $_POST['username'];
$password = password_hash($_POST['password'], PASSWORD_DEFAULT);

$sql = "INSERT INTO users (email, username, password) VALUES ('$email', '$username', '$password')";

if ($conn->query($sql) === TRUE) {
    header("Location: screen1afterlog.html");
    exit;
} else {
    echo "❌ Error: " . $conn->error;
}

$conn->close();
?>
