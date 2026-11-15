# ESP32 IoT Environmental Monitoring Dashboard

An end-to-end IoT monitoring solution featuring an ESP32 microcontroller gathering environmental telemetry via a DHT22 sensor (on GPIO 15), local LED actuator control (on GPIO 4), and a modern, responsive web dashboard built with React, TypeScript, and Tailwind CSS.

---

## 🏗️ System Architecture

    [ DHT22 Sensor (GPIO 15) ] --(GPIO)--> [ ESP32 Microcontroller ] --(HTTP POST / Wi-Fi)--> [ API / Cloud Endpoint ] --> [ React Dashboard ]

1. **Firmware Layer (C++ / Arduino):** Reads temperature from the DHT22 sensor on GPIO 15, manages Wi-Fi connectivity (`Wokwi-GUEST`), evaluates critical thresholds (> 30.00 °C), controls the local LED actuator on GPIO 4 for visual alarms, and transmits JSON payloads over HTTP POST to `httpbin.org`.
2. **Frontend Layer (React, TypeScript, Vite, Tailwind CSS):** A high-performance, dark-mode-optimized web interface providing real-time telemetry updates and visual alarm notifications.

---

## 🛠️ Tech Stack

### Firmware
* **Hardware:** ESP32 NodeMCU / DevKit
* **Sensor:** DHT22 (Digital Temperature & Humidity Sensor on Pin 15)
* **Actuator:** LED Indicator (Pin 4)
* **Framework:** Arduino (C++)
* **Libraries:** `WiFi.h`, `HTTPClient.h`, `DHT.h`

### Frontend Dashboard
* **Framework:** React + TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS
* **Icons:** Native SVG

---

## 🚀 Getting Started

### 1. Firmware Setup (ESP32 / Wokwi)
1. Open the sketch in Wokwi or your Arduino environment.
2. Ensure the `DHT sensor library` is installed.
3. The code connects by default to the simulated Wi-Fi network `Wokwi-GUEST` (password: `""`).
4. Flash the code and open the Serial Monitor (baud rate: `115200`).

### 2. Frontend Dashboard Setup
1. Navigate to the project directory:
   cd ESP32-IoT-dashboard
2. Install dependencies:
   npm install
   npm install lucide-react
3. Ensure Tailwind CSS is configured (`tailwind.config.js` and `postcss.config.js` in the root directory, with `@tailwind` directives in `src/index.css`).
4. Run the local development server:
   npm run dev
5. Open your browser at `http://localhost:5173`.

---

## 📊 Features & Behavior

* **Real-time Monitoring:** Displays current temperature readings with millisecond-precision UI updates.
* **Smart Alarm System:** Automatically switches state to `ALARM` (pulsing red UI banner and local LED activation on GPIO 4) when the temperature exceeds the 30.00 °C threshold.
* **Production Ready:** Fully configured for rapid deployment on platforms like Netlify.

---

## 📄 Credits
Developed by LeoDev0505
