import React, { useState, useEffect, useRef } from 'react';

interface SensorPayload {
  temperature: number;
  status: 'OK' | 'ALARM';
  timestamp: string;
}

export default function App() {
  // Modalità Demo attiva di default per un'esperienza immediata e senza attrito al primo caricamento
  const [isSimulation, setIsSimulation] = useState<boolean>(true);
  const [temperature, setTemperature] = useState<number>(24.5);
  const [sensorData, setSensorData] = useState<SensorPayload>({
    temperature: 24.5,
    status: 'OK',
    timestamp: '--:--:--',
  });
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  const wasAlarmRef = useRef<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

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

    const telemetryInterval = setInterval(() => {
      setTemperature((prevTemp) => {
        const delta = (Math.random() - 0.45) * 1.3;
        let nextTemp = Number((prevTemp + delta).toFixed(2));
        
        if (nextTemp < 21.0) nextTemp = 21.0;
        if (nextTemp > 35.0) nextTemp = 35.0;

        const nextStatus = nextTemp > 30.0 ? 'ALARM' : 'OK';

        if (nextStatus === 'ALARM' && !wasAlarmRef.current) {
          playBeep();
        }
        wasAlarmRef.current = (nextStatus === 'ALARM');

        setSensorData({
          temperature: nextTemp,
          status: nextStatus,
          timestamp: new Date().toLocaleTimeString(),
        });

        return nextTemp;
      });
    }, 2000);

    return () => clearInterval(telemetryInterval);
  }, [isSimulation]);

  // 2. Motore Live (Chiamata Fetch periodica al Backend tramite Proxy Vite)
  useEffect(() => {
    if (isSimulation) {
      setIsLiveConnected(false);
      return;
    }

    const fetchLiveData = async () => {
      try {
        // Interroga l'endpoint gestito dal proxy Vite (reindirizzato a http://localhost:3000/api/telemetry)
        const response = await fetch('/api/telemetry'); 
        if (!response.ok) throw new Error('Errore di comunicazione con il server');
        const data = await response.json();

        const nextStatus = data.temperature > 30.0 ? 'ALARM' : 'OK';
        
        if (nextStatus === 'ALARM' && !wasAlarmRef.current) {
          playBeep();
        }
        wasAlarmRef.current = (nextStatus === 'ALARM');

        setSensorData({
          temperature: data.temperature,
          status: nextStatus,
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsLiveConnected(true);
      } catch (err) {
        setIsLiveConnected(false);
        console.error("Backend offline o endpoint non raggiungibile:", err);
      }
    };

    fetchLiveData();
    const liveInterval = setInterval(fetchLiveData, 2000);
    return () => clearInterval(liveInterval);
  }, [isSimulation]);

  const isAlarm = sensorData.status === 'ALARM';

  return (
    <div 
      onClick={initAudio} 
      className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center cursor-default"
    >
      
      {/* Header */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10 pb-6 border-b border-slate-800">
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
              isSimulation ? 'bg-amber-400 animate-pulse' : (isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500 animate-pulse')
            }`} />
            <span className="text-slate-300">
              {isSimulation ? 'ESP32 Sim (GPIO 15/4)' : (isLiveConnected ? 'Live Connected' : 'Live Offline')}
            </span>
          </div>
        </div>
      </header>

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
              {sensorData.temperature.toFixed(2)}
            </span>
            <span className="text-3xl font-semibold text-slate-400">°C</span>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs text-slate-500">
            <span>Soglia firmware: &gt; 30.00 °C</span>
            <span>Aggiornato: {sensorData.timestamp}</span>
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
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <span className={`w-3 h-3 rounded-full ${isAlarm ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
              {isAlarm ? 'ALLARME: LED ON (Soglia Superata)' : 'SISTEMA IN RANGE: LED OFF'}
            </div>
          </div>

          <p className="text-xs text-slate-400/80">
            {isAlarm 
              ? 'Il microcontrollore ha rilevato un valore critico e attivato l’attuatore locale sul pin 4 con feedback audio.' 
              : 'Parametri ambientali stabili. Nessuna anomalia rilevata dal nodo.'}
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