/* js/editor.js — Chỉnh sửa trực quan */
(() => {
  if (window.__megaEditorLoaded) return;
  window.__megaEditorLoaded = true;

  const cms = window.MEGA_CMS;
  const dev = /[?&]edit\b/.test(location.search) ||
    location.protocol === 'file:' ||
    ['localhost', '127.0.0.1'].includes(location.hostname) ||
    cms?.editRequested;
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
    ['Hệ thống', 'system-ui,sans-serif']
  ];
  const TEXT_BLOCK = 'p,h1,h2,h3,h4,h5,h6,blockquote,figcaption,li,.tag,.kick,.numeral,.eyebrow,.cue,.hero-cap,small,label,button';
  const MEDIA_SEL = 'img,video,iframe';

  if (!document.getElementById('ed-fonts')) {
    const fonts = document.createElement('link');
    fonts.id = 'ed-fonts';
    fonts.rel = 'stylesheet';
    fonts.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;700&family=Roboto:wght@400;700&family=Oswald:wght@400;700&display=swap';
    document.head.appendChild(fonts);
  }

  const style = document.createElement('style');
  style.id = 'ed-style';
  style.textContent = `
    #ed-ui,#ed-ui *{box-sizing:border-box;font:13px/1.2 system-ui,sans-serif;letter-spacing:0;text-transform:none}
    #ed-toggle{position:fixed;right:16px;bottom:16px;z-index:2147483600;border:0;border-radius:99px;padding:12px 18px;background:#2679ed;color:white;font-weight:700;box-shadow:0 5px 18px #0006;cursor:pointer}
    #ed-panel{position:fixed;bottom:72px;right:16px;z-index:2147483600;width:min(360px,calc(100vw - 32px));max-height:75vh;overflow:auto;padding:15px;background:#151b2a;color:white;border:1px solid #36445d;border-radius:14px;box-shadow:0 8px 30px #0009;display:none}
    #ed-panel.open{display:block}
    #ed-panel h3{margin:0 0 10px;font-size:16px;font-weight:700}
    #ed-panel button,#ed-panel select,#ed-panel input{padding:8px;border-radius:7px;border:1px solid #46516a;background:#29354d;color:white}
    #ed-panel button{cursor:pointer}
    #ed-panel button:disabled{opacity:.55;cursor:wait}
    #ed-panel .actions,#ed-panel .g{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:10px 0}
    #ed-panel .primary{background:#2679ed;border-color:#2679ed}
    #ed-panel input[type=number]{width:76px}
    #ed-panel input[type=color]{width:48px;padding:2px}
    #ed-panel select{max-width:170px}
    #ed-name{font-weight:600;color:#7db4ff}
    #ed-hint,#ed-msg{color:#cbd5e1;font-size:12px}
    #ed-login{position:fixed;inset:0;z-index:2147483601;display:grid;place-items:center;background:#000b}
    #ed-login[hidden]{display:none}
    #ed-login>div{background:#151b2a;color:white;padding:24px;border-radius:14px;max-width:340px;margin:16px}
    #ed-login button,.ed-dbtn{background:#2679ed;color:white;border:0;padding:10px 12px;border-radius:8px;cursor:pointer}
    .ed-dbtn.alt{background:#3a3a45}
    #ed-box{position:fixed;display:none;z-index:2147483500;pointer-events:none;border:2px solid #2f7df6}
    #ed-tag{position:absolute;left:-2px;top:-22px;padding:2px 6px;border-radius:4px 4px 0 0;background:#2f7df6;color:white;font-size:11px;white-space:nowrap}
    .ed-h{position:absolute;width:12px;height:12px;background:white;border:2px solid #2f7df6;border-radius:3px;pointer-events:auto}
    .ed-h[data-d=nw]{left:-7px;top:-7px;cursor:nwse-resize}
    .ed-h[data-d=n]{left:calc(50% - 6px);top:-7px;cursor:ns-resize}
    .ed-h[data-d=ne]{right:-7px;top:-7px;cursor:nesw-resize}
    .ed-h[data-d=e]{right:-7px;top:calc(50% - 6px);cursor:ew-resize}
    .ed-h[data-d=se]{right:-7px;bottom:-7px;cursor:nwse-resize}
    .ed-h[data-d=s]{left:calc(50% - 6px);bottom:-7px;cursor:ns-resize}
    .ed-h[data-d=sw]{left:-7px;bottom:-7px;cursor:nesw-resize}
    .ed-h[data-d=w]{left:-7px;top:calc(50% - 6px);cursor:ew-resize}
    #ed-hover{position:fixed;display:none;z-index:2147483400;pointer-events:none;border:1px dashed #7db4ff}
    #ed-menu{position:fixed;display:none;gap:6px;padding:6px;background:#1b1b1f;border-radius:10px;box-shadow:0 6px 24px #0008}
    #ed-menu button{height:32px;padding:0 12px;border:0;border-radius:6px;background:#2f7df6;color:white;font-weight:600;cursor:pointer}
    #ed-menu button[data-k=x]{background:#44444d}
    body.ed-on{-webkit-user-select:none;user-select:none}
    body.ed-on .rail{display:none!important}
    body.ed-on .rv{opacity:1!important;transform:none!important;filter:none!important;visibility:visible!important}
    body.ed-on iframe{pointer-events:none!important}
    body.ed-on [contenteditable=true]{-webkit-user-select:text;user-select:text;outline:2px dashed #ffb020;outline-offset:3px;cursor:text}
  `;
  document.head.appendChild(style);

  const ui = document.createElement('div');
  ui.id = 'ed-ui';
  ui.innerHTML = `
    <button id="ed-toggle" type="button" aria-controls="ed-panel" aria-expanded="false">✎ Chỉnh sửa</button>
    <section id="ed-panel" aria-labelledby="ed-title">
      <h3 id="ed-title">Chỉnh sửa nội dung</h3>
      <div class="actions">
        <button id="ed-save" type="button">Lưu nháp</button>
        <button id="ed-publish" type="button" class="primary">Xuất bản</button>
        <button id="ed-reset" type="button">Hủy nháp</button>
        <button id="ed-logout" type="button">Đăng xuất</button>
      </div>
      <span id="ed-name">Chưa chọn</span>
      <p id="ed-hint">Bấm để chọn, kéo để di chuyển, kéo chấm trắng để đổi kích thước. Bấm đúp để sửa chữ hoặc thay ảnh, video.</p>
      <div class="g" id="g-text">
        <select id="ed-font" aria-label="Font chữ"></select>
        <input id="ed-size" type="number" min="0.5" max="25" step="0.05" title="Cỡ chữ (rem)" aria-label="Cỡ chữ (rem)">
        <input id="ed-color" type="color" title="Màu chữ">
        <button id="ed-b" type="button" title="In đậm"><b>B</b></button>
        <button id="ed-i" type="button" title="In nghiêng"><i>I</i></button>
        <button type="button" data-al="left">Trái</button>
        <button type="button" data-al="center">Giữa</button>
        <button type="button" data-al="right">Phải</button>
        <button id="ed-edit" type="button">Sửa chữ</button>
      </div>
      <div class="g" id="g-media">
        <button id="ed-replace" type="button">Thay ảnh / video / YouTube</button>
        <button id="ed-image-url" type="button">Đổi ảnh bằng URL</button>
        <select id="ed-fit" aria-label="Cách khớp ảnh với khung">
          <option value="cover">Phủ kín khung</option>
          <option value="contain">Vừa khung</option>
        </select>
      </div>
      <div class="g">
        <button id="ed-draw" type="button" class="primary">＋ Chèn (kéo vùng)</button>
        <button id="ed-reset-box" type="button">Đặt lại khung</button>
        <button id="ed-del" type="button">Xóa</button>
        <button id="ed-undo" type="button" title="Ctrl+Z">↶ Hoàn tác</button>
        <button id="ed-export" type="button">⬇ Xuất file</button>
        <button id="ed-door" type="button">Đóng/mở cửa</button>
      </div>
      <p id="ed-msg" role="status"></p>
    </section>
    <div id="ed-login" role="dialog" aria-modal="true" aria-labelledby="ed-login-title" hidden>
      <div>
        <h3 id="ed-login-title">Đăng nhập để chỉnh sửa</h3>
        <button id="ed-google" type="button">Đăng nhập bằng Google</button>
        <button id="ed-cancel-login" type="button">Hủy</button>
        <p id="ed-auth-error" role="status"></p>
      </div>
    </div>
    <div id="ed-hover"></div>
    <div id="ed-box">
      <div id="ed-tag"></div>
      ${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(direction => `<div class="ed-h" data-d="${direction}"></div>`).join('')}
    </div>
    <input type="file" id="ed-file" hidden>
  `;
  document.body.appendChild(ui);

  const $ = id => document.getElementById(id);
  const bar = $('ed-panel');
  const box = $('ed-box');
  const hover = $('ed-hover');
  const fileInput = $('ed-file');
  const font = $('ed-font');
  const size = $('ed-size');
  const color = $('ed-color');
  const fit = $('ed-fit');
  const undo = [];
  const blobs = new Map();

  let on = false;
  let selected = null;
  let editing = null;
  let priorText = '';
  let savedRange = null;
  let dirty = false;
  let frame = 0;
  let hoverQueued = false;

  for (const [name, value] of FONTS) font.add(new Option(name, value));

  const isMedia = el => el.matches(MEDIA_SEL);
  const FRAME_SELECTOR = '.slot,.op-frame,.ph';

const isSlot = el => el.matches(
    '.ph,.slot,.op-frame,figure,.hero-media,.documentary-screen'
);

function findMediaFrame(area) {
    const frames = document.querySelectorAll(FRAME_SELECTOR);

    let bestFrame = null;
    let bestScore = 0;

    for (const frame of frames) {
        const rect = frame.getBoundingClientRect();
        const style = getComputedStyle(frame);

        if (
            rect.width < 10 ||
            rect.height < 10 ||
            style.display === 'none' ||
            style.visibility === 'hidden'
        ) continue;

        let visible = true;
        let parent = frame;

        while (parent && parent !== document.body) {
            const s = getComputedStyle(parent);

            if (
                s.display === 'none' ||
                s.visibility === 'hidden' ||
                Number(s.opacity) < 0.5
            ) {
                visible = false;
                break;
            }

            parent = parent.parentElement;
        }

        if (!visible) continue;

        const left = Math.max(area.x, rect.left);
        const top = Math.max(area.y, rect.top);

        const right = Math.min(
            area.x + area.width,
            rect.right
        );

        const bottom = Math.min(
            area.y + area.height,
            rect.bottom
        );

        const overlap =
            Math.max(0, right - left) *
            Math.max(0, bottom - top);

        const areaSize = area.width * area.height;
        const frameSize = rect.width * rect.height;

        const score = overlap / Math.max(
            1,
            Math.min(areaSize, frameSize)
        );

        if (score >= 0.5 && score > bestScore) {
            bestScore = score;
            bestFrame = frame;
        }
    }

    return bestFrame;
}
  const inUI = node => !!(node?.nodeType === 1 ? node.closest('#ed-ui') : node?.parentElement?.closest('#ed-ui'));

  function offset(el) {
    const match = (el.style.translate || '').match(/(-?[\d.]+)px\s+(-?[\d.]+)px/);
    return match ? [+match[1], +match[2]] : [0, 0];
  }

  function move(el, x, y) {
    el.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
  }

  function ensureBox(el) {
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
  }

  function track(el, key) {
    cms?.mark(el, 'style');
    dirty = true;

    const previous = el.getAttribute('style');
    const now = Date.now();
    const last = undo[undo.length - 1];
    if (last?.el === el && last.key === key && now - last.time < 1200) {
      last.time = now;
      return;
    }

    undo.push({
      el,
      key,
      time: now,
      run() {
        if (previous === null) el.removeAttribute('style');
        else el.setAttribute('style', previous);
      }
    });
  }

  function doUndo() {
    stopEdit();
    const action = undo.pop();
    if (!action) return;
    action.run();
    cms?.touch();
    dirty = true;
    refresh();
  }

  function stackAt(x, y) {
    const nodes = [...document.elementsFromPoint(x, y)];
    for (const iframe of document.querySelectorAll('iframe')) {
      if (inUI(iframe) || nodes.includes(iframe)) continue;
      const rect = iframe.getBoundingClientRect();
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
      const index = nodes.findIndex(el => el !== iframe && el.contains(iframe));
      if (index < 0) nodes.push(iframe);
      else nodes.splice(index, 0, iframe);
    }

    const elements = [];
    for (const node of nodes) {
      if (node === document.documentElement || node === document.body || inUI(node)) continue;
      if (node.closest('[aria-hidden="true"]')) continue;
      const el = node.closest(MEDIA_SEL) || node.closest(TEXT_BLOCK) || node;
      if (!elements.includes(el)) elements.push(el);
    }
    return elements;
  }

  function pick(event) {
    const list = stackAt(event.clientX, event.clientY);
    if (!list.length) return null;
    if (event.altKey) return list[(list.indexOf(selected) + 1) % list.length];
    if (event.shiftKey && list[0].parentElement !== document.body) return list[0].parentElement;
    return list[0];
  }

  function describe(el) {
    if (el.matches('img')) return 'Ảnh';
    if (el.matches('video')) return 'Video';
    if (el.matches('iframe')) return 'Video YouTube';
    if (isSlot(el)) return 'Khung ảnh/video';
    return '<' + el.localName + '>' + (el.classList.length ? '.' + el.classList[0] : '');
  }

  function select(el) {
    selected = el;
    refresh();
  }

  function refresh() {
    if (!selected?.isConnected) {
      selected = null;
      box.style.display = 'none';
      $('ed-name').textContent = 'Chưa chọn';
      $('ed-hint').style.display = '';
      $('g-text').style.display = 'none';
      $('g-media').style.display = 'none';
      return;
    }

    $('ed-hint').style.display = 'none';
    $('ed-name').textContent = describe(selected);
    $('ed-tag').textContent = describe(selected);
    const media = isMedia(selected) || isSlot(selected);
    $('g-text').style.display = media ? 'none' : 'flex';
    $('g-media').style.display = media ? 'flex' : 'none';

    if (media) {
      const element = isMedia(selected) ? selected : selected.querySelector(MEDIA_SEL);
      fit.value = element?.style.objectFit === 'contain' ? 'contain' : 'cover';
      return;
    }

    const computed = getComputedStyle(selected);
    const family = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
    font.value = [...font.options].find(option => option.value && option.text.toLowerCase() === family)?.value || '';
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    size.value = (parseFloat(computed.fontSize) / rootSize).toFixed(2);
    const rgb = computed.color.match(/\d+(\.\d+)?/g) || [0, 0, 0];
    color.value = '#' + rgb.slice(0, 3).map(n => (+n | 0).toString(16).padStart(2, '0')).join('');
  }

  function positionBox(target, rect) {
    Object.assign(target.style, {
      display: 'block',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px'
    });
  }

  function animateBox() {
    if (!on) return;
    if (selected?.isConnected) positionBox(box, selected.getBoundingClientRect());
    else if (selected) select(null);
    frame = requestAnimationFrame(animateBox);
  }

  function whileDragging(moveListener) {
    const end = () => {
      removeEventListener('mousemove', moveListener, true);
      removeEventListener('mouseup', end, true);
    };
    addEventListener('mousemove', moveListener, true);
    addEventListener('mouseup', end, true);
  }

  function startDrag(event) {
    const el = selected;
    const [left, top] = offset(el);
    let moved = false;

    whileDragging(next => {
      const dx = next.clientX - event.clientX;
      const dy = next.clientY - event.clientY;
      if (!moved) {
        if (Math.hypot(dx, dy) < 4) return;
        moved = true;
        track(el, 'drag-' + Math.random());
        ensureBox(el);
      }
      move(el, left + dx, top + dy);
    });
  }

  for (const handle of box.querySelectorAll('.ed-h')) {
    handle.addEventListener('mousedown', event => {
      if (!selected) return;
      event.preventDefault();
      event.stopPropagation();

      const el = selected;
      const direction = handle.dataset.d;
      const rect = el.getBoundingClientRect();
      const [left, top] = offset(el);
      track(el, 'resize-' + Math.random());
      ensureBox(el);
      el.style.boxSizing = 'border-box';
      el.style.maxWidth = 'none';
      if (/[ns]/.test(direction)) el.style.aspectRatio = 'auto';
      if (el.matches('img,video') && !el.style.objectFit) el.style.objectFit = 'cover';

      whileDragging(next => {
        const dx = next.clientX - event.clientX;
        const dy = next.clientY - event.clientY;
        let width = rect.width;
        let height = rect.height;
        let x = left;
        let y = top;
        if (direction.includes('e')) width += dx;
        if (direction.includes('w')) { width -= dx; x += dx; }
        if (direction.includes('s')) height += dy;
        if (direction.includes('n')) { height -= dy; y += dy; }
        if (/[ew]/.test(direction)) el.style.width = Math.max(20, width) + 'px';
        if (/[ns]/.test(direction)) el.style.height = Math.max(20, height) + 'px';
        if (/[wn]/.test(direction)) move(el, x, y);
      });
    });
  }

  function startEdit(el) {
    if (!el || isMedia(el) || isSlot(el)) return;
    if (!el.matches(TEXT_BLOCK) && el.children.length) return;
    stopEdit();
    editing = el;
    priorText = el.innerHTML;
    el.contentEditable = 'true';
    el.focus();
  }

  function stopEdit() {
    if (!editing) return;
    const el = editing;
    const previous = priorText;
    editing = null;
    savedRange = null;
    el.removeAttribute('contenteditable');

    if (el.innerHTML !== previous) {
      cms?.mark(el, 'text');
      undo.push({ run: () => { el.innerHTML = previous; } });
      dirty = true;
    }
  }

  document.addEventListener('selectionchange', () => {
    if (!editing) return;
    const selection = getSelection();
    if (selection.rangeCount && editing.contains(selection.anchorNode)) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }
  });

  function format(command, value, property, css) {
    if (editing && savedRange && !savedRange.collapsed && command) {
      editing.focus();
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(command, false, value);
      dirty = true;
    } else if (selected && !isMedia(selected) && !isSlot(selected)) {
      track(selected, property);
      selected.style[property] = css;
    }
  }

  function youtubeId(value) {
    const input = value.trim();
    if (/^[\w-]{11}$/.test(input)) return input;
    const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtube-nocookie\.com\/embed\/)([\w-]{11})/);
    return match?.[1] || null;
  }

  function youtubeUrl(id) {
    return 'https://www.youtube.com/embed/' + id + '?rel=0&playsinline=1';
  }

  function makeMedia(item) {
    if (item.yt) {
      const el = document.createElement('iframe');
      el.src = youtubeUrl(item.yt);
      el.title = 'YouTube';
      el.dataset.yt = item.yt;
      el.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      el.setAttribute('allowfullscreen', '');
      el.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      el.style.border = '0';
      el.style.display = 'block';
      return el;
    }

    const video = item.file.type.startsWith('video');
    const el = document.createElement(video ? 'video' : 'img');
    const src = URL.createObjectURL(item.file);
    blobs.set(src, item.file);
    el.src = src;
    if (video) {
      el.controls = true;
      el.playsInline = true;
      el.preload = 'metadata';
    } else {
      el.alt = '';
    }
    return el;
  }

  function askMedia(callback) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483650;background:#0009;display:grid;place-items:center';
    wrap.innerHTML = `
      <div style="width:min(460px,92vw);padding:18px;background:#1b1b1f;color:#eee;border-radius:14px">
        <p>Chèn / thay ảnh và video</p>
        <input id="ed-yt" aria-label="Link YouTube" placeholder="Dán link YouTube" style="width:100%;padding:8px">
        <p id="ed-yterr" role="status"></p>
        <button class="ed-dbtn" data-k="yt" type="button">Dùng YouTube</button>
        <button class="ed-dbtn alt" data-k="file" type="button">Chọn file từ máy</button>
        <button class="ed-dbtn alt" data-k="x" type="button">Hủy</button>
      </div>`;
    ui.appendChild(wrap);
    const input = wrap.querySelector('#ed-yt');
    input.focus();

    function useLink() {
      const id = youtubeId(input.value);
      if (!id) {
        wrap.querySelector('#ed-yterr').textContent = 'Link YouTube chưa hợp lệ.';
        return;
      }
      wrap.remove();
      callback({ yt: id });
    }

    input.onkeydown = event => {
      if (event.key === 'Enter') useLink();
      if (event.key === 'Escape') wrap.remove();
    };

    wrap.onclick = event => {
      const key = event.target.dataset.k;
      if (key === 'yt') useLink();
      if (key === 'x' || event.target === wrap) wrap.remove();
      if (key === 'file') {
        wrap.remove();
        fileInput.accept = 'image/*,video/*';
        fileInput.onchange = () => {
          const file = fileInput.files[0];
          fileInput.value = '';
          if (file) callback({ file });
        };
        fileInput.click();
      }
    };
  }
