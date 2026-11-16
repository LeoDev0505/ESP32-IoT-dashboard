
# 🌐 ESP32 IoT Real-Time Telemetry & Monitoring Dashboard

An end-to-end full-stack IoT telemetry solution featuring an **ESP32** microcontroller (simulated via Wokwi) collecting environmental sensor data, a cloud-ready **Node.js & Express REST API** backend, and a modern, responsive **React, TypeScript & Tailwind CSS** web dashboard.

The system provides real-time environmental monitoring, automated temperature threshold detection, and hardware-level visual alerts through an integrated LED actuator.

---

## 🏗️ System Architecture

```text
                 ┌─────────────────────────┐
                 │     DHT22 Sensor        │
                 │   Temperature/Humidity  │
                 │       GPIO 15           │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │       ESP32             │
                 │   Arduino / C++         │
                 │                         │
                 │  • Sensor acquisition   │
                 │  • Threshold detection  │
                 │  • LED control          │
                 │  • Wi-Fi connectivity   │
                 └────────────┬────────────┘
                              │
                         HTTP POST
                              │
                              ▼
                 ┌─────────────────────────┐
                 │    Node.js / Express    │
                 │       REST API          │
                 │                         │
                 │     Render Cloud        │
                 └────────────┬────────────┘
                              │
                         HTTP GET
                         (Polling)
                              │
                              ▼
                 ┌─────────────────────────┐
                 │    React Dashboard      │
                 │                         │
                 │  • Live telemetry       │
                 │  • Alarm notifications  │
                 │  • Interactive UI       │
                 │                         │
                 │      Vercel             │
                 └─────────────────────────┘

                 ┌─────────────────────────┐
                 │      LED Actuator       │
                 │        GPIO 4           │
                 │    Local alarm output   │
                 └─────────────────────────┘
```

The architecture consists of three independent layers:

1. **Firmware Layer (C++ / Arduino):** The ESP32 reads temperature and humidity measurements from the DHT22 sensor connected to GPIO 15. It manages Wi-Fi connectivity through the `Wokwi-GUEST` network, evaluates temperature thresholds, controls a local LED actuator connected to GPIO 4, and transmits telemetry data to the backend using HTTP POST requests with JSON payloads.

2. **Backend API Layer (Node.js / Express):** A lightweight REST API receives incoming sensor measurements through `POST /api/telemetry` and exposes the latest telemetry state through `GET /api/telemetry`. The server uses CORS middleware and JSON request parsing and is deployed on Render.

3. **Frontend Dashboard Layer (React / TypeScript):** A responsive web application retrieves telemetry data from the backend through periodic HTTP polling. It displays environmental measurements, system status, and visual alarm notifications. The frontend is built with Vite and Tailwind CSS and deployed on Netlify.

---

## 🛠️ Tech Stack

### Firmware & Hardware

| Component | Technology |
|---|---|
| Microcontroller | ESP32 NodeMCU / DevKit |
| Temperature & Humidity Sensor | DHT22 |
| Sensor Connection | GPIO 15 |
| LED Actuator | GPIO 4 |
| Programming Language | C++ |
| Development Framework | Arduino |
| Communication | Wi-Fi / HTTP |
| Libraries | `WiFi.h`, `HTTPClient.h`, `DHT.h` |
| Simulation Environment | Wokwi |

### Backend

| Component | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Middleware | CORS |
| Data Format | JSON |
| Communication | REST API / HTTP |
| Cloud Deployment | Render |

### Frontend Dashboard

| Component | Technology |
|---|---|
| Framework | React |
| Programming Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Communication | HTTP / REST API |
| Cloud Deployment | Netlify |

---

## 📁 Repository Structure

The project follows a clean **Monorepo architecture**, keeping the backend and frontend applications organized within a single repository.

```text
ESP32-IoT-dashboard/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── dashboard/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

Follow these instructions to run the backend and frontend applications locally.

### 1. Backend Setup

Navigate to the backend directory, install the required dependencies, and start the Express server:

```bash
cd backend
npm install
node server.js
```

The backend server will be available at:

```text
http://localhost:3000
```

### 2. Frontend Dashboard Setup

Open a separate terminal, navigate to the dashboard directory, install its dependencies, and start the Vite development server:

```bash
cd dashboard
npm install
npm run dev
```

The dashboard will be available at:

```text
http://localhost:5173
```

### 3. ESP32 Firmware (Wokwi Simulation)

1. Open the Wokwi project containing the ESP32 microcontroller, DHT22 sensor, and LED actuator.
2. Configure the `serverUrl` variable in the Arduino sketch to point to the backend endpoint.
3. Use the appropriate endpoint depending on the execution environment:

   **Local backend:**
   ```cpp
   http://localhost:3000/api/telemetry
   ```

   **Cloud backend:**
   ```cpp
   https://YOUR-RENDER-SERVICE.onrender.com/api/telemetry
   ```

4. Start the Wokwi simulation.
5. Monitor the incoming sensor measurements through the web dashboard.

**Note:** When using Wokwi, the backend must be reachable from the simulation environment. `localhost` refers to the machine running the ESP32 simulation, not the Render server.

---

## 📊 Features & System Behavior

### 🌡️ Real-Time Environmental Monitoring

- Continuous temperature and humidity acquisition through the DHT22 sensor.
- Transmission of sensor measurements to the backend using HTTP POST requests.
- Periodic dashboard updates through HTTP GET polling.
- Live visualization of the latest available telemetry data.

### 🚨 Smart Temperature Alarm

- Automatic temperature threshold evaluation on the ESP32.
- Alarm activation when the measured temperature exceeds **30.00 °C**.
- Local LED activation through GPIO 4.
- Visual alarm notifications within the web dashboard.
- Dynamic system status representation.

### ☁️ Cloud-Ready Architecture

- Independent firmware, backend, and frontend layers.
- REST API communication through HTTP and JSON.
- Backend deployment on Render.
- Frontend deployment on Vercel.
- Remote communication between the ESP32 simulation and the dashboard through the cloud backend.

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/telemetry` | Receives temperature and humidity measurements from the ESP32. |
| `GET` | `/api/telemetry` | Returns the latest available telemetry data. |

The backend acts as the communication layer between the ESP32 and the web dashboard.

---

## 👨‍💻 Author

**Leonardo Lunardi**

GitHub: [@LeoDev0505](https://github.com/LeoDev0505)

---

*Built with Arduino, ESP32, Node.js, Express, React, TypeScript, and Tailwind CSS.*

