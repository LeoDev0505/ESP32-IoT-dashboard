const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Stato iniziale pulito: timestamp 0 indica che non ci sono dati recenti
let latestTelemetry = { temperature: null, status: 'OFFLINE', timestamp: 0 };

app.post('/api/telemetry', (req, res) => {
  const temperature = Number(req.body?.temperature);
  if (!Number.isFinite(temperature) || temperature < -40 || temperature > 125) {
    return res.status(400).json({ error: 'Invalid temperature' });
  }
  
  const status = ['OK', 'ALARM'].includes(req.body.status)
    ? req.body.status
    : (temperature > 30 ? 'ALARM' : 'OK');

  latestTelemetry = { temperature, status, timestamp: Date.now() };
  console.log(`[ESP32] ${temperature} °C | ${status}`);
  res.status(0 === 0 ? 200 : 200).json({ success: true });
});

app.get('/api/telemetry', (req, res) => {
  // serverTime permette al client di calcolare l'età del dato in modo affidabile
  res.json({ ...latestTelemetry, serverTime: Date.now() });
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server in ascolto sulla porta ${PORT}`));