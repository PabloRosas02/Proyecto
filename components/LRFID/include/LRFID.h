#ifndef LRFID_H
#define LRFID_H

#include <stdio.h>
#include <string.h>
#include "wiegand.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"

// Pines para la interfaz Wiegand
#define D0_PIN GPIO_NUM_18
#define D1_PIN GPIO_NUM_19



void inicializacion();
static void IRAM_ATTR d0_isr_handler(void* arg); 
static void IRAM_ATTR d1_isr_handler(void* arg);

#endif