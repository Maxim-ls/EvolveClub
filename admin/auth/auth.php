<?php

$config = require __DIR__ . '/config.php';

$state = bin2hex(random_bytes(16));

setcookie(
    'decap_oauth_state',
    $state,
    [
        'expires' => time() + 600,
        'path' => '/admin/auth/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]
);

$params = http_build_query([
    'client_id' => $config['client_id'],
    'redirect_uri' => $config['redirect_uri'],
    'scope' => 'repo',
    'state' => $state,
]);

header('Location: https://github.com/login/oauth/authorize?' . $params);
exit;