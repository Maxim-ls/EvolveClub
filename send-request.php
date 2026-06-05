<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$configPaths = [
    dirname(__DIR__) . '/request-mail-config.php',
    __DIR__ . '/request-mail-config.php',
];
$configPath = null;

foreach ($configPaths as $path) {
    if (is_file($path)) {
        $configPath = $path;
        break;
    }
}

$config = $configPath ? require $configPath : [];

$mailTo = trim((string)(isset($config['mail_to']) ? $config['mail_to'] : 'info@evolveclub.ru'));
$mailFrom = trim((string)(isset($config['mail_from']) ? $config['mail_from'] : 'clubmail@evolveclub.ru'));
$mailSubjectPrefix = trim((string)(isset($config['subject_prefix']) ? $config['subject_prefix'] : 'EvolveClub'));
$smtpEnabled = !empty($config['smtp_enabled']);
$smtpHost = trim((string)(isset($config['smtp_host']) ? $config['smtp_host'] : 'smtp.beget.com'));
$smtpPort = (int)(isset($config['smtp_port']) ? $config['smtp_port'] : 465);
$smtpSecure = trim((string)(isset($config['smtp_secure']) ? $config['smtp_secure'] : 'ssl'));
$smtpUsername = trim((string)(isset($config['smtp_username']) ? $config['smtp_username'] : $mailFrom));
$smtpPassword = (string)(isset($config['smtp_password']) ? $config['smtp_password'] : '');
$debugErrors = !empty($config['debug_errors']);

if (!filter_var($mailTo, FILTER_VALIDATE_EMAIL) || !filter_var($mailFrom, FILTER_VALIDATE_EMAIL)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Mail config error'], JSON_UNESCAPED_UNICODE);
    exit;
}

function field_value($name)
{
    $value = isset($_POST[$name]) ? $_POST[$name] : '';
    if (is_array($value)) {
        $value = implode(', ', array_map('strval', $value));
    }

    $value = trim((string)$value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $normalized = preg_replace('/[ \t]+/', ' ', $value);
    return $normalized === null ? '' : $normalized;
}

function clean_header($value)
{
    return trim(str_replace(["\r", "\n"], ' ', $value));
}

function json_response($ok, $message, $status = 200)
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function smtp_read_response($socket)
{
    $response = '';

    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }

    return $response;
}

function smtp_expect($socket, $codes)
{
    $response = smtp_read_response($socket);
    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $codes, true)) {
        throw new Exception('SMTP error: ' . trim($response));
    }
    return $response;
}

function smtp_command($socket, $command, $codes)
{
    fwrite($socket, $command . "\r\n");
    return smtp_expect($socket, $codes);
}

function smtp_send_mail($settings, $to, $from, $subject, $body)
{
    $host = $settings['host'];
    $port = (int)$settings['port'];
    $secure = $settings['secure'];
    $username = $settings['username'];
    $password = $settings['password'];
    $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host;

    $socket = fsockopen($remote, $port, $errno, $errstr, 20);
    if (!$socket) {
        throw new Exception('SMTP connect error: ' . $errstr);
    }

    stream_set_timeout($socket, 20);

    try {
        smtp_expect($socket, [220]);
        smtp_command($socket, 'EHLO evolveclub.ru', [250]);

        if ($secure === 'tls') {
            smtp_command($socket, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception('SMTP TLS error');
            }
            smtp_command($socket, 'EHLO evolveclub.ru', [250]);
        }

        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode($username), [334]);
        smtp_command($socket, base64_encode($password), [235]);
        smtp_command($socket, 'MAIL FROM:<' . $from . '>', [250]);
        smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtp_command($socket, 'DATA', [354]);

        $message = [];
        $message[] = 'From: EvolveClub <' . $from . '>';
        $message[] = 'To: ' . $to;
        $message[] = 'Subject: ' . $subject;
        $message[] = 'MIME-Version: 1.0';
        $message[] = 'Content-Type: text/plain; charset=UTF-8';
        $message[] = 'Content-Transfer-Encoding: 8bit';
        $message[] = '';
        $message[] = str_replace("\n.", "\n..", $body);

        fwrite($socket, implode("\r\n", $message) . "\r\n.\r\n");
        smtp_expect($socket, [250]);
        smtp_command($socket, 'QUIT', [221]);
        fclose($socket);
        return true;
    } catch (Exception $error) {
        fclose($socket);
        throw $error;
    }
}

