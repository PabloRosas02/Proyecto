#ifndef WIFI_H
#define WIFI_H

#include <stdio.h>
#include <string.h>
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_http_server.h"

#define STA_SSID "INFINITUME5BA"         // SSID de la red Wi-Fi existente
#define STA_PASSWORD "Mm3Nm4Mj9p" // Contraseña de la red Wi-Fi

#define AP_SSID "ESP32_AP_Network"    // SSID de la red Wi-Fi creada por el ESP32
#define AP_PASSWORD "12345678"        // Contraseña para el punto de acceso

static const char *TAG = "WiFi_HTTP_Server";

void inicio_wifi();
void wifi_init_ap();
void wifi_init_sta();
httpd_handle_t start_http_server();
static esp_err_t http_post_handler(httpd_req_t *req);
static esp_err_t http_get_handler(httpd_req_t *req);

#endif

