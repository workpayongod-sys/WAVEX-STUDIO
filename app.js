const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;
let isPlaying = false;
let currentStep = 0;
let intervalId = null;
let currentView = 'rack';

const tracks = [
  { name: "Kick Drum", type: "kick", activeClass: "active-kick", tagColor: "bg-emerald-500" },
  { name: "Snare Drum", type: "snare", activeClass: "active-snare", tagColor: "bg-cyan-500" },
  { name: "Hi-Hat Closed", type: "hat", activeClass: "active-hat", tagColor: "bg-pink-500" },
  { name: "Clap", type: "clap", activeClass: "active-clap", tagColor: "bg-amber-500" }
];

const sequence = tracks.map(() => Array(8).fill(false));

function initCtx() {
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

function switchView(viewName) {
  currentView = viewName;
  ['rack', 'piano', 'playlist', 'mixer'].forEach(v => {
    const tab = document.getElementById(`tab-${v}`);
    if (tab) tab.classList.remove('tab-active');
  });
  const activeTab = document.getElementById(`tab-${viewName}`);
  if (activeTab) activeTab.classList.add('tab-active');
  renderViewport();
}

function playSound(type) {
  if (!ctx) return;
  const masterVol = parseFloat(document.getElementById('volInput').value);
  const now = ctx.currentTime;

  if (type === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    gain.gain.setValueAtTime(masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } 
  else if (type === 'snare') {
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 800;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(masterVol * 0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    oscGain.gain.setValueAtTime(masterVol, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    whiteNoise.start(now);
    osc.start(now);
    whiteNoise.stop(now + 0.15);
    osc.stop(now + 0.1);
  } 
  else if (type === 'hat') {
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(masterVol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  } 
  else if (type === 'clap') {
    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(masterVol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }
}

function playPianoFreq(freq) {
  initCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const masterVol = parseFloat(document.getElementById('volInput').value);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gain.gain.setValueAtTime(masterVol * 0.7, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

function renderViewport() {
  const viewport = document.getElementById('viewport');
  viewport.innerHTML = '';

  if (currentView === 'rack') {
    let html = `
      <div class="flex justify-between items-center mb-2 px-1">
        <span class="text-[10px] font-black tracking-widest text-zinc-400">CHANNEL RACK</span>
        <span class="text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">8 STEPS</span>
      </div>
      <div id="rack-container" class="space-y-2"></div>
    `;
    viewport.innerHTML = html;
    renderRack();
  } 
  else if (currentView === 'piano') {
    viewport.innerHTML = `
      <div class="flex justify-between items-center mb-2 px-1">
        <span class="text-[10px] font-black tracking-widest text-zinc-400">PIANO ROLL SYNTH</span>
        <span class="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">SYNTH LEAD</span>
      </div>
      <div class="fl-chassis p-3 rounded-2xl">
        <div class="h-28 bg-black/60 rounded-xl border border-zinc-800 mb-3 p-2 relative flex items-center justify-center">
          <span class="text-xs text-zinc-500 font-bold">Tap keys below to play melody</span>
        </div>
        <div class="grid grid-cols-7 gap-1 h-28">
          <button onclick="playPianoFreq(261.63)" class="white-key rounded-b-lg font-black text-xs pb-2 flex items-end justify-center">C</button>
          <button onclick="playPianoFreq(293.66)" class="white-key rounded-b-lg font-black text-xs pb-2 flex items-end justify-center">D</button>
          <button onclick="playPianoFreq(329.63)" class="white-key rounded-b-lg font-black text-xs pb-2 flex items-end justify-center">E</button>
          <button onclick="playPianoFreq(349.23)" class="white-key rounded-b-lg font-black text-xs pb-2 flex items-end justify-center">F</button>
          <button onclick="playPianoFreq(392.00)" class="white-key rounded-b-lg font-black text-xs pb-2 flex items-end justify-center">G</button>
          <button onclick="playPianoFreq(440.00)" class="white-key rounded-b-lg font-black text-xs pb-2 flex items-end justify-center">A</button>
          <button onclick="playPianoFreq(493.88)" class="white-key rounded-b-lg font-black text-xs pb-2 flex items-end justify-center">B</button>
        </div>
      </div>
    `;
  } 
  else if (currentView === 'playlist') {
    viewport.innerHTML = `
      <div class="flex justify-between items-center mb-2 px-1">
        <span class="text-[10px] font-black tracking-widest text-zinc-400">PLAYLIST / SONG ARRANGER</span>
        <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">BARS 1-8</span>
      </div>
      <div class="fl-chassis p-3 rounded-2xl space-y-2">
        <div class="p-2 bg-black/40 rounded-xl border border-zinc-800">
          <span class="text-[10px] font-bold text-amber-500 block mb-1">Track 1: Drums Beat</span>
          <div class="grid grid-cols-4 gap-1">
            <div class="h-7 bg-emerald-500/30 border border-emerald-500/50 rounded flex items-center justify-center text-[9px] font-bold text-emerald-300">Pat 1</div>
            <div class="h-7 bg-emerald-500/30 border border-emerald-500/50 rounded flex items-center justify-center text-[9px] font-bold text-emerald-300">Pat 1</div>
            <div class="h-7 bg-emerald-500/30 border border-emerald-500/50 rounded flex items-center justify-center text-[9px] font-bold text-emerald-300">Pat 1</div>
            <div class="h-7 bg-zinc-800/50 border border-zinc-800 rounded"></div>
          </div>
        </div>
        <div class="p-2 bg-black/40 rounded-xl border border-zinc-800">
          <span class="text-[10px] font-bold text-cyan-400 block mb-1">Track 2: Synth Melody</span>
          <div class="grid grid-cols-4 gap-1">
            <div class="h-7 bg-zinc-800/50 border border-zinc-800 rounded"></div>
            <div class="h-7 bg-cyan-500/30 border border-cyan-500/50 rounded flex items-center justify-center text-[9px] font-bold text-cyan-300">Pat 2</div>
            <div class="h-7 bg-cyan-500/30 border border-cyan-500/50 rounded flex items-center justify-center text-[9px] font-bold text-cyan-300">Pat 2</div>
            <div class="h-7 bg-cyan-500/30 border border-cyan-500/50 rounded flex items-center justify-center text-[9px] font-bold text-cyan-300">Pat 2</div>
          </div>
        </div>
      </div>
    `;
  } 
  else if (currentView === 'mixer') {
    viewport.innerHTML = `
      <div class="flex justify-between items-center mb-2 px-1">
        <span class="text-[10px] font-black tracking-widest text-zinc-400">MIXER CONSOLE</span>
        <span class="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">4 CHANNELS</span>
      </div>
      <div class="fl-chassis p-3 rounded-2xl grid grid-cols-4 gap-2 text-center">
        <div class="p-2 bg-black/40 rounded-xl border border-zinc-800 flex flex-col items-center">
          <span class="text-[9px] font-bold text-amber-500 mb-1">MASTER</span>
          <div class="w-2 bg-zinc-800 h-20 rounded-full relative overflow-hidden my-1">
            <div class="w-full bg-emerald-400 absolute bottom-0 h-3/4"></div>
          </div>
          <span class="text-[8px] text-zinc-500 font-bold">0 dB</span>
        </div>
        <div class="p-2 bg-black/40 rounded-xl border border-zinc-800 flex flex-col items-center">
          <span class="text-[9px] font-bold text-emerald-400 mb-1">KICK</span>
          <div class="w-2 bg-zinc-800 h-20 rounded-full relative overflow-hidden my-1">
            <div class="w-full bg-emerald-400 absolute bottom-0 h-2/3"></div>
          </div>
          <span class="text-[8px] text-zinc-500 font-bold">-2 dB</span>
        </div>
        <div class="p-2 bg-black/40 rounded-xl border border-zinc-800 flex flex-col items-center">
          <span class="text-[9px] font-bold text-cyan-400 mb-1">SNARE</span>
          <div class="w-2 bg-zinc-800 h-20 rounded-full relative overflow-hidden my-1">
            <div class="w-full bg-cyan-400 absolute bottom-0 h-1/2"></div>
          </div>
          <span class="text-[8px] text-zinc-500 font-bold">-4 dB</span>
        </div>
        <div class="p-2 bg-black/40 rounded-xl border border-zinc-800 flex flex-col items-center">
          <span class="text-[9px] font-bold text-pink-400 mb-1">HAT</span>
          <div class="w-2 bg-zinc-800 h-20 rounded-full relative overflow-hidden my-1">
            <div class="w-full bg-pink-400 absolute bottom-0 h-3/5"></div>
          </div>
          <span class="text-[8px] text-zinc-500 font-bold">-3 dB</span>
        </div>
      </div>
    `;
  }
}

function renderRack() {
  const rackEl = document.getElementById('rack-container');
  if (!rackEl) return;
  rackEl.innerHTML = '';

  tracks.forEach((track, tIdx) => {
    const row = document.createElement('div');
    row.className = 'fl-chassis p-2 rounded-xl flex items-center justify-between gap-2';

    const trackMeta = document.createElement('div');
    trackMeta.className = 'w-24 flex items-center gap-1.5';
    trackMeta.innerHTML = `
      <div class="w-1.5 h-6 rounded-full ${track.tagColor}"></div>
      <div class="flex flex-col">
        <span class="text-[10px] font-bold text-white leading-tight truncate">${track.name}</span>
        <div class="flex gap-1 items-center mt-0.5">
          <div class="knob-dial w-3 h-3 rounded-full"></div>
          <span class="text-[8px] font-bold text-zinc-500">VOL</span>
          <div class="knob-dial w-3 h-3 rounded-full"></div>
          <span class="text-[8px] font-bold text-zinc-500">PAN</span>
        </div>
      </div>
    `;
    row.appendChild(trackMeta);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-8 gap-1 flex-1';

    for (let sIdx = 0; sIdx < 8; sIdx++) {
      const btn = document.createElement('button');
      btn.className = `fl-pad h-8 rounded transition-all ${sequence[tIdx][sIdx] ? track.activeClass : ''}`;
      
      if (currentStep === sIdx && isPlaying) {
        btn.classList.add('step-current');
      }

      btn.onclick = () => {
        initCtx();
        sequence[tIdx][sIdx] = !sequence[tIdx][sIdx];
        if (sequence[tIdx][sIdx]) playSound(track.type);
        renderRack();
      };
      grid.appendChild(btn);
    }
    row.appendChild(grid);
    rackEl.appendChild(row);
  });
}

document.getElementById('playBtn').onclick = () => {
  initCtx();
  isPlaying = !isPlaying;
  const playBtn = document.getElementById('playBtn');

  if (isPlaying) {
    playBtn.innerText = '■ STOP';
    playBtn.className = 'bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-5 py-2 rounded-lg shadow-lg shadow-rose-500/20 active:scale-95 transition';
    currentStep = 0;
    runSequencer();
  } else {
    playBtn.innerText = '▶ PLAY';
    playBtn.className = 'bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-xs px-5 py-2 rounded-lg shadow-lg shadow-orange-500/20 active:scale-95 transition';
    clearInterval(intervalId);
    if (currentView === 'rack') renderRack();
  }
};

function runSequencer() {
  const bpm = parseInt(document.getElementById('bpmInput').value) || 120;
  const stepTime = (60 / bpm / 2) * 1000;

  clearInterval(intervalId);
  intervalId = setInterval(() => {
    tracks.forEach((track, tIdx) => {
      if (sequence[tIdx][currentStep]) playSound(track.type);
    });
    if (currentView === 'rack') renderRack();
    currentStep = (currentStep + 1) % 8;
  }, stepTime);
}

// Initial View Render on Load
renderViewport();
