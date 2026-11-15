const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Variabile temporanea in memoria che memorizza l'ultimo stato inviato dall'ESP32
let latestTelemetry = {
  temperature: 24.5,
  status: 'OK',
  timestamp: '--:--:--'
};

// Root endpoint / Health Check (FONDAMENTALE per Render o Railway)
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    service: 'NexusIoT Backend API',
    timestamp: new Date().toISOString()
  });
});

// Endpoint POST: L'ESP32 (o Wokwi) invia qui i dati tramite HTTP POST
app.post('/api/telemetry', (req, res) => {
  const { temperature, status } = req.body;
  if (temperature !== undefined) {
    latestTelemetry = {
      temperature: Number(temperature),
      status: status || (temperature > 30.0 ? 'ALARM' : 'OK'),
      timestamp: new Date().toLocaleTimeString()
    };
    console.log(`[ESP32 Node] Ricevuto -> Temp: ${latestTelemetry.temperature}°C | Stato: ${latestTelemetry.status}`);
    res.status(200).json({ success: true, message: "Telemetry stored successfully" });
  } else {
    res.status(400).json({ error: "Invalid payload format" });
  }
});

// Endpoint GET: La Dashboard React interroga questo indirizzo per leggere i dati
app.get('/api/telemetry', (req, res) => {
  res.json(latestTelemetry);
});

// Porta dinamica per il Cloud (fallback su 3000 in locale)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 NexusIoT Backend Server in ascolto sulla porta ${PORT}`);
});