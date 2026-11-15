import { useState, useEffect, useRef } from 'react';

interface SensorPayload {
  temperature: number | null;
  status: 'OK' | 'ALARM' | 'OFFLINE';
  timestamp: number;
  serverTime: number;
}

// Utilizza la variabile d'ambiente impostata su Netlify o ricade sull'endpoint cloud ufficiale
const API_URL = import.meta.env.VITE_API_URL ?? 'https://esp32-iot-dashboard-xo8d.onrender.com/api/telemetry';

export default function App() {
  const [isSimulation, setIsSimulation] = useState<boolean>(true);
  const [sensorData, setSensorData] = useState<SensorPayload>({
    temperature: 24.5,
    status: 'OK',
    timestamp: 0,
    serverTime: Date.now(),
  });
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isWakingUp, setIsWakingUp] = useState<boolean>(false);

  const wasAlarmRef = useRef<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Ultima temperatura generata dalla simulazione (evita effetti collaterali dentro setState)
  const simTempRef = useRef<number>(24.5);

  // Inizializzazione sicura della Web Audio API per il beep di allarme
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playBeep = () => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.log("Audio non riproducibile:", e);
    }
  };

  // 1. Motore di Simulazione (Modalità Demo)
  useEffect(() => {
    if (!isSimulation) return;
    setIsWakingUp(false);

    // Ripartenza pulita ad ogni ingresso in modalità Demo
    simTempRef.current = 24.5;
    wasAlarmRef.current = false;

    // Funzione di generazione: calcolo e beep fuori da setState (nessun doppio beep in StrictMode)
    const triggerDemoTick = () => {
      const delta = (Math.random() - 0.45) * 1.3;
      let nextTemp = Number((simTempRef.current + delta).toFixed(2));

      if (nextTemp < 21.0) nextTemp = 21.0;
      if (nextTemp > 35.0) nextTemp = 35.0;
      simTempRef.current = nextTemp;

      const nextStatus: SensorPayload['status'] = nextTemp > 30.0 ? 'ALARM' : 'OK';

      if (nextStatus === 'ALARM' && !wasAlarmRef.current) {
        playBeep();
      }
      wasAlarmRef.current = (nextStatus === 'ALARM');

      const now = Date.now();
      setSensorData({
        temperature: nextTemp,
        status: nextStatus,
        timestamp: now,
        serverTime: now,
      });
    };

    triggerDemoTick(); // Primo aggiornamento istantaneo al cambio di modalità
    const telemetryInterval = setInterval(triggerDemoTick, 2000); // Poi ogni 2 secondi

    return () => clearInterval(telemetryInterval);
  }, [isSimulation]);

  // 2. Motore Live (Chiamata Fetch asincrona con supporto Cold Start e serverTime)
  useEffect(() => {
    if (isSimulation) {
      setIsLiveConnected(false);
      setIsWakingUp(false);
      return;
    }

    let isMounted = true;

    const fetchLiveData = async (isInitial: boolean) => {
      // Al primo avvio concediamo fino a 25 secondi per il risveglio di Render (Cold Start)
      const timeoutMs = isInitial ? 25000 : 5000;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);

      if (isInitial) {
        setIsWakingUp(true);
      }

      try {
        const response = await fetch(API_URL, { signal: ctrl.signal });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (!isMounted) return;

        // Calcolo dell'età del dato basato sul serverTime per evitare disallineamenti di orologio
        const age = data.serverTime - data.timestamp;
        const isOffline = data.timestamp === 0 || age > 20000; // 20 secondi di tolleranza

        const nextStatus: SensorPayload['status'] = isOffline
          ? 'OFFLINE'
          : (data.temperature > 30.0 ? 'ALARM' : 'OK');

        if (!isOffline && nextStatus === 'ALARM' && !wasAlarmRef.current) {
          playBeep();
        }

        if (isOffline) {
          wasAlarmRef.current = false;
        } else {
          wasAlarmRef.current = (nextStatus === 'ALARM');
        }

        setSensorData({
          temperature: data.temperature,
          status: nextStatus,
          timestamp: data.timestamp,
          serverTime: data.serverTime,
        });
        setIsLiveConnected(!isOffline);
        setIsWakingUp(false);
      } catch (err) {
        if (!isMounted) return;
        console.error("Backend offline o in fase di risveglio:", err);
        setIsLiveConnected(false);
        setIsWakingUp(false);
        setSensorData((prev) => ({ ...prev, status: 'OFFLINE' }));
      } finally {
        clearTimeout(timer);
      }
    };

    // Primo fetch immediato (con attesa estesa per Cold Start)
    fetchLiveData(true);

    // Polling periodico successivo ogni 3 secondi
    const liveInterval = setInterval(() => {
      fetchLiveData(false);
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(liveInterval);
    };
  }, [isSimulation]);

  const isAlarm = sensorData.status === 'ALARM';
  const isOffline = sensorData.status === 'OFFLINE';
  const formattedTime = sensorData.timestamp ? new Date(sensorData.timestamp).toLocaleTimeString() : '--:--:--';
  const displayTemp = sensorData.temperature !== null ? sensorData.temperature.toFixed(2) : '--.--';

  return (
    <div
      onClick={initAudio}
      className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center cursor-default"
    >

      {/* Header */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">NexusIoT Hub</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">Sistema di Telemetria Ambientale &bull; ESP32 Node</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selettore di modalità interattivo */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              initAudio();
              setIsSimulation(!isSimulation);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
              isSimulation
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isSimulation ? '⚡ Modalità Demo (Default)' : '🌐 Modalità Live (Backend)'}
          </button>

          <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800 text-xs font-medium">
            <span className={`w-2 h-2 rounded-full ${
              isSimulation
                ? 'bg-amber-400 animate-pulse'
                : (isWakingUp ? 'bg-amber-500 animate-ping' : (isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500 animate-pulse'))
            }`} />
            <span className="text-slate-300">
              {isSimulation ? 'ESP32 Sim (GPIO 15/4)' : (isWakingUp ? 'Backend in risveglio...' : (isLiveConnected ? 'Live Connected' : 'Live Offline'))}
            </span>
          </div>
        </div>
      </header>

      {/* Banner informativo in caso di Cold Start in corso */}
      {isWakingUp && !isSimulation && (
        <div className="w-full max-w-5xl mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Il server cloud su Render è in fase di risveglio (Cold Start). Questa operazione può richiedere fino a 30 secondi...
          </span>
        </div>
      )}

      {/* Main Grid */}
      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card Temperatura */}
        <div className={`p-8 rounded-3xl border transition-all duration-300 bg-slate-900/40 backdrop-blur-md relative overflow-hidden ${
          isAlarm ? 'border-rose-500/50 shadow-2xl shadow-rose-950/30' : 'border-slate-800/80 shadow-xl'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Sensore DHT22</span>
            <svg className={`w-7 h-7 ${isAlarm ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
            </svg>
          </div>

          <div className="flex items-baseline gap-3 my-4">
            <span className="text-7xl font-black tracking-tighter">
              {displayTemp}
            </span>
            <span className="text-3xl font-semibold text-slate-400">°C</span>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs text-slate-500">
            <span>Soglia firmware: &gt; 30.00 °C</span>
            <span>Aggiornato: {formattedTime}</span>
          </div>
        </div>

        {/* Card Stato & Azione LED */}
        <div className={`p-8 rounded-3xl border transition-all duration-300 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between ${
          isAlarm ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Attuatore &amp; Stato</span>
            {isAlarm ? (
              <svg className="w-6 h-6 text-rose-500 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="my-6">
            <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold tracking-wide ${
              isAlarm
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : (isOffline && !isSimulation ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30')
            }`}>
              <span className={`w-3 h-3 rounded-full ${isAlarm ? 'bg-rose-500 animate-ping' : (isOffline && !isSimulation ? 'bg-slate-500' : 'bg-emerald-400')}`} />
              {isAlarm
                ? 'ALLARME: LED ON (Soglia Superata)'
                : (isOffline && !isSimulation ? 'OFFLINE: In attesa di dati dal nodo...' : 'SISTEMA IN RANGE: LED OFF')}
            </div>
          </div>

          <p className="text-xs text-slate-400/80">
            {isAlarm
              ? 'Il microcontrollore ha rilevato un valore critico e attivato l’attuatore locale sul pin 4 con feedback audio.'
              : (isOffline && !isSimulation ? 'Nessun pacchetto recente ricevuto dal backend. Avvia la simulazione Wokwi per popolare i dati live.' : 'Parametri ambientali stabili. Nessuna anomalia rilevata dal nodo.')}
          </p>
        </div>

      </main>

      {/* Footer Deploy info */}
      <footer className="w-full max-w-5xl mt-12 pt-6 border-t border-slate-900 flex justify-between items-center text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          Netlify Ready Deployment
        </span>
        <span>NexusIoT Architecture &bull; 2026</span>
      </footer>
    </div>
  );
}