/* IK BODAM — V1 (डेमो). कोई API Key या पासवर्ड इस फाइल में नहीं है। */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var KEY = { chat: 'bodam_chat', mem: 'bodam_mem', set: 'bodam_set' };

  // ---------- सुरक्षित localStorage ----------
  function load(k, fallback) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var chatLog = load(KEY.chat, []);
  var memory = load(KEY.mem, []);
  var settings = load(KEY.set, { voice: false, glow: true, name: '' });

  // ---------- Tabs ----------
  var tabs = $('tabs');
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (!b) return;
    tabs.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('show'); });
    $('tab-' + b.dataset.tab).classList.add('show');
  });

  // ---------- Orb स्थिति ----------
  function setState(state, text) {
    $('orb').dataset.state = state;
    $('status').textContent = text;
  }
  var IDLE = 'तैयार — बोलने के लिए 🎙 दबाएँ या लिखें';

  // ---------- Chat ----------
  var chatEl = $('chat');
  function addMsg(role, text, store) {
    var d = document.createElement('div');
    d.className = 'msg ' + role;
    d.textContent = text;            // textContent: सुरक्षित (HTML नहीं चलेगा)
    chatEl.appendChild(d);
    chatEl.scrollTop = chatEl.scrollHeight;
    if (store !== false) {
      chatLog.push({ r: role, t: text });
      if (chatLog.length > 100) chatLog = chatLog.slice(-100);
      save(KEY.chat, chatLog);
    }
  }
  function greeting() {
    var n = settings.name ? ' ' + settings.name : '';
    return 'नमस्ते' + n + '! मैं IK BODAM हूँ, IK TECHNOLOGY का AI Assistant। मैं आपकी कैसे मदद कर सकता हूँ?';
  }
  function renderChat() {
    chatEl.innerHTML = '';
    if (!chatLog.length) { addMsg('bot', greeting(), false); return; }
    chatLog.forEach(function (m) { addMsg(m.r, m.t, false); });
  }

  // ---------- जवाब (डेमो, अभी AI नहीं) ----------
  var IDENTITY = 'मुझे BCA Software Student Imran ने डिजाइन किया है। मैं IK TECHNOLOGY का AI Assistant IK BODAM हूँ। मैं आपकी कैसे मदद कर सकता हूँ?';

  function reply(raw) {
    var q = raw.toLowerCase();

    // पहचान वाले सवाल (हिंदी + अंग्रेज़ी)
    var who = /(तुम्हें|तुमको|आपको|तुम्हे).*(किसने|किसने)|किसने\s*(बनाया|डिजाइन|डिज़ाइन)|निर्माता|तुम कौन|आप कौन|कौन हो|who\s*(made|created|designed|built)|who\s*are\s*you|your\s*(creator|developer|maker)/i;
    if (who.test(raw)) return IDENTITY;

    if (/समय|टाइम|time/.test(q)) return 'अभी समय है: ' + new Date().toLocaleTimeString('hi-IN');
    if (/तारीख|तारिख|date|आज/.test(q)) return 'आज की तारीख: ' + new Date().toLocaleDateString('hi-IN');
    if (/नमस्ते|hello|\bhi\b|hey/.test(q)) return greeting();
    if (/मेमोरी|याद|memory/.test(q)) return 'आपकी मेमोरी में ' + memory.length + ' बातें हैं। "मेमोरी" टैब में देखें।';
    if (/डिवाइस|रिमोट|device|remote/.test(q)) return 'रिमोट कंट्रोल V3 में आएगा। अभी सिर्फ़ डिज़ाइन तैयार है।';

    return 'आपने कहा: "' + raw + '"\n(अभी डेमो मोड है। असली जवाब V2 में BODAM 10.6 से जुड़ने पर मिलेंगे।)';
  }

  // ---------- Voice Reply (ब्राउज़र की मुफ़्त speechSynthesis) ----------
  function speak(text) {
    if (!settings.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-US';
      u.onstart = function () { setState('speaking', 'बोल रहा हूँ…'); };
      u.onend = u.onerror = function () { setState('idle', IDLE); };
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  function handle(text) {
    text = text.trim();
    if (!text) return;
    addMsg('user', text);
    setState('thinking', 'सोच रहा हूँ…');
    setTimeout(function () {
      var r = reply(text);
      addMsg('bot', r);
      setState('idle', IDLE);
      speak(r);
    }, 350);
  }

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var i = $('input');
    var v = i.value;
    i.value = '';
    handle(v);
  });

  $('newChat').addEventListener('click', function () {
    chatLog = [];
    save(KEY.chat, chatLog);
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
    renderChat();
    setState('idle', IDLE);
  });

  // ---------- Voice Command (Web Speech API, Chrome Android पर) ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, listening = false;
  $('mic').addEventListener('click', function () {
    if (!SR) { addMsg('bot', 'इस ब्राउज़र में Voice Command उपलब्ध नहीं है। Chrome (Android) में खोलें।', false); return; }
    if (listening && rec) { rec.stop(); return; }
    rec = new SR();
    rec.lang = 'hi-IN';
    rec.interimResults = false;
    rec.onstart = function () { listening = true; $('mic').classList.add('on'); setState('listening', 'सुन रहा हूँ…'); };
    rec.onresult = function (ev) { handle(ev.results[0][0].transcript); };
    rec.onerror = function (ev) { addMsg('bot', 'Mic में समस्या: ' + ev.error + ' (Mic की अनुमति जाँचें)', false); };
    rec.onend = function () { listening = false; $('mic').classList.remove('on'); if ($('orb').dataset.state === 'listening') setState('idle', IDLE); };
    try { rec.start(); } catch (e) {}
  });

  // ---------- Devices (डेमो सूची) ----------
  var demoDevices = [
    { n: 'यह फोन (Android)', s: 'अभी का डिवाइस', on: true },
    { n: 'घर वाला Android फोन', s: 'डेमो — V3 में जुड़ेगा', on: false },
    { n: 'Windows PC', s: 'डेमो — V3 में जुड़ेगा', on: false }
  ];
  $('deviceList').innerHTML = demoDevices.map(function (d) {
    return '<div class="item"><span class="dot ' + (d.on ? 'on' : '') + '"></span><div class="grow">' + d.n + '<small>' + d.s + '</small></div></div>';
  }).join('');

  // ---------- Memory Dashboard ----------
  function renderMem() {
    var box = $('memList');
    box.innerHTML = '';
    if (!memory.length) {
      var e = document.createElement('p'); e.className = 'hint'; e.textContent = 'अभी कोई मेमोरी नहीं है।'; box.appendChild(e); return;
    }
    memory.forEach(function (m, i) {
      var row = document.createElement('div'); row.className = 'item';
      var t = document.createElement('div'); t.className = 'grow'; t.textContent = m;
      var b = document.createElement('button'); b.textContent = '🗑'; b.setAttribute('aria-label', 'मिटाएँ');
      b.addEventListener('click', function () { memory.splice(i, 1); save(KEY.mem, memory); renderMem(); });
      row.appendChild(t); row.appendChild(b); box.appendChild(row);
    });
  }
  $('memForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('memInput').value.trim();
    if (!v) return;
    memory.push(v); save(KEY.mem, memory);
    $('memInput').value = '';
    renderMem();
  });
  $('clearMem').addEventListener('click', function () {
    if (memory.length && confirm('सारी मेमोरी मिटानी है?')) { memory = []; save(KEY.mem, memory); renderMem(); }
  });

  // ---------- Settings ----------
  $('setVoice').checked = !!settings.voice;
  $('setGlow').checked = settings.glow !== false;
  $('setName').value = settings.name || '';
  function applySettings() { document.body.classList.toggle('no-glow', settings.glow === false); }
  $('setVoice').addEventListener('change', function (e) { settings.voice = e.target.checked; save(KEY.set, settings); });
  $('setGlow').addEventListener('change', function (e) { settings.glow = e.target.checked; save(KEY.set, settings); applySettings(); });
  $('setName').addEventListener('input', function (e) { settings.name = e.target.value.trim(); save(KEY.set, settings); });

  // ---------- Login modal (सिर्फ़ डिज़ाइन) ----------
  $('openLogin').addEventListener('click', function () { $('modal').hidden = false; });
  $('closeLogin').addEventListener('click', function () { $('modal').hidden = true; });
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) $('modal').hidden = true; });

  // ---------- शुरू ----------
  applySettings();
  renderChat();
  renderMem();
})();
