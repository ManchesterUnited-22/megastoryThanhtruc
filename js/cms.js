/* cms.js — nội dung chỉnh được, lưu ở Supabase.
   Chạy bình thường: đọc bản ĐÃ XUẤT BẢN rồi áp lên trang.
   Mở  ?edit=1  : đăng nhập rồi chỉnh trực tiếp trên chính trang này. */
(function () {
  var CFG = window.CMS_CONFIG || {};
  if (!CFG.url || !CFG.key) return;
  var EDIT = /[?&]edit=1/.test(location.search) || localStorage.getItem('cms_edit') === '1';
  var FONTS = {
    'Be Vietnam Pro': "'Be Vietnam Pro',system-ui,sans-serif",
    'Newsreader': "'Newsreader',Georgia,serif",
    'Georgia': 'Georgia,serif',
    'Hệ thống': 'system-ui,sans-serif'
  };
  var INLINE = { B: 1, I: 1, EM: 1, STRONG: 1, MARK: 1, U: 1, BR: 1 };
  var SKIP = '.rail,.progress,#cap,.tl-map,svg,script,style,.op-door.r,#tlYear,#reveal,#cmsBar,#cmsLogin';
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var each = function (o, f) { Object.keys(o || {}).forEach(function (k) { f(k, o[k]); }); };
  var state = { t: {}, s: {}, i: {}, y: {}, c: {} };
  var sb = null, sel = null, pending = null, texts = {}, imgs = {}, imgKeys = [];
  var layers = qa('.layer');

  /* ---------- khóa (key) cho từng phần tử: đường đi trong cây HTML ---------- */
  function keyOf(el) {
    var parts = [];
    while (el && el !== document.body) {
      if (el.id) { parts.unshift('#' + el.id); break; }
      var i = 1, s = el;
      while ((s = s.previousElementSibling)) i++;
      parts.unshift(el.tagName.toLowerCase() + ':' + i);
      el = el.parentElement;
    }
    return parts.join('>');
  }
  function isLeaf(el) {
    if (el.closest(SKIP) || !/\S/.test(el.textContent)) return false;
    return Array.prototype.every.call(el.childNodes, function (n) {
      return n.nodeType === 3 || (n.nodeType === 1 && INLINE[n.tagName]);
    });
  }
  qa('body *').forEach(function (el) { if (isLeaf(el)) texts[keyOf(el)] = el; });
  if ($('reveal')) texts[keyOf($('reveal'))] = $('reveal');
  qa('img').forEach(function (im) { var k = keyOf(im); imgs[k] = im; im.dataset.orig = im.getAttribute('src') || ''; });
  imgKeys = Object.keys(imgs);

  /* ---------- an toàn: chỉ cho phép vài thẻ định dạng, bỏ mọi thuộc tính ---------- */
  function clean(html) {
    var d = new DOMParser().parseFromString('<body>' + html, 'text/html').body;
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 1) {
          walk(c);
          if (!INLINE[c.tagName]) { while (c.firstChild) n.insertBefore(c.firstChild, c); n.removeChild(c); }
          else while (c.attributes.length) c.removeAttribute(c.attributes[0].name);
        } else if (c.nodeType !== 3) n.removeChild(c);
      });
    })(d);
    return d.innerHTML;
  }
  var okUrl = function (u) { return typeof u === 'string' && (/^assets\//.test(u) || u.indexOf(CFG.url + '/storage/') === 0); };
  function ytId(u) {
    u = String(u || '').trim();
    var m = u.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : (/^[\w-]{11}$/.test(u) ? u : '');
  }

  /* ---------- áp nội dung lên trang ---------- */
  function twin(el) {   // hai cánh cửa có tiêu đề giống nhau: sửa bên trái thì chép sang bên phải
    var l = el.closest('.op-door.l'); if (!l) return null;
    return qa('*', document.querySelector('.op-door.r'))[qa('*', l).indexOf(el)] || null;
  }
  function styleEl(el, v) {
    [el, twin(el)].forEach(function (e) {
      if (!e) return;
      e.style.fontSize = /^[\d.]+rem$/.test(v.fs || '') ? v.fs : '';
      e.style.fontFamily = FONTS[v.ff] || '';
      e.style.color = /^#[0-9a-f]{3,8}$/i.test(v.c || '') ? v.c : '';
    });
  }
  function setImg(k, url) { var im = imgs[k]; if (im && okUrl(url)) { im.style.display = ''; im.src = url; } }
  function syncYT(l) {   // chỉ tải iframe YouTube khi cảnh đó đang hiện
    var f = l.querySelector('iframe.yt'); if (!f) return;
    var want = l.classList.contains('on') ? f.dataset.src : '';
    if ((f.getAttribute('src') || '') !== want) { if (want) f.src = want; else f.removeAttribute('src'); }
  }
  function setYT(l, id) {
    if (!l) return;
    var f = l.querySelector('iframe.yt'), v = l.querySelector('video');
    if (!/^[\w-]{11}$/.test(id || '')) { if (f) f.remove(); if (v) v.style.display = ''; return; }
    if (!f) {
      f = document.createElement('iframe'); f.className = 'yt';
      f.setAttribute('allow', 'autoplay; encrypted-media'); f.setAttribute('tabindex', '-1'); f.setAttribute('title', 'video');
      l.appendChild(f);
    }
    f.dataset.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&loop=1&playlist=' + id + '&controls=0&modestbranding=1&playsinline=1&rel=0';
    if (v) { v.pause(); v.style.display = 'none'; }
    syncYT(l);
  }
  layers.forEach(function (l) { new MutationObserver(function () { syncYT(l); }).observe(l, { attributes: true, attributeFilter: ['class'] }); });

  function apply(d) {
    d = d || {};
    each(d.t, function (k, v) {
      var el = texts[k]; if (!el || typeof v !== 'string') return;
      if (el.id === 'reveal') el.textContent = v; else { el.innerHTML = clean(v); var t = twin(el); if (t) t.innerHTML = el.innerHTML; }
    });
    each(d.s, function (k, v) { if (texts[k]) styleEl(texts[k], v || {}); });
    each(d.i, setImg);
    each(d.y, function (k, v) { setYT(layers[+k], v); });
    each(d.c, function (k, v) { if (layers[+k] && typeof v === 'string') layers[+k].setAttribute('data-cap', v); });
    if (window.__rebuildReveal) window.__rebuildReveal();
  }

  /* ---------- CSS thêm ---------- */
  var css = '.layer iframe.yt{position:absolute;top:50%;left:50%;width:100vw;height:56.25vw;min-height:100vh;min-width:177.78vh;transform:translate(-50%,-50%);border:0;pointer-events:none}';
  if (EDIT) css += '[contenteditable]{outline:1px dashed rgba(240,161,95,.0);cursor:text}[contenteditable]:hover{outline-color:rgba(240,161,95,.7)}[contenteditable]:focus{outline:2px solid #f0a15f}' +
    '#cmsBar,#cmsLogin form{font:13px/1.4 system-ui,sans-serif;color:#222;background:#fff;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.45)}' +
    '#cmsBar{position:fixed;top:12px;right:12px;width:270px;max-height:92vh;overflow:auto;z-index:99999;padding:12px}' +
    '#cmsBar h4{margin:12px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#777}#cmsBar h4:first-child{margin-top:0}' +
    '#cmsBar button,#cmsLogin button{font:inherit;padding:5px 9px;margin:2px 2px 2px 0;border:1px solid #bbb;border-radius:6px;background:#f4f4f4;cursor:pointer;color:#222}' +
    '#cmsBar button.p{background:#d9482b;border-color:#d9482b;color:#fff}#cmsBar input,#cmsBar select,#cmsLogin input{font:inherit;padding:4px;margin:2px 0;max-width:100%;box-sizing:border-box}' +
    '#cmsBar .r{display:flex;align-items:center;gap:4px;padding:3px 0;border-bottom:1px solid #eee}#cmsBar .r span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#cmsMsg{margin-top:6px;color:#b33}#cmsLogin{position:fixed;inset:0;z-index:99999;background:rgba(10,6,4,.9);display:flex;align-items:center;justify-content:center}' +
    '#cmsLogin form{display:flex;flex-direction:column;gap:8px;padding:22px;width:300px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- CHẠY BÌNH THƯỜNG: đọc bản đã xuất bản ---------- */
  function loadPublished() {
    try { apply(JSON.parse(localStorage.getItem('cms_pub'))); } catch (e) {}
    var ctl = new AbortController(); setTimeout(function () { ctl.abort(); }, 5000);
    fetch(CFG.url + '/rest/v1/site_content?id=eq.published&select=data', {
      headers: { apikey: CFG.key, Authorization: 'Bearer ' + CFG.key }, signal: ctl.signal
    }).then(function (r) { return r.json(); }).then(function (rows) {
      var d = rows && rows[0] && rows[0].data;
      if (d && Object.keys(d).length) { apply(d); try { localStorage.setItem('cms_pub', JSON.stringify(d)); } catch (e) {} }
    }).catch(function () {});
  }

  /* ---------- CHẾ ĐỘ EDIT ---------- */
  function msg(t) { if ($('cmsMsg')) $('cmsMsg').textContent = t || ''; }
  function dirty() { msg('Chưa lưu · bấm "Lưu nháp"'); }
  function startEdit() {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
    s.onload = function () {
      sb = supabase.createClient(CFG.url, CFG.key);
      sb.auth.getSession().then(function (r) { if (r.data.session) begin(); else login(); });
    };
    document.head.appendChild(s);
  }
    function login() {
    var d = document.createElement('div'); d.id = 'cmsLogin';
    d.innerHTML = '<form><b>Đăng nhập để chỉnh sửa</b><button type="button">Đăng nhập bằng Google</button><small></small></form>';
    d.querySelector('button').onclick = function () {
      try { localStorage.setItem('cms_edit', '1'); } catch (e) {}
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r.error) d.querySelector('small').textContent = 'Không đăng nhập được: ' + r.error.message;
      });
    };
    document.body.appendChild(d);
  }
    function begin() {
    try { localStorage.removeItem('cms_edit'); } catch (e) {}
    history.replaceState(null, '', location.pathname + '?edit=1');
    sb.from('site_content').select('id,data').then(function (r) {
      var rows = {}; (r.data || []).forEach(function (x) { rows[x.id] = x.data; });
      if (!rows.draft) {
        alert('Tài khoản này không có quyền chỉnh sửa.');
        sb.auth.signOut().then(function () { location.href = location.pathname; });
        return;
      }
      var d = rows.draft && Object.keys(rows.draft).length ? rows.draft : rows.published;
      state = { t: {}, s: {}, i: {}, y: {}, c: {} };
      each(d, function (k, v) { state[k] = v; });
      apply(state); buildUI(); makeEditable();
    });
  }
  function shrink(file) {   // thu ảnh về tối đa 2200px, đổi sang WebP cho nhẹ
    return createImageBitmap(file).then(function (b) {
      var s = Math.min(1, 2200 / Math.max(b.width, b.height)), c = document.createElement('canvas');
      c.width = Math.round(b.width * s); c.height = Math.round(b.height * s);
      c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(res, 'image/webp', 0.86); });
    });
  }
  function save(id) {
    msg('Đang lưu…');
    return sb.from('site_content').update({ data: state, updated_at: new Date().toISOString() }).eq('id', id).select().then(function (r) {
      if (r.error || !r.data || !r.data.length) { msg('Lỗi: không lưu được (' + ((r.error && r.error.message) || 'không có quyền') + ')'); return false; }
      return true;
    });
  }
  function hex(c) { return '#' + (c.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(function (n) { return ('0' + (+n).toString(16)).slice(-2); }).join(''); }
  function syncCtl() {
    var el = texts[sel], v = state.s[sel] || {}, cs = getComputedStyle(el);
    $('cmsLbl').textContent = (el.textContent || '').trim().slice(0, 30);
    $('cmsFs').value = v.fs ? parseFloat(v.fs) : (parseFloat(cs.fontSize) / 16).toFixed(2);
    $('cmsFf').value = v.ff || '';
    $('cmsC').value = v.c || hex(cs.color);
  }
  function setStyle(key, val) {
    if (!sel) return;
    var v = state.s[sel] = state.s[sel] || {};
    v[key] = val; styleEl(texts[sel], v); dirty();
  }
  function buildUI() {
    var o = $('opening'); if (o) o.classList.add('open');
    var b = document.createElement('div'); b.id = 'cmsBar';
    var fonts = '<option value="">(giữ nguyên)</option>' + Object.keys(FONTS).map(function (f) { return '<option>' + f + '</option>'; }).join('');
    var rows = layers.map(function (l, k) {
      return '<div class="r"><span>Nền cảnh ' + (k + 1) + '</span><button data-yt="' + k + '">YouTube</button><button data-cap="' + k + '">Chú thích</button></div>';
    }).join('') + imgKeys.map(function (k, n) {
      return '<div class="r"><span>' + ((imgs[k].dataset.orig || '').split('/').pop() || 'ảnh') + '</span><button data-img="' + n + '">Đổi ảnh</button></div>';
    }).join('');
    b.innerHTML = '<h4>Lưu</h4><button id="cmsSave">Lưu nháp</button><button id="cmsPub" class="p">Xuất bản</button><button id="cmsDis">Hủy nháp</button><button id="cmsOut">Thoát</button><button id="cmsDoor">Đóng/mở cửa</button><div id="cmsMsg"></div>' +
      '<h4>Chữ đang chọn</h4><div id="cmsLbl">(bấm vào một đoạn chữ trên trang)</div>' +
      'Cỡ chữ (rem) <input id="cmsFs" type="number" step="0.05" min="0.5" max="12" style="width:70px"><br>Phông <select id="cmsFf">' + fonts + '</select><br>Màu <input id="cmsC" type="color"> <button id="cmsRs">Đặt lại kiểu</button>' +
      '<h4>Ảnh &amp; video</h4>' + rows + '<input id="cmsFile" type="file" accept="image/*" hidden>';
    document.body.appendChild(b);
    $('cmsFs').oninput = function () { setStyle('fs', this.value ? this.value + 'rem' : ''); };
    $('cmsFf').onchange = function () { setStyle('ff', this.value); };
    $('cmsC').oninput = function () { setStyle('c', this.value); };
    $('cmsRs').onclick = function () { if (sel) { delete state.s[sel]; styleEl(texts[sel], {}); syncCtl(); dirty(); } };
    $('cmsDoor').onclick = function () { if (o) o.classList.toggle('open'); };
    $('cmsSave').onclick = function () { save('draft').then(function (ok) { if (ok) msg('Đã lưu nháp ✔'); }); };
    $('cmsPub').onclick = function () {
      if (!confirm('Xuất bản: mọi người đọc sẽ thấy ngay. Tiếp tục?')) return;
      save('draft').then(function (ok) { return ok && save('published'); }).then(function (ok) { if (ok) msg('Đã xuất bản ✔'); });
    };
    $('cmsDis').onclick = function () {
      if (!confirm('Bỏ bản nháp và quay về bản đã xuất bản?')) return;
      sb.from('site_content').select('data').eq('id', 'published').single().then(function (r) {
        return sb.from('site_content').update({ data: r.data.data }).eq('id', 'draft');
      }).then(function () { location.reload(); });
    };
    $('cmsOut').onclick = function () { sb.auth.signOut().then(function () { location.href = location.pathname; }); };
    b.onclick = function (e) {
      var t = e.target;
      if (t.dataset.img) { pending = imgKeys[+t.dataset.img]; $('cmsFile').value = ''; $('cmsFile').click(); }
      if (t.dataset.yt) {
        var k = t.dataset.yt, cur = state.y[k] ? 'https://youtu.be/' + state.y[k] : '';
        var u = prompt('Dán link YouTube cho cảnh nền này (để trống = bỏ video YouTube):', cur);
        if (u === null) return;
        var id = ytId(u);
        if (u && !id) { msg('Link YouTube không hợp lệ'); return; }
        if (id) state.y[k] = id; else delete state.y[k];
        setYT(layers[+k], id); dirty();
      }
      if (t.dataset.cap) {
        var c = prompt('Chú thích hiện ở góc dưới khi cảnh này hiển thị:', layers[+t.dataset.cap].getAttribute('data-cap') || '');
        if (c === null) return;
        state.c[t.dataset.cap] = c; layers[+t.dataset.cap].setAttribute('data-cap', c); dirty();
      }
    };
    $('cmsFile').onchange = function () {
      var f = this.files[0]; if (!f) return; msg('Đang tải ảnh lên…');
      shrink(f).then(function (blob) {
        var path = 'img/' + Date.now() + '.webp';
        return sb.storage.from('media').upload(path, blob, { contentType: 'image/webp' }).then(function (r) {
          if (r.error) throw r.error;
          var url = sb.storage.from('media').getPublicUrl(path).data.publicUrl;
          state.i[pending] = url; setImg(pending, url); dirty();
        });
      }).catch(function (e) { msg('Lỗi tải ảnh: ' + (e.message || e)); });
    };
  }
  function makeEditable() {
    each(texts, function (k, el) {
      el.contentEditable = 'true'; el.spellcheck = false;
      el.addEventListener('focus', function () { sel = k; syncCtl(); });
      el.addEventListener('input', function () {
        state.t[k] = el.id === 'reveal' ? el.textContent : clean(el.innerHTML);
        var t = twin(el); if (t) t.innerHTML = state.t[k];
        dirty();
      });
      el.addEventListener('blur', function () { if (el.id === 'reveal' && window.__rebuildReveal) window.__rebuildReveal(); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); } });
      el.addEventListener('paste', function (e) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
    });
    document.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && !a.closest('#cmsBar')) e.preventDefault(); }, true);
  }

  if (EDIT) startEdit(); else loadPublished();
})();