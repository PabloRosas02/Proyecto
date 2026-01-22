#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_timer.h" 

#define LED_GPIO        GPIO_NUM_2
#define BUTTON_ON       GPIO_NUM_13
#define BUTTON_OFF      GPIO_NUM_14
#define BUTTON_TOGGLE   GPIO_NUM_12
#define DEBOUNCE_TIME_MS 200

static const char *TAG = "LED_BUTTONS";

typedef enum {
    BUTTON_EVENT_ON,
    BUTTON_EVENT_OFF,
    BUTTON_EVENT_TOGGLE
} button_event_t;

static QueueHandle_t gpio_evt_queue = NULL;

static void IRAM_ATTR gpio_isr_handler(void* arg) {
    uint32_t gpio_num = (uint32_t) arg;
    button_event_t event;

    if (gpio_num == BUTTON_ON) {
        event = BUTTON_EVENT_ON;
    } else if (gpio_num == BUTTON_OFF) {
        event = BUTTON_EVENT_OFF;
    } else if (gpio_num == BUTTON_TOGGLE) {
        event = BUTTON_EVENT_TOGGLE;
    } else {
        return;
    }

    xQueueSendFromISR(gpio_evt_queue, &event, NULL);
}

static void button_task(void* arg) {
    button_event_t evt;
    bool led_state = false;

    int64_t last_evt_time[3] = {0};

     while (1) {
        if (xQueueReceive(gpio_evt_queue, &evt, portMAX_DELAY)) {
            int index = (int) evt;  
            int64_t now = esp_timer_get_time(); 

            if ((now - last_evt_time[index]) < DEBOUNCE_TIME_MS * 1000) {
                continue;  // ignorar rebote
            }
            last_evt_time[index] = now;

            // Acción según el evento
            switch (evt) {
                case BUTTON_EVENT_ON:
                    led_state = true;
                    break;
                case BUTTON_EVENT_OFF:
                    led_state = false;
                    break;
                case BUTTON_EVENT_TOGGLE:
                    led_state = !led_state;
                    break;
            }
            gpio_set_level(LED_GPIO, led_state);
            ESP_LOGI(TAG, "LED %s", led_state ? "ON" : "OFF");
        }
    }
}

void app_main(void) {
    // Configurar LED como salida
    gpio_config_t led_conf = {
        .pin_bit_mask = 1ULL << LED_GPIO,
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&led_conf);
    gpio_set_level(LED_GPIO, 0);

    // Configurar botones como entradas con pull-down y flanco de subida
    gpio_config_t btn_conf = {
        .pin_bit_mask = (1ULL << BUTTON_ON) | (1ULL << BUTTON_OFF) | (1ULL << BUTTON_TOGGLE),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_POSEDGE
    };
    gpio_config(&btn_conf);

    // Crear cola de eventos
    gpio_evt_queue = xQueueCreate(10, sizeof(button_event_t));
    xTaskCreate(button_task, "button_task", 2048, NULL, 10, NULL);

    // Instalar ISR y asociar botones
    gpio_install_isr_service(0);
    gpio_isr_handler_add(BUTTON_ON, gpio_isr_handler, (void*) BUTTON_ON);
    gpio_isr_handler_add(BUTTON_OFF, gpio_isr_handler, (void*) BUTTON_OFF);
    gpio_isr_handler_add(BUTTON_TOGGLE, gpio_isr_handler, (void*) BUTTON_TOGGLE);
}
