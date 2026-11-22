
/* Unified blue editor + Supabase auth and publishing */
(() => {
  if (window.__megaEditorLoaded) return;
  window.__megaEditorLoaded = true;

  const cfg = window.CMS_CONFIG;

  const editRequested =
    new URLSearchParams(location.search).get('edit') === '1' ||
    sessionStorage.getItem('mega_oauth_pending') === '1';

  if (!editRequested) return;

  const wait = () => new Promise(resolve => {
    if (window.MEGA_CMS) {
      return resolve(window.MEGA_CMS);
    }

    const timer = setInterval(() => {
      if (window.MEGA_CMS) {
        clearInterval(timer);
        resolve(window.MEGA_CMS);
      }
    }, 30);

    setTimeout(() => {
      clearInterval(timer);

      if (!window.MEGA_CMS) {
        alert('Không tải được CMS. Kiểm tra config.js.');
      }
    }, 10000);
  });

  wait().then(start);

  async function start(api) {
    if (!cfg?.url || !cfg?.key) {
      return alert('Thiếu cấu hình Supabase');
    }

    const style = document.createElement('style');

    style.textContent = `
      #ed-ui,
      #ed-ui * {
        box-sizing: border-box;
        font: 13px/1.4 system-ui, sans-serif;
      }

      #ed-toggle {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483600;
        border: 0;
        border-radius: 99px;
        padding: 12px 18px;
        background: #2679ed;
        color: white;
        font-weight: 700;
        box-shadow: 0 5px 18px #0006;
        cursor: pointer;
      }

      #ed-panel {
        position: fixed;
        bottom: 72px;
        right: 16px;
        z-index: 2147483600;
        width: min(360px, calc(100vw - 32px));
        max-height: 75vh;
        overflow: auto;
        padding: 15px;
        background: #151b2a;
        color: white;
        border: 1px solid #36445d;
        border-radius: 14px;
        box-shadow: 0 8px 30px #0009;
        display: none;
      }

      #ed-panel.open {
        display: block;
      }

      #ed-panel h3 {
        margin: 0 0 10px;
        font-size: 16px;
      }

      #ed-panel button,
      #ed-panel select,
      #ed-panel input {
        padding: 8px;
        border-radius: 7px;
        border: 1px solid #46516a;
        background: #29354d;
        color: white;
      }

      #ed-panel button {
        cursor: pointer;
      }

      #ed-panel .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin: 10px 0;
      }

      #ed-panel .primary {
        background: #2679ed;
        border-color: #2679ed;
      }

      #ed-panel .field {
        display: flex;
        gap: 6px;
        align-items: center;
        margin: 8px 0;
      }

      #ed-panel input[type=color] {
        padding: 2px;
        width: 48px;
      }

      #ed-panel input[type=number] {
        width: 75px;
      }

      #ed-panel select {
        max-width: 170px;
      }

      #ed-msg {
        font-size: 12px;
        color: #cbd5e1;
        min-height: 20px;
      }

      body.ed-active [contenteditable=true] {
        outline: 1px dashed #4c9aff;
        outline-offset: 3px;
        cursor: text;
        user-select: text !important;
      }

      body.ed-active [contenteditable=true]:focus {
        outline: 2px solid #4c9aff;
      }

      #ed-login {
        position: fixed;
        inset: 0;
        z-index: 2147483601;
        display: grid;
        place-items: center;
        background: #000b;
      }

      #ed-login > div {
        background: #151b2a;
        color: white;
        padding: 24px;
        border-radius: 14px;
        max-width: 340px;
      }

      #ed-login button {
        background: #2679ed;
        color: white;
        border: 0;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
      }
    `;

    document.head.appendChild(style);

    const ui = document.createElement('div');
    ui.id = 'ed-ui';

    ui.innerHTML = `
      <button id="ed-toggle" type="button">
        ✎ Chỉnh sửa
      </button>

      <section id="ed-panel">
        <h3>Chỉnh sửa nội dung</h3>

        <div class="actions">
          <button id="ed-save">
            Lưu nháp
          </button>

          <button id="ed-publish" class="primary">
            Xuất bản
          </button>

          <button id="ed-reset">
            Hủy nháp
          </button>

          <button id="ed-logout">
            Đăng xuất
          </button>
        </div>

        <p>
          Bấm trực tiếp vào đoạn chữ trên trang để sửa.
        </p>

        <div class="field">
          Cỡ chữ (rem)
          <input
            id="ed-size"
            type="number"
            min="0.5"
            max="12"
            step="0.05"
          >
        </div>

        <div class="field">
          Font
          <select id="ed-font">
            <option value="">Mặc định</option>
            <option>Be Vietnam Pro</option>
            <option>Newsreader</option>
            <option>Georgia</option>
            <option>Hệ thống</option>
          </select>
        </div>

        <div class="field">
          Màu chữ
          <input id="ed-color" type="color">
        </div>

        <div class="actions">
          <button id="ed-image">
            Đổi ảnh được chọn
          </button>

          <button id="ed-door">
            Đóng/mở cửa
          </button>
        </div>

        <p id="ed-msg">
          Đang kiểm tra đăng nhập...
        </p>
      </section>
    `;

    document.body.appendChild(ui);

    const $ = id => document.getElementById(id);
    const msg = t => $('ed-msg').textContent = t;

    $('ed-toggle').onclick = () => {
      $('ed-panel').classList.toggle('open');
    };

    let sb;
    let session;
    let state = {
      t: {},
      s: {},
      i: {},
      y: {},
      c: {},
      n: []
    };

    let selected = null;
    let authorized = false;

    const loadLib = () => new Promise((resolve, reject) => {
      if (window.supabase?.createClient) {
        return resolve();
      }

      const s = document.createElement('script');

      s.src =
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

      s.onload = resolve;

      s.onerror = () => {
        reject(Error('Không tải được Supabase SDK'));
      };

      document.head.appendChild(s);
    });

    try {
      await loadLib();

      sb = window.supabase.createClient(
        cfg.url,
        cfg.key
      );

      const auth = await sb.auth.getSession();

      if (auth.error) throw auth.error;

      session = auth.data.session;

      if (!session) {
        showLogin();
        return;
      }

      sessionStorage.removeItem('mega_oauth_pending');

      const rows = await sb
        .from('site_content')
        .select('id,data')
        .in('id', ['draft', 'published']);

      if (rows.error) throw rows.error;

      const draft = rows.data?.find(
        x => x.id === 'draft'
      );

      if (!draft) {
        msg('Tài khoản không có quyền xem bản nháp.');
        await sb.auth.signOut();
        return;
      }

      authorized = true;

      const published = rows.data.find(
        x => x.id === 'published'
      );

      state = JSON.parse(
        JSON.stringify(
          Object.keys(draft.data || {}).length
            ? draft.data
            : (published?.data || {})
        )
      );

      for (const k of ['t', 's', 'i', 'y', 'c']) {
        state[k] ||= {};
      }

      state.n ||= [];

      api.apply(state);
      enableEditing();

      msg('Đã đăng nhập. Chọn chữ hoặc ảnh để sửa.');

    } catch (e) {
      msg('Lỗi: ' + e.message);
      console.error(e);
    }

    function showLogin() {
      const overlay = document.createElement('div');
      overlay.id = 'ed-login';

      overlay.innerHTML = `
        <div>
          <h3>Đăng nhập để chỉnh sửa</h3>

          <p>
            Chỉ tài khoản được cấp quyền trên Supabase
            mới có thể lưu hoặc xuất bản.
          </p>

          <button type="button">
            Đăng nhập bằng Google
          </button>

          <p id="ed-auth-error"></p>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('button').onclick =
        async () => {
          sessionStorage.setItem(
            'mega_oauth_pending',
            '1'
          );

          const redirectTo =
            location.origin +
            location.pathname +
            '?edit=1';

          const result = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo }
          });

          if (result.error) {
            sessionStorage.removeItem(
              'mega_oauth_pending'
            );

            $('ed-auth-error').textContent =
              result.error.message;
          }
        };
    }

    function enableEditing() {
      document.body.classList.add('ed-active');

      for (const [k, el] of Object.entries(api.texts)) {
        if (el.id === 'reveal') continue;

        el.contentEditable = 'true';
        el.spellcheck = false;

        el.addEventListener('focus', () => {
          selected = k;
          syncControls();
        });

        el.addEventListener('input', () => {
          state.t[k] = api.clean(el.innerHTML);
          msg('Có thay đổi chưa lưu');
        });

        el.addEventListener('paste', e => {
          e.preventDefault();

          document.execCommand(
            'insertText',
            false,
            e.clipboardData.getData('text/plain')
          );
        });
      }

      document.querySelectorAll('img').forEach(el => {
        el.addEventListener('click', e => {
          if (!authorized) return;

          e.preventDefault();
          e.stopPropagation();

          const k = api.keyOf(el);

          const url = prompt(
            'Dán đường dẫn ảnh trong assets/ hoặc Supabase Storage:',
            state.i[k] || el.getAttribute('src') || ''
          );

          if (url === null) return;

          if (!api.okUrl(url)) {
            msg(
              'Đường dẫn không hợp lệ. ' +
              'Hãy dùng assets/... hoặc Supabase Storage.'
            );
            return;
          }

          state.i[k] = url;
          api.apply(state);

          msg(
            'Đã đổi ảnh. Bấm Lưu nháp hoặc Xuất bản.'
          );
        }, true);
      });
    }

    function syncControls() {
      if (!selected) return;

      const el = api.texts[selected];
      const v = state.s[selected] || {};

      $('ed-size').value = v.fs
        ? parseFloat(v.fs)
        : (
            parseFloat(getComputedStyle(el).fontSize) / 16
          ).toFixed(2);

      $('ed-font').value = v.ff || '';

      const c =
        v.c || getComputedStyle(el).color;

      const m = c.match(/\d+/g);

      $('ed-color').value =
        /^#[0-9a-f]{6}$/i.test(c)
          ? c
          : (
              m
                ? '#' + m.slice(0, 3).map(
                    n => (+n).toString(16).padStart(2, '0')
                  ).join('')
                : '#ffffff'
            );
    }

    function setStyle(prop, value) {
      if (!selected) {
        return msg('Hãy chọn một đoạn chữ trước.');
      }

      state.s[selected] ||= {};
      state.s[selected][prop] = value;

      const el = api.texts[selected];
      const v = state.s[selected];

      el.style.fontSize = v.fs || '';

      el.style.fontFamily = ({
        'Be Vietnam Pro':
          "'Be Vietnam Pro',sans-serif",
        Newsreader:
          "'Newsreader',serif",
        Georgia:
          'Georgia,serif',
        'Hệ thống':
          'system-ui,sans-serif'
      })[v.ff] || '';

      el.style.color = v.c || '';

      msg('Có thay đổi chưa lưu');
    }

    $('ed-size').onchange = e => {
      setStyle(
        'fs',
        e.target.value
          ? e.target.value + 'rem'
          : ''
      );
    };

    $('ed-font').onchange = e => {
      setStyle('ff', e.target.value);
    };

    $('ed-color').oninput = e => {
      setStyle('c', e.target.value);
    };

    $('ed-image').onclick = () => {
      msg(
        'Bấm trực tiếp vào ảnh trên trang để thay đường dẫn.'
      );
    };

    $('ed-door').onclick = () => {
      document
        .getElementById('opening')
        ?.classList.toggle('open');
    };

    async function save(id) {
      if (!authorized || !session) {
        throw Error(
          'Chưa được xác thực quyền chỉnh sửa'
        );
      }

      const result = await sb
        .from('site_content')
        .update({
          data: state,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id');

      if (result.error) {
        throw result.error;
      }

      if (!result.data?.length) {
        throw Error(
          'Không có quyền ghi vào ' +
          id +
          ' (kiểm tra RLS)'
        );
      }
    }

    $('ed-save').onclick = async () => {
      try {
        msg('Đang lưu nháp...');

        await save('draft');

        msg('Đã lưu nháp ✓');
      } catch (e) {
        msg('Lỗi: ' + e.message);
      }
    };

    $('ed-publish').onclick = async () => {
      if (!confirm(
        'Xuất bản để mọi người thấy nội dung mới?'
      )) {
        return;
      }

      try {
        msg('Đang xuất bản...');

        await save('draft');
        await save('published');

        msg('Đã xuất bản thành công ✓');
      } catch (e) {
        msg(
          'Xuất bản thất bại: ' + e.message
        );
      }
    };

    $('ed-reset').onclick = async () => {
      if (!confirm(
        'Bỏ nháp và lấy lại bản đã xuất bản?'
      )) {
        return;
      }

      try {
        const r = await sb
          .from('site_content')
          .select('data')
          .eq('id', 'published')
          .single();

        if (r.error) throw r.error;

        state = JSON.parse(
          JSON.stringify(r.data.data || {})
        );

        await save('draft');

        location.reload();
      } catch (e) {
        msg('Lỗi: ' + e.message);
      }
    };

    $('ed-logout').onclick = async () => {
      await sb.auth.signOut();

      sessionStorage.removeItem(
        'mega_oauth_pending'
      );

      location.href = location.pathname;
    };
  }
})();
