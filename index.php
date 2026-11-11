<?php
/**
 * Contact form endpoint. Requires PHP mail() to be configured by the host.
 * No secrets are stored in the repository. This endpoint uses a honeypot,
 * basic rate limiting, strict validation, and header-safe fixed mail headers.
 */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Method not allowed');
}

function finish(string $status): void
{
    header('Location: index.html?contact=' . rawurlencode($status) . '#contact', true, 303);
    exit;
}

if (!empty($_POST['website'] ?? '')) {
    finish('sent'); // Honeypot: silently accept bots without sending mail.
}

$now = time();
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
$lastSubmission = (int)($_SESSION['contact_last_submission'] ?? 0);
if ($lastSubmission && $now - $lastSubmission < 30) {
    finish('rate-limited');
}

$name = trim((string)($_POST['Name'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$message = trim((string)($_POST['Message'] ?? ''));
if ($name === '' || strlen($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 || strlen($message) < 10 || strlen($message) > 5000) {
    finish('invalid');
}
if (preg_match('/[\r\n]/', $email) || preg_match('/[\r\n]/', $name)) {
    finish('invalid');
}

$recipient = 'hasanemamrabbi@gmail.com';
$subject = 'Portfolio contact message';
$body = "Name: {$name}\nEmail: {$email}\n\nMessage:\n{$message}";
$host = preg_replace('/[^a-z0-9.-]/i', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
$headers = [
    'From' => 'Portfolio Contact <no-reply@' . ($host ?: 'localhost') . '>',
    'Reply-To' => $email,
    'Content-Type' => 'text/plain; charset=UTF-8',
];

if (mail($recipient, $subject, $body, $headers)) {
    $_SESSION['contact_last_submission'] = $now;
    finish('sent');
}
finish('error');
