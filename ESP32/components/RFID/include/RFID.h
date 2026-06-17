#pragma once

#include <stdio.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <wiegand.h>
#include <string.h>
#include <inttypes.h>

#include <sys/socket.h>
#include <netdb.h>
#include <netinet/in.h>
#include <stdlib.h>
#include <time.h>

#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_err.h"
#include "esp_http_client.h"
#include "esp_sntp.h"
#include "esp_system.h"
#include "lwip/sockets.h"
#include "unistd.h"

#define GPIO_WIEGAND_D0 18  
#define GPIO_WIEGAND_D1 19
#define WIEGAND_BUF_SIZE 8
#define GPIO_RELAY 13
#define ID_SALON 1  

#define SERVER_IP   "192.168.1.89"
#define TCP_PORT 4000  // Puerto unificado
static const char *TAG = "wiegand_reader";

static wiegand_reader_t reader;
static QueueHandle_t queue = NULL;


typedef struct {
    uint8_t data[WIEGAND_BUF_SIZE];
    size_t bits;
} data_packet_t;

typedef struct {
    bool acceso;
    int id_salon;
    char profesor[64];
} verificacion_resultado_t;

void inicio(void);
static void iniciar_sntp();
static void gpio_init();
static void reader_callback(wiegand_reader_t *r);
static bool verificar_con_servidor_tcp(const char* rfid, int* id_salon);


