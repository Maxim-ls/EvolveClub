<?php

$config = require __DIR__ . '/config.php';

$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';
$savedState = $_COOKIE['decap_oauth_state'] ?? '';

if (!$code || !$state || !$savedState || !hash_equals($savedState, $state)) {
    http_response_code(400);
    echo 'Invalid OAuth state.';
    exit;
}

$payload = http_build_query([
    'client_id' => $config['client_id'],
    'client_secret' => $config['client_secret'],
    'code' => $code,
    'redirect_uri' => $config['redirect_uri'],
    'state' => $state,
]);

$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'User-Agent: EvolveClub-Decap-CMS',
    ],
]);

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(500);
    echo 'OAuth request failed.';
    exit;
}

$data = json_decode($response, true);

if (empty($data['access_token'])) {
    http_response_code(500);
    echo 'OAuth token error.';
    exit;
}

$token = json_encode([
    'token' => $data['access_token'],
    'provider' => 'github',
]);

?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>GitHub OAuth</title>
</head>
<body>
<script>
  const message = 'authorization:github:success:<?php echo addslashes($token); ?>';

  if (window.opener) {
    window.opener.postMessage(message, '*');
    window.close();
  } else {
    window.location.href = '<?php echo addslashes($config['site_url']); ?>/admin/';
  }
</script>
</body>
</html>