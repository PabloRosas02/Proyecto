#include "RFID.h"

char card[12];

// Inicializa SNTP para sincronización de hora
static void iniciar_sntp() {
    setenv("TZ", "PST8PDT,M3.2.0/2,M11.1.0/2", 1);
    tzset();
    sntp_setoperatingmode(SNTP_OPMODE_POLL);
    sntp_setservername(0, "pool.ntp.org");
    sntp_init();

    time_t now;
    struct tm timeinfo;
    int retry = 0;

    while (retry < 10) {
        time(&now);
        localtime_r(&now, &timeinfo);
        if (timeinfo.tm_year > 70) break;
        vTaskDelay(2000 / portTICK_PERIOD_MS);
        retry++;
    }

    if (retry == 10) {
        ESP_LOGW(TAG, "No se pudo sincronizar la hora.");
    } else {
        char fecha_completa[64];
        strftime(fecha_completa, sizeof(fecha_completa), "%A %Y-%m-%d %H:%M:%S", &timeinfo);
        ESP_LOGI(TAG, "Hora sincronizada: %s", fecha_completa);
    }
}

static void gpio_init() {
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << GPIO_RELAY),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&io_conf);
    gpio_set_level(GPIO_RELAY, 0);
}

// Verificación RFID (profesor con clase)
static bool verificar_con_servidor_tcp(const char* rfid, int* id_salon) {
    struct sockaddr_in dest_addr;
    dest_addr.sin_addr.s_addr = inet_addr(SERVER_IP);
    dest_addr.sin_family = AF_INET;
    dest_addr.sin_port = htons(TCP_PORT);

    int sock = socket(AF_INET, SOCK_STREAM, IPPROTO_IP);
    if (sock < 0) return false;

    if (connect(sock, (struct sockaddr *)&dest_addr, sizeof(dest_addr)) != 0) {
        close(sock);
        return false;
    }

    char mensaje[64];
    snprintf(mensaje, sizeof(mensaje), "RFID:%s:%d\n", rfid, ID_SALON);
    send(sock, mensaje, strlen(mensaje), 0);

    char respuesta[64];
    int len = recv(sock, respuesta, sizeof(respuesta) - 1, 0);
    if (len > 0) {
        respuesta[len] = 0;
        ESP_LOGI(TAG, "Respuesta verificación: %s", respuesta);
        if (strncmp(respuesta, "OK:", 3) == 0) {
            *id_salon = atoi(respuesta + 3);
            close(sock);
            return true;
        }
    }

    close(sock);
    return false;
}

// Callback para lector Wiegand
static void reader_callback(wiegand_reader_t* r) {
    data_packet_t p;
    p.bits = r->bits;
    memcpy(p.data, r->buf, WIEGAND_BUF_SIZE);
    xQueueSendToBack(queue, &p, 0);
}

static void wiegand_task(void* arg) {
    queue = xQueueCreate(5, sizeof(data_packet_t));
    if (!queue) {
        ESP_LOGE(TAG, "No se pudo crear la cola");
        vTaskDelete(NULL);
    }

    ESP_ERROR_CHECK(wiegand_reader_init(
        &reader,
        GPIO_WIEGAND_D0,
        GPIO_WIEGAND_D1,
        true,
        WIEGAND_BUF_SIZE,
        reader_callback,
        WIEGAND_MSB_FIRST,
        WIEGAND_LSB_FIRST
    ));

    ESP_LOGI(TAG, "Wiegand iniciado");

    data_packet_t p;
    char rfid_str[16];

    while (1) {
        if (xQueueReceive(queue, &p, portMAX_DELAY)) {
            uint64_t value = 0;
            int bytes = (p.bits + 7) / 8;
            for (int i = 0; i < bytes; i++) {
                value = (value << 8) | p.data[i];
            }

            value = value >> (bytes * 8 - p.bits);
            uint32_t raw = (uint32_t)value;
            uint8_t facility = (raw >> 17) & 0xFF;
            uint16_t card_id = (raw >> 1) & 0xFFFF;
            uint32_t full_id = ((uint32_t)facility << 16) | card_id;

            snprintf(rfid_str, sizeof(rfid_str), "%lu", (unsigned long)full_id);
            ESP_LOGI(TAG, "RFID leído: %s", rfid_str);

            int id_salon = -1;
            if (verificar_con_servidor_tcp(rfid_str, &id_salon)) {
                ESP_LOGI(TAG, "Acceso autorizado. Abriendo salón %d...", id_salon);
                gpio_set_level(GPIO_RELAY, 1);
                vTaskDelay(10000 / portTICK_PERIOD_MS);
                gpio_set_level(GPIO_RELAY, 0);
            } else {
                ESP_LOGW(TAG, "Acceso denegado.");
            }
        }
    }
}

// Tarea para mantener conexión TCP persistente (apertura remota)
static void apertura_remota_tcp_task(void* arg) {
    struct sockaddr_in dest_addr;
    dest_addr.sin_addr.s_addr = inet_addr(SERVER_IP);
    dest_addr.sin_family = AF_INET;
    dest_addr.sin_port = htons(TCP_PORT);

    while (1) {
        int sock = socket(AF_INET, SOCK_STREAM, IPPROTO_IP);
        if (sock < 0) {
            ESP_LOGE(TAG, "No se pudo crear socket TCP");
            vTaskDelay(3000 / portTICK_PERIOD_MS);
            continue;
        }

        if (connect(sock, (struct sockaddr *)&dest_addr, sizeof(dest_addr)) != 0) {
            ESP_LOGW(TAG, "No se pudo conectar al servidor TCP");
            close(sock);
            vTaskDelay(3000 / portTICK_PERIOD_MS);
            continue;
        }

        // Enviar ID de salón al servidor
        char saludo[32];
        snprintf(saludo, sizeof(saludo), "LISTO:%d\n", ID_SALON);
        send(sock, saludo, strlen(saludo), 0);

        char respuesta[32];
        while (1) {
            int len = recv(sock, respuesta, sizeof(respuesta) - 1, 0);
            if (len > 0) {
                respuesta[len] = 0;
                ESP_LOGI(TAG, "Comando remoto recibido: %s", respuesta);
                if (strncmp(respuesta, "ABRIR", 5) == 0) {
                    gpio_set_level(GPIO_RELAY, 1);
                    vTaskDelay(10000 / portTICK_PERIOD_MS);
                    gpio_set_level(GPIO_RELAY, 0);
                }
            } else {
                ESP_LOGW(TAG, "Conexión cerrada o pérdida de datos. Reintentando...");
                break;
            }
        }

        close(sock);
        vTaskDelay(3000 / portTICK_PERIOD_MS);
    }
}

void inicio() {
    gpio_init();
    iniciar_sntp();
    xTaskCreate(wiegand_task, "wiegand_task", 8192, NULL, 5, NULL);
    xTaskCreate(apertura_remota_tcp_task, "apertura_remota_tcp_task", 8192, NULL, 5, NULL);
}
