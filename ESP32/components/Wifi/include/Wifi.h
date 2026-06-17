#ifndef WIFI_H
#define WIFI_H

#include <string.h>
#include <stdio.h>

#include "esp_log.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "freertos/event_groups.h"
#include "driver/uart.h"
#include <string.h>

#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"

#define TAG "WiFi"
#define MAX_LEN 64
#define WIFI_CONNECTED_BIT BIT0

static EventGroupHandle_t wifi_event_group;
static char ssid[MAX_LEN] = {0};
static char password[MAX_LEN] = {0};

static void inicializar_uart();
static void leer_por_uart(char *buffer, size_t max_len);
void wifi_init_sta();
static void leer_credenciales_terminal();
static void guardar_credenciales_en_nvs();
static bool cargar_credenciales_de_nvs();

#endif