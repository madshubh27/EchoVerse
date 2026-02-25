/* ═══════════════════════════════════════════════════════════════════
   EchoVerse v2.0.1 — Voice Intelligence, Refined.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const API = 'http://localhost:8000';

  const $ = (s) => document.querySelector(s);
  const orbBtn = $('#orbBtn');
  const orbContainer = $('#orbContainer');
  const orbBtnLabel = $('#orbBtnLabel');
  const orbStatus = $('#orbStatus');
  const transcriptBody = $('#transcriptBody');
  const transcriptHeading = $('#transcriptHeading');
  const transcriptHint = $('#transcriptHint');
  const metricLatency = $('#metricLatency');
  const metricStatus = $('#metricStatus');
  const metricLogs = $('#metricLogs');
  const bars = document.querySelectorAll('.waveform-bars span');

  let state = 'idle'; // idle | connecting | listening
  let recognition = null;
  let isListening = false;
  let chatHistory = [];
  let sessionId = null;
  let audioCtx = null;
  let analyser = null;
  let micStream = null;
  let animFrame = null;
  const synth = window.speechSynthesis;

  // ═══════════════════════════════════════════════════════════════
  //  STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  function setState(s) {
    state = s;

    if (s === 'idle') {
      orbContainer.classList.remove('active');
      orbBtnLabel.textContent = 'Activate';
      orbStatus.textContent = 'Ready';
      metricStatus.textContent = 'Standby';
      resetBars();
    } else if (s === 'connecting') {
      orbBtnLabel.textContent = '...';
      orbStatus.textContent = 'Connecting';
      metricStatus.textContent = 'Connecting';
    } else if (s === 'listening') {
      orbContainer.classList.add('active');
      orbBtnLabel.textContent = 'Active';
      orbStatus.textContent = 'Listening';
      metricStatus.textContent = 'Operational';
    }
  }

  function resetBars() {
    const heights = [10, 16, 22, 28, 36, 28, 22, 16, 10];
    bars.forEach((b, i) => { b.style.height = heights[i] + 'px'; });
  }

  // ═══════════════════════════════════════════════════════════════
  //  METRICS LOG
  // ═══════════════════════════════════════════════════════════════
  function addMetricLog(msg) {
    const p = document.createElement('p');
    p.textContent = '> ' + msg;
    metricLogs.appendChild(p);
    // Keep last 8
    while (metricLogs.children.length > 8) metricLogs.removeChild(metricLogs.firstChild);
  }

  // ═══════════════════════════════════════════════════════════════
  //  TRANSCRIPT
  // ═══════════════════════════════════════════════════════════════
  let hasTranscript = false;

  function addTranscript(role, text) {
    if (!hasTranscript) {
      // Replace placeholder content
      transcriptBody.innerHTML = '';
      hasTranscript = true;
    }

    const div = document.createElement('div');
    div.className = `transcript-entry ${role}`;
    const time = new Date().toLocaleTimeString();
    div.innerHTML = `
      <div class="entry-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="entry-bubble">
        <div class="entry-role">${role === 'user' ? 'You' : 'EchoVerse'}</div>
        <div class="entry-text">${escapeHtml(text)}</div>
        <div class="entry-time">${time}</div>
      </div>`;
    transcriptBody.appendChild(div);
    transcriptBody.scrollTop = transcriptBody.scrollHeight;
  }

  // ═══════════════════════════════════════════════════════════════
  //  AUDIO VISUALIZATION → drive waveform bars from mic
  // ═══════════════════════════════════════════════════════════════
  function startAudioViz(stream) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      const src = audioCtx.createMediaStreamSource(stream);
      analyser.fftSize = 64;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        analyser.getByteFrequencyData(data);
        // Map 9 bars to freq bins
        const step = Math.floor(data.length / 9);
        bars.forEach((b, i) => {
          const val = data[i * step] || 0;
          const h = 6 + (val / 255) * 30;
          b.style.height = h + 'px';
        });

        // Update latency with a simulated value based on audio
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        metricLatency.textContent = Math.round(16 + avg * 0.08) + 'ms';

        animFrame = requestAnimationFrame(tick);
      }
      tick();
    } catch (e) {
      console.warn('Audio viz unavailable', e);
    }
  }

  function stopAudioViz() {
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;
    if (audioCtx) { try { audioCtx.close(); } catch {} audioCtx = null; }
    analyser = null;
    resetBars();
    metricLatency.textContent = '--';
  }

  // ═══════════════════════════════════════════════════════════════
  //  TTS
  // ═══════════════════════════════════════════════════════════════
  function speak(text) {
    return new Promise((resolve) => {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1; u.pitch = 1; u.volume = 1;
      const voices = synth.getVoices();
      const pref = voices.find(v =>
        v.name.includes('Samantha') || v.name.includes('Google') || v.lang === 'en-US'
      );
      if (pref) u.voice = pref;
      u.onend = resolve;
      u.onerror = resolve;
      synth.speak(u);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  CHAT
  // ═══════════════════════════════════════════════════════════════
  async function sendToChat(userText) {
    chatHistory.push({ role: 'user', content: userText });
    addTranscript('user', userText);
    addMetricLog('STT captured: "' + userText.slice(0, 50) + '"');

    try {
      const resp = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory, session_id: sessionId || '' }),
      });
      if (!resp.ok) throw new Error('API ' + resp.status);
      const d = await resp.json();
      chatHistory.push({ role: 'assistant', content: d.response });
      addTranscript('agent', d.response);
      addMetricLog('LLM responded (' + (d.model || 'gpt') + ')');
      await speak(d.response);
    } catch (e) {
      addMetricLog('Chat error: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  SPEECH RECOGNITION
  // ═══════════════════════════════════════════════════════════════
  async function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { addMetricLog('Speech recognition not supported'); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream = stream;
      addMetricLog('Microphone access granted.');
      startAudioViz(stream);

      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        addMetricLog('Speech recognition active.');
      };

      recognition.onresult = (ev) => {
        let fin = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) fin += ev.results[i][0].transcript;
        }
        if (fin.trim()) sendToChat(fin.trim());
      };

      recognition.onerror = (ev) => {
        if (ev.error !== 'no-speech') addMetricLog('Speech error: ' + ev.error);
      };

      recognition.onend = () => {
        if (isListening && recognition) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();
    } catch (e) {
      addMetricLog('Mic error: ' + e.message);
      setState('idle');
    }
  }

  function stopListening() {
    isListening = false;
    if (recognition) { try { recognition.abort(); } catch {} recognition = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    stopAudioViz();
    synth.cancel();
  }

  // ═══════════════════════════════════════════════════════════════
  //  BUTTON HANDLER
  // ═══════════════════════════════════════════════════════════════
  async function handleOrb() {
    if (state === 'idle') {
      setState('connecting');
      addMetricLog('Initializing core modules...');

      // Try token
      try {
        const r = await fetch(`${API}/api/voice-token`);
        if (r.ok) {
          const d = await r.json();
          sessionId = d.session_id;
          addMetricLog('Session: ' + sessionId);
        }
      } catch {
        addMetricLog('Token proxy unavailable — demo mode.');
      }

      addMetricLog('Audio engine ready.');
      setState('listening');

      const greeting = "Hello! I'm EchoVerse, your AI voice assistant. How can I help you today?";
      addTranscript('agent', greeting);
      await speak(greeting);
      await startListening();

    } else {
      stopListening();
      setState('idle');
      chatHistory = [];
      sessionId = null;
      addMetricLog('Session ended.');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  UTILS
  // ═══════════════════════════════════════════════════════════════
  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ═══════════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════════
  function init() {
    orbBtn.addEventListener('click', handleOrb);
    setState('idle');

    // Pre-load TTS voices
    if (synth.getVoices().length === 0) {
      synth.addEventListener('voiceschanged', () => {}, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