function documentaryPlayer(target) {
    return target?.closest('#documentaryFrame')
        ?.querySelector('#documentaryVideo') || null;
}

function replaceMedia(item, target = selected) {

    const player = documentaryPlayer(target);

    if (player) {

        if (!item.yt || !/^[\w-]{11}$/.test(item.yt)) {
            $('ed-msg').textContent =
                'Khung tư liệu chỉ nhận video YouTube.';
            return;
        }

        const attrs = ['src', 'data-yt', 'style'];

        const previous = attrs.map(name => [
            name,
            player.getAttribute(name)
        ]);

        cms?.mark(player, 'media');

        player.src = youtubeUrl(item.yt);
        player.dataset.yt = item.yt;

        player.removeAttribute('style');

        undo.push({
            run() {
                for (const [name, value] of previous) {
                    if (value === null) {
                        player.removeAttribute(name);
                    } else {
                        player.setAttribute(name, value);
                    }
                }
            }
        });

        dirty = true;

        cms?.touch();

        select(player);

        $('ed-msg').textContent =
            'Đã cập nhật YouTube trong khung tư liệu.';

        return;
    }
    if (!target) return;

    const slot =
        target.closest(FRAME_SELECTOR) ||
        target.querySelector(FRAME_SELECTOR);

    const old = slot
        ? slot.querySelector(MEDIA_SEL)
        : isMedia(target)
            ? target
            : target.querySelector(MEDIA_SEL);

    const replacement = makeMedia(item);

    dirty = true;

    function normalizeFrameMedia(el) {
        if (!slot) return;

        el.removeAttribute('onerror');

        el.style.removeProperty('translate');
        el.style.removeProperty('transform');
        el.style.removeProperty('z-index');

        Object.assign(el.style, {
            position: 'absolute',
            inset: '0',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            maxWidth: 'none',
            maxHeight: 'none',
            margin: '0',
            display: 'block',
            objectFit: 'cover',
            border: '0'
        });
    }

    function syncFrame(el) {
        if (!slot) return;

        const update = () => {
            const ready = el.matches('img')
                ? el.complete && el.naturalWidth > 0
                : el.matches('video')
                    ? el.readyState >= 1
                    : true;

            slot.classList.toggle('has-media', ready);
        };

        el.addEventListener('load', update);
        el.addEventListener('loadedmetadata', update);

        el.addEventListener('error', () => {
            slot.classList.remove('has-media');
        });

        update();
    }

    if (old && old.tagName === replacement.tagName) {
        const previous = old.getAttribute('src');
        const previousStyle = old.getAttribute('style');
        const previousYouTube = old.getAttribute('data-yt');
        const previousError = old.getAttribute('onerror');

        cms?.mark(old, 'media');

        old.removeAttribute('onerror');
        old.removeAttribute('data-src');
        old.style.removeProperty('display');

        normalizeFrameMedia(old);

        old.src = replacement.src;

        if (item.yt) {
            old.dataset.yt = item.yt;
        } else {
            old.removeAttribute('data-yt');
        }

        if (old.matches('video')) {
            old.load();
        }

        syncFrame(old);

        undo.push({
            run() {
                const attrs = [
                    ['src', previous],
                    ['style', previousStyle],
                    ['data-yt', previousYouTube],
                    ['onerror', previousError]
                ];

                for (const [name, value] of attrs) {
                    if (value === null) {
                        old.removeAttribute(name);
                    } else {
                        old.setAttribute(name, value);
                    }
                }

                if (old.matches('video')) {
                    old.load();
                }

                syncFrame(old);
            }
        });

        select(old);

    } else if (old) {
        const skip = new Set([
            'src',
            'onerror',
            'controls',
            'muted',
            'loop',
            'playsinline',
            'preload',
            'autoplay',
            'poster',
            'allow',
            'allowfullscreen',
            'referrerpolicy',
            'title',
            'data-yt',
            'data-src',
            'frameborder',
            'alt'
        ]);

        for (const attr of old.attributes) {
            if (!skip.has(attr.name)) {
                replacement.setAttribute(
                    attr.name,
                    attr.value
                );
            }
        }

        normalizeFrameMedia(replacement);

        cms?.replace(old, replacement);

        old.replaceWith(replacement);

        syncFrame(replacement);

        undo.push({
            run() {
                replacement.replaceWith(old);
                syncFrame(old);
            }
        });

        select(replacement);

    } else {
        const host = slot || target;

        if (slot) {
            normalizeFrameMedia(replacement);
        } else {
            Object.assign(replacement.style, {
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover'
            });
        }

        host.append(replacement);

        cms?.insert(replacement);

        syncFrame(replacement);

        undo.push({
            run() {
                replacement.remove();

                if (slot) {
                    slot.classList.remove('has-media');
                }
            }
        });

        select(replacement);
    }

    cms?.touch();

    refresh();

    $('ed-msg').textContent = slot
        ? 'Đã thay media bên trong frame animation.'
        : 'Đã thay media.';
}

  function removeSelected() {
    if (!selected) return;
    const el = selected;
    const parent = el.parentNode;
    const next = el.nextSibling;
    cms?.mark(el, 'deleted');
    undo.push({ run: () => parent.insertBefore(el, next?.parentNode === parent ? next : null) });
    el.remove();
    dirty = true;
    select(null);
  }

  function putInArea(el, area) {
    const host =
        area.host && area.host.isConnected
            ? area.host
            : document.querySelector('main');

    if (!host) return;

    const bounds = host.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return;

    if (getComputedStyle(host).position === 'static') {
        host.style.position = 'relative';
    }

    const x = area.x - bounds.left;
    const y = area.y - bounds.top;

    Object.assign(el.style, {
        position: 'absolute',

        left: (x / bounds.width * 100) + '%',

        top: (y / bounds.height * 100) + '%',

        width: (area.width / bounds.width * 100) + '%',

        margin: '0',

        zIndex: '1000',

        right: 'auto',

        bottom: 'auto'
    });

    if (el.matches('img,video,iframe')) {
        el.style.height =
            (area.height / bounds.height * 100) + '%';

        el.style.objectFit = 'cover';
        el.style.display = 'block';
    }

    host.append(el);

    cms?.insert(el);

    undo.push({
        run: () => el.remove()
    });

    dirty = true;

    cms?.touch();

    select(el);
}

  function drawArea() {
    stopEdit();
    select(null);

    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;z-index:2147483550;cursor:crosshair;background:rgba(47,125,246,.06)';
    const rect = document.createElement('div');
    rect.style.cssText = 'position:fixed;display:none;border:2px dashed #2f7df6;background:#2f7df630;pointer-events:none';
    const tip = document.createElement('div');
    tip.textContent = 'Giữ chuột kéo một vùng trên trang. Nhấn Esc để hủy.';
    tip.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);padding:6px 12px;border-radius:8px;background:#2f7df6;color:white;pointer-events:none';
    const menu = document.createElement('div');
    menu.id = 'ed-menu';
    menu.innerHTML = '<button data-k="media" type="button">Ảnh / Video / YouTube</button><button data-k="text" type="button">Aa Chữ</button><button data-k="x" type="button">Hủy</button>';
    layer.append(rect, tip, menu);
    ui.append(layer);

    let start = null;
    let area = null;
    function close() {
      layer.remove();
      removeEventListener('keydown', escape, true);
    }
    function escape(event) {
      if (event.key === 'Escape') close();
    }
    function bounds(event) {
      return {
        x: Math.min(start.x, event.clientX),
        y: Math.min(start.y, event.clientY),
        width: Math.abs(event.clientX - start.x),
        height: Math.abs(event.clientY - start.y)
      };
    }

    addEventListener('keydown', escape, true);
    layer.onmousedown = event => {
      if (event.target !== layer || event.button !== 0) return;
      event.preventDefault();
      start = { x: event.clientX, y: event.clientY };
      area = null;
      menu.style.display = 'none';
      rect.style.display = 'none';
    };
    layer.onmousemove = event => {
      if (!start) return;
      const zone = bounds(event);
      positionBox(rect, {
        left: zone.x, top: zone.y, width: zone.width, height: zone.height
      });
    };
    layer.onmouseup = event => {
      if (!start) return;
      const zone = bounds(event);
      start = null;
      if (zone.width < 30 || zone.height < 30) {
        rect.style.display = 'none';
        return;
      }
      const candidates = document.querySelectorAll('.fog-panel,.act,.card,.step,section.chapter');
      const x = zone.x + zone.width / 2, y = zone.y + zone.height / 2;
      const hits = [...candidates].filter(el => {
        const r = el.getBoundingClientRect(), st = getComputedStyle(el);
        return st.visibility !== 'hidden' && +st.opacity > .5 && r.left <= x && r.right >= x && r.top <= y && r.bottom >= y;
      });
      zone.host = hits.reverse().find(el => el.matches('.fog-panel,.act,.card')) || hits[0];
      area = zone;
      const bottom = zone.y + zone.height;
      menu.style.left = Math.max(8, Math.min(zone.x, innerWidth - 380)) + 'px';
      menu.style.top = (bottom + 50 < innerHeight ? bottom + 8 : Math.max(8, zone.y - 48)) + 'px';
      menu.style.display = 'flex';
    };
    menu.onmousedown = event => event.stopPropagation();
    menu.onclick = event => {
      const key = event.target.dataset.k;
      if (!key) return;
      close();
      if (!area) return;
      if (key === 'text') {
        const el = document.createElement('p');
        el.textContent = 'Văn bản mới — bấm đúp để sửa';
        el.style.minHeight = area.height + 'px';
        putInArea(el, area);
        startEdit(el);
      }
      if (key === 'media') {

    const screen = document.querySelector(
        '.documentary-screen'
    );

    const r = screen?.getBoundingClientRect();

    const x = area.x + area.width / 2;
    const y = area.y + area.height / 2;

    const player =
        r &&
        x >= r.left &&
        x <= r.right &&
        y >= r.top &&
        y <= r.bottom
            ? screen.querySelector('#documentaryVideo')
            : null;

    askMedia(item => {

        if (player) {
            replaceMedia(item, player);
            return;
        }

        const el = makeMedia(item);

        el.style.height = area.height + 'px';
        el.style.display = 'block';

        if (!item.yt) {
            el.style.objectFit = 'cover';
        }

        putInArea(el, area);
    });
}
    };
  }

  function download(blob, name) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function exportHTML() {
    stopEdit();
    select(null);

    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('#ed-ui,#ed-style,[data-mega-runtime]').forEach(el => el.remove());
    clone.querySelectorAll('[data-mega-key]').forEach(el => el.removeAttribute('data-mega-key'));
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelector('body').classList.remove('ed-on');
    clone.setAttribute('data-mega-export', '');

    const names = new Map();
    const files = [];
    const used = new Set();
    for (const el of clone.querySelectorAll('img,video')) {
      const src = el.getAttribute('src');
      const file = blobs.get(src);
      if (!file) continue;
      if (!names.has(src)) {
        let name = file.name.replace(/[^\w.-]+/g, '_');
        while (used.has(name)) name = 'x_' + name;
        used.add(name);
        names.set(src, (file.type.startsWith('video') ? 'assets/video/' : 'assets/images/') + name);
        files.push([file, name]);
      }
      el.setAttribute('src', names.get(src));
    }

    download(new Blob(['<!DOCTYPE html>\n' + clone.outerHTML], { type: 'text/html' }), 'index.html');
    files.forEach(([file, name], index) => setTimeout(() => download(file, name), 600 * (index + 1)));
    dirty = false;
    alert(files.length
      ? 'Đã tải index.html và các tệp ảnh/video. Đặt ảnh vào assets/images/, video vào assets/video/.'
      : 'Đã tải index.html.');
  }

  const toggle = $('ed-toggle');
  const login = $('ed-login');

  function setOn(value) {
    on = value;
    document.body.classList.toggle('ed-on', on);
    toggle.textContent = on ? '✔ Xong' : '✎ Chỉnh sửa';
    toggle.setAttribute('aria-expanded', String(on));
    bar.classList.toggle('open', on);

    if (on) {
      refresh();
      animateBox();
    } else {
      stopEdit();
      select(null);
      hover.style.display = 'none';
      cancelAnimationFrame(frame);
    }
  }

  toggle.onclick = () => {
    if (on) {
      setOn(false);
      return;
    }
    try {
      if (cms && !cms.openEditor()) {
        login.hidden = false;
        $('ed-google').focus();
        return;
      }
      setOn(true);
    } catch (error) {
      alert(error.message || 'Không mở được trình chỉnh sửa.');
    }
  };

  $('ed-cancel-login').onclick = () => {
    login.hidden = true;
    toggle.focus();
  };

  $('ed-google').onclick = async event => {
    const button = event.currentTarget;
    button.disabled = true;
    $('ed-auth-error').textContent = '';
    try {
      await cms.signIn();
    } catch (error) {
      $('ed-auth-error').textContent = error.message;
      button.disabled = false;
    }
  };

  document.addEventListener('mousedown', event => {
    if (!on || event.button !== 0 || inUI(event.target)) return;
    if (event.target === document.documentElement && event.clientX >= document.documentElement.clientWidth) return;
    if (editing?.contains(event.target)) return;
    stopEdit();
    const el = pick(event);
    if (!el) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (el !== selected) select(el);
    startDrag(event);
  }, true);

  document.addEventListener('click', event => {
    if (!on || inUI(event.target) || editing?.contains(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('dblclick', event => {
    if (!on || inUI(event.target) || !selected) return;
    event.preventDefault();
    if (isMedia(selected) || isSlot(selected)) askMedia(replaceMedia);
    else startEdit(selected);
  }, true);

  document.addEventListener('mousemove', event => {
    if (!on || hoverQueued) return;
    if (inUI(event.target)) {
      hover.style.display = 'none';
      return;
    }
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      if (!on) return;
      const el = stackAt(event.clientX, event.clientY)[0];
      if (!el || el === selected) hover.style.display = 'none';
      else positionBox(hover, el.getBoundingClientRect());
    });
  }, true);

  document.addEventListener('keydown', event => {
    if (!on) return;
    if (editing) {
      if (event.key === 'Escape') stopEdit();
      return;
    }
    if (/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName || '')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      doUndo();
      return;
    }
    if (event.key === 'Escape') {
      select(null);
      return;
    }
    if (!selected) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeSelected();
      return;
    }

    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    }[event.key];
    if (direction) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const [left, top] = offset(selected);
      track(selected, 'nudge');
      ensureBox(selected);
      move(selected, left + direction[0] * step, top + direction[1] * step);
    }
  }, true);

  addEventListener('beforeunload', event => {
    if (dirty || (editing && editing.innerHTML !== priorText)) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  bar.addEventListener('mousedown', event => {
    if (!/INPUT|SELECT|OPTION/.test(event.target.tagName)) event.preventDefault();
  });

  font.onchange = () => format('fontName', font.value.split(',')[0].replace(/'/g, ''), 'fontFamily', font.value);
  size.oninput = () => {
    if (selected && size.value) {
      track(selected, 'fontSize');
      selected.style.fontSize = size.value + 'rem';
    }
  };
  color.oninput = () => format('foreColor', color.value, 'color', color.value);
  $('ed-b').onclick = () => {
    if (editing && savedRange && !savedRange.collapsed) format('bold');
    else if (selected) format(null, null, 'fontWeight', +getComputedStyle(selected).fontWeight >= 600 ? '400' : '700');
  };
  $('ed-i').onclick = () => {
    if (editing && savedRange && !savedRange.collapsed) format('italic');
    else if (selected) format(null, null, 'fontStyle', getComputedStyle(selected).fontStyle === 'italic' ? 'normal' : 'italic');
  };
  bar.querySelectorAll('[data-al]').forEach(button => {
    button.onclick = () => format(null, null, 'textAlign', button.dataset.al);
  });
  $('ed-edit').onclick = () => startEdit(selected);
  $('ed-replace').onclick = () => askMedia(replaceMedia);
  $('ed-image-url').onclick = () => {
    if (!selected) return;
    const image = selected.matches('img') ? selected : selected.querySelector('img');
    const value = prompt('Dán đường dẫn ảnh trong assets/ hoặc Supabase Storage:', image?.getAttribute('src') || '');
    if (value === null) return;
    const url = value.trim();

    if (!cms?.okUrl(url)) {
      $('ed-msg').textContent = 'Hãy dùng đường dẫn assets/ hoặc Supabase Storage.';
      return;
    }
    if (image) {
      const previous = image.getAttribute('src');
      cms.mark(image, 'media');
      image.removeAttribute('onerror');
      image.style.removeProperty('display');
      image.src = url;
      undo.push({
        run() {
          if (previous === null) image.removeAttribute('src');
          else image.setAttribute('src', previous);
        }
      });
    } else {
      const el = document.createElement('img');
      el.src = url;
      el.alt = '';
      el.style.width = '100%';
      const slot = selected.matches('.ph,.slot,.op-frame') ? selected : selected.querySelector('.ph,.slot,.op-frame') || selected;
      slot.append(el);
      cms.insert(el);
      undo.push({ run: () => el.remove() });
      select(el);
    }
    dirty = true;
    $('ed-msg').textContent = 'Đã đổi ảnh.';
  };

  fit.onchange = () => {
    const el = selected && (isMedia(selected) ? selected : selected.querySelector(MEDIA_SEL));
    if (el) {
      track(el, 'fit');
      el.style.objectFit = fit.value;
    }
  };
  $('ed-draw').onclick = drawArea;
  $('ed-reset-box').onclick = () => {
    if (!selected) return;
    track(selected, 'reset');
    for (const property of ['translate', 'width', 'height', 'minHeight', 'maxWidth', 'aspectRatio']) {
      selected.style[property] = '';
    }
  };
  $('ed-del').onclick = removeSelected;
  $('ed-undo').onclick = doUndo;
  $('ed-export').onclick = exportHTML;
  $('ed-door').onclick = () => $('opening')?.classList.toggle('open');

  const cloudButtons = ['ed-save', 'ed-publish', 'ed-reset', 'ed-logout'].map($);
  let cloudBusy = false;

  async function online(message, action) {
    if (cloudBusy) return;
    stopEdit();
    cloudBusy = true;
    cloudButtons.forEach(button => { button.disabled = true; });
    const status = $('ed-msg');
    status.textContent = message;

    try {
      if (!cms) throw new Error('Thiếu js/cms.js.');
      await action(status);
    } catch (error) {
      status.textContent = error.message || 'Không thực hiện được.';
    } finally {
      cloudBusy = false;
      cloudButtons.forEach(button => { button.disabled = false; });
    }
  }

  async function saveOnline(publish) {
    if (cloudBusy || (publish && !confirm('Xuất bản các thay đổi lên website công khai?'))) return;
    await online(publish ? 'Đang xuất bản…' : 'Đang lưu nháp…', async status => {
      const savedCurrentChanges = await cms.save(publish, blobs);
      if (savedCurrentChanges && !editing) dirty = false;
      status.textContent = publish ? 'Đã xuất bản lên web.' : 'Đã lưu nháp.';
    });
  }

  $('ed-save').onclick = () => saveOnline(false);
  $('ed-publish').onclick = () => saveOnline(true);
  $('ed-reset').onclick = () => {
    if (cloudBusy || !confirm('Bỏ nháp và lấy lại bản đã xuất bản?')) return;
    return online('Đang lấy lại bản đã xuất bản…', async () => {
      await cms.discardDraft();
      dirty = false;
      location.reload();
    });
  };
  $('ed-logout').onclick = () => {
    if (cloudBusy || ((dirty || editing) && !confirm('Đăng xuất và bỏ các thay đổi chưa lưu?'))) return;
    return online('Đang đăng xuất…', async () => {
      await cms.signOut();
      dirty = false;
      location.href = location.pathname;
    });
  };

  refresh();
})();