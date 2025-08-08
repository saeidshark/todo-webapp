<?php
// api.php
header("Content-Type: application/json");
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once "config.php";

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
  case 'GET':
    $stmt = $pdo->query("SELECT * FROM tasks ORDER BY due_date ASC");
    echo json_encode($stmt->fetchAll());
    break;

  case 'POST':
  $data = json_decode(file_get_contents("php://input"), true);
  $stmt = $pdo->prepare("INSERT INTO tasks (id, title, priority, status, due_date)
                         VALUES (?, ?, ?, ?, ?)");
  $stmt->execute([
  $data['id'],
  $data['title'],
  $data['priority'],
  $data['status'],
  $data['dueDate'] ?? null
]);
  echo json_encode(['success' => true]);
  break;



  case 'PUT':
    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("UPDATE tasks SET title=?, priority=?, status=?, due_date=? WHERE id=?");
    $stmt->execute([
      $data['title'],
      $data['priority'],
      $data['status'],
      $data['dueDate'],
      $data['id']
    ]);
    echo json_encode(['success' => true]);
    break;

  case 'DELETE':
    $id = $_GET['id'] ?? null;
    if ($id) {
      $stmt = $pdo->prepare("DELETE FROM tasks WHERE id=?");
      $stmt->execute([$id]);
      echo json_encode(['success' => true]);
    } else {
      echo json_encode(['error' => 'ID not provided']);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    break;
}
?>
