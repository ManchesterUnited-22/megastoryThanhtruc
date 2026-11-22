/* Đọc nội dung công khai và lưu thay đổi từ editor xanh. */
(() => {
  const cfg = window.CMS_CONFIG || {};
  const KEY = 'data-mega-key';
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&family=Merriweather:wght@400;700&family=Montserrat:wght@400;700&family=Roboto:wght@400;700&family=Oswald:wght@400;700&display=swap';
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const LEGACY_FONTS = {
    'Be Vietnam Pro': "'Be Vietnam Pro',system-ui,sans-serif",
    Newsreader: "'Newsreader',Georgia,serif",
    Georgia: 'Georgia,serif',
    'Hệ thống': 'system-ui,sans-serif'
  };
  const INLINE = new Set(['B', 'I', 'EM', 'STRONG', 'MARK', 'U', 'BR']);
  const SKIP = '.rail,.progress,#cap,.tl-map,svg,script,style,.op-door.r,#tlYear,#reveal,#cmsBar,#cmsLogin';
  const STYLES = [
    'translate', 'width', 'height', 'min-height', 'max-width',
    'aspect-ratio', 'box-sizing', 'object-fit', 'display',
    'position', 'margin', 'left', 'top', 'z-index', 'border',
    'font-size', 'font-family', 'font-weight', 'font-style',
    'color', 'text-align', 'text-decoration', 'vertical-align', 'white-space'
  ];
  const TAGS = new Set('a b blockquote br button code div em figcaption figure h1 h2 h3 h4 h5 h6 i iframe img label li mark ol p pre s small span strong sub sup u ul video'.split(' '));
  const ATTRIBUTES = new Set('id class title alt role aria-label aria-hidden width height controls muted loop autoplay playsinline preload loading allow allowfullscreen referrerpolicy data-yt data-mega-key'.split(' '));

  const tracked = new Map();
  const uploaded = new Map();
  const removals = [];
  const exported = document.documentElement.hasAttribute('data-mega-export');
  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const editRequested = new URLSearchParams(location.search).has('edit') || readPending();

  let client;
  let session;
  let authError;
  let rows = new Map();
  let data = {};
  let entries = new Map();
  let editRevision = 0;

  function lookup(key) {
    if (key === '@') return document.body;
    if (typeof key !== 'string') return null;
    return document.querySelector('[' + KEY + '="' + CSS.escape(key) + '"]');
  }

  function readPending() {
    try {
      return sessionStorage.getItem('mega-sign-in') === '1';
    } catch {
      return false;
    }
  }

  function setPending(value) {
    try {
      if (value) sessionStorage.setItem('mega-sign-in', '1');
      else sessionStorage.removeItem('mega-sign-in');
    } catch {
      // URL OAuth vẫn mang ?edit=1.
    }
  }

  function webUrl(value) {
    if (typeof value !== 'string' || !value) return null;
    try {
      const url = new URL(value, document.baseURI);
      if (url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === location.origin)) {
        return url;
      }
    } catch {
      // URL không hợp lệ.
    }
    return null;
  }

  function okUrl(value) {
    if (typeof value !== 'string') return false;
    if (!value.startsWith('assets/') && !value.startsWith(cfg.url + '/storage/')) return false;
    return !!webUrl(value) || (location.protocol === 'file:' && value.startsWith('assets/'));
  }

  function youtube(value) {
    const url = webUrl(value);
    return url &&
      ['https://www.youtube.com', 'https://www.youtube-nocookie.com'].includes(url.origin) &&
      /^\/embed\/[\w-]{11}$/.test(url.pathname);
  }

  function keyOf(el) {
    const parts = [];
    while (el && el !== document.body) {
      if (el.id) {
        parts.unshift('#' + el.id);
        break;
      }
      let index = 1;
      let sibling = el;
      while ((sibling = sibling.previousElementSibling)) index += 1;
      parts.unshift(el.tagName.toLowerCase() + ':' + index);
      el = el.parentElement;
    }
    return parts.join('>');
  }

  function legacyText(html) {
    const input = document.createElement('template');
    const output = document.createElement('template');
    input.innerHTML = html;

    function copy(parent, child) {
      if (child.nodeType === Node.TEXT_NODE) {
        parent.append(document.createTextNode(child.data));
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const target = INLINE.has(child.tagName)
        ? document.createElement(child.localName)
        : parent;
      if (target !== parent) parent.append(target);
      for (const node of child.childNodes) copy(target, node);
    }

    for (const child of input.content.childNodes) copy(output.content, child);
    return output.innerHTML;
  }

  function twin(el) {
    const left = el.closest('.op-door.l');
    const right = document.querySelector('.op-door.r');
    if (!left || !right) return null;
    return right.querySelectorAll('*')[[...left.querySelectorAll('*')].indexOf(el)] || null;
  }

  function applyLegacy(content) {
    const texts = new Map();
    const images = new Map();
    const cards = new Map();
    const layers = [...document.querySelectorAll('.layer')];

    for (const el of document.querySelectorAll('body *')) {
      if (el.closest(SKIP) || !el.textContent.trim()) continue;
      if ([...el.childNodes].every(node => node.nodeType === 3 || (node.nodeType === 1 && INLINE.has(node.tagName)))) {
        texts.set(keyOf(el), el);
      }
    }
    const reveal = document.getElementById('reveal');
    if (reveal) texts.set(keyOf(reveal), reveal);
    for (const img of document.querySelectorAll('img')) images.set(keyOf(img), img);
    for (const card of document.querySelectorAll('.card')) cards.set(keyOf(card), card);

    for (const [key, value] of Object.entries(content.t || {})) {
      const el = texts.get(key);
      if (!el || typeof value !== 'string') continue;
      if (el.id === 'reveal') {
        el.textContent = value;
      } else {
        el.innerHTML = legacyText(value);
        const second = twin(el);
        if (second) second.innerHTML = el.innerHTML;
      }
    }

    for (const [key, value] of Object.entries(content.s || {})) {
      const el = texts.get(key);
      if (!el || !value) continue;
      for (const target of [el, twin(el)]) {
        if (!target) continue;
        target.style.fontSize = /^[\d.]+rem$/.test(value.fs || '') ? value.fs : '';
        target.style.fontFamily = Object.hasOwn(LEGACY_FONTS, value.ff) ? LEGACY_FONTS[value.ff] : '';
        target.style.color = /^#[0-9a-f]{3,8}$/i.test(value.c || '') ? value.c : '';
      }
    }

    for (const [key, value] of Object.entries(content.i || {})) {
      const image = images.get(key);
      if (image && okUrl(value)) {
        image.style.display = '';
        image.src = value;
      }
    }

    for (const [key, value] of Object.entries(content.c || {})) {
      if (layers[+key] && typeof value === 'string') layers[+key].dataset.cap = value;
    }

    for (const [key, id] of Object.entries(content.y || {})) {
      const layer = layers[+key];
      if (!layer) continue;
      let iframe = layer.querySelector('iframe.yt');
      const video = layer.querySelector('video');

      if (typeof id !== 'string' || !/^[\w-]{11}$/.test(id)) {
        iframe?.remove();
        if (video) video.style.display = '';
        continue;
      }

      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.className = 'yt';
        iframe.title = 'Video YouTube';
        iframe.tabIndex = -1;
        iframe.allow = 'autoplay; encrypted-media';
        layer.append(iframe);
      }
      iframe.dataset.src = 'https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=1&mute=1&loop=1&playlist=' + id + '&controls=0&playsinline=1';

      if (video) {
        video.pause();
        video.style.display = 'none';
      }
    }

    for (const layer of layers) {
      function sync() {
        const iframe = layer.querySelector('iframe.yt');
        if (!iframe) return;
        const url = layer.classList.contains('on') ? iframe.dataset.src : '';
        if (url && youtube(url)) {
          if (iframe.getAttribute('src') !== url) iframe.src = url;
        } else {
          iframe.removeAttribute('src');
        }
      }
      new MutationObserver(sync).observe(layer, { attributes: true, attributeFilter: ['class'] });
      sync();
    }

    document.querySelectorAll('.cmsFig').forEach(el => el.remove());
    const figures = Array.isArray(content.n) ? content.n : [];
    for (const item of figures) {
      const card = item && cards.get(item.k);
      if (!card || !okUrl(item.u)) continue;
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      const caption = document.createElement('figcaption');
      figure.className = 'cmsFig';
      img.src = item.u;
      img.alt = item.c || '';
      img.loading = 'lazy';
      caption.textContent = item.c || '';
      figure.append(img, caption);
      card.append(figure);
    }

    window.CMSX_apply?.(content);
  }

  const legacyStyle = document.createElement('style');
  legacyStyle.dataset.megaRuntime = '';
  legacyStyle.textContent = `
    .layer iframe.yt{position:absolute;top:50%;left:50%;width:100vw;height:56.25vw;min-height:100vh;min-width:177.78vh;transform:translate(-50%,-50%);border:0;pointer-events:none}
    .cmsFig{margin:1.2rem 0 0;position:relative}
    .cmsFig img{display:block;width:100%;height:auto;max-height:55vh;object-fit:cover;border-radius:3px}
    .cmsFig figcaption{margin-top:.5rem;font-size:.85rem;font-style:italic;opacity:.8}
    .cmsFig figcaption:empty{display:none}
  `;
  document.head.append(legacyStyle);

  function indexElements(parent, prefix) {
    const counts = new Map();
    for (const el of parent.children) {
      if (!(el instanceof HTMLElement) || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName)) continue;
      const tag = el.localName;
      const count = (counts.get(tag) || 0) + 1;
      counts.set(tag, count);
      const key = el.id ? '#' + el.id : prefix + '/' + tag + ':' + count;
      el.setAttribute(KEY, key);
      indexElements(el, key);
    }
  }

  function touch() {
    editRevision += 1;
  }

  function record(key, type) {
    if (!key) return;
    touch();
    if (!tracked.has(key)) tracked.set(key, new Set());
    tracked.get(key).add(type);
  }

  function mark(el, type) {
    record(el?.getAttribute(KEY), type);
  }

  function replace(before, after) {
    const key = before.getAttribute(KEY);
    if (!key) return;
    after.setAttribute(KEY, key);
    record(key, 'media');
  }

  function insert(el) {
    const parent = el.parentElement === document.body ? '@' : el.parentElement?.getAttribute(KEY);
    if (!parent) return;
    const key = 'new-' + (crypto.randomUUID?.() || Date.now() + '-' + Math.random());
    el.setAttribute(KEY, key);
    indexElements(el, key);
    record(key, 'insert');
  }

  function copyStyles(source, target) {
    for (const property of STYLES) {
      const value = source.getPropertyValue(property);
      if (value && !/url\s*\(|\\|[<>{}]/i.test(value)) target.setProperty(property, value);
      else target.removeProperty(property);
    }
  }

  function safeFragment(html, mediaUrls = new Map()) {
    const input = document.createElement('template');
    input.innerHTML = typeof html === 'string' ? html : '';
    const result = document.createDocumentFragment();

    function append(parent, child) {
      if (child.nodeType === Node.TEXT_NODE) {
        parent.append(document.createTextNode(child.data));
        return;
      }
      if (child.namespaceURI !== 'http://www.w3.org/1999/xhtml' || !TAGS.has(child.localName)) return;

      const tag = child.localName;
      if (tag === 'span' && child.hasAttribute('data-mega-word')) {
        for (const node of child.childNodes) append(parent, node);
        return;
      }

      const originalSource = child.getAttribute('src');
      const src = mediaUrls.get(originalSource) || originalSource;
      if (tag === 'iframe' && !youtube(src || child.dataset.src)) return;

      const el = document.createElement(tag);
      for (const { name, value } of child.attributes) {
        if (ATTRIBUTES.has(name)) el.setAttribute(name, value);
      }
      copyStyles(child.style, el.style);

      if (tag === 'iframe') {
        if (youtube(src)) el.setAttribute('src', src);
        if (youtube(child.dataset.src)) el.dataset.src = child.dataset.src;
        el.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      } else if (tag === 'img' || tag === 'video') {
        if (webUrl(src)) el.setAttribute('src', src);
        const poster = child.getAttribute('poster');
        if (tag === 'video' && webUrl(poster)) el.setAttribute('poster', poster);
      } else if (tag === 'a') {
        const href = child.getAttribute('href');
        if (webUrl(href)) el.setAttribute('href', href);
      }

      for (const node of child.childNodes) append(el, node);
      parent.append(el);
    }

    for (const node of input.content.childNodes) append(result, node);
    return result;
  }

  function safeHtml(html, urls) {
    const template = document.createElement('template');
    template.content.append(safeFragment(html, urls));
    return template.innerHTML;
  }

  function applyChanges() {
    if (!entries.size) return;

    if (!document.getElementById('ed-fonts')) {
      const fonts = document.createElement('link');
      fonts.id = 'ed-fonts';
      fonts.rel = 'stylesheet';
      fonts.href = FONT_URL;
      document.head.append(fonts);
    }

    for (const [key, change] of entries) {
      if (!change?.insert || lookup(key)) continue;
      const parent = lookup(change.parent);
      const el = safeFragment(change.insert).firstElementChild;
      if (parent && el) {
        el.setAttribute(KEY, key);
        parent.append(el);
      }
    }

    for (const [key, change] of entries) {
      if (typeof change?.text !== 'string') continue;
      lookup(key)?.replaceChildren(safeFragment(change.text));
    }

    for (const [key, change] of entries) {
      let el = lookup(key);
      if (!el || !change) continue;

      if (change.media) {
        const replacement = safeFragment(change.media).firstElementChild;
        if (replacement?.matches('img,video,iframe') && el.matches('img,video,iframe')) {
          replacement.setAttribute(KEY, key);
          el.replaceWith(replacement);
          el = replacement;
        }
      }

      if (typeof change.style === 'string') {
        const sample = document.createElement('div');
        sample.style.cssText = change.style;
        copyStyles(sample.style, el.style);
      }

      if (change.deleted) removals.push(el);
    }
  }

  function finish() {
    // main.js lấy tham chiếu cho các hiệu ứng trước khi bỏ phần tử đã xóa.
    for (const el of removals) el.remove();
  }

  function loadSDK() {
    if (window.supabase?.createClient) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.dataset.megaRuntime = '';
      const timeout = setTimeout(() => {
        script.remove();
        reject(new Error('Quá thời gian tải thư viện Supabase.'));
      }, 8000);

      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Không tải được thư viện Supabase.'));
      };
      document.head.append(script);
    });
  }

  async function readPublished() {
    const response = await fetch(cfg.url + '/rest/v1/site_content?id=eq.published&select=data', {
      headers: { apikey: cfg.key },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Không đọc được bản đã xuất bản (' + response.status + ').');

    const result = await response.json();
    if (!result[0]) throw new Error('Thiếu dòng published hoặc quyền đọc công khai.');
    return result[0].data || {};
  }

  async function loadDraft() {
    await loadSDK();
    client = window.supabase.createClient(cfg.url, cfg.key, {
      global: {
        fetch(input, options = {}) {
          const url = String(input?.url || input);
          if (url.includes('/storage/v1/')) return fetch(input, options);
          const deadline = AbortSignal.timeout(15000);
          const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
          return fetch(input, { ...options, signal });
        }
      }
    });

    const auth = await client.auth.getSession();
    if (auth.error) throw auth.error;
    session = auth.data.session;
    if (!session) return null;
    setPending(false);

    const result = await client.from('site_content').select('id,data,updated_at')
      .in('id', ['draft', 'published']);
    if (result.error) throw result.error;

    rows = new Map(result.data.map(row => [row.id, row]));
    if (!rows.has('draft') || !rows.has('published')) {
      throw new Error('Tài khoản chưa có quyền xem bản nháp hoặc thiếu dòng draft/published.');
    }
    const draft = rows.get('draft').data;
    return draft && Object.keys(draft).length ? draft : rows.get('published').data || {};
  }

  async function boot() {
    if (cfg.url && cfg.key && location.protocol !== 'file:' && !exported) {
      data = null;
      if (editRequested || local) {
        try {
          data = await loadDraft();
        } catch (error) {
          authError = error;
        }
      }
      if (!data) {
        try {
          data = await readPublished();
        } catch (error) {
          console.warn('Megastory:', error.message);
          data = {};
        }
      }
    }

    window.CMSX_init?.({ EDIT: false, keyOf, okUrl });
    if (!exported) applyLegacy(data);
    indexElements(document.body, '@');
    entries = new Map(Array.isArray(data.editorV1) ? data.editorV1 : []);
    applyChanges();
  }

  function openEditor() {
    if (local || exported) return true;
    if (authError) throw authError;
    if (session && rows.has('draft')) return true;
    if (!client) throw new Error('Kiểm tra cấu hình Supabase.');
    return false;
  }

  async function signIn() {
    if (!client) throw new Error('Kiểm tra cấu hình Supabase.');
    const redirect = new URL(location.pathname, location.origin);
    redirect.searchParams.set('edit', '1');
    setPending(true);
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirect.href }
      });
      if (error) throw error;
    } catch (error) {
      setPending(false);
      throw error;
    }
  }

  async function signOut() {
    if (!client) throw new Error('Chưa có kết nối Supabase.');
    if (session) {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      session = null;
    }
    setPending(false);
  }

  function collect() {
    const next = new Map([...entries].map(([key, change]) => [key, { ...change }]));

    for (const [key, flags] of tracked) {
      const change = { ...next.get(key) };
      const el = lookup(key);
      if (!el) {
        if (flags.has('deleted') || change.insert) change.deleted = true;
      } else {
        delete change.deleted;
        if (flags.has('insert')) {
          change.parent = el.parentElement === document.body ? '@' : el.parentElement.getAttribute(KEY);
          change.insert = el.outerHTML;
        }
        if (flags.has('text')) change.text = el.innerHTML;
        if (flags.has('media')) change.media = el.outerHTML;
        if (flags.has('style')) {
          const sample = document.createElement('div');
          copyStyles(el.style, sample.style);
          change.style = sample.style.cssText;
        }
      }
      if (Object.keys(change).length) next.set(key, change);
    }
    return next;
  }

  async function uploadMedia(next, blobs) {
    const sources = new Set();
    for (const change of next.values()) {
      if (change.deleted) continue;
      for (const field of ['insert', 'text', 'media']) {
        if (typeof change[field] !== 'string') continue;
        const template = document.createElement('template');
        template.innerHTML = change[field];
        for (const el of template.content.querySelectorAll('img[src],video[src]')) {
          const src = el.getAttribute('src');
          if (src.startsWith('blob:')) sources.add(src);
        }
      }
    }

    for (const src of sources) {
      if (uploaded.has(src)) continue;
      const file = blobs.get(src);
      if (!file) throw new Error('Thiếu tệp ảnh hoặc video gốc. Hãy chọn lại tệp.');

      const extension = file.name.match(/\.[a-z0-9]{1,10}$/i)?.[0] || '';
      const path = 'megastory-editor/' + crypto.randomUUID() + extension;
      const bucket = client.storage.from('media');
      const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error('Không tải được ' + file.name + ': ' + error.message);
      uploaded.set(src, bucket.getPublicUrl(path).data.publicUrl);
    }
  }

  function assertCanSave() {
    if (!client || !session || !rows.has('draft') || authError) {
      throw new Error('Hãy mở website với ?edit=1 và đăng nhập tài khoản quản trị.');
    }
  }

  async function write(payload, publish, checkPublished = publish) {
    const result = await client.rpc('megastory_save', {
      p_content: payload,
      p_publish: publish,
      p_draft_updated_at: rows.get('draft').updated_at,
      p_published_updated_at: rows.get('published').updated_at,
      p_check_published: checkPublished
    });
    if (result.error) throw result.error;
    for (const row of result.data) rows.set(row.id, row);
    data = payload;
  }

  async function save(publish, blobs) {
    assertCanSave();
    const revision = editRevision;
    const next = collect();
    await uploadMedia(next, blobs);

    for (const change of next.values()) {
      for (const field of ['insert', 'text', 'media']) {
        if (typeof change[field] === 'string') change[field] = safeHtml(change[field], uploaded);
      }
    }

    await write({ ...data, editorV1: [...next] }, publish);
    entries = next;
    return revision === editRevision;
  }

  async function discardDraft() {
    assertCanSave();
    const result = await client.from('site_content').select('id,data,updated_at')
      .eq('id', 'published').single();
    if (result.error) throw result.error;
    rows.set('published', result.data);
    await write(result.data.data || {}, false, true);
  }

  window.MEGA_CMS = {
    editRequested, openEditor, signIn, signOut, okUrl,
    mark, replace, insert, touch, finish, save, discardDraft,
    ready: boot()
  };
})();