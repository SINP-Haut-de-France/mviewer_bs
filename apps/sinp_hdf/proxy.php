<?php
/**
 * Proxy CORS pour GeoServer
 *
 * Ce proxy permet de contourner les restrictions CORS en agissant comme intermédiaire
 * entre le client (navigateur) et GeoServer.
 *
 * Installation:
 * 1. Placer ce fichier dans /var/www/html/proxy.php (ou dans votre dossier mviewer)
 * 2. S'assurer que PHP curl est installé: sudo apt-get install php-curl
 * 3. Configurer dans sinp_hdf.xml: <proxy url="http://votre-serveur/proxy.php?url="/>
 *
 * Sécurité:
 * - Ajouter une whitelist d'URLs autorisées en production
 * - Limiter aux IPs du réseau interne si possible
 *
 * @author SINP HDF
 * @date 2026-02-27
 */

// En-têtes CORS pour autoriser toutes les origines (à restreindre en production)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400'); // Cache des preflight requests pendant 24h

// Répondre aux requêtes OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Récupérer l'URL cible depuis les paramètres
$url = $_GET['url'] ?? '';

if (empty($url)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'URL parameter is required',
        'usage' => 'proxy.php?url=http://example.com/api'
    ]);
    exit();
}

// Liste blanche des domaines autorisés (sécurité)
// En production, décommenter et configurer cette liste
$allowedDomains = [
    '172.30.0.11:8080',           // GeoServer DEV
    'www.geo2france.fr',          // GeoServer PROD/PREPROD
    // Ajouter d'autres domaines autorisés ici
];

// Vérifier si l'URL est dans la whitelist (optionnel, à activer en production)
/*
$urlHost = parse_url($url, PHP_URL_HOST);
$urlPort = parse_url($url, PHP_URL_PORT);
$urlHostPort = $urlPort ? "$urlHost:$urlPort" : $urlHost;

if (!in_array($urlHostPort, $allowedDomains)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Domain not allowed',
        'domain' => $urlHostPort,
        'allowed' => $allowedDomains
    ]);
    exit();
}
*/

// Log de la requête (pour debug, à désactiver en production)
error_log("Proxy request to: $url");

// Initialiser cURL
$ch = curl_init();

// Configuration cURL
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch, CURLOPT_TIMEOUT, 120); // Timeout de 2 minutes
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // À activer en production
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false); // À activer en production

// Transférer les en-têtes du client (si nécessaire)
$headers = [];
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
}
if (isset($_SERVER['HTTP_CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['HTTP_CONTENT_TYPE'];
}
if (!empty($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
}

// Gérer les requêtes POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

// Exécuter la requête
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);

curl_close($ch);

// Gérer les erreurs cURL
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Proxy request failed',
        'details' => $error,
        'url' => $url
    ]);
    exit();
}

// Renvoyer la réponse
header('Content-Type: ' . ($contentType ?: 'application/json'));
http_response_code($httpCode);
echo $response;
?>

