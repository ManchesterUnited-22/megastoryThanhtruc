(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var $ = function (s) { return document.querySelector(s); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Câu kết: tách từng chữ để hiện chậm
  var big = $('.end .big');
  if (big) {
    var txt = big.textContent.trim();
    big.setAttribute('aria-label', txt);
    big.innerHTML = txt.split(/\s+/).map(function (w, i) {
      return '<span class="w" aria-hidden="true" style="--i:' + i + '">' + w + '</span>';
    }).join(' ');
  }

  // Hiện dần khi cuộn tới
  var rv = [].slice.call(document.querySelectorAll('.rv'));
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  rv.forEach(function (el) { io.observe(el); });

  // Mục lục chương + chớp mờ khi sang chương mới
  var secs = [].slice.call(document.querySelectorAll('[data-fg]'));
  var links = [].slice.call(document.querySelectorAll('#rail a'));
  var rail = $('#rail');
  var blink = $('.blink');
  var last = -1;
  var so = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = secs.indexOf(e.target);
      links.forEach(function (a, k) { a.classList.toggle('on', k === i); });
      rail.style.setProperty('--rf', e.target.getAttribute('data-fg'));
      if (last !== -1 && last !== i && !reduce && blink) {
        blink.classList.remove('go'); void blink.offsetWidth; blink.classList.add('go');
      }
      last = i;
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  secs.forEach(function (s) { so.observe(s); });

  // Thanh cảm xúc: dải màu theo vị trí thật của từng chương
  var emo = $('#emo');
  var cols = ['#B4531A', '#6E1A14', '#3A2418', '#0B0807', '#41533A', '#F1E8D4'];
  function buildEmo() {
    var H = root.scrollHeight;
    var stops = secs.map(function (s, i) {
      return cols[i] + ' ' + ((s.offsetTop + s.offsetHeight / 2) / H * 100).toFixed(1) + '%';
    });
    emo.style.background = 'linear-gradient(180deg,' + cols[0] + ' 0%,' + stops.join(',') + ',' + cols[5] + ' 100%)';
  }

  // Hiệu ứng gắn với mức cuộn: hạt phim, vignette chương III, bình minh chương V
  var ch3 = $('#c3'), ch5 = $('#c5');
  var ticking = false;
  function update() {
    var vh = window.innerHeight;
    var max = Math.max(1, root.scrollHeight - vh);
    var P = clamp(window.scrollY / max, 0, 1);
    emo.style.setProperty('--ep', (1 + P * 98).toFixed(2) + '%');
    root.style.setProperty('--grain', (reduce ? 0 : 0.32 * (1 - clamp(P / 0.92, 0, 1))).toFixed(3));
    if (!reduce) {
      var r3 = ch3.getBoundingClientRect();
      var p3 = clamp((vh - r3.top) / (r3.height + vh), 0, 1);
      root.style.setProperty('--v', clamp((p3 - 0.1) / 0.6, 0, 1).toFixed(3));
      root.style.setProperty('--vo', (clamp(p3 / 0.12, 0, 1) * clamp((1 - p3) / 0.12, 0, 1)).toFixed(3));
      var r5 = ch5.getBoundingClientRect();
      ch5.style.setProperty('--dawn', clamp((vh - r5.top) / (r5.height * 0.6 + vh * 0.5), 0, 1).toFixed(3));
    }
    ticking = false;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { buildEmo(); onScroll(); });
  window.addEventListener('load', function () { buildEmo(); update(); });
  buildEmo(); update();
})();