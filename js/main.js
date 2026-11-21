(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- 1. Cạnh giấy xé ngẫu nhiên (trên + dưới) ---------- */
  function tornPoly(amp, n) {
    var pts = [], i, x;
    for (i = 0; i <= n; i++) {
      x = (i / n * 100).toFixed(2);
      pts.push(x + '% ' + rnd(0, amp).toFixed(1) + 'px');
    }
    for (i = n; i >= 0; i--) {
      x = (i / n * 100).toFixed(2);
      pts.push(x + '% calc(100% - ' + rnd(0, amp).toFixed(1) + 'px)');
    }
    return 'polygon(' + pts.join(',') + ')';
  }
  $$('.torn').forEach(function (el) {
    var amp = parseFloat(el.getAttribute('data-amp')) || 8;
    el.style.clipPath = tornPoly(amp, 70);
    el.style.webkitClipPath = el.style.clipPath;
  });

  /* ---------- 2. Cánh cửa xé đôi (cạnh dọc) ---------- */
  function doorPoly(side, amp, n) {
    var pts = [], i, y, off;
    if (side === 'l') {
      pts.push('0 0');
      for (i = 0; i <= n; i++) {
        y = (i / n * 100).toFixed(2);
        off = rnd(0, amp).toFixed(1);
        pts.push('calc(100% - ' + off + 'px) ' + y + '%');
      }
      pts.push('0 100%');
    } else {
      pts.push('100% 0');
      pts.push('100% 100%');
      for (i = n; i >= 0; i--) {
        y = (i / n * 100).toFixed(2);
        off = rnd(0, amp).toFixed(1);
        pts.push(off + 'px ' + y + '%');
      }
    }
    return 'polygon(' + pts.join(',') + ')';
  }
  $$('.torn-door').forEach(function (el) {
    var p = doorPoly(el.getAttribute('data-side'), 26, 30);
    el.style.clipPath = p;
    el.style.webkitClipPath = p;
  });

  /* ---------- 3. Cuộn: cửa mở + thanh tiến độ ---------- */
    var doorL = $('.door-l'), doorR = $('.door-r'), doorText = $('.door-text');
  var reveal = $('.hero-reveal'), content = $('.hero-content');
  var bar = $('.progress i');
  var ticking = false;

  function onScroll() {
    var vh = window.innerHeight;
    var t = clamp(window.scrollY / (vh * 0.9), 0, 1);

    // Giai đoạn 1 (0 → 0.28): chữ mờ dần, đường xé nổi lên
    var fade = clamp(t / 0.28, 0, 1);
    doorText.style.opacity = (1 - fade).toFixed(3);
    doorText.style.filter = 'blur(' + (fade * 8).toFixed(1) + 'px)';
    doorText.style.transform = 'scale(' + (1 + fade * 0.06).toFixed(3) + ')';
    var seam = (0.15 + 0.85 * fade).toFixed(3);
    doorL.style.setProperty('--seam', seam);
    doorR.style.setProperty('--seam', seam);

    // Giai đoạn 2 (0.2 → 1): hai nửa mở ra
    var o = clamp((t - 0.2) / 0.8, 0, 1);
    var e = o * o * (3 - 2 * o);
    doorL.style.transform = 'translateX(' + (-e * 106) + '%) rotate(' + (-e * 5) + 'deg)';
    doorR.style.transform = 'translateX(' + (e * 106) + '%) rotate(' + (e * 5) + 'deg)';
    var vis = t >= 1 ? 'hidden' : 'visible';
    doorL.style.visibility = vis; doorR.style.visibility = vis;
    doorText.style.visibility = fade >= 1 ? 'hidden' : 'visible';
    reveal.style.transform = 'scale(' + (1.12 - 0.12 * e) + ')';
    content.style.opacity = (0.15 + 0.85 * e).toFixed(3);
    content.style.transform = 'translateY(' + (40 * (1 - e)).toFixed(1) + 'px)';

    var max = document.documentElement.scrollHeight - vh;
    bar.style.height = (max > 0 ? clamp(window.scrollY / max, 0, 1) * 100 : 0) + '%';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 4. Hiện dần khi cuộn tới ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .fly').forEach(function (el) { io.observe(el); });

  /* ---------- 5. Video tự phát khi vào khung nhìn ---------- */
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
  }, { threshold: 0.4 });
  $$('video[data-autoplay]').forEach(function (v) { vio.observe(v); });

  // Video chính: tạm dừng khi cuộn ra khỏi khung
  var main = $('.film video');
  if (main) {
    new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) main.pause();
    }, { threshold: 0.1 }).observe(main);
  }

  /* ---------- 6. Thẻ lật ---------- */
  $$('.flip').forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    });
  });

  /* ---------- 7. Thanh kéo "hôm nay / mai sau" ---------- */
  var cmp = $('#cmp');
  if (cmp) {
    var range = $('input', cmp);
    var set = function (v) { cmp.style.setProperty('--pos', v + '%'); };
    range.addEventListener('input', function () { set(range.value); });
    set(range.value);
  }
})();
