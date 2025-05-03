#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "Wifi.h"
#include "LRFID.h"

void app_main(void)
{
    inicio_wifi(); 
    inicializacion(); 
}
