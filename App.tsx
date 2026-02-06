
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, ShieldAlert, ShieldCheck, Activity, History, Settings, 
  AlertTriangle, Play, Square, Volume2, VolumeX, Grid, 
  Layout, Plus, Trash2, UserSearch, Hand, AlertCircle
} from 'lucide-react';
import { analyzeFrame } from './services/geminiService';
import { DetectionResult, LogEntry, ThreatLevel, ThreatType, CameraConfig } from './types';

const INITIAL_CAMERAS: CameraConfig[] = [
  { id: 'CAM-01', name: 'Main Lobby', isActive: false, isAnalyzing: false, lastResult: null },
  { id: 'CAM-02', name: 'Back Entrance', isActive: false, isAnalyzing: false, lastResult: null },
];

const App: React.FC = () => {
  const [cameras, setCameras] = useState<CameraConfig[]>(INITIAL_CAMERAS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ANALYSIS_INTERVAL = 4000; 

  const playAlert = useCallback((result: DetectionResult) => {
    // Silent Distress Signal triggers NO audible alert as per constraints
    if (result.threatType === ThreatType.GESTURE) {
      console.log(`[SILENT ALERT] Distress signal detected on ${result.cameraId}`);
      return;
    }

    if (!audioEnabled || result.threatLevel === ThreatLevel.NONE || result.threatLevel === ThreatLevel.LOW) return;
    
    // For other high threats, play a subtle warning if enabled
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  }, [audioEnabled]);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameras(prev => prev.map(c => ({ ...c, isActive: true })));
      }
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  const stopMonitoring = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameras(prev => prev.map(c => ({ ...c, isActive: false })));
    }
  };

  const runAnalysisCycle = useCallback(async () => {
    const activeCams = cameras.filter(c => c.isActive);
    if (activeCams.length === 0 || !videoRef.current || !canvasRef.current) return;

    // Analyze one camera at a time in rotation to save resources
    for (const cam of activeCams) {
      setCameras(prev => prev.map(c => c.id === cam.id ? { ...c, isAnalyzing: true } : c));
      
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        
        const result = await analyzeFrame(dataUrl, cam.id, cam.name);
        
        setCameras(prev => prev.map(c => c.id === cam.id ? { ...c, isAnalyzing: false, lastResult: result } : c));

        if (result.threatLevel !== ThreatLevel.NONE || result.threatType !== ThreatType.NONE) {
          const newLog: LogEntry = {
            ...result,
            id: Math.random().toString(36).substr(2, 9),
            snapshot: dataUrl,
          };
          setLogs(prev => [newLog, ...prev].slice(0, 50));
          playAlert(result);
        }
      }
      
      // Small pause between cameras
      await new Promise(r => setTimeout(r, 500));
    }
  }, [cameras, playAlert]);

  useEffect(() => {
    let interval: number;
    if (cameras.some(c => c.isActive)) {
      interval = window.setInterval(() => {
        runAnalysisCycle();
      }, ANALYSIS_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [cameras, runAnalysisCycle]);

  const getThreatColor = (level: ThreatLevel) => {
    switch (level) {
      case ThreatLevel.CRITICAL: return 'text-red-500 border-red-500 bg-red-500/10';
      case ThreatLevel.HIGH: return 'text-orange-500 border-orange-500 bg-orange-500/10';
      case ThreatLevel.MEDIUM: return 'text-yellow-500 border-yellow-500 bg-yellow-500/10';
      case ThreatLevel.LOW: return 'text-blue-500 border-blue-500 bg-blue-500/10';
      default: return 'text-slate-500 border-slate-800 bg-slate-900';
    }
  };

  const addNewCamera = () => {
    const id = `CAM-0${cameras.length + 1}`;
    const newCam: CameraConfig = {
      id,
      name: `New Zone ${cameras.length + 1}`,
      isActive: cameras.some(c => c.isActive),
      isAnalyzing: false,
      lastResult: null
    };
    setCameras([...cameras, newCam]);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#050810] text-slate-200 overflow-hidden">
      {/* Guard AI Global Header */}
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-6 bg-[#0a0f1d] z-30 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/20">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tighter">GUARD <span className="text-blue-500">AI</span></h1>
          </div>
          <div className="h-4 w-px bg-slate-800 ml-2" />
          <div className="flex items-center gap-4 ml-2">
            <button className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
              <Grid size={14} /> DASHBOARD
            </button>
            <button className="text-xs font-semibold text-blue-500 flex items-center gap-1.5">
              <Layout size={14} /> MULTI-VIEW
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
               <span className="text-[10px] mono text-slate-500 leading-none">SYSTEM_STATUS</span>
               <span className="text-[10px] font-bold text-emerald-500">OPERATIONAL</span>
             </div>
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>

          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-1.5 rounded-md transition-all ${audioEnabled ? 'text-blue-400 bg-blue-950/30' : 'text-slate-600 bg-slate-900'}`}
          >
            {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          
          {!cameras.some(c => c.isActive) ? (
            <button 
              onClick={startMonitoring}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
              <Play size={14} fill="currentColor" /> START ALL
            </button>
          ) : (
            <button 
              onClick={stopMonitoring}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Square size={12} fill="currentColor" /> STOP ALL
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Multi-Camera Grid */}
        <div className="flex-1 flex flex-col gap-4">
          <div className={`grid gap-4 flex-1 ${cameras.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2'}`}>
            {cameras.map((cam) => (
              <div 
                key={cam.id}
                className={`relative rounded-xl border group overflow-hidden bg-black transition-all duration-500 ${
                  cam.lastResult?.threatLevel === ThreatLevel.CRITICAL ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 
                  cam.lastResult?.threatType === ThreatType.GESTURE ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]' :
                  'border-slate-800'
                }`}
              >
                {/* Camera Overlay */}
                <div className="absolute inset-0 z-20 p-4 pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${cam.isActive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="text-[10px] font-bold mono tracking-tight text-white">{cam.id} — {cam.name}</span>
                      </div>
                      {cam.isAnalyzing && (
                        <div className="bg-blue-600 px-2 py-0.5 rounded-sm self-start shadow-lg">
                          <span className="text-[8px] font-black italic tracking-widest text-white">GUARD_AI_ANALYZING...</span>
                        </div>
                      )}
                    </div>
                    
                    {cam.lastResult && cam.lastResult.threatLevel !== ThreatLevel.NONE && (
                       <div className={`px-2 py-1 rounded-sm backdrop-blur-md border ${getThreatColor(cam.lastResult.threatLevel)}`}>
                          <span className="text-[9px] font-black tracking-widest uppercase">{cam.lastResult.threatType} DETECTED</span>
                       </div>
                    )}
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="bg-black/40 backdrop-blur-sm p-2 rounded border border-white/5">
                      <div className="flex items-center gap-3 opacity-60">
                         <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Frame_Conf</span>
                            <span className="text-[10px] text-white mono">{cam.lastResult?.confidence || 0}%</span>
                         </div>
                         <div className="h-6 w-px bg-white/10" />
                         <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Signal_Str</span>
                            <span className="text-[10px] text-white mono">128ms</span>
                         </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pointer-events-auto">
                       <button className="p-1.5 bg-black/60 hover:bg-blue-600 rounded border border-white/10 transition-all text-white/70 hover:text-white">
                          <Settings size={14} />
                       </button>
                    </div>
                  </div>
                </div>

                {/* Animated Scanner Overlays */}
                {cam.isActive && cam.lastResult?.threatLevel === ThreatLevel.CRITICAL && <div className="threat-scanner-line" />}
                {cam.isActive && !cam.lastResult && <div className="scanner-line" />}
                {cam.lastResult?.threatType === ThreatType.GESTURE && (
                  <div className="absolute inset-0 bg-blue-500/5 distress-indicator z-10" />
                )}

                <video 
                  autoPlay 
                  muted 
                  playsInline 
                  ref={cam.id === 'CAM-01' ? videoRef : null}
                  className={`w-full h-full object-cover transition-opacity duration-1000 ${cam.isActive ? 'opacity-100' : 'opacity-20'}`}
                />
                
                {!cam.isActive && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/20 backdrop-blur-[2px]">
                      <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center mb-3">
                        <Camera size={20} className="text-slate-600" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 tracking-widest">FEED_OFFLINE</span>
                   </div>
                )}
              </div>
            ))}
            
            {cameras.length < 4 && (
              <button 
                onClick={addNewCamera}
                className="border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-slate-900/50 hover:border-slate-700 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={20} className="text-slate-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 tracking-widest group-hover:text-slate-400">ADD MONITORING ZONE</span>
              </button>
            )}
          </div>
          
          {/* Active Alert Summary Banner */}
          {logs.length > 0 && logs[0].threatLevel !== ThreatLevel.NONE && (
            <div className={`h-12 rounded-lg border flex items-center px-4 gap-4 animate-in fade-in slide-in-from-bottom-2 ${
              logs[0].threatType === ThreatType.GESTURE ? 'bg-blue-900/20 border-blue-500/50' : 'bg-red-900/20 border-red-500/50'
            }`}>
              <div className={logs[0].threatType === ThreatType.GESTURE ? 'text-blue-400' : 'text-red-400'}>
                {logs[0].threatType === ThreatType.GESTURE ? <Hand size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div className="flex-1 flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {logs[0].threatType} DETECTED
                </span>
                <span className="text-xs text-slate-300 font-medium">{logs[0].description}</span>
                <span className="text-[10px] mono text-slate-500">{logs[0].cameraId} • {new Date(logs[0].timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">CONFIDENCE: {logs[0].confidence}%</span>
                <button className="text-[10px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition-colors uppercase">Acknowledge</button>
              </div>
            </div>
          )}
        </div>

        {/* Unified Incident Log Sidebar */}
        <div className="w-96 flex flex-col gap-4">
          <div className="bg-[#0a0f1d] border border-slate-800/50 rounded-xl flex flex-col overflow-hidden h-full shadow-xl">
            <div className="p-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/20">
              <h2 className="text-xs font-black tracking-widest text-slate-500 uppercase flex items-center gap-2">
                <History size={14} className="text-blue-500" /> SYSTEM_INCIDENT_LOG
              </h2>
              <button onClick={() => setLogs([])} className="p-1 hover:text-red-400 text-slate-600 transition-colors">
                 <Trash2 size={14} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-8">
                  <ShieldCheck size={40} className="mb-4" />
                  <p className="text-[10px] font-bold tracking-widest leading-relaxed">NO THREATS DETECTED. SYSTEM MONITORING STABLE.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`group border-l-2 rounded-r-lg bg-[#111827]/50 overflow-hidden transition-all hover:bg-[#111827] ${
                      log.threatType === ThreatType.GESTURE ? 'border-blue-500' : 
                      log.threatLevel === ThreatLevel.CRITICAL ? 'border-red-500' : 'border-slate-700'
                    }`}
                  >
                    <div className="relative aspect-video bg-black">
                       <img src={log.snapshot} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                       <div className="absolute top-2 left-2 flex gap-1.5">
                          <span className="bg-black/80 text-[8px] mono text-white/80 px-1.5 py-0.5 rounded border border-white/5">{log.cameraId}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                            log.threatType === ThreatType.GESTURE ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                          }`}>
                            {log.threatType}
                          </span>
                       </div>
                       <div className="absolute bottom-2 right-2 flex flex-col items-end">
                          <span className="text-[8px] mono text-slate-400 bg-black/80 px-1 rounded">{new Date(log.timestamp).toLocaleTimeString()}</span>
                       </div>
                    </div>
                    <div className="p-3">
                       <div className="flex justify-between items-start mb-1.5">
                          <h4 className="text-[11px] font-bold text-slate-100 line-clamp-1 flex-1 pr-2">{log.description}</h4>
                          <span className="text-[9px] mono text-slate-500">{log.confidence}%</span>
                       </div>
                       <div className="flex flex-wrap gap-1">
                          {log.objectsDetected.slice(0, 3).map((obj, i) => (
                             <span key={i} className="text-[8px] mono bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700">{obj}</span>
                          ))}
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/20">
               <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold py-2 rounded transition-all uppercase tracking-widest text-slate-400">
                    <UserSearch size={14} /> ID Search
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold py-2 rounded transition-all uppercase tracking-widest text-slate-400">
                    <AlertCircle size={14} /> Full Report
                  </button>
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden helper elements */}
      <canvas ref={canvasRef} className="hidden" width={640} height={360} />
    </div>
  );
};

export default App;
