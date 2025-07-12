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

$username_input = $_POST['username'];
$password_input = $_POST['password'];

$sql = "SELECT * FROM users WHERE username = '$username_input'";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
  $user = $result->fetch_assoc();
  
  if (password_verify($password_input, $user['password'])) {
    header("Location: screen1afterlog.html");
    exit;
  } else {
    echo "❌ Incorrect password!";
  }
} else {
  echo "❌ User not found!";
}

$conn->close();
?>
