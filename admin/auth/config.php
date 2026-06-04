<?php

$externalConfig = dirname(__DIR__, 3) . '/cms-auth-config.php';

if (is_file($externalConfig)) {
    return require $externalConfig;
}

return [
    'client_id' => getenv('EVOLVECLUB_GITHUB_CLIENT_ID') ?: '',
    'client_secret' => getenv('EVOLVECLUB_GITHUB_CLIENT_SECRET') ?: '',
    'redirect_uri' => 'https://evolveclub.ru/admin/auth/callback.php',
    'site_url' => 'https://evolveclub.ru',
];
