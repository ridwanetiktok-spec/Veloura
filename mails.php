<?php

header('Content-Type: application/json');

$resultDir = __DIR__ . '/result';
$file = $resultDir . '/mails.txt';

try {

    if (!is_dir($resultDir)) {
        mkdir($resultDir, 0755, true);
    }

    $email = trim($_POST['email'] ?? '');

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email address.'
        ]);
        exit;
    }

    $email = strtolower($email);

    $existing = [];

    if (file_exists($file)) {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            $line = strtolower(trim($line));

            if ($line !== '') {
                $existing[] = $line;
            }
        }
    }

    if (in_array($email, $existing, true)) {
        echo json_encode([
            'success' => true,
            'alreadySubscribed' => true,
            'message' => 'This email is already subscribed.'
        ]);
        exit;
    }

    file_put_contents(
        $file,
        $email . PHP_EOL,
        FILE_APPEND | LOCK_EX
    );

    echo json_encode([
        'success' => true,
        'alreadySubscribed' => false,
        'message' => 'Successfully subscribed.'
    ]);

} catch (Throwable $e) {

    echo json_encode([
        'success' => false,
        'message' => 'Could not save email.'
    ]);
}