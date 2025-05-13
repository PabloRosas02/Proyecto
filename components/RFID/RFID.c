#include "RFID.h"

#define compara "38202"

char card[10];

static void reader_callback(wiegand_reader_t *r){
    data_packet_t p;
    p.bits = r->bits;
    memcpy(p.data, r->buf, WIEGAND_BUF_SIZE);
    xQueueSendToBack(queue, &p, 0);
}

void gpio_init(){
    gpio_reset_pin(GPIO_NUM_23);
    gpio_set_direction(GPIO_NUM_23, GPIO_MODE_OUTPUT);
}

static void wiegand_task(void *arg){
    gpio_init();
    queue = xQueueCreate(5, sizeof(data_packet_t));
    if (!queue) {
        ESP_LOGE(TAG, "Error al crear la cola");
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

    ESP_LOGI(TAG, "Lector Wiegand inicializado");

    data_packet_t p;
    while (1) {
        if (xQueueReceive(queue, &p, portMAX_DELAY)) {
            // Mostrar datos crudos
            printf("==========================================\n");
            printf("Bits recibidos: %d\n", (int)p.bits);
            printf("Bytes: ");
            int bytes = (p.bits + 7) / 8;
            for (int i = 0; i < bytes; i++) {
                printf("0x%02X ", p.data[i]);
            }
            printf("\n");

            // Convertir a entero (hasta 64 bits)
            uint64_t value = 0;
            for (int i = 0; i < bytes; i++) {
                value = (value << 8) | p.data[i];
            }
            value = value >> (bytes * 8 - p.bits); // Desplaza para eliminar bits basura

            // Wiegand 26: 1 bit paridad + 8 facility code + 16 ID + 1 bit paridad
            uint32_t raw = (uint32_t)value;
            uint8_t facility = (raw >> 17) & 0xFF;
            uint16_t card_id = (raw >> 1) & 0xFFFF;
        
            ESP_LOGI(TAG, "Facility code: %u", facility);
            ESP_LOGI(TAG, "Card ID: %u", card_id);
            sprintf(card,"%u", card_id);

            if(strcmp(card, compara) == 0){
                ESP_LOGI(TAG, "Tarjeta correcta");
                gpio_set_level(GPIO_NUM_23, 0);
                vTaskDelay(2000 / portTICK_PERIOD_MS);
                gpio_set_level(GPIO_NUM_23, 1);
            }
        }
    }
}

void inicio(){

    xTaskCreate(wiegand_task, "wiegand_task", 4096, NULL, 5, NULL);
}