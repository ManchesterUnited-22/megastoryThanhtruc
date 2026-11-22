(function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function $(id) { return document.getElementById(id); }
  // tiến độ cuộn (0..1) của khối cao có phần tử sticky bên trong
  function progressOf(el) {
    if (!el) return 0;
    var r = el.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }
  function isPinned(el) {
    var r = el.getBoundingClientRect();
    return r.top <= 0 && r.bottom >= window.innerHeight;
  }

  /* Mỗi phần tử i trong n phần tử có một "ngăn" riêng theo tiến độ cuộn p.
     Hiện: 12% → 30% ngăn · Ẩn: 74% → 92% ngăn.
     Phần tử cũ tắt hẳn trước khi phần tử mới bắt đầu hiện → không bao giờ chồng chữ. */
  function slotWindow(p, i, n, isFirst, isLast) {
    var t = clamp((p - i / n) * n, 0, 1);
    var inn = isFirst ? 1 : smooth((t - 0.12) / 0.18);
    var out = isLast ? 1 : 1 - smooth((t - 0.74) / 0.18);
    return { o: inn * out, y: (1 - inn) * 28 - (1 - out) * 28 }; // vào từ dưới, ra lên trên
  }

  /* ---------- Đổi cảnh nền + tâm trạng ---------- */
  var layers = Array.prototype.slice.call(document.querySelectorAll('.layer'));
  var cap = $('cap');
  var current = -1;

  function setScene(i) {
    if (i === current || !layers[i]) return;
    current = i;
    layers.forEach(function (l, k) {
      var on = k === i;
      l.classList.toggle('on', on);
      var v = l.querySelector('video');
      if (v) {
        if (on) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else { v.pause(); }
      }
    });
    var text = layers[i].getAttribute('data-cap') || '';
    cap.textContent = text;
    cap.classList.toggle('show', !!text);
  }

  var sceneIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      setScene(parseInt(e.target.getAttribute('data-scene'), 10));
      document.body.setAttribute('data-mood', e.target.getAttribute('data-mood') || '');
      document.body.classList.toggle('film', e.target.classList.contains('film'));
    });
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
  document.querySelectorAll('[data-scene]').forEach(function (el) { sceneIO.observe(el); });

  /* ---------- Chữ hiện dần ---------- */
  var rvIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
  document.querySelectorAll('.rv').forEach(function (el) { rvIO.observe(el); });

  /* ---------- Thanh chương ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('#rail a'));
  var railIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) {
        a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id);
      });
      document.body.setAttribute('data-tone', e.target.getAttribute('data-tone') || 'blood');
    });
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
  document.querySelectorAll('.chapter').forEach(function (el) { railIO.observe(el); });

  /* ---------- MỞ ĐẦU: dòng thời gian 1961 → 1971 → 2026 ---------- */
  var tlWrap = $('timeline'), tlYear = $('tlYear');
  var seg1 = $('seg1'), seg2 = $('seg2'), tlDot = $('tlDot');
  var tlEv = Array.prototype.slice.call(document.querySelectorAll('.tl-ev'));
  var SPLIT = 10 / 65;   // 1961→1971 chiếm 10 trên tổng 65 năm (1961→2026)
  var tlStage = -1;
  function updateTimeline() {
    if (!tlWrap) return;
    var p = progressOf(tlWrap), year, bar, stage, k;
    if (p < 0.05)      { year = 1961; bar = 0; stage = 0; }
    else if (p < 0.36) { k = (p - 0.05) / 0.31; year = 1961 + Math.round(10 * k); bar = SPLIT * k; stage = 0; }
    else if (p < 0.44) { year = 1971; bar = SPLIT; stage = 1; }
    else if (p < 0.74) { k = smooth((p - 0.44) / 0.30); year = 1971 + Math.round(55 * k); bar = SPLIT + (1 - SPLIT) * k; stage = 1; }
    else               { year = 2026; bar = 1; stage = 2; }
    tlYear.textContent = year;
    updateMap(p);    
    tlYear.classList.toggle('after', year > 1971);
    seg1.style.width = (Math.min(bar, SPLIT) * 100) + '%';
    seg2.style.width = (Math.max(0, bar - SPLIT) * 100) + '%';
    tlDot.style.left = (bar * 100) + '%';
    if (stage !== tlStage) {
      tlStage = stage;
      tlEv.forEach(function (e, i) { e.classList.toggle('on', i === stage); });
    }
  }
    /* ---------- BẢN ĐỒ + CON SỐ LỚN ---------- */
  var MAP_LIT = 80;    // triệu lít (số đang ghi trên trang)
  var MAP_PPL = 4.8;   // triệu người
  var mapSouth = $('mapSouth'), mcNum = $('mcNum'), mcUnit = $('mcUnit'), mcLabel = $('mcLabel');
  var mapPhase = -1;
  function updateMap(p) {
    if (!mapSouth) return;
    var fill, val, phase, k;
    if (p < 0.05)      { fill = 0; val = 0; phase = 0; }
    else if (p < 0.44) { k = clamp((p - 0.05) / 0.31, 0, 1); fill = k; val = MAP_LIT * k; phase = 0; }
    else               { fill = 1; val = MAP_PPL * smooth((p - 0.44) / 0.30); phase = 1; }
    if (phase !== mapPhase) {
      mapPhase = phase;
      mcUnit.textContent = phase ? 'triệu người' : 'triệu lít';
      mcLabel.textContent = phase ? 'người Việt Nam bị phơi nhiễm (ước tính)' : 'chất diệt cỏ đã rải xuống miền Nam (ước tính)';
    }
    mcNum.textContent = phase ? val.toFixed(1).replace('.', ',') : Math.round(val);
    mapSouth.style.opacity = (0.78 * fill).toFixed(3);
  }

  /* ---------- CHƯƠNG I: sáng từng chữ ---------- */
  var revealWrap = $('revealWrap'), revealEl = $('reveal'), words = [];
  function buildReveal() {
    if (!revealEl) return;
    words = [];
    var raw = revealEl.textContent.trim().split(/\s+/);
    revealEl.textContent = '';
    raw.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      revealEl.appendChild(s);
      if (i < raw.length - 1) revealEl.appendChild(document.createTextNode(' '));
      words.push(s);
    });
  }
  buildReveal();
  window.__rebuildReveal = function () { buildReveal(); updateReveal(); };
  function updateReveal() {
    if (!revealWrap) return;
    var p = clamp((progressOf(revealWrap) - 0.08) / 0.8, 0, 1);
    var n = Math.round(p * words.length);
    words.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
  }

  /* ---------- CHƯƠNG II: ba cảnh Bữa ăn / Bài tập / Kỹ năng ---------- */
  var actsWrap = $('actsWrap');
  var acts = Array.prototype.slice.call(document.querySelectorAll('.act'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.act-dots i'));
  function updateActs() {
    if (!actsWrap || !acts.length) return;
    var p = progressOf(actsWrap), n = acts.length, B = 0.04, idx = 0, best = -1;
    acts.forEach(function (a, i) {
      // ảnh: giao nhau mờ quanh ranh giới
      var inn = i === 0 ? 1 : clamp((p - (i / n - B)) / (2 * B), 0, 1);
      var out = i === n - 1 ? 1 : 1 - clamp((p - ((i + 1) / n - B)) / (2 * B), 0, 1);
      var o = inn * out;
      a.classList.remove('on');
      a.style.opacity = o.toFixed(3);
      a.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      var img = a.querySelector('img');
      if (img) img.style.transform = 'scale(' + (1 + 0.12 * clamp((p - i / n) * n, 0, 1)).toFixed(4) + ')';
      // chữ: tách riêng, tắt hẳn trước khi chữ kế tiếp hiện
      var t = a.querySelector('.act-text');
      if (t) {
        var w = slotWindow(p, i, n, i === 0, i === n - 1);
        t.style.opacity = w.o.toFixed(3);
        t.style.transform = 'translateY(' + w.y.toFixed(1) + 'px)';
        t.style.filter = w.o > 0.99 ? 'none' : 'blur(' + ((1 - w.o) * 8).toFixed(1) + 'px)';
      }
      if (o > best) { best = o; idx = i; }
    });
    dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
  }

  /* ---------- CHƯƠNG III: nền mờ dần, từng đoạn ẩn hẳn rồi mới đến đoạn sau ---------- */
  var fogWrap = $('fogWrap'), narrow = $('narrow');
  var panels = Array.prototype.slice.call(document.querySelectorAll('.fog-panel'));
  function updateFog() {
    if (!fogWrap) return;
    var r = fogWrap.getBoundingClientRect(), H = innerHeight;
    var p = progressOf(fogWrap), n = panels.length;

    // nền mờ/tối: gắn trực tiếp vào mức cuộn nên vào/ra rất mượt
    var enter = smooth((H * 0.55 - r.top) / (H * 0.55));
    var leave = smooth(r.bottom / (H * 0.6));
    var f = smooth((p - 0.3) / 0.45) * leave;           // "Hôm nay" còn khá rõ, "Mai sau" mờ hẳn
    document.body.style.setProperty('--fog', f.toFixed(3));
    var minNr = innerWidth < 720 ? 74 : 54;
    narrow.style.setProperty('--nr', (100 - (100 - minNr) * f).toFixed(1) + '%');
    narrow.style.opacity = Math.min(enter, leave).toFixed(3);

    // chữ + khung ảnh
    var enterTxt = smooth((H * 0.5 - r.top) / (H * 0.5));
    var leaveTxt = smooth((r.bottom - H * 0.45) / (H * 0.45));
    panels.forEach(function (el, i) {
      var w = slotWindow(p, i, n, i === 0, i === n - 1);
      var o = w.o * (i === 0 ? enterTxt : 1) * (i === n - 1 ? leaveTxt : 1);
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      el.style.transform = 'translate(-50%,calc(-50% + ' + w.y.toFixed(1) + 'px))';
      el.style.filter = o > 0.99 ? 'none' : 'blur(' + ((1 - o) * 10).toFixed(1) + 'px)';
    });

    // đổi ảnh nền đúng vào nhịp trống giữa "Hôm nay" và "Mai sau"
    if (isPinned(fogWrap)) setScene(p < 0.5 ? 5 : 6);
  }

  /* ---------- CHƯƠNG IV: ghép mảnh ---------- */
  var puzzleWrap = $('puzzleWrap'), frame4 = $('frame4'), frameCap = $('frameCap');
  var pieces = Array.prototype.slice.call(document.querySelectorAll('.piece'));
  function updatePuzzle() {
    if (!puzzleWrap) return;
    var p = progressOf(puzzleWrap), W = innerWidth, H = innerHeight;
    pieces.forEach(function (el, i) {
      var t = clamp((p - i * 0.17) / 0.3, 0, 1);
      var e = 1 - Math.pow(1 - t, 3);
      var x = parseFloat(el.getAttribute('data-x')) * W / 100;
      var y = parseFloat(el.getAttribute('data-y')) * H / 100;
      var r = parseFloat(el.getAttribute('data-r'));
      el.style.transform = 'translate3d(' + (x * (1 - e)) + 'px,' + (y * (1 - e)) + 'px,0) rotate(' + (r * (1 - e)) + 'deg)';
      el.style.opacity = Math.min(1, t * 4);
    });
    frame4.classList.toggle('done', p > 0.72);
    frameCap.style.opacity = smooth((p - 0.72) / 0.15);
  }

  /* ---------- KHÉP LẠI: bình minh → khoảng lặng ---------- */
  var dawnWrap = $('dawnWrap'), sun = $('sun'), blackout = $('blackout');
  var dawnLayer = document.querySelector('.layer.dawn');
  var endEls = [$('e0'), $('e1'), $('e2')];
  var endStart = [0.12, 0.26, 0.46];
  function updateDawn() {
    if (!dawnWrap) return;
    var p = progressOf(dawnWrap);
    var out = 1 - smooth((p - 0.74) / 0.1);
    if (dawnLayer) dawnLayer.style.setProperty('--dawn', (0.12 + 0.88 * smooth(p / 0.55)).toFixed(3));
    sun.style.opacity = (smooth(p / 0.5) * out).toFixed(3);
    sun.style.transform = 'translateY(' + ((1 - smooth(p / 0.6)) * 28) + '%)';
    blackout.style.opacity = smooth((p - 0.76) / 0.14).toFixed(3);
    endEls.forEach(function (el, i) {
      if (!el) return;
      var inn = smooth((p - endStart[i]) / 0.14);
      el.style.opacity = (inn * out).toFixed(3);
      el.style.transform = 'translateY(' + ((1 - inn) * 24) + 'px)';
    });
  }

  /* ---------- Cuộn ---------- */
  var bar = $('progress'), ticking = false;
  function update() {
    ticking = false;
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
    updateTimeline(); updateReveal(); updateActs();
    updateFog(); updatePuzzle(); updateDawn();
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('load', update);

  setScene(0);
  update();

  /* ---------- MỞ ĐẦU: chia đôi (ảnh sang trái, chữ sang phải) ---------- */
  var opening = $('opening');
  if (opening) {
    var openIt = function () { opening.classList.add('open'); };
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      openIt();
    } else {
      var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      var cap1 = new Promise(function (r) { setTimeout(r, 1800); });
      Promise.race([fontsReady, cap1]).then(function () { setTimeout(openIt, 700); });
    }
  }
})();