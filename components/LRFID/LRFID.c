#include "LRFID.h"
// Variables para almacenar el ID
uint32_t rfid_id = 0;
uint8_t bit_count = 0;

// Interrupción para el pin D0
static void IRAM_ATTR d0_isr_handler(void* arg) {
    rfid_id <<= 1; // Desplazar bits a la izquierda
    bit_count++;
}

// Interrupción para el pin D1
static void IRAM_ATTR d1_isr_handler(void* arg) {
    rfid_id = (rfid_id << 1) | 1; // Desplazar bits y agregar un 1
    bit_count++;
}

void inicializacion(void) {
    // Configurar los pines como entradas
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << D0_PIN) | (1ULL << D1_PIN),
        .mode = GPIO_MODE_INPUT,
        .intr_type = GPIO_INTR_NEGEDGE,
    };
    gpio_config(&io_conf);

    // Configurar interrupciones
    gpio_install_isr_service(0);
    gpio_isr_handler_add(D0_PIN, d0_isr_handler, NULL);
    gpio_isr_handler_add(D1_PIN, d1_isr_handler, NULL);

    while (1) {
        vTaskDelay(pdMS_TO_TICKS(1000)); // Esperar 1 segundo

        if (bit_count > 0) {
            printf("RFID ID: %lu\n", rfid_id);
            rfid_id = 0; // Reiniciar ID
            bit_count = 0; // Reiniciar contador de bits
        }
    }
}

