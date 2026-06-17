#include "Wifi.h"

static void inicializar_uart() {
    const uart_config_t uart_config = {
        .baud_rate = 115200,
        .data_bits = UART_DATA_8_BITS,
        .parity    = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE
    };

    uart_driver_install(UART_NUM_0, 1024, 0, 0, NULL, 0);
    uart_param_config(UART_NUM_0, &uart_config);
    uart_set_pin(UART_NUM_0, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
}


void leer_por_uart(char *buffer, size_t max_len) {
    memset(buffer, 0, max_len);  // limpia el buffer antes de usarlo
    int i = 0;
    while (i < max_len - 1) {
        uint8_t ch;
        int len = uart_read_bytes(UART_NUM_0, &ch, 1, portMAX_DELAY);
        if (len > 0) {
            if (ch == '\r' || ch == '\n') {
                uart_write_bytes(UART_NUM_0, "\r\n", 2);  // nueva línea
                break;
            } else if (ch >= 32 && ch <= 126) {  // caracteres imprimibles
                buffer[i++] = ch;
                uart_write_bytes(UART_NUM_0, (const char *)&ch, 1);  // eco
            }
        }
    }
    buffer[i] = '\0';
}


static void leer_credenciales_terminal() {
    printf("Introduce el SSID: ");
    fflush(stdout);
    leer_por_uart(ssid, MAX_LEN);
    ESP_LOGI("WiFi", "SSID leido: %s", ssid);

    printf("Introduce la contraseña: ");
    fflush(stdout);
    leer_por_uart(password, MAX_LEN);
    ESP_LOGI("WiFi", "Password leido: %s", password);
}

static void guardar_credenciales_en_nvs() {
    nvs_handle_t nvs;
    if (nvs_open("wifi", NVS_READWRITE, &nvs) == ESP_OK) {
        nvs_set_str(nvs, "ssid", ssid);
        nvs_set_str(nvs, "pass", password);
        nvs_commit(nvs);
        nvs_close(nvs);
    }
}

static bool cargar_credenciales_de_nvs() {
    nvs_handle_t nvs;
    size_t ssid_len = MAX_LEN;
    size_t pass_len = MAX_LEN;

    if (nvs_open("wifi", NVS_READONLY, &nvs) != ESP_OK)
        return false;

    esp_err_t r1 = nvs_get_str(nvs, "ssid", ssid, &ssid_len);
    esp_err_t r2 = nvs_get_str(nvs, "pass", password, &pass_len);
    nvs_close(nvs);

    return (r1 == ESP_OK && r2 == ESP_OK && strlen(ssid) > 0 && strlen(password) > 0);
}

static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                               int32_t event_id, void* event_data) {
    if (event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_id == WIFI_EVENT_STA_CONNECTED) {
        ESP_LOGI(TAG, "Conectado al AP");
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ESP_LOGI(TAG, "¡Conexion exitosa!");
        xEventGroupSetBits(wifi_event_group, WIFI_CONNECTED_BIT);
    } else if (event_id == WIFI_EVENT_STA_DISCONNECTED) {
        ESP_LOGW(TAG, "Desconectado. Intentando reconexion...");
        esp_wifi_connect();
    }
}

void wifi_init_sta() {
    /*nvs_flash_erase();
    nvs_flash_init();*/
    inicializar_uart();
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);
    esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL);
    esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, NULL);

    wifi_event_group = xEventGroupCreate();

    if (!cargar_credenciales_de_nvs()) {
        ESP_LOGW(TAG, "No se encontraron credenciales. Solicitandolas...");
        leer_credenciales_terminal();
        guardar_credenciales_en_nvs();
    } 
    else {
        ESP_LOGI(TAG, "Credenciales cargadas de NVS.");
    }

    wifi_config_t wifi_config = { 0 };
    strncpy((char *)wifi_config.sta.ssid, ssid, sizeof(wifi_config.sta.ssid));
    strncpy((char *)wifi_config.sta.password, password, sizeof(wifi_config.sta.password));

    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_start();

    ESP_LOGI(TAG, "Conectando a WiFi...");
    xEventGroupWaitBits(wifi_event_group, WIFI_CONNECTED_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
}
