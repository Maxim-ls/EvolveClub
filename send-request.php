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
    'hotel' => 'Отель / размещение',
    'message' => 'Комментарий',
    'page_title' => 'Страница',
    'page_url' => 'Адрес страницы',
];

$ignored = ['website'];
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
}

$lines[] = '';
$lines[] = 'IP: ' . (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown');
$lines[] = 'User-Agent: ' . (isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'unknown');
$lines[] = 'Дата: ' . date('Y-m-d H:i:s');

$subjectParts = array_filter([$mailSubjectPrefix, 'заявка', $name]);
$subjectRaw = clean_header(implode(' - ', $subjectParts));
$subject = '=?UTF-8?B?' . base64_encode($subjectRaw) . '?=';
$body = implode("\n", $lines);

$headers = [
    'From: ' . clean_header($mailFrom),
    'Reply-To: ' . clean_header($mailFrom),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sendmailParams = '-f' . clean_header($mailFrom);
$sent = mail($mailTo, $subject, $body, implode("\n", $headers), $sendmailParams);

if (!$sent) {
    json_response(false, 'Не удалось отправить заявку. Попробуйте позже.', 500);
}

json_response(true, 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.');
