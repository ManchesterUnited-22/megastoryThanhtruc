/* js/editor.js — Chỉnh sửa trực quan: bấm vào bất kỳ chỗ nào để sửa */
(() => {
  // Gỡ bảng trắng cũ ("Lưu nháp / Xuất bản...") + nút tròn bật bảng
  function killOldPanel() {
    try {
      const main = document.querySelector('main');
      const btn = [...document.querySelectorAll('button,a,div,span,label')]
        .find(e => !e.closest('#ed-ui') && e.children.length === 0 && e.textContent.trim() === 'Lưu nháp');
      if (btn) {
        let p = btn;
        while (p.parentElement && p.parentElement !== document.body &&
               !p.parentElement.contains(main) && getComputedStyle(p).position !== 'fixed') p = p.parentElement;
        p.remove();
      }
      document.querySelectorAll('body > *').forEach(el => {
        if (el.closest('#ed-ui') || el.getAttribute('aria-hidden') === 'true') return;
        if (getComputedStyle(el).position !== 'fixed') return;
        const r = el.getBoundingClientRect();
        if (r.width && r.width <= 70 && r.height <= 70 && r.right > innerWidth - 80 &&
            /tool|panel|edit|admin|toggle|fab|gear/i.test(el.id + ' ' + el.className)) el.remove();
      });
    } catch (err) { /* bỏ qua */ }
  }
  killOldPanel();
  const mo = new MutationObserver(killOldPanel);
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => mo.disconnect(), 10000);

  // Chỉ hiện khi mở local (file://, localhost) hoặc thêm ?edit vào địa chỉ. Người xem web thật không thấy.
  
const dev =
  /[?&]edit(?:=1|&|$)/.test(location.search) ||
  location.protocol === 'file:' ||
  ['localhost', '127.0.0.1'].includes(location.hostname) ||
  localStorage.getItem('cms_edit') === '1';

if (!dev) return;


  const FONTS = [
    ['Font gốc', ''],
    ['Be Vietnam Pro', "'Be Vietnam Pro',sans-serif"],
    ['Newsreader', "'Newsreader',serif"],
    ['Playfair Display', "'Playfair Display',serif"],
    ['Lora', "'Lora',serif"],
    ['Merriweather', "'Merriweather',serif"],
    ['Montserrat', "'Montserrat',sans-serif"],
    ['Roboto', "'Roboto',sans-serif"],
    ['Oswald', "'Oswald',sans-serif"],
    ['Georgia', 'Georgia,serif'],
    ['Arial', 'Arial,sans-serif'],
  ];
  const TEXT_BLOCK = 'p,h1,h2,h3,h4,h5,h6,blockquote,figcaption,li,.tag,.kick,.numeral,.eyebrow,.cue,.hero-cap,small,label,button';
  const MEDIA_SEL = 'img,video,iframe';

  // ---------- Font + CSS ----------
  const fl = document.createElement('link');
  fl.id = 'ed-fonts'; fl.rel = 'stylesheet';
  fl.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;700&family=Roboto:wght@400;700&family=Oswald:wght@400;700&display=swap';
  document.head.appendChild(fl);

  const st = document.createElement('style');
  st.id = 'ed-style';
  st.textContent = `
  #ed-ui,#ed-ui *{box-sizing:border-box;font:13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:0;text-transform:none}
  #ed-toggle{position:fixed;right:16px;bottom:16px;z-index:2147483600;padding:10px 16px;border:0;border-radius:999px;background:#2f7df6;color:#fff;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)}
  #ed-bar{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483600;display:none;flex-wrap:wrap;align-items:center;gap:6px 10px;max-width:calc(100vw - 20px);padding:8px 10px;background:#1b1b1f;color:#eee;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.45)}
  body.ed-on #ed-bar{display:flex}
  #ed-bar .g{display:inline-flex;align-items:center;gap:4px;padding-left:10px;border-left:1px solid #3a3a42}
  #ed-bar button,#ed-bar select,#ed-bar input[type=number]{height:28px;padding:0 8px;border:1px solid #44444d;border-radius:6px;background:#2a2a31;color:#eee;cursor:pointer}
  #ed-bar button:hover{background:#3a3a45}
  #ed-bar button.main{background:#2f7df6;border-color:#2f7df6;color:#fff;font-weight:600}
  #ed-bar input[type=number]{width:56px;cursor:text}
  #ed-bar input[type=color]{width:30px;height:28px;padding:0;border:1px solid #44444d;border-radius:6px;background:none;cursor:pointer}
  #ed-name{font-weight:600;color:#7db4ff;min-width:90px}
  #ed-hint{color:#9a9aa5;font-size:12px}
  #ed-box{position:fixed;display:none;z-index:2147483500;pointer-events:none;border:2px solid #2f7df6}
  #ed-tag{position:absolute;left:-2px;top:-22px;padding:2px 6px;border-radius:4px 4px 0 0;background:#2f7df6;color:#fff;font-size:11px;white-space:nowrap}
  .ed-h{position:absolute;width:12px;height:12px;background:#fff;border:2px solid #2f7df6;border-radius:3px;pointer-events:auto}
  .ed-h[data-d=nw]{left:-7px;top:-7px;cursor:nwse-resize}.ed-h[data-d=n]{left:calc(50% - 6px);top:-7px;cursor:ns-resize}
  .ed-h[data-d=ne]{right:-7px;top:-7px;cursor:nesw-resize}.ed-h[data-d=e]{right:-7px;top:calc(50% - 6px);cursor:ew-resize}
  .ed-h[data-d=se]{right:-7px;bottom:-7px;cursor:nwse-resize}.ed-h[data-d=s]{left:calc(50% - 6px);bottom:-7px;cursor:ns-resize}
  .ed-h[data-d=sw]{left:-7px;bottom:-7px;cursor:nesw-resize}.ed-h[data-d=w]{left:-7px;top:calc(50% - 6px);cursor:ew-resize}
  #ed-hover{position:fixed;display:none;z-index:2147483400;pointer-events:none;border:1px dashed #7db4ff}
  #ed-menu{position:fixed;display:none;gap:6px;padding:6px;background:#1b1b1f;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.5)}
  #ed-menu button{height:32px;padding:0 12px;border:0;border-radius:6px;background:#2f7df6;color:#fff;font-weight:600;cursor:pointer}
  #ed-menu button[data-k=x]{background:#44444d}
  .ed-dbtn{height:34px;padding:0 14px;border:0;border-radius:8px;background:#2f7df6;color:#fff;font-weight:600;cursor:pointer}
  .ed-dbtn.alt{background:#3a3a45}
  body.ed-on{-webkit-user-select:none;user-select:none}
  body.ed-on .rail{display:none!important}
  body.ed-on .rv{opacity:1!important;transform:none!important;filter:none!important;visibility:visible!important}
  body.ed-on iframe{pointer-events:none!important}
  body.ed-on [contenteditable=true]{-webkit-user-select:text;user-select:text;outline:2px dashed #ffb020;outline-offset:3px;cursor:text}
  `;
  document.head.appendChild(st);

  // ---------- Giao diện ----------
  const ui = document.createElement('div');
  ui.id = 'ed-ui';
  ui.innerHTML = `
  <button id="ed-toggle">✎ Chỉnh sửa</button>
  <div id="ed-bar">
    <span id="ed-name">Chưa chọn</span>
    <span id="ed-hint">Bấm vào bất kỳ chỗ nào · kéo để di chuyển · kéo chấm trắng để đổi kích thước · bấm đúp để sửa chữ / thay ảnh, video</span>
    <span class="g" id="g-text">
      <select id="ed-font"></select>
      <input id="ed-size" type="number" min="8" max="400" title="Cỡ chữ (px)">
      <input id="ed-color" type="color" title="Màu chữ">
      <button id="ed-b" title="In đậm"><b>B</b></button>
      <button id="ed-i" title="In nghiêng"><i>I</i></button>
      <button data-al="left">Trái</button><button data-al="center">Giữa</button><button data-al="right">Phải</button>
      <button id="ed-edit">Sửa chữ</button>
    </span>
    <span class="g" id="g-media">
      <button id="ed-replace">Thay ảnh / video / link YouTube</button>
      <select id="ed-fit"><option value="cover">Phủ kín khung</option><option value="contain">Vừa khung</option></select>
    </span>
    <span class="g">
      <button id="ed-draw" class="main">＋ Chèn (kéo vùng)</button>
      <button id="ed-reset" title="Xóa vị trí/kích thước đã chỉnh">Đặt lại</button>
      <button id="ed-del">Xóa</button>
      <button id="ed-undo" title="Ctrl+Z">↶ Hoàn tác</button>
      <button id="ed-save">⬇ Xuất file</button>
    </span>
  </div>
  <div id="ed-hover"></div>
  <div id="ed-box"><div id="ed-tag"></div>
    ${['nw','n','ne','e','se','s','sw','w'].map(d => `<div class="ed-h" data-d="${d}"></div>`).join('')}
  </div>
  <input type="file" id="ed-file" hidden>`;
  document.body.appendChild(ui);

  const $ = id => document.getElementById(id);
  const bar = $('ed-bar'), box = $('ed-box'), hov = $('ed-hover'), fileIn = $('ed-file');
  const fontSel = $('ed-font'), sizeIn = $('ed-size'), colorIn = $('ed-color'), fitSel = $('ed-fit');
  FONTS.forEach(([n, v]) => fontSel.add(new Option(n, v)));

  // ---------- Trạng thái ----------
  let on = false, sel = null, editing = null, savedRange = null, dirty = false, rafId = 0, hoverQueued = false;
  const undo = [];
  const blobs = new Map(); // blob:url -> File

  const inUI = n => {
    const e = n && (n.nodeType === 1 ? n : n.parentElement);
    return !!(e && e.closest('#ed-ui'));
  };
  const isMedia = el => el.matches(MEDIA_SEL);
  const isSlot = el => el.matches('.ph,figure,.hero-media');
  const isTextable = el => el.matches(TEXT_BLOCK) || el.children.length === 0;
  const hex = c => '#' + (c.match(/\d+(\.\d+)?/g) || [0, 0, 0]).slice(0, 3).map(n => (+n | 0).toString(16).padStart(2, '0')).join('');

  function getT(el) {
    const m = (el.style.translate || '').match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);
    return m ? [+m[1], +m[2]] : [0, 0];
  }
  const setT = (el, x, y) => { el.style.translate = `${Math.round(x)}px ${Math.round(y)}px`; };
  function ensureBox(el) { if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block'; }

  function track(el, key) {
    const prev = el.getAttribute('style'), now = Date.now(), last = undo[undo.length - 1];
    dirty = true;
    if (last && last.el === el && last.key === key && now - last.t < 1200) { last.t = now; return; }
    undo.push({ el, key, t: now, fn: () => prev === null ? el.removeAttribute('style') : el.setAttribute('style', prev) });
  }
  function doUndo() {
    const u = undo.pop();
    if (u) { u.fn(); refresh(); }
  }

  // ---------- Chọn phần tử ----------
  const refine = el => el.closest(MEDIA_SEL) || el.closest(TEXT_BLOCK) || el;
  function stackAt(x, y) {
    const raw = [...document.elementsFromPoint(x, y)];
    // iframe (YouTube) bị tắt pointer-events khi chỉnh sửa nên tự dò theo toạ độ
    document.querySelectorAll('iframe').forEach(f => {
      if (inUI(f) || raw.includes(f)) return;
      const r = f.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
      const i = raw.findIndex(el => el !== f && el.contains(f));
      i < 0 ? raw.push(f) : raw.splice(i, 0, f);
    });
    const out = [];
    for (const el of raw) {
      if (el === document.documentElement || el === document.body || inUI(el)) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const r = refine(el);
      if (!out.includes(r)) out.push(r);
    }
    return out;
  }
  function pickAt(e) {
    const list = stackAt(e.clientX, e.clientY);
    if (!list.length) return null;
    if (e.altKey) {                       // Alt+bấm: chọn lớp nằm bên dưới
      const i = list.indexOf(sel);
      return list[(i + 1) % list.length];
    }
    if (e.shiftKey) {                     // Shift+bấm: chọn khung cha
      const p = list[0].parentElement;
      return p && p !== document.body ? p : list[0];
    }
    return list[0];
  }

  function label(el) {
    if (el.matches('img')) return 'Ảnh';
    if (el.matches('video')) return 'Video';
    if (el.matches('iframe')) return 'Video YouTube';
    if (isSlot(el)) return 'Khung ảnh/video';
    const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '';
    return '<' + el.tagName.toLowerCase() + '>' + c;
  }

  function select(el) { sel = el; refresh(); }
  function refresh() {
    if (!sel || !sel.isConnected) {
      sel = null; box.style.display = 'none';
      $('ed-name').textContent = 'Chưa chọn'; $('ed-hint').style.display = '';
      $('g-text').style.display = $('g-media').style.display = 'none';
      return;
    }
    $('ed-hint').style.display = 'none';
    $('ed-name').textContent = label(sel);
    $('ed-tag').textContent = label(sel);
    const media = isMedia(sel) || isSlot(sel);
    $('g-media').style.display = media ? 'inline-flex' : 'none';
    $('g-text').style.display = media ? 'none' : 'inline-flex';
    if (media) {
      const m = isMedia(sel) ? sel : sel.querySelector(MEDIA_SEL);
      fitSel.value = m && m.style.objectFit === 'contain' ? 'contain' : 'cover';
    } else {
      const cs = getComputedStyle(sel), fam = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
      const o = [...fontSel.options].find(o => o.value && o.text.toLowerCase() === fam);
      fontSel.value = o ? o.value : '';
      sizeIn.value = Math.round(parseFloat(cs.fontSize));
      colorIn.value = hex(cs.color);
    }
  }

  function loop() {
    if (!on) return;
    if (sel) {
      if (!sel.isConnected) select(null);
      else {
        const r = sel.getBoundingClientRect();
        Object.assign(box.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  // ---------- Kéo di chuyển ----------
  function startDrag(e) {
    const el = sel, [tx, ty] = getT(el), sx = e.clientX, sy = e.clientY;
    let moved = false;
    const mv = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved) { if (Math.hypot(dx, dy) < 4) return; moved = true; ensureBox(el); track(el, 'g' + Math.random()); }
      setT(el, tx + dx, ty + dy);
    };
    const up = () => { removeEventListener('mousemove', mv, true); removeEventListener('mouseup', up, true); };
    addEventListener('mousemove', mv, true); addEventListener('mouseup', up, true);
  }

  // ---------- Kéo đổi kích thước ----------
  box.querySelectorAll('.ed-h').forEach(h => h.addEventListener('mousedown', e => {
    if (!sel) return;
    e.preventDefault(); e.stopPropagation();
    const el = sel, dir = h.dataset.d, r = el.getBoundingClientRect(), [tx, ty] = getT(el), sx = e.clientX, sy = e.clientY;
    ensureBox(el); track(el, 'g' + Math.random());
    el.style.boxSizing = 'border-box'; el.style.maxWidth = 'none';
    if (dir.includes('n') || dir.includes('s')) el.style.aspectRatio = 'auto';
    if (el.matches('img,video') && !el.style.objectFit) el.style.objectFit = 'cover';
    const mv = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let w = r.width, hgt = r.height, x = tx, y = ty;
      if (dir.includes('e')) w = r.width + dx;
      if (dir.includes('w')) { w = r.width - dx; x = tx + dx; }
      if (dir.includes('s')) hgt = r.height + dy;
      if (dir.includes('n')) { hgt = r.height - dy; y = ty + dy; }
      if (dir.includes('e') || dir.includes('w')) el.style.width = Math.max(20, w) + 'px';
      if (dir.includes('n') || dir.includes('s')) el.style.height = Math.max(20, hgt) + 'px';
      if (dir.includes('w') || dir.includes('n')) setT(el, x, y);
    };
    const up = () => { removeEventListener('mousemove', mv, true); removeEventListener('mouseup', up, true); };
    addEventListener('mousemove', mv, true); addEventListener('mouseup', up, true);
  }));

  // ---------- Sửa chữ ----------
  function startEdit(el) {
    if (!el || isMedia(el) || isSlot(el) || !isTextable(el)) return;
    stopEdit();
    editing = el; el._prev = el.innerHTML;
    el.contentEditable = 'true'; el.focus();
  }
  function stopEdit() {
    if (!editing) return;
    const el = editing; editing = null; savedRange = null;
    el.removeAttribute('contenteditable');
    if (el.innerHTML !== el._prev) {
      const prev = el._prev; dirty = true;
      undo.push({ fn: () => { el.innerHTML = prev; } });
    }
  }
  document.addEventListener('selectionchange', () => {
    if (!editing) return;
    const s = getSelection();
    if (s.rangeCount && editing.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange();
  });
  function fmt(cmd, val, prop, css) {
    if (editing && savedRange && !savedRange.collapsed && cmd) {
      editing.focus();
      const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange);
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(cmd, false, val);
      dirty = true;
    } else if (sel && !isMedia(sel) && !isSlot(sel)) {
      track(sel, prop); sel.style[prop] = css;
    }
  }

  // ---------- Ảnh / video / YouTube ----------
  function pickFile(cb) {
    fileIn.accept = 'image/*,video/*';
    fileIn.onchange = () => { const f = fileIn.files[0]; fileIn.value = ''; if (f) cb(f); };
    fileIn.click();
  }
  // Lấy mã video từ link YouTube (watch, youtu.be, embed, shorts, live)
  function ytId(u) {
    u = (u || '').trim();
    if (/^[\w-]{11}$/.test(u)) return u;
    const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtube-nocookie\.com\/embed\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  const ytSrc = id => 'https://www.youtube.com/embed/' + id + '?rel=0&playsinline=1';
  function ytEl(id) {
    const f = document.createElement('iframe');
    f.src = ytSrc(id); f.title = 'YouTube'; f.dataset.yt = id;
    f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.style.border = '0'; f.style.display = 'block';
    return f;
  }
  function newMedia(f) {
    const url = URL.createObjectURL(f); blobs.set(url, f);
    const v = f.type.startsWith('video'), m = document.createElement(v ? 'video' : 'img');
    m.src = url;
    if (v) { m.controls = true; m.playsInline = true; m.preload = 'metadata'; } else m.alt = '';
    return m;
  }
  const mkEl = it => it.yt ? ytEl(it.yt) : newMedia(it.file);

  // Hộp thoại: dán link YouTube hoặc chọn file → cb({yt}) hoặc cb({file})
  function getMedia(cb) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483650;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center';
    wrap.innerHTML = `
      <div style="width:min(460px,92vw);padding:18px;background:#1b1b1f;color:#eee;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.6)">
        <div style="font-weight:700;font-size:15px;margin-bottom:10px">Chèn / thay ảnh – video</div>
        <input id="ed-yt" placeholder="Dán link YouTube (youtube.com/watch?v=… hoặc youtu.be/…)"
          style="width:100%;height:36px;padding:0 10px;border-radius:8px;border:1px solid #44444d;background:#2a2a31;color:#eee">
        <div id="ed-yterr" style="color:#ff8a8a;font-size:12px;min-height:16px;margin:6px 0"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="ed-dbtn" data-k="yt">▶ Dùng link YouTube</button>
          <button class="ed-dbtn alt" data-k="file">📁 Chọn file từ máy</button>
          <button class="ed-dbtn alt" data-k="x">Huỷ</button>
        </div>
      </div>`;
    ui.appendChild(wrap);
    const input = wrap.querySelector('#ed-yt'), err = wrap.querySelector('#ed-yterr');
    input.focus();
    const useLink = () => {
      const id = ytId(input.value);
      if (!id) { err.textContent = 'Link YouTube chưa hợp lệ, hãy dán lại.'; return; }
      wrap.remove(); cb({ yt: id });
    };
    input.onkeydown = e => { if (e.key === 'Enter') useLink(); if (e.key === 'Escape') wrap.remove(); };
    wrap.onmousedown = e => { if (e.target === wrap) wrap.remove(); };
    wrap.onclick = e => {
      const k = e.target.dataset && e.target.dataset.k;
      if (k === 'yt') useLink();
      else if (k === 'file') { wrap.remove(); pickFile(f => cb({ file: f })); }
      else if (k === 'x') wrap.remove();
    };
  }

  function replaceMedia(item) {
    if (!sel) return;
    const m = isMedia(sel) ? sel : sel.querySelector(MEDIA_SEL);
    const wantTag = item.yt ? 'IFRAME' : (item.file.type.startsWith('video') ? 'VIDEO' : 'IMG');
    dirty = true;
    if (m && m.tagName === wantTag) {                   // cùng loại: chỉ đổi nguồn
      const old = m.getAttribute('src');
      if (item.yt) {
        m.src = ytSrc(item.yt); m.dataset.yt = item.yt;
        undo.push({ fn: () => { old === null ? m.removeAttribute('src') : m.setAttribute('src', old); } });
      } else {
        const url = URL.createObjectURL(item.file); blobs.set(url, item.file);
        m.removeAttribute('onerror'); m.src = url; if (wantTag === 'VIDEO') m.load();
        undo.push({ fn: () => { old === null ? m.removeAttribute('src') : m.setAttribute('src', old); if (wantTag === 'VIDEO') m.load(); } });
      }
    } else if (m) {                                      // khác loại: đổi thẻ, giữ class + style
      const r = m.getBoundingClientRect(), nm = mkEl(item);
      const skip = ['src', 'onerror', 'controls', 'muted', 'loop', 'playsinline', 'preload', 'autoplay', 'poster',
                    'allow', 'allowfullscreen', 'referrerpolicy', 'title', 'data-yt', 'frameborder', 'alt'];
      for (const a of m.attributes) if (!skip.includes(a.name)) nm.setAttribute(a.name, a.value);
      if (item.yt) {
        nm.style.border = '0'; nm.style.display = 'block';
        if (!nm.style.width) nm.style.width = '100%';
        if (!nm.style.height) {
          if (r.height > 40) nm.style.height = Math.round(r.height) + 'px';
          else { nm.style.height = 'auto'; nm.style.aspectRatio = '16/9'; }
        }
      }
      m.replaceWith(nm);
      undo.push({ fn: () => nm.replaceWith(m) });
      select(nm);
    } else {                                             // khung trống (placeholder)
      const slot = sel.matches('.ph') ? sel : (sel.querySelector('.ph') || sel), nm = mkEl(item);
      nm.style.cssText = item.yt ? 'display:block;width:100%;height:100%;border:0'
                                 : 'display:block;width:100%;height:100%;object-fit:cover';
      slot.appendChild(nm);
      undo.push({ fn: () => nm.remove() });
      select(nm);
    }
    refresh();
  }
  function del() {
    if (!sel) return;
    const el = sel, parent = el.parentNode, next = el.nextSibling;
    undo.push({ fn: () => parent.insertBefore(el, next) });
    el.remove(); dirty = true; select(null);
  }

  // ---------- KÉO VÙNG RỒI MỚI CHÈN ----------
  function putInArea(el, a) {
    el.style.position = 'absolute';
    el.style.margin = '0';
    el.style.zIndex = '1000';
    el.style.left = (a.x + scrollX) + 'px';
    el.style.top = (a.y + scrollY) + 'px';
    el.style.width = a.w + 'px';
    document.body.appendChild(el);
    const r = el.getBoundingClientRect();           // bù lệch nếu body có margin / position riêng
    el.style.left = (parseFloat(el.style.left) + (a.x - r.left)) + 'px';
    el.style.top = (parseFloat(el.style.top) + (a.y - r.top)) + 'px';
    undo.push({ fn: () => el.remove() });
    dirty = true;
  }
  function placeText(a) {
    const p = document.createElement('p');
    p.textContent = 'Văn bản mới — bấm đúp để sửa';
    p.style.minHeight = a.h + 'px';
    putInArea(p, a);
    select(p); startEdit(p);
  }
  function placeMedia(item, a) {
    const nm = mkEl(item);
    nm.style.height = a.h + 'px';
    nm.style.display = 'block';
    if (!item.yt) nm.style.objectFit = 'cover';
    putInArea(nm, a);
    select(nm);
  }

  function startDraw() {
    stopEdit(); select(null);
    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483550;cursor:crosshair;background:rgba(47,125,246,.06)';
    const rect = document.createElement('div');
    rect.style.cssText = 'position:fixed;display:none;border:2px dashed #2f7df6;background:rgba(47,125,246,.18);pointer-events:none';
    const tip = document.createElement('div');
    tip.textContent = 'Giữ chuột kéo một vùng trên trang · Esc để huỷ';
    tip.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);padding:6px 12px;border-radius:8px;background:#2f7df6;color:#fff;pointer-events:none';
    const menu = document.createElement('div');
    menu.id = 'ed-menu';
    menu.innerHTML = '<button data-k="media">🖼 Ảnh / Video / YouTube</button><button data-k="text">Aa Chữ</button><button data-k="x">✕ Huỷ</button>';
    layer.append(rect, tip, menu);
    ui.appendChild(layer);

    let sx = 0, sy = 0, drawing = false, area = null;
    const end = () => { layer.remove(); removeEventListener('keydown', esc, true); };
    const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); end(); } };
    addEventListener('keydown', esc, true);
    const calc = e => ({
      x: Math.min(sx, e.clientX), y: Math.min(sy, e.clientY),
      w: Math.abs(e.clientX - sx), h: Math.abs(e.clientY - sy),
    });

    layer.onmousedown = e => {
      if (e.target !== layer) return;
      e.preventDefault();
      sx = e.clientX; sy = e.clientY; drawing = true; area = null;
      menu.style.display = 'none'; rect.style.display = 'none';
    };
    layer.onmousemove = e => {
      if (!drawing) return;
      const b = calc(e);
      Object.assign(rect.style, { display: 'block', left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });
    };
    layer.onmouseup = e => {
      if (!drawing) return;
      drawing = false;
      const b = calc(e);
      if (b.w < 30 || b.h < 30) { rect.style.display = 'none'; return; }
      area = b;
      const top = b.y + b.h + 50 < innerHeight ? b.y + b.h + 8 : Math.max(8, b.y - 48);
      menu.style.left = Math.max(8, Math.min(b.x, innerWidth - 380)) + 'px';
      menu.style.top = top + 'px';
      menu.style.display = 'flex';
    };
    menu.onmousedown = e => e.stopPropagation();
    menu.onclick = e => {
      const k = e.target.dataset && e.target.dataset.k;
      if (!k) return;
      const a = area;
      end();
      if (k === 'text' && a) placeText(a);
      else if (k === 'media' && a) getMedia(it => placeMedia(it, a));
    };
  }

  // ---------- Xuất file ----------
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function exportHTML() {
    stopEdit(); select(null);
    const clone = document.documentElement.cloneNode(true), body = clone.querySelector('body');
    clone.querySelectorAll('#ed-ui,#ed-style').forEach(n => n.remove());
    body.classList.remove('ed-on'); if (!body.getAttribute('class')) body.removeAttribute('class');
    clone.querySelectorAll('[contenteditable]').forEach(n => n.removeAttribute('contenteditable'));
    const names = new Map(), files = [], used = new Set();
    clone.querySelectorAll('img,video').forEach(m => {
      const src = m.getAttribute('src'), f = blobs.get(src);
      if (!f) return;
      if (!names.has(src)) {
        let n = f.name.replace(/[^\w.\-]+/g, '_'); while (used.has(n)) n = 'x_' + n; used.add(n);
        names.set(src, (f.type.startsWith('video') ? 'assets/video/' : 'assets/images/') + n);
        files.push([f, n]);
      }
      m.setAttribute('src', names.get(src));
    });
    download(new Blob(['<!DOCTYPE html>\n' + clone.outerHTML], { type: 'text/html' }), 'index.html');
    files.forEach(([f, n], i) => setTimeout(() => download(f, n), 600 * (i + 1)));
    dirty = false;
    alert('Đã tải index.html' + (files.length ? ' + ' + files.length + ' file ảnh/video.\n\nĐặt index.html ở thư mục gốc repo.\nẢnh bỏ vào assets/images/, video bỏ vào assets/video/.' : '.\nĐặt nó đè lên index.html trong repo.'));
  }

  // ---------- Bật / tắt ----------
  const toggle = $('ed-toggle');
  function setOn(v) {
    on = v; document.body.classList.toggle('ed-on', on);
    toggle.textContent = on ? '✔ Xong' : '✎ Chỉnh sửa';
    if (on) { refresh(); loop(); }
    else { stopEdit(); select(null); hov.style.display = 'none'; cancelAnimationFrame(rafId); }
  }
  toggle.onclick = () => setOn(!on);
  refresh();

  // ---------- Sự kiện trang ----------
  document.addEventListener('mousedown', e => {
    if (!on || e.button !== 0 || inUI(e.target)) return;
    if (e.target === document.documentElement && e.clientX >= document.documentElement.clientWidth) return;
    if (editing && editing.contains(e.target)) return;
    stopEdit();
    const el = pickAt(e);
    if (!el) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (el !== sel) select(el);
    startDrag(e);
  }, true);
  document.addEventListener('click', e => {
    if (!on || inUI(e.target) || (editing && editing.contains(e.target))) return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  document.addEventListener('dblclick', e => {
    if (!on || inUI(e.target) || !sel) return;
    e.preventDefault();
    if (isMedia(sel) || isSlot(sel)) getMedia(replaceMedia); else startEdit(sel);
  }, true);
  document.addEventListener('mousemove', e => {
    if (!on || hoverQueued) return;
    if (inUI(e.target)) { hov.style.display = 'none'; return; }
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      const t = stackAt(e.clientX, e.clientY)[0];
      if (!t || t === sel) { hov.style.display = 'none'; return; }
      const r = t.getBoundingClientRect();
      Object.assign(hov.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    });
  }, true);
  document.addEventListener('keydown', e => {
    if (!on) return;
    if (editing) { if (e.key === 'Escape') stopEdit(); return; }
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); return; }
    if (e.key === 'Escape') { select(null); return; }
    if (!sel) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); return; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (d) {
      e.preventDefault(); const k = e.shiftKey ? 10 : 1, [x, y] = getT(sel);
      ensureBox(sel); track(sel, 'nudge'); setT(sel, x + d[0] * k, y + d[1] * k);
    }
  }, true);
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- Thanh công cụ ----------
  bar.addEventListener('mousedown', e => { if (!/INPUT|SELECT|OPTION/.test(e.target.tagName)) e.preventDefault(); });
  fontSel.onchange = () => fmt('fontName', fontSel.value.split(',')[0].replace(/'/g, ''), 'fontFamily', fontSel.value);
  sizeIn.oninput = () => { if (sel && sizeIn.value) { track(sel, 'size'); sel.style.fontSize = sizeIn.value + 'px'; } };
  colorIn.oninput = () => fmt('foreColor', colorIn.value, 'color', colorIn.value);
  $('ed-b').onclick = () => (editing && savedRange && !savedRange.collapsed)
    ? fmt('bold') : fmt(null, null, 'fontWeight', sel && +getComputedStyle(sel).fontWeight >= 600 ? '400' : '700');
  $('ed-i').onclick = () => (editing && savedRange && !savedRange.collapsed)
    ? fmt('italic') : fmt(null, null, 'fontStyle', sel && getComputedStyle(sel).fontStyle === 'italic' ? 'normal' : 'italic');
  bar.querySelectorAll('[data-al]').forEach(b => b.onclick = () => fmt(null, null, 'textAlign', b.dataset.al));
  $('ed-edit').onclick = () => startEdit(sel);
  $('ed-replace').onclick = () => getMedia(replaceMedia);
  fitSel.onchange = () => {
    const m = sel && (isMedia(sel) ? sel : sel.querySelector(MEDIA_SEL));
    if (m) { track(m, 'fit'); m.style.objectFit = fitSel.value; }
  };
  $('ed-draw').onclick = startDraw;
  $('ed-reset').onclick = () => {
    if (!sel) return; track(sel, 'reset');
    ['translate', 'width', 'height', 'minHeight', 'maxWidth', 'aspectRatio'].forEach(p => sel.style[p] = '');
  };
  $('ed-del').onclick = del;
  $('ed-undo').onclick = doUndo;
  $('ed-save').onclick = exportHTML;
})();