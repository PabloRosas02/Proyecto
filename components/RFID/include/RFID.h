#include <stdio.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <wiegand.h>
#include <string.h>
#include <inttypes.h> // para usar PRIu64

#define GPIO_WIEGAND_D0 18  // Ajusta a tu pin real
#define GPIO_WIEGAND_D1 19  // Ajusta a tu pin real
#define WIEGAND_BUF_SIZE 8 // hasta 64 bits (8 bytes)

static const char *TAG = "wiegand_reader";

static wiegand_reader_t reader;
static QueueHandle_t queue = NULL;

typedef struct {
    uint8_t data[WIEGAND_BUF_SIZE];
    size_t bits;
} data_packet_t;

void inicio(void);

