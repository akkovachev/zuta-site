(function () {
  'use strict';
  var stage = document.getElementById('joke');
  var mascot = document.getElementById('mascot');
  var setupEl = document.getElementById('joke-setup');
  var punchEl = document.getElementById('joke-punch');
  var propEl = document.getElementById('prop');
  var confettiEl = document.getElementById('confetti');
  var btn = document.getElementById('joke-btn');
  var visitorsEl = document.getElementById('visitors');
  var viewsEl = document.getElementById('views');
  var lastId = null;
  var runId = 0;
  var timers = [];
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#ffb000', '#ff5fa2', '#5b6cff', '#3ddc97', '#ffffff', '#ffd966'];

  document.getElementById('y').textContent = new Date().getFullYear();

  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function setState(s) { mascot.setAttribute('class', 'mascot ' + s); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function showProp(emoji) {
    propEl.textContent = emoji;
    propEl.classList.remove('show');
    void propEl.offsetWidth; // restart the pop animation
    propEl.classList.add('show');
  }
  function hideProp() { propEl.classList.remove('show'); }

  function burst() {
    if (reduced) return;
    var i, el;
    for (i = 0; i < 26; i++) {
      el = document.createElement('i');
      el.className = 'piece';
      el.style.setProperty('--c', COLORS[i % COLORS.length]);
      el.style.setProperty('--dx', rand(-110, 110).toFixed(0) + 'px');
      el.style.setProperty('--dy', rand(-120, 40).toFixed(0) + 'px');
      el.style.setProperty('--rot', rand(-540, 540).toFixed(0) + 'deg');
      confettiEl.appendChild(el);
    }
    var words = ['HA!', 'HA HA', 'HEH', 'LOL'];
    for (i = 0; i < 3; i++) {
      el = document.createElement('b');
      el.className = 'ha';
      el.textContent = words[Math.floor(Math.random() * words.length)];
      el.style.setProperty('--hx', rand(-60, 60).toFixed(0) + 'px');
      el.style.setProperty('--hr', rand(-18, 18).toFixed(0) + 'deg');
      el.style.animationDelay = (i * 0.18) + 's';
      confettiEl.appendChild(el);
    }
    later(function () { confettiEl.textContent = ''; }, 1700);
  }

  function typeText(el, text, id, done) {
    if (reduced) { el.textContent = text; done(); return; }
    el.textContent = '';
    el.classList.add('typing');
    var start = performance.now(), shown = 0, perChar = 22;
    // Time-based, so a throttled or background tab (timers fire only about once a
    // second there) still finishes right away instead of typing one char per tick.
    (function step() {
      if (id !== runId) return;
      var n = Math.min(text.length, Math.floor((performance.now() - start) / perChar) + 1);
      if (n !== shown) { shown = n; el.textContent = text.slice(0, n); }
      if (n < text.length) { later(step, 24); }
      else { el.classList.remove('typing'); done(); }
    })();
  }

  function perform(j) {
    var id = ++runId;
    clearTimers();
    confettiEl.textContent = '';
    punchEl.textContent = '';
    punchEl.className = 'punch';
    setupEl.className = 'setup';
    hideProp();
    setState('think');
    btn.disabled = true;

    typeText(setupEl, j.setup, id, function () {
      if (id !== runId) return;
      punchEl.classList.add('thinking');
      later(function () {
        if (id !== runId) return;
        punchEl.classList.remove('thinking');
        punchEl.textContent = j.punchline;
        punchEl.classList.add('reveal');
        setState('laugh');
        showProp(j.emoji || '😄');
        burst();
        btn.disabled = false;
        later(function () { if (id === runId) setState('idle'); }, reduced ? 0 : 2600);
      }, reduced ? 0 : 850);
    });
  }

  function loadJoke() {
    btn.disabled = true;
    var url = '/api/joke' + (lastId === null ? '' : '?last=' + lastId);
    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { lastId = j.id; perform(j); })
      .catch(function () {
        runId++;
        clearTimers();
        setState('idle');
        setupEl.className = 'setup';
        setupEl.textContent = 'The joke machine is taking a nap.';
        punchEl.className = 'punch';
        punchEl.textContent = 'Try again in a moment.';
        btn.disabled = false;
      });
  }

  function countUp(el, to) {
    if (reduced || !to) { el.textContent = fmt(to); return; }
    var start = performance.now(), dur = 900;
    (function frame() {
      var p = Math.min((performance.now() - start) / dur, 1);
      el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) setTimeout(frame, 30);
    })();
  }

  function countVisit() {
    fetch('/api/visit', { method: 'POST', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { countUp(visitorsEl, d.visitors); countUp(viewsEl, d.views); })
      .catch(function () { visitorsEl.textContent = '\u2013'; viewsEl.textContent = '\u2013'; });
  }

  btn.addEventListener('click', loadJoke);
  loadJoke();
  countVisit();
})();
