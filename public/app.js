(function () {
  'use strict';
  var jokeEl = document.getElementById('joke');
  var setupEl = document.getElementById('joke-setup');
  var punchEl = document.getElementById('joke-punch');
  var btn = document.getElementById('joke-btn');
  var visitorsEl = document.getElementById('visitors');
  var viewsEl = document.getElementById('views');
  var lastId = null;

  document.getElementById('y').textContent = new Date().getFullYear();

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function loadJoke() {
    btn.disabled = true;
    var url = '/api/joke' + (lastId === null ? '' : '?last=' + lastId);
    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        lastId = j.id;
        setupEl.textContent = j.setup;
        punchEl.textContent = j.punchline;
        jokeEl.classList.remove('pop');
        void jokeEl.offsetWidth; // restart animation
        jokeEl.classList.add('pop');
      })
      .catch(function () {
        setupEl.textContent = 'The joke machine is taking a nap.';
        punchEl.textContent = 'Try again in a moment.';
      })
      .then(function () { btn.disabled = false; });
  }

  function countVisit() {
    fetch('/api/visit', { method: 'POST', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        visitorsEl.textContent = fmt(d.visitors);
        viewsEl.textContent = fmt(d.views);
      })
      .catch(function () {
        visitorsEl.textContent = '–';
        viewsEl.textContent = '–';
      });
  }

  btn.addEventListener('click', loadJoke);
  loadJoke();
  countVisit();
})();