if (field_value('website') !== '') {
    json_response(true, 'Заявка отправлена.');
}

$name = field_value('name');
$contact = field_value('contact');

if ($name === '' || $contact === '') {
    json_response(false, 'Заполните имя и контакт.', 422);
}

$labels = [
    'name' => 'Имя',
    'contact' => 'Контакт',
    'destination' => 'Направление',
    'dates' => 'Даты',
    'date_start' => 'Начало поездки',
    'date_end' => 'Конец поездки',
    'hotel' => 'Отель / размещение',
    'message' => 'Комментарий',
    'page_title' => 'Страница',
    'page_url' => 'Адрес страницы',
];

$dateStart = field_value('date_start');
$dateEnd = field_value('date_end');
$dateRange = 'Не определились';

if ($dateStart !== '' && $dateEnd !== '') {
    $dateRange = 'с ' . $dateStart . ' по ' . $dateEnd;
} elseif ($dateStart !== '') {
    $dateRange = 'с ' . $dateStart;
} elseif ($dateEnd !== '') {
    $dateRange = 'до ' . $dateEnd;
}

$ignored = ['website', 'date_start', 'date_end', 'dates'];
$lines = [];
$lines[] = 'Новая заявка с сайта EvolveClub';
$lines[] = '';

foreach ($_POST as $key => $value) {
    if (in_array($key, $ignored, true)) continue;

    $cleanKey = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)$key);
    if ($cleanKey === '') continue;

    $text = field_value($cleanKey);
    if ($text === '') continue;

    $label = isset($labels[$cleanKey]) ? $labels[$cleanKey] : $cleanKey;
    $lines[] = $label . ': ' . $text;

    if ($cleanKey === 'contact') {
        $lines[] = 'Даты поездки: ' . $dateRange;
    }
}

$lines[] = '';
$lines[] = 'IP: ' . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown');
$lines[] = 'User-Agent: ' . (isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'unknown');
$lines[] = 'Дата: ' . date('Y-m-d H:i:s');

$subjectParts = array_filter([$mailSubjectPrefix, 'заявка', $name]);
$subjectRaw = clean_header(implode(' - ', $subjectParts));
$subject = '=?UTF-8?B?' . base64_encode($subjectRaw) . '?=';
$body = implode("\n", $lines);

$sent = false;

if ($smtpEnabled) {
    if ($smtpUsername === '' || $smtpPassword === '') {
        json_response(false, 'SMTP config error', 500);
    }

    try {
        $sent = smtp_send_mail([
            'host' => $smtpHost,
            'port' => $smtpPort,
            'secure' => $smtpSecure,
            'username' => $smtpUsername,
            'password' => $smtpPassword,
        ], $mailTo, $mailFrom, $subject, $body);
    } catch (Exception $error) {
        if ($debugErrors) {
            json_response(false, 'SMTP debug: ' . $error->getMessage(), 500);
        }
        json_response(false, 'Не удалось отправить заявку. Попробуйте позже.', 500);
    }
} else {
    $headers = [
        'From: ' . clean_header($mailFrom),
        'Reply-To: ' . clean_header($mailFrom),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];

    $sendmailParams = '-f' . clean_header($mailFrom);
    $sent = mail($mailTo, $subject, $body, implode("\n", $headers), $sendmailParams);
}

if (!$sent) {
    json_response(false, 'Не удалось отправить заявку. Попробуйте позже.', 500);
}

json_response(true, 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.');
