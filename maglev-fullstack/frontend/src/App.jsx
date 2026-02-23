import { useEffect, useRef, useState } from "react";
import { loadMaglev } from "./wasm/loadMaglev";
import { Hero } from "./Hero"; 

import "./App.css";
import { MeshGradientBackground } from "./components/ui/mesh-gradient";

/* ================= CONSTANTS ================= */
const DT = 0.001;
const MAX_SAMPLES = 3000;

const controllerNames = ["PID", "FL + PID", "LQR", "NMPC"];
const controllerColors = ["#38bdf8", "#34d399", "#a78bfa", "#f87171"];

/* ================= APP ================= */
export default function App() {
  /* ===== REFS ===== */
  const wasm = useRef(null);
  const ySvgRef = useRef(null);
  const plotRef = useRef(null);

  const liveResponse = useRef([]);
  const frozenRunsRef = useRef([]);
  const lastYpx = useRef(0);
  const yRefRef = useRef(0.02);

  /* ===== STATE ===== */
  const [controller, setController] = useState(0);
  const [yRef, setYRef] = useState(0.02);

  const [Kp, setKp] = useState(150);
  const [Ki, setKi] = useState(0);
  const [Kd, setKd] = useState(20);

  const [k1, setK1] = useState(120);
  const [k2, setK2] = useState(18);
  const [k3, setK3] = useState(0.8);

  const [Qy, setQy] = useState(200);
  const [Ru, setRu] = useState(0.01);

  /* ===== UI STATE ===== */
  const [liveY, setLiveY] = useState(0.02);
  const [plotColors, setPlotColors] = useState({
    response: controllerColors[0],
    setpoint: "#94a3b8",
    error: "#e5e7eb"
  });
  const [plotView, setPlotView] = useState("combined");

  /* ===== keep setpoint live ===== */
  useEffect(() => {
    yRefRef.current = yRef;
  }, [yRef]);

  /* ================= LOAD WASM ================= */
  useEffect(() => {
    let physicsTimer, animId;
    let alive = true;

    loadMaglev().then((m) => {
      if (!alive) return;

      wasm.current = {
        init: m.cwrap("init", null, ["number"]),
        step: m.cwrap("step_closed_loop", null, ["number"]),
        setCtrl: m.cwrap("set_controller", null, ["number"]),
        setSetpoint: m.cwrap("set_setpoint", null, ["number"]),
        setPID: m.cwrap("set_pid_gains", null, ["number","number","number"]),
        setLQR: m.cwrap("set_lqr_gains", null, ["number","number","number"]),
        setNMPC: m.cwrap("set_nmpc_weights", null, ["number","number"]),
        getY: m.cwrap("get_y", "number", [])
      };

      wasm.current.init(yRefRef.current);
      wasm.current.setCtrl(controller);

      physicsTimer = setInterval(() => {
        wasm.current.step(DT);
      }, DT * 1000);

      const animate = () => {
        if (!alive) return;

        const y = wasm.current.getY();
        setLiveY(y);

        liveResponse.current.push({ y, yRef: yRefRef.current });
        if (liveResponse.current.length > MAX_SAMPLES)
          liveResponse.current.shift();

        const target = mapYtoSvg(y);
        lastYpx.current += 0.08 * (target - lastYpx.current);
        ySvgRef.current?.setAttribute(
          "transform",
          `translate(160, ${lastYpx.current})`
        );

        drawPlot(
          plotRef.current,
          liveResponse.current,
          frozenRunsRef.current,
          controller,
          plotColors,
          plotView
        );

        animId = requestAnimationFrame(animate);
      };

      animate();
    });

    return () => {
      alive = false;
      clearInterval(physicsTimer);
      cancelAnimationFrame(animId);
    };
  }, [plotColors, plotView]);

  /* ===== PARAM UPDATES ===== */
  useEffect(() => wasm.current?.setCtrl(controller), [controller]);
  useEffect(() => wasm.current?.setSetpoint(yRef), [yRef]);
  useEffect(() => wasm.current?.setPID(Kp,Ki,Kd), [Kp,Ki,Kd]);
  useEffect(() => wasm.current?.setLQR(k1,k2,k3), [k1,k2,k3]);
  useEffect(() => wasm.current?.setNMPC(Qy,Ru), [Qy,Ru]);

  /* ===== Update response color when controller changes ===== */
  useEffect(() => {
    setPlotColors(prev => ({ ...prev, response: controllerColors[controller] }));
  }, [controller]);

  /* ===== ACTIONS ===== */
  const freezeRun = () =>
    frozenRunsRef.current.push({ data: [...liveResponse.current], controller });

  const reset = () => {
    liveResponse.current = [];
    wasm.current?.init(yRefRef.current);
  };

  const clearFrozen = () => frozenRunsRef.current = [];

  /* ================= UI ================= */
  return (
    
   
      
   <div className="relative min-h-screen text-slate-100">
  <MeshGradientBackground />
  <div className="relative z-10"></div>

      {/* ===== HEADER ===== */}
      <header className="border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Maglev Control Laboratory
                </h1>
                
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Real-time Nonlinear System Simulation · WASM @ 1kHz
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                ONLINE
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* ===== MAIN ===== */}
      <main className="max-w-[1800px] mx-auto px-8 py-8">
        
        {/* TOP ROW: Animation + Controller + Live Data */}
        <div className="grid grid-cols-[500px_1fr] gap-6 mb-6">
          
          {/* HERO: lab instrument control panel */}
          <div className="sim-hero-instrument overflow-hidden">
            <div className="sim-hero-header">
              <h2 className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">System Visualization</h2>
            </div>
            
            <div className="p-6">
              {/* Setpoint Reference - integrated into hero */}
              <div className="mb-4">
                <FancyKnob label="y₀ Target Position" value={yRef} setValue={setYRef} min={0.005} max={0.05} step={0.001} unit="m" color="from-orange-500 to-red-500" large/>
              </div>
              {/* Animation */}
              <div className="mb-6 rounded-lg bg-slate-950/80 p-6">
                <div className="flex justify-center">
                  <svg width="320" height="320">
                    <defs>
                      <linearGradient id="trackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#334155" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#334155" stopOpacity="0.8"/>
                      </linearGradient>
                      <linearGradient id="fieldGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/>
                        <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.06"/>
                        <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="magnetGlow" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <ellipse cx="160" cy="40" rx="90" ry="35" fill="url(#fieldGrad)"/>
                    <path d="M90 55 Q160 120 230 55 M95 65 Q160 140 225 65 M100 75 Q160 160 220 75 M105 85 Q160 180 215 85" stroke="rgba(96,165,250,0.2)" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
                    <rect x="110" y="30" width="100" height="20" fill="#1e293b" stroke="#475569" strokeWidth="1" rx="2"/>
                    <line x1="160" y1="60" x2="160" y2="280" stroke="url(#trackGrad)" strokeWidth="3"/>
                    <line x1="110" y1={mapYtoSvg(yRef)} x2="210" y2={mapYtoSvg(yRef)} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.9"/>
                    <g ref={ySvgRef}>
                      <circle r="16" fill={controllerColors[controller]} opacity="0.2"/>
                      <circle r="12" fill={controllerColors[controller]} stroke="#fff" strokeWidth="2" className="drop-shadow-lg"/>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Controller Selection */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Controller Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {controllerNames.map((n,i)=>(
                    <button
                      key={i}
                      onClick={()=>setController(i)}
                      data-active={controller===i}
                      className={`sim-controller-btn relative px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200
                        ${controller===i
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                          : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-700/50"}`}
                    >
                      {n}
                      {controller===i && (
                        <div className="absolute inset-0 rounded-lg bg-white/10 animate-pulse"/>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controller-Specific Gains */}
              {(controller<=1)&&(
                <div className="sim-controller-surface space-y-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/30">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">PID Gains</div>
                  <FancyKnob label="Kp" value={Kp} setValue={setKp} max={300} color="from-blue-500 to-cyan-400"/>
                  <FancyKnob label="Ki" value={Ki} setValue={setKi} max={50} color="from-purple-500 to-pink-400"/>
                  <FancyKnob label="Kd" value={Kd} setValue={setKd} max={50} color="from-emerald-500 to-teal-400"/>
                </div>
              )}

              {controller===2&&(
                <div className="sim-controller-surface space-y-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/30">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">LQR Gains</div>
                  <FancyKnob label="k₁" value={k1} setValue={setK1} max={300} color="from-blue-500 to-cyan-400"/>
                  <FancyKnob label="k₂" value={k2} setValue={setK2} max={50} color="from-purple-500 to-pink-400"/>
                  <FancyKnob label="k₃" value={k3} setValue={setK3} max={5} step={0.1} color="from-emerald-500 to-teal-400"/>
                </div>
              )}

              {controller===3&&(
                <div className="sim-controller-surface space-y-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/30">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">NMPC Weights</div>
                  <FancyKnob label="Qy" value={Qy} setValue={setQy} max={500} color="from-blue-500 to-cyan-400"/>
                  <FancyKnob label="Ru" value={Ru} setValue={setRu} max={1} step={0.01} color="from-purple-500 to-pink-400"/>
                </div>
              )}
            </div>
          </div>

          {/* OSCILLOSCOPE: measurement panel */}
          <div className="sim-linear-section sim-oscilloscope overflow-hidden">
            <div className="sim-linear-header">Live Telemetry</div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <InstrumentDisplay label="Position" value={liveY} unit="m" color="text-blue-400" precision={4}/>
              <InstrumentDisplay label="Setpoint" value={yRef} unit="m" color="text-purple-400" precision={4}/>
              <InstrumentDisplay label="Error" value={yRef - liveY} unit="m" color="text-rose-400" precision={5}/>
              <InstrumentDisplay label="Controller" value={controllerNames[controller]} unit="" color="text-emerald-400" isText/>
              {controller<=1&&<InstrumentDisplay label="Kp" value={Kp} unit="" color="text-cyan-400" precision={0}/>}
              {controller<=1&&<InstrumentDisplay label="Ki" value={Ki} unit="" color="text-cyan-400" precision={0}/>}
              {controller<=1&&<InstrumentDisplay label="Kd" value={Kd} unit="" color="text-cyan-400" precision={0}/>}
              {controller===2&&<InstrumentDisplay label="k₁" value={k1} unit="" color="text-cyan-400" precision={0}/>}
              {controller===2&&<InstrumentDisplay label="k₂" value={k2} unit="" color="text-cyan-400" precision={0}/>}
              {controller===2&&<InstrumentDisplay label="k₃" value={k3} unit="" color="text-cyan-400" precision={3}/>}
              {controller===3&&<InstrumentDisplay label="Qy" value={Qy} unit="" color="text-cyan-400" precision={0}/>}
              {controller===3&&<InstrumentDisplay label="Ru" value={Ru} unit="" color="text-cyan-400" precision={3}/>}
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: Experiment Actions */}
        <div className="mb-6">
          
          <div className="sim-action-strip overflow-hidden">
            <div className="px-4 py-3">
              <div className="sim-experiment-toolset flex items-center gap-3">
              <button onClick={freezeRun} className="sim-action-btn flex-1 px-4 py-3 rounded-lg bg-blue-600/90 hover:bg-blue-500/90 text-white font-medium text-sm transition-colors">
                Freeze Run
              </button>
              <button onClick={reset} className="sim-action-btn flex-1 px-4 py-3 rounded-lg bg-slate-700/80 hover:bg-slate-600/90 text-white font-medium text-sm transition-colors">
                Reset
              </button>
              <button onClick={clearFrozen} className="sim-action-btn flex-1 px-4 py-3 rounded-lg bg-rose-600/90 hover:bg-rose-500/90 text-white font-medium text-sm transition-colors">
                Clear Frozen
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Plot Area */}
        <div className="sim-linear-section sim-plot-panel overflow-hidden">
          <div className="sim-linear-header flex items-center justify-between px-4">
            <span>Response Analysis</span>
            <div className="sim-vscode-controls">
              <button 
                onClick={() => setPlotView(plotView === "combined" ? "separate" : "combined")}
                className="sim-plot-toggle"
              >
                {plotView === "combined" ? "Split" : "Combined"}
              </button>
              <ColorControl label="Response" color={plotColors.response} setColor={(c) => setPlotColors(p => ({...p, response: c}))} />
              <ColorControl label="Setpoint" color={plotColors.setpoint} setColor={(c) => setPlotColors(p => ({...p, setpoint: c}))} />
              <ColorControl label="Error" color={plotColors.error} setColor={(c) => setPlotColors(p => ({...p, error: c}))} />
            </div>
          </div>
          
          <div className="p-4">

            {/* Plot Canvas */}
            <div className="sim-plot-chart p-4">
              <canvas
                ref={plotRef}
                width={1600}
                height={plotView === "combined" ? 400 : 800}
                className="mx-auto block"
              />
            </div>
          </div>
        </div>
      </main>
      </div>
      
    
  );
}

/* ================= PLOT ================= */
function drawPlot(canvas, live, frozen, controller, plotColors, plotView) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#020617";
  ctx.fillRect(0,0,W,H);

  ctx.strokeStyle="rgba(71,85,105,0.15)";
  ctx.lineWidth=1;
  for (let g=0; g<=10; g++) {
    const y=30+g*(H-50)/10;
    ctx.beginPath();
    ctx.moveTo(50,y);
    ctx.lineTo(W-20,y);
    ctx.stroke();
  }
  for (let g=0; g<=20; g++) {
    const x=50+g*(W-70)/20;
    ctx.beginPath();
    ctx.moveTo(x,30);
    ctx.lineTo(x,H-20);
    ctx.stroke();
  }

  if (plotView === "combined") {
    const mapY=y=>(H-30)-(y-0.005)/(0.05-0.005)*(H-50);
    const mapE=e=>(H-30)-(e/0.03)*(H-50)/2;

    // Setpoint line
    ctx.strokeStyle=plotColors.setpoint;
    ctx.setLineDash([4,4]);
    ctx.lineWidth=2;
    ctx.beginPath();
    live.forEach((p,i)=>{
      const x=50+i/MAX_SAMPLES*(W-70);
      i?ctx.lineTo(x,mapY(p.yRef)):ctx.moveTo(x,mapY(p.yRef));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Frozen runs
    frozen.forEach(r=>{
      ctx.globalAlpha=0.25;
      ctx.strokeStyle=controllerColors[r.controller];
      ctx.lineWidth=2;
      ctx.beginPath();
      r.data.forEach((p,i)=>{
        const x=50+i/MAX_SAMPLES*(W-70);
        i?ctx.lineTo(x,mapY(p.y)):ctx.moveTo(x,mapY(p.y));
      });
      ctx.stroke();
    });

    // Live response
    ctx.globalAlpha=1;
    ctx.strokeStyle=plotColors.response;
    ctx.lineWidth=3;
    ctx.beginPath();
    live.forEach((p,i)=>{
      const x=50+i/MAX_SAMPLES*(W-70);
      i?ctx.lineTo(x,mapY(p.y)):ctx.moveTo(x,mapY(p.y));
    });
    ctx.stroke();

    // Error line
    ctx.strokeStyle=plotColors.error;
    ctx.setLineDash([6,4]);
    ctx.lineWidth=2;
    ctx.beginPath();
    live.forEach((p,i)=>{
      const x=50+i/MAX_SAMPLES*(W-70);
      i?ctx.lineTo(x,mapE(p.yRef-p.y)):ctx.moveTo(x,mapE(p.yRef-p.y));
    });
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Separate view - split into two plots
    const H1 = H/2 - 20;
    const mapY1=y=>(H1-20)-(y-0.005)/(0.05-0.005)*(H1-40);
    const mapE1=e=>(H-20)-(e/0.03)*(H1-40)/2 - H/2;

    // Top plot: Position
    ctx.fillStyle="#1e293b";
    ctx.fillRect(0,0,W,H/2-10);
    
    ctx.strokeStyle=plotColors.setpoint;
    ctx.setLineDash([4,4]);
    ctx.lineWidth=2;
    ctx.beginPath();
    live.forEach((p,i)=>{
      const x=50+i/MAX_SAMPLES*(W-70);
      i?ctx.lineTo(x,mapY1(p.yRef)):ctx.moveTo(x,mapY1(p.yRef));
    });
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle=plotColors.response;
    ctx.lineWidth=3;
    ctx.beginPath();
    live.forEach((p,i)=>{
      const x=50+i/MAX_SAMPLES*(W-70);
      i?ctx.lineTo(x,mapY1(p.y)):ctx.moveTo(x,mapY1(p.y));
    });
    ctx.stroke();

    // Bottom plot: Error
    ctx.fillStyle="#1e293b";
    ctx.fillRect(0,H/2+10,W,H/2-10);
    
    ctx.strokeStyle=plotColors.error;
    ctx.lineWidth=3;
    ctx.beginPath();
    live.forEach((p,i)=>{
      const x=50+i/MAX_SAMPLES*(W-70);
      i?ctx.lineTo(x,mapE1(p.yRef-p.y)+H/2+10):ctx.moveTo(x,mapE1(p.yRef-p.y)+H/2+10);
    });
    ctx.stroke();
  }
}

/* ================= UI COMPONENTS ================= */
const InstrumentDisplay = ({label, value, unit, color, precision=3, isText=false}) => (
  <div className="sim-instrument bg-slate-950/50 rounded-xl border border-slate-800/30 p-4 shadow-inner">
    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</div>
    <div className={`font-mono text-2xl font-bold ${color}`}>
      {isText ? value : value.toFixed(precision)}
      {unit && <span className="text-sm ml-1 text-slate-500">{unit}</span>}
    </div>
  </div>
);

const FancyKnob = ({label, value, setValue, min=0, max=100, step=1, unit="", color="from-blue-500 to-purple-500", large=false}) => (
  <div className={`sim-knob-wrap ${large ? 'p-6' : 'p-3'} rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
    <div className="flex items-center justify-between mb-3">
      <span className={`${large ? 'text-sm' : 'text-xs'} font-bold text-slate-200`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => setValue(Math.max(min, value - step))}
        className={`${large ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all hover:scale-110 shadow-lg`}
      >
        −
      </button>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e=>setValue(+e.target.value)}
        className="sim-knob-range flex-1"
        style={{
          background: `linear-gradient(to right, 
            hsl(${((value-min)/(max-min)) * 120 + 200}, 70%, 50%) 0%,
            hsl(${((value-min)/(max-min)) * 120 + 200}, 70%, 50%) ${((value-min)/(max-min))*100}%,
            #1e293b ${((value-min)/(max-min))*100}%,
            #1e293b 100%)`
        }}
      />
      <button
        onClick={() => setValue(Math.min(max, value + step))}
        className={`${large ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all hover:scale-110 shadow-lg`}
      >
        +
      </button>
    </div>
  </div>
);

const ColorControl = ({label, color, setColor}) => {
  const presetColors = ["#38bdf8", "#34d399", "#a78bfa", "#f87171", "#94a3b8", "#e5e7eb", "#fbbf24", "#f472b6"];
  return (
    <div className="flex items-center gap-2 sim-color-control">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <input
        type="color"
        value={color}
        onChange={(e)=>setColor(e.target.value)}
        className="sim-color-native w-8 h-8 rounded cursor-pointer border border-slate-600"
      />
      <span className="sim-color-hex font-mono text-[10px] text-slate-500 w-14">{color}</span>
      <div className="flex gap-1">
        {presetColors.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`sim-color-swatch w-5 h-5 rounded border transition-all hover:scale-110 ${color === c ? 'border-white scale-110 ring-1 ring-white/50' : 'border-slate-600'}`}
            style={{backgroundColor: c}}
            title={c}
          />
        ))}
      </div>
    </div>
  
  );
};

const mapYtoSvg=y=>280-(y-0.005)/(0.05-0.005)*220;