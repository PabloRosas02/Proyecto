#include <stdio.h>
#include "RFID.h"
#include "Wifi.h"

void app_main(void)
{
    nvs_flash_init();
    wifi_init_sta();
    inicio();
}
