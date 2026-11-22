
/* CMS public reader: no editor UI */
(() => {
  if (window.__megaPublicLoaded) return;
  window.__megaPublicLoaded = true;

  const cfg = window.CMS_CONFIG;
  if (!cfg?.url || !cfg?.key) return;

  const SKIP =
    '.rail,.progress,#cap,.tl-map,svg,script,style,.op-door.r,#tlYear,#reveal,#ed-ui';

  const INLINE = new Set([
    'B', 'I', 'EM', 'STRONG', 'MARK', 'U', 'BR'
  ]);

  const keyOf = el => {
    const parts = [];

    while (el && el !== document.body) {
      if (el.id) {
        parts.unshift('#' + el.id);
        break;
      }

      let i = 1;
      let s = el;

      while ((s = s.previousElementSibling)) i++;

      parts.unshift(
        el.tagName.toLowerCase() + ':' + i
      );

      el = el.parentElement;
    }

    return parts.join('>');
  };

  function clean(html) {
    const doc = new DOMParser().parseFromString(
      '<body>' + String(html) + '</body>',
      'text/html'
    );

    function walk(parent) {
      for (const node of [...parent.childNodes]) {
        if (node.nodeType === 3) continue;

        if (node.nodeType !== 1) {
          node.remove();
          continue;
        }

        walk(node);

        if (!INLINE.has(node.tagName)) {
          node.replaceWith(...node.childNodes);
        } else {
          for (const a of [...node.attributes]) {
            node.removeAttribute(a.name);
          }
        }
      }
    }

    walk(doc.body);
    return doc.body.innerHTML;
  }

  const texts = {};

  document.querySelectorAll('body *').forEach(el => {
    if (el.closest(SKIP) || !el.textContent.trim()) {
      return;
    }

    if (
      [...el.childNodes].every(
        n =>
          n.nodeType === 3 ||
          (n.nodeType === 1 && INLINE.has(n.tagName))
      )
    ) {
      texts[keyOf(el)] = el;
    }
  });

  const reveal = document.getElementById('reveal');

  if (reveal) {
    texts[keyOf(reveal)] = reveal;
  }

  const images = {};

  document.querySelectorAll('img').forEach(el => {
    images[keyOf(el)] = el;
  });

  const layers = [
    ...document.querySelectorAll('.layer')
  ];

  const cards = {};

  document.querySelectorAll('.card').forEach(el => {
    cards[keyOf(el)] = el;
  });

  const fonts = {
    'Be Vietnam Pro':
      "'Be Vietnam Pro',system-ui,sans-serif",
    Newsreader:
      "'Newsreader',Georgia,serif",
    Georgia:
      'Georgia,serif',
    'Hệ thống':
      'system-ui,sans-serif'
  };

  const okUrl = u =>
    typeof u === 'string' &&
    (
      /^assets\//.test(u) ||
      u.startsWith(cfg.url + '/storage/')
    );

  function syncYT(layer) {
    const frame = layer.querySelector('iframe.yt');
    if (!frame) return;

    const want = layer.classList.contains('on')
      ? frame.dataset.src
      : '';

    if (want) {
      if (frame.src !== want) frame.src = want;
    } else {
      frame.removeAttribute('src');
    }
  }

  layers.forEach(layer => {
    new MutationObserver(
      () => syncYT(layer)
    ).observe(layer, {
      attributes: true,
      attributeFilter: ['class']
    });
  });

  function apply(data) {
    if (!data || typeof data !== 'object') return;

    Object.entries(data.t || {}).forEach(([k, v]) => {
      const el = texts[k];

      if (!el || typeof v !== 'string') return;

      if (el.id === 'reveal') {
        el.textContent = v;
      } else {
        el.innerHTML = clean(v);
      }

      const left = el.closest('.op-door.l');
      const right = document.querySelector('.op-door.r');

      if (left && right) {
        const index = [
          ...left.querySelectorAll('*')
        ].indexOf(el);

        const twin =
          right.querySelectorAll('*')[index];

        if (twin) {
          twin.innerHTML = el.innerHTML;
        }
      }
    });

    Object.entries(data.s || {}).forEach(([k, v]) => {
      const el = texts[k];

      if (!el || !v) return;

      el.style.fontSize =
        /^[\d.]+rem$/.test(v.fs || '')
          ? v.fs
          : '';

      el.style.fontFamily =
        fonts[v.ff] || '';

      el.style.color =
        /^#[0-9a-f]{3,8}$/i.test(v.c || '')
          ? v.c
          : '';
    });

    Object.entries(data.i || {}).forEach(([k, u]) => {
      if (images[k] && okUrl(u)) {
        images[k].style.display = '';
        images[k].src = u;
      }
    });

    Object.entries(data.c || {}).forEach(([k, v]) => {
      if (layers[+k] && typeof v === 'string') {
        layers[+k].dataset.cap = v;
      }
    });

    Object.entries(data.y || {}).forEach(([k, id]) => {
      const layer = layers[+k];
      if (!layer) return;

      let frame = layer.querySelector('iframe.yt');
      const video = layer.querySelector('video');

      if (!/^[\w-]{11}$/.test(id)) {
        frame?.remove();

        if (video) {
          video.style.display = '';
        }

        return;
      }

      if (!frame) {
        frame = document.createElement('iframe');
        frame.className = 'yt';
        frame.title = 'YouTube';
        frame.allow = 'autoplay; encrypted-media';
        layer.appendChild(frame);
      }

      frame.dataset.src =
        'https://www.youtube-nocookie.com/embed/' +
        id +
        '?autoplay=1&mute=1&loop=1&playlist=' +
        id +
        '&controls=0&playsinline=1';

      if (video) {
        video.pause();
        video.style.display = 'none';
      }

      syncYT(layer);
    });

    document.querySelectorAll('.cmsFig').forEach(
      el => el.remove()
    );

    (data.n || []).forEach(item => {
      const card = cards[item.k];

      if (!card || !okUrl(item.u)) return;

      const figure = document.createElement('figure');
      figure.className = 'cmsFig';

      const img = document.createElement('img');
      img.src = item.u;
      img.alt = item.c || '';

      const caption = document.createElement('figcaption');
      caption.textContent = item.c || '';

      figure.append(img, caption);
      card.appendChild(figure);
    });

    window.CMSX_apply?.(data);
    window.__rebuildReveal?.();
  }

  const style = document.createElement('style');

  style.textContent = `
    .layer iframe.yt {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100vw;
      height: 56.25vw;
      min-height: 100vh;
      min-width: 177.78vh;
      transform: translate(-50%, -50%);
      border: 0;
      pointer-events: none;
    }

    .cmsFig img {
      width: 100%;
      height: auto;
    }

    .cmsFig figcaption {
      font-size: .85rem;
      opacity: .8;
    }
  `;

  document.head.appendChild(style);

  window.MEGA_CMS = {
    apply,
    keyOf,
    texts,
    images,
    clean,
    okUrl
  };

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    10000
  );

  fetch(
    cfg.url +
      '/rest/v1/site_content?id=eq.published&select=data',
    {
      headers: {
        apikey: cfg.key,
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store',
      signal: controller.signal
    }
  )
    .then(async r => {
      if (!r.ok) {
        throw Error('HTTP ' + r.status);
      }

      return r.json();
    })
    .then(rows => {
      if (rows?.[0]?.data) {
        apply(rows[0].data);
      }
    })
    .catch(e => {
      console.warn(
        'Không tải được nội dung xuất bản:',
        e
      );
    })
    .finally(() => {
      clearTimeout(timeout);
    });
})();
