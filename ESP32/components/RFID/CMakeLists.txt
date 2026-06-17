idf_component_register(SRCS "RFID.c"
                    INCLUDE_DIRS "include"
                    REQUIRES driver wiegand esp_http_client esp_netif nvs_flash esp_wifi )