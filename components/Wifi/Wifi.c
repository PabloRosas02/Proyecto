#include "Wifi.h"

static esp_err_t http_get_handler(httpd_req_t *req){
    const char *response = "Servidor HTTP funcionando correctamente.";
    httpd_resp_send(req, response, strlen(response));
    ESP_LOGI(TAG, "Solicitud HTTP GET recibida.");
    return ESP_OK;
}

static esp_err_t http_post_handler(httpd_req_t *req){
    char content[100];
    int received = httpd_req_recv(req, content, sizeof(content));
    if (received <= 0) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }
    content[received] = '\0'; // Asegúrate de que el contenido recibido sea nulo-terminado
    ESP_LOGI(TAG, "Datos recibidos por POST: %s", content);

    // Envía una respuesta al cliente
    httpd_resp_send(req, "Datos recibidos correctamente.", HTTPD_RESP_USE_STRLEN);
    return ESP_OK;
}

httpd_handle_t start_http_server(void) {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    httpd_handle_t server = NULL;

    // Inicia el servidor HTTP
    if (httpd_start(&server, &config) == ESP_OK) {
        httpd_uri_t get_uri = {
            .uri = "/get",
            .method = HTTP_GET,
            .handler = http_get_handler,
            .user_ctx = NULL,
        };
        httpd_uri_t post_uri = {
            .uri = "/post",
            .method = HTTP_POST,
            .handler = http_post_handler,
            .user_ctx = NULL,
        };
        httpd_register_uri_handler(server, &get_uri);
        httpd_register_uri_handler(server, &post_uri);

        ESP_LOGI(TAG, "Servidor HTTP iniciado.");
    } else {
        ESP_LOGE(TAG, "Fallo al iniciar el servidor HTTP.");
    }
    return server;
}

void wifi_init_sta(){
    wifi_config_t sta_config = {
        .sta = {
            .ssid = STA_SSID,
            .password = STA_PASSWORD,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA)); // Modo AP + STA
    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_STA, &sta_config));
    ESP_LOGI(TAG, "Modo STA configurado con SSID: %s", STA_SSID);
}

void wifi_init_ap(){
    wifi_config_t ap_config = {
        .ap = {
            .ssid = AP_SSID,
            .ssid_len = strlen(AP_SSID),
            .password = AP_PASSWORD,
            .authmode = WIFI_AUTH_WPA2_PSK,
            .max_connection = 4,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA)); // Modo AP + STA
    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_AP, &ap_config));
    ESP_LOGI(TAG, "Modo AP configurado con SSID: %s", AP_SSID);
}

void inicio_wifi(){
    ESP_ERROR_CHECK(nvs_flash_init()); // Inicializa NVS
    ESP_ERROR_CHECK(esp_netif_init()); // Inicializa la red
    ESP_ERROR_CHECK(esp_event_loop_create_default()); // Crea el loop de eventos

    wifi_init_config_t wifi_init_cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&wifi_init_cfg));
    ESP_LOGI(TAG, "Iniciando Wi-Fi en modo dual...");
    
    wifi_init_sta(); // Configura STA
    wifi_init_ap();  // Configura AP
    
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_LOGI(TAG, "Wi-Fi en modo dual configurado correctamente.");

    // Inicia el servidor HTTP
    start_http_server();
}
