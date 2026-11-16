/**
 * @file sketch.ino
 * @brief ESP32 IoT Environmental Monitoring Firmware (Wokwi Simulation)
 * @author Leonardo Lunardi (LeoDev0505)
 * @details Legge i dati ambientali tramite il sensore DHT22, gestisce la logica 
 *          di allarme locale con un attuatore LED e trasmette i dati telemetrici 
 *          via HTTPS (POST) a un backend cloud Node.js/Express ospitato su Render.
 */

#include <DHT.h>
#include <stddef.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#define WIFI_NETWORK "Wokwi-GUEST"
#define WIFI_PASSWORD ""
#define WIFI_TIMEOUT 20000

#define DHT_PIN 15          
#define LED_PIN 4           

DHT dht_sensor(DHT_PIN, DHT22); 

// Endpoint cloud ufficiale su Render (-xo8d)
const char* serverUrl = "https://esp32-iot-dashboard-xo8d.onrender.com/api/telemetry";

void initWiFi() {
  Serial.println("Inizializzazione connessione Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_NETWORK, WIFI_PASSWORD);
  
  size_t startAttemptTime = millis();
  while ((WiFi.status() != WL_CONNECTED) && ((millis() - startAttemptTime) <= WIFI_TIMEOUT)) {
    Serial.print(".");
    delay(100);
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n[ERRORE] Connessione Wi-Fi fallita o scaduta.");
  } else {
    Serial.printf("\n[SUCCESSO] Wi-Fi connesso! IP: %s\n", WiFi.localIP().toString().c_str());
  }
}

bool sendDataToServer(float temp, const String& status) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERRORE] Wi-Fi disconnesso, riconnessione...");
    WiFi.reconnect();
    return false;
  }

  WiFiClientSecure secureClient;
  secureClient.setInsecure(); // Bypassa certificato per Wokwi

  HTTPClient http;
  if (!http.begin(secureClient, serverUrl)) {
    Serial.println("[ERRORE] http.begin() fallita");
    return false;
  }
  
  http.setReuse(false);
  http.setConnectTimeout(10000);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"temperature\":" + String(temp, 2) + ",\"status\":\"" + status + "\"}";

  int code = http.POST(payload);
  bool ok = (code == 200 || code == 201);

  if (ok) {
    Serial.printf("[CLOUD] Inviato con successo: %s\n", payload.c_str()); // Corretto (via il 5)
  } else if (code > 0) {
    Serial.printf("[CLOUD] Errore HTTP %d: %s\n", code, http.getString().substring(0, 150).c_str());
  } else {
    Serial.printf("[CLOUD] Errore di rete (%d): %s\n", code, HTTPClient::errorToString(code).c_str()); // Corretto (via il 5)
  }
  
  http.end();
  return ok;
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n--- Avvio Sistema IoT ESP32 ---");
  
  dht_sensor.begin();
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  initWiFi();
  delay(3000); // Stabilizzazione della rete simulata su Wokwi
}

void loop() {
  float temp = dht_sensor.readTemperature();

  if (isnan(temp)) {
    Serial.println("[ERRORE] Impossibile leggere dal sensore DHT22!");
    delay(2000);
    return;
  }

  Serial.printf("Temperatura rilevata: %.2f °C\n", temp);

  // Gestione isteresi LED per evitare flapping vicino alla soglia
  static bool alarmActive = false;
  if (!alarmActive && temp > 30.0) {
    alarmActive = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("[ALLARME] Soglia superata (> 30.0 °C). LED ON.");
  } else if (alarmActive && temp < 29.5) {
    alarmActive = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("[INFO] Temperatura rientrata (< 29.5 °C). LED OFF.");
  }

  String sensorStatus = alarmActive ? "ALARM" : "OK";

  // Tentativi multipli (retry) per superare i rifiuti di connessione transitori
  bool sent = false;
  for (int i = 0; i < 3 && !sent; i++) {
    sent = sendDataToServer(temp, sensorStatus);
    if (!sent) delay(2000);
  }
  
  // Delay allungato a 7 secondi per stabilire socket TCP puliti senza sovraccaricare il cloud
  delay(7000); 
}
