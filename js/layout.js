/* layout.js — chèn ảnh / video / YouTube ở mọi vị trí; đổi chỗ, độ rộng, căn lề;
   chỉnh vị trí & độ rộng thẻ chữ. Nạp TRƯỚC cms.js.
   Trang thường: chỉ hiển thị. Trang ?edit=1: có công cụ chỉnh. Mọi thứ nằm trong dòng chảy
   của trang (không dùng position tuyệt đối) nên không bao giờ đè lên nhau. */
(function () {
  var X = null, blocks = {}, cardEls = {}, secs = [];
  var ALIGN = ['left', 'center', 'right'];
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var S = function () { return X.state(); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  var css = '.cmsBlk{position:relative;z-index:3;display:flex;padding:5vh clamp(1.2rem,6vw,6rem)}' +
    '.cmsBlk[data-a=left]{justify-content:flex-start}.cmsBlk[data-a=center]{justify-content:center}.cmsBlk[data-a=right]{justify-content:flex-end}' +
    '.cmsM{margin:0;position:relative;max-width:100%}' +
    '.cmsM>img,.cmsM>video{display:block;width:100%;height:auto;border-radius:3px;box-shadow:0 10px 40px rgba(0,0,0,.45)}' +
    '.cmsM .yt16{position:relative;padding-top:56.25%;border-radius:3px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.45)}' +
    '.cmsM .yt16 iframe{position:absolute;inset:0;width:100%;height:100%;border:0}' +
    '.cmsM figcaption{margin-top:.6rem;font-size:.85rem;font-style:italic;opacity:.85}.cmsM figcaption:empty{display:none}' +
    '.step.cmsT{align-items:flex-start}.step.cmsB{align-items:flex-end}' +
    '@media(max-width:700px){.cmsM{width:100%!important}}';
  var cssEdit = '.card{position:relative}' +
    '.cmsTb,.cmsCt{font:12px/1 system-ui,sans-serif;background:#fff;color:#222;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.45);padding:4px;display:flex;gap:3px;align-items:center;z-index:50}' +
    '.cmsTb{position:absolute;left:8px;top:8px;opacity:.93}' +
    '.cmsCt{position:absolute;right:0;top:-38px;opacity:0;transition:opacity .15s}.card:hover>.cmsCt,.cmsCt:focus-within{opacity:1}' +
    '.cmsTb button,.cmsCt button{font:inherit;padding:5px 7px;border:1px solid #bbb;border-radius:5px;background:#f4f4f4;cursor:pointer;color:#222}' +
    '.cmsTb button[data-x=drag]{cursor:grab;touch-action:none}.cmsTb button.on{background:#f0a15f}.cmsTb input,.cmsCt input{width:70px;margin:0}.cmsCt i{width:1px;height:16px;background:#ccc}' +
    '.cmsM figcaption:empty{display:block}.cmsM figcaption:empty::before{content:"Bấm để nhập chú thích";opacity:.5}.cmsM figcaption{outline:none}.cmsM figcaption:focus{outline:2px solid #f0a15f}' +
    '#cmsDrop{position:fixed;left:0;right:0;height:4px;margin-top:-2px;background:#f0a15f;box-shadow:0 0 0 2px rgba(0,0,0,.5);z-index:99998;pointer-events:none;display:none}' +
    'body.cmsDragging,body.cmsDragging *{cursor:grabbing!important;user-select:none}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- khởi tạo: ghi nhớ khóa của mọi khối & thẻ chữ TRƯỚC khi DOM bị đổi ---------- */
  window.CMSX_init = function (api) {
    X = api;
    if (X.EDIT) st.textContent += cssEdit;
    qa('section.chapter').forEach(function (sec) {
      sec._k = X.keyOf(sec); blocks['^' + sec._k] = sec; secs.push({ el: sec, k: sec._k });
      Array.prototype.forEach.call(sec.children, function (c) { c._k = X.keyOf(c); blocks[c._k] = c; });
    });
    qa('.card').forEach(function (c) {
      c._k = X.keyOf(c); cardEls[c._k] = c;
      var h = c.closest('.step');
      if (h) h.dataset.o = ALIGN.filter(function (a) { return h.classList.contains(a); })[0] || '';
    });
  };

  /* ---------- dựng một khối ảnh / video ---------- */
  function build(it) {
    var d = document.createElement('div'); d.className = 'cmsBlk'; d._it = it;
    d.dataset.a = ALIGN.indexOf(it.a) >= 0 ? it.a : 'center';
    var f = document.createElement('figure'); f.className = 'cmsM';
    f.style.width = Math.min(100, Math.max(10, +it.w || 60)) + '%';
    var m;
    if (it.t === 'y') {
      m = document.createElement('div'); m.className = 'yt16';
      var fr = document.createElement('iframe');
      fr.src = 'https://www.youtube-nocookie.com/embed/' + it.u + '?rel=0&modestbranding=1';
      fr.setAttribute('allow', 'encrypted-media; fullscreen'); fr.setAttribute('allowfullscreen', ''); fr.title = 'video';
      m.appendChild(fr);
    } else if (it.t === 'v') {
      m = document.createElement('video'); m.src = it.u; m.setAttribute('playsinline', ''); m.preload = 'metadata';
      if (it.L) { m.muted = true; m.setAttribute('muted', ''); m.loop = true; m.autoplay = true; } else m.controls = true;
    } else {
      m = document.createElement('img'); m.src = it.u; m.alt = it.c || ''; m.loading = 'lazy';
    }
    f.appendChild(m);
    var cp = document.createElement('figcaption'); cp.textContent = it.c || ''; f.appendChild(cp);
    d.appendChild(f);
    if (X.EDIT) toolbar(it, d, f, cp);
    return d;
  }
  function valid(it) {
    if (!it || !blocks[it.k]) return false;
    if (it.t === 'y') return /^[\w-]{11}$/.test(it.u || '');
    return (it.t === 'i' || it.t === 'v') && X.okUrl(it.u);
  }

  /* ---------- vẽ lại toàn bộ khối đã chèn theo danh sách ---------- */
  function render(list) {
    qa('.cmsBlk').forEach(function (e) { e.remove(); });
    var last = {};
    (list || []).forEach(function (it) {
      if (!valid(it)) return;
      var node = build(it), anc = blocks[it.k], ref = last[it.k];
      if (!ref) {
        if (it.k.charAt(0) === '^') anc.insertBefore(node, anc.firstChild);   // đầu phần
        else anc.parentNode.insertBefore(node, anc.nextSibling);              // ngay sau khối gốc
      } else ref.parentNode.insertBefore(node, ref.nextSibling);
      last[it.k] = node;
    });
  }

  /* ---------- thẻ chữ: độ rộng + căn lề + vị trí dọc ---------- */
  function applyCard(k, v) {
    var c = cardEls[k]; if (!c) return;
    v = v || {};
    c.style.width = /^[\d.]+$/.test(String(v.w || '')) && v.w >= 10 && v.w <= 90 ? 'min(' + v.w + 'rem,100%)' : '';
    var h = c.closest('.step'); if (!h) return;
    h.classList.remove('left', 'center', 'right', 'cmsT', 'cmsB');
    var a = ALIGN.indexOf(v.a) >= 0 ? v.a : h.dataset.o;
    if (a) h.classList.add(a);
    if (v.v === 't') h.classList.add('cmsT'); else if (v.v === 'b') h.classList.add('cmsB');
  }
  window.CMSX_apply = function (d) {
    d = d || {};
    render(d.m);
    Object.keys(cardEls).forEach(function (k) { applyCard(k, (d.k || {})[k]); });
  };

  /* ---------- các "khe" giữa các khối, theo thứ tự trên trang ---------- */
  function bounds() {
    var out = [];
    secs.forEach(function (s) {
      var kids = Array.prototype.slice.call(s.el.children);
      out.push({ k: '^' + s.k, ref: null, el: kids[0], edge: 'top', node: null });
      kids.forEach(function (c) {
        out.push(c._it ? { k: c._it.k, ref: c._it, el: c, edge: 'bottom', node: c }
                       : { k: c._k, ref: null, el: c, edge: 'bottom', node: c });
      });
    });
    return out;
  }
  function place(it, b) {
    var arr = S().m; arr.splice(arr.indexOf(it), 1);
    var idx;
    if (b.ref) idx = arr.indexOf(b.ref) + 1;
    else { idx = -1; arr.forEach(function (x, i) { if (idx < 0 && x.k === b.k) idx = i; }); if (idx < 0) idx = arr.length; }
    it.k = b.k; arr.splice(idx, 0, it);
  }
  function stepMove(it, node, dir) {
    var all = bounds(), i = -1;
    all.forEach(function (b, j) { if (b.node === node) i = j; });
    var t = all[dir < 0 ? i - 2 : i + 1];
    if (!t) { X.msg(dir < 0 ? 'Đã ở đầu trang' : 'Đã ở cuối trang'); return; }
    place(it, t); render(S().m); X.dirty(); focusNode(it);
  }
  function focusNode(it) {
    var n = qa('.cmsBlk').filter(function (e) { return e._it === it; })[0];
    if (n) n.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---------- kéo thả để chuyển chỗ ---------- */
  function startDrag(it, node, ev) {
    ev.preventDefault();
    var bar = document.createElement('div'); bar.id = 'cmsDrop'; document.body.appendChild(bar);
    document.body.classList.add('cmsDragging'); node.style.opacity = '.35';
    var y = ev.clientY, best = null, raf = 0;
    function pick() {
      var all = bounds(), i = -1;
      all.forEach(function (b, j) { if (b.node === node) i = j; });
      var bd = 1e9; best = null;
      all.forEach(function (b, j) {
        if (j === i || j === i - 1 || !b.el) return;     // bỏ 2 khe sát khối đang kéo
        var r = b.el.getBoundingClientRect(), yy = b.edge === 'top' ? r.top : r.bottom, dd = Math.abs(yy - y);
        if (dd < bd) { bd = dd; best = b; best.y = yy; }
      });
      if (best) { bar.style.top = best.y + 'px'; bar.style.display = 'block'; }
    }
    function tick() {
      if (y < 90) window.scrollBy(0, -16); else if (y > innerHeight - 90) window.scrollBy(0, 16);
      pick(); raf = requestAnimationFrame(tick);
    }
    function mv(e) { y = e.clientY; }
    function up() {
      cancelAnimationFrame(raf); window.removeEventListener('pointermove', mv);
      bar.remove(); document.body.classList.remove('cmsDragging'); node.style.opacity = '';
      if (best) { place(it, best); render(S().m); X.dirty(); focusNode(it); }
    }
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('pointercancel', up, { once: true });
    tick();
  }

  /* ---------- thanh công cụ trên mỗi ảnh / video ---------- */
  function toolbar(it, d, f, cp) {
    var tb = document.createElement('div'); tb.className = 'cmsTb';
    tb.innerHTML = '<button type="button" data-x="drag" title="Giữ và kéo để chuyển chỗ">✥</button>' +
      '<button type="button" data-x="up" title="Lên một khe">↑</button><button type="button" data-x="dn" title="Xuống một khe">↓</button>' +
      '<button type="button" data-x="left" title="Căn trái">◧</button><button type="button" data-x="center" title="Căn giữa">▣</button><button type="button" data-x="right" title="Căn phải">◨</button>' +
      (it.t === 'v' ? '<button type="button" data-x="loop" title="Tự phát, lặp, tắt tiếng">🔁</button>' : '') +
      '<input type="range" min="15" max="100" title="Độ rộng"><button type="button" data-x="del" title="Xóa">✕</button>';
    var rg = tb.querySelector('input'); rg.value = Math.min(100, Math.max(15, +it.w || 60));
    var loop = tb.querySelector('[data-x=loop]'); if (loop && it.L) loop.className = 'on';
    rg.oninput = function () { it.w = +rg.value; f.style.width = it.w + '%'; X.dirty(); };
    tb.onclick = function (e) {
      var x = e.target.dataset && e.target.dataset.x; if (!x || x === 'drag') return;
      if (x === 'up') stepMove(it, d, -1);
      else if (x === 'dn') stepMove(it, d, 1);
      else if (ALIGN.indexOf(x) >= 0) { it.a = x; d.dataset.a = x; X.dirty(); }
      else if (x === 'loop') { it.L = it.L ? 0 : 1; render(S().m); X.dirty(); }
      else if (x === 'del') {
        if (!confirm('Xóa mục này khỏi trang?')) return;
        S().m.splice(S().m.indexOf(it), 1); render(S().m); X.dirty();
      }
    };
    tb.querySelector('[data-x=drag]').addEventListener('pointerdown', function (e) { startDrag(it, d, e); });
    f.appendChild(tb);
    cp.contentEditable = 'true'; cp.spellcheck = false;
    cp.addEventListener('input', function () { it.c = cp.textContent; var im = f.querySelector('img'); if (im) im.alt = it.c; X.dirty(); });
    cp.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    cp.addEventListener('paste', function (e) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
  }

  /* ---------- phần giao diện trong thanh công cụ bên phải ---------- */
  function secName(el) {
    var a = document.querySelector('#rail a[href="#' + el.id + '"] span');
    return a ? a.textContent : (el.id || 'Phần');
  }
  function snip(c) {
    var t = (c.textContent || '').replace(/\s+/g, ' ').trim();
    return t ? t.slice(0, 34) + (t.length > 34 ? '…' : '') : (c.id || c.className || 'khối');
  }
  function centerKey() {
    var mid = innerHeight / 2, best = null, bd = 1e9;
    qa('section.chapter > *').forEach(function (c) {
      if (!c._k) return;
      var r = c.getBoundingClientRect();
      var dd = (mid >= r.top && mid <= r.bottom) ? 0 : Math.min(Math.abs(mid - r.top), Math.abs(mid - r.bottom));
      if (dd < bd) { bd = dd; best = c._k; }
    });
    return best;
  }
  function upload(file, isVid) {
    var sb = X.sb(), ext = isVid ? ((file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4') : 'webp';
    var path = (isVid ? 'vid/' : 'img/') + Date.now() + '.' + ext;
    return (isVid ? Promise.resolve(file) : X.shrink(file)).then(function (blob) {
      return sb.storage.from('media').upload(path, blob, { contentType: isVid ? (file.type || 'video/mp4') : 'image/webp' });
    }).then(function (r) {
      if (r.error) throw r.error;
      return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
    });
  }
  window.CMSX_ui = function (bar) {
    var box = document.createElement('div');
    var opt = '<option value="">Chỗ đang xem trên màn hình</option>';
    secs.forEach(function (s) {
      opt += '<optgroup label="' + esc(secName(s.el)) + '"><option value="' + esc('^' + s.k) + '">Đầu phần này</option>';
      Array.prototype.forEach.call(s.el.children, function (c) {
        if (c._k) opt += '<option value="' + esc(c._k) + '">Sau: ' + esc(snip(c)) + '</option>';
      });
      opt += '</optgroup>';
    });
    box.innerHTML = '<h4>Chèn ảnh / video</h4>Vị trí chèn<br><select id="cmsSlot" style="width:100%">' + opt + '</select><br>' +
      '<button type="button" id="cmsAddImg" class="p">🖼️ Ảnh</button><button type="button" id="cmsAddVid" class="p">🎬 Video</button><button type="button" id="cmsAddYt" class="p">▶ YouTube</button>' +
      '<input id="cmsAddFile" type="file" hidden>' +
      '<div style="margin-top:6px;color:#777">Sau khi chèn: ✥ kéo để chuyển chỗ, ↑↓ nhích từng khe, ◧▣◨ căn lề, thanh trượt đổi độ rộng. Rê chuột vào thẻ chữ để chỉnh vị trí/độ rộng thẻ.</div>';
    bar.insertBefore(box, bar.querySelectorAll('h4')[1] || null);   // ngay dưới nhóm nút Lưu
    var $ = function (id) { return document.getElementById(id); }, kind = 'i';
    function add(base) {
      var arr = S().m = S().m || [];
      var it = { t: 'i', u: '', c: '', w: 60, a: 'center', k: $('cmsSlot').value || centerKey() };
      for (var p in base) it[p] = base[p];
      arr.push(it); render(arr); X.dirty(); focusNode(it);
    }
    $('cmsAddImg').onclick = function () { kind = 'i'; $('cmsAddFile').accept = 'image/*'; $('cmsAddFile').value = ''; $('cmsAddFile').click(); };
    $('cmsAddVid').onclick = function () { kind = 'v'; $('cmsAddFile').accept = 'video/mp4,video/webm,video/quicktime'; $('cmsAddFile').value = ''; $('cmsAddFile').click(); };
    $('cmsAddYt').onclick = function () {
      var u = prompt('Dán link YouTube:'); if (!u) return;
      var id = X.ytId(u); if (!id) { X.msg('Link YouTube không hợp lệ'); return; }
      add({ t: 'y', u: id, w: 70 });
    };
    $('cmsAddFile').onchange = function () {
      var f = this.files[0]; if (!f) return;
      if (kind === 'v' && f.size > 50 * 1024 * 1024) { X.msg('Video quá lớn (tối đa 50MB). Nén lại hoặc dùng YouTube.'); return; }
      X.msg('Đang tải lên…');
      upload(f, kind === 'v').then(function (url) { add({ t: kind, u: url }); X.msg(''); })
        .catch(function (e) { X.msg('Lỗi tải lên: ' + (e.message || e)); });
    };

    /* thanh chỉnh cho từng thẻ chữ */
    qa('.card').forEach(function (c) {
      var k = c._k, tb = document.createElement('div'); tb.className = 'cmsCt';
      tb.innerHTML = '<button type="button" data-a="left" title="Căn trái">◧</button><button type="button" data-a="center" title="Căn giữa">▣</button><button type="button" data-a="right" title="Căn phải">◨</button><i></i>' +
        '<button type="button" data-v="t" title="Lên trên">⤒</button><button type="button" data-v="m" title="Giữa">↕</button><button type="button" data-v="b" title="Xuống dưới">⤓</button><i></i>' +
        '<input type="range" min="16" max="70" title="Độ rộng"><button type="button" data-r="1" title="Đặt lại">⟲</button>';
      var rg = tb.querySelector('input'); rg.value = Math.round(parseFloat(getComputedStyle(c).width) / 16) || 34;
      function cur() { var K = S().k = S().k || {}; return (K[k] = K[k] || {}); }
      rg.oninput = function () { cur().w = +rg.value; applyCard(k, cur()); X.dirty(); };
      tb.onclick = function (e) {
        var t = e.target; if (t.tagName !== 'BUTTON') return;
        if (t.dataset.a) cur().a = t.dataset.a;
        else if (t.dataset.v) { if (t.dataset.v === 'm') delete cur().v; else cur().v = t.dataset.v; }
        else if (t.dataset.r) { delete S().k[k]; rg.value = 34; c.style.width = ''; }
        applyCard(k, (S().k || {})[k]); X.dirty();
      };
      c.appendChild(tb);
    });
  };
})();