
(function () {

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function smooth(x) {
        x = clamp(x, 0, 1);
        return x * x * (3 - 2 * x);
    }

    function $(id) {
        return document.getElementById(id);
    }

    /* ==========================================
       SCROLL PROGRESS
       ========================================== */

    function progressOf(el) {

        if (!el) return 0;

        var rect = el.getBoundingClientRect();

        var sticky = el.querySelector(
            '.acts-stick,.fog-stick,.puzzle-stick'
        );

        var height = sticky
            ? sticky.getBoundingClientRect().height
            : window.innerHeight;

        var distance = rect.height - height;

        if (distance <= 0) return 0;

        return clamp(
            -rect.top / distance,
            0,
            1
        );
    }

    function isPinned(el) {

        var r = el.getBoundingClientRect();

        return r.top <= 0 &&
            r.bottom >= window.innerHeight;
    }

    function slotWindow(p, i, n, isFirst, isLast) {

        var t = clamp((p - i / n) * n, 0, 1);

        var inn = isFirst
            ? 1
            : smooth((t - 0.12) / 0.18);

        var out = isLast
            ? 1
            : 1 - smooth((t - 0.74) / 0.18);

        return {
            o: inn * out,
            y: (1 - inn) * 28 - (1 - out) * 28
        };
    }

    /* ==========================================
       ĐỔI CẢNH NỀN + TÂM TRẠNG
       ========================================== */

    var layers = Array.prototype.slice.call(
        document.querySelectorAll('.layer')
    );

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

                if (on) {

                    var p = v.play();

                    if (p && p.catch) {
                        p.catch(function () {});
                    }

                } else {

                    v.pause();
                }
            }
        });

        var text =
            layers[i].getAttribute('data-cap') || '';

        if (cap) {

            cap.textContent = text;

            cap.classList.toggle('show', !!text);
        }
    }

    var sceneIO = new IntersectionObserver(
        function (entries) {

            entries.forEach(function (e) {

                if (!e.isIntersecting) return;

                setScene(
                    parseInt(
                        e.target.getAttribute('data-scene'),
                        10
                    )
                );

                document.body.setAttribute(
                    'data-mood',
                    e.target.getAttribute('data-mood') || ''
                );

                document.body.classList.toggle(
                    'film',
                    e.target.classList.contains('film')
                );
            });
        },
        {
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        }
    );

    document.querySelectorAll('[data-scene]')
        .forEach(function (el) {

            sceneIO.observe(el);
        });

    /* ==========================================
       CHỮ HIỆN DẦN
       ========================================== */

    var rvIO = new IntersectionObserver(
        function (entries) {

            entries.forEach(function (e) {

                if (e.isIntersecting) {

                    e.target.classList.add('in');

                    rvIO.unobserve(e.target);
                }
            });
        },
        {
            rootMargin: '0px 0px -12% 0px',
            threshold: 0.1
        }
    );

    document.querySelectorAll('.rv')
        .forEach(function (el) {

            rvIO.observe(el);
        });

    /* ==========================================
       THANH CHƯƠNG
       ========================================== */

    var links = Array.prototype.slice.call(
        document.querySelectorAll('#rail a')
    );

    var railIO = new IntersectionObserver(
        function (entries) {

            entries.forEach(function (e) {

                if (!e.isIntersecting) return;

                links.forEach(function (a) {

                    a.classList.toggle(
                        'on',
                        a.getAttribute('href') ===
                        '#' + e.target.id
                    );
                });

                document.body.setAttribute(
                    'data-tone',
                    e.target.getAttribute('data-tone') ||
                    'blood'
                );
            });
        },
        {
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        }
    );

    document.querySelectorAll('.chapter')
        .forEach(function (el) {

            railIO.observe(el);
        });

    /* ==========================================
       TIMELINE 1961 → 1971 → 2026
       ========================================== */

    var tlWrap = $('timeline');
    var tlYear = $('tlYear');

    var seg1 = $('seg1');
    var seg2 = $('seg2');
    var tlDot = $('tlDot');

    var tlEv = Array.prototype.slice.call(
        document.querySelectorAll('.tl-ev')
    );

    var SPLIT = 10 / 65;
    var tlStage = -1;

    function updateTimeline() {

        if (!tlWrap) return;

        var p = progressOf(tlWrap);
        var year, bar, stage, k;

        if (p < 0.05) {

            year = 1961;
            bar = 0;
            stage = 0;

        } else if (p < 0.36) {

            k = (p - 0.05) / 0.31;

            year = 1961 + Math.round(10 * k);
            bar = SPLIT * k;
            stage = 0;

        } else if (p < 0.44) {

            year = 1971;
            bar = SPLIT;
            stage = 1;

        } else if (p < 0.74) {

            k = smooth((p - 0.44) / 0.30);

            year = 1971 + Math.round(55 * k);

            bar = SPLIT + (1 - SPLIT) * k;

            stage = 1;

        } else {

            year = 2026;
            bar = 1;
            stage = 2;
        }

        tlYear.textContent = year;

        updateMap(p);

        tlYear.classList.toggle(
            'after',
            year > 1971
        );

        seg1.style.width =
            (Math.min(bar, SPLIT) * 100) + '%';

        seg2.style.width =
            (Math.max(0, bar - SPLIT) * 100) + '%';

        tlDot.style.left =
            (bar * 100) + '%';

        if (stage !== tlStage) {

            tlStage = stage;

            tlEv.forEach(function (e, i) {

                e.classList.toggle(
                    'on',
                    i === stage
                );
            });
        }
    }

    /* ==========================================
       BẢN ĐỒ + CON SỐ LỚN
       ========================================== */

    var MAP_LIT = 80;
    var MAP_PPL = 4.8;

    var mapSouth = $('mapSouth');
    var mcNum = $('mcNum');
    var mcUnit = $('mcUnit');
    var mcLabel = $('mcLabel');

    var mapPhase = -1;

    function updateMap(p) {

        if (!mapSouth) return;

        var fill, val, phase, k;

        if (p < 0.05) {

            fill = 0;
            val = 0;
            phase = 0;

        } else if (p < 0.44) {

            k = clamp(
                (p - 0.05) / 0.31,
                0,
                1
            );

            fill = k;
            val = MAP_LIT * k;
            phase = 0;

        } else {

            fill = 1;

            val = MAP_PPL *
                smooth((p - 0.44) / 0.30);

            phase = 1;
        }

        if (phase !== mapPhase) {

            mapPhase = phase;

            mcUnit.textContent = phase
                ? 'triệu người'
                : 'triệu lít';

            mcLabel.textContent = phase
                ? 'người Việt Nam bị phơi nhiễm (ước tính)'
                : 'chất diệt cỏ đã rải xuống miền Nam (ước tính)';
        }

        mcNum.textContent = phase
            ? val.toFixed(1).replace('.', ',')
            : Math.round(val);

        mapSouth.style.opacity =
            (0.78 * fill).toFixed(3);
    }

    /* ==========================================
       CHƯƠNG I - SÁNG TỪNG CHỮ
       ========================================== */

    var revealWrap = $('revealWrap');
    var revealEl = $('reveal');

    var words = [];

    function buildReveal() {

        if (!revealEl) return;

        words = [];

        var raw = revealEl.textContent
            .trim()
            .split(/\s+/);

        revealEl.textContent = '';

        raw.forEach(function (w, i) {

            var s = document.createElement('span');

            s.className = 'w';
            s.textContent = w;

            revealEl.appendChild(s);

            if (i < raw.length - 1) {

                revealEl.appendChild(
                    document.createTextNode(' ')
                );
            }

            words.push(s);
        });
    }

    buildReveal();

    window.__rebuildReveal = function () {

        buildReveal();
        updateReveal();
    };

    function updateReveal() {

        if (!revealWrap) return;

        var p = clamp(
            (progressOf(revealWrap) - 0.08) / 0.8,
            0,
            1
        );

        var n = Math.round(p * words.length);

        words.forEach(function (w, i) {

            w.classList.toggle('lit', i < n);
        });
    }

    /* ==========================================
       CHƯƠNG II
       BỮA ĂN / BÀI TẬP / KỸ NĂNG

       CINEMATIC EDGE FADE + CROSSFADE
       ========================================== */

    var actsWrap = $('actsWrap');

    var acts = Array.prototype.slice.call(
        document.querySelectorAll('#actsWrap .act')
    );

    var dots = Array.prototype.slice.call(
        document.querySelectorAll('.act-dots i')
    );

    var reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    );

    function updateActs() {

        if (!actsWrap || !acts.length) return;

        var stick = actsWrap.querySelector(
            '.acts-stick'
        );

        if (!stick) return;

        var p = clamp(
            progressOf(actsWrap),
            0,
            1
        );

        var n = acts.length;

        var rect = actsWrap.getBoundingClientRect();

        var stickRect =
            stick.getBoundingClientRect();

        var vh = stickRect.height ||
            window.innerHeight;

        /* --------------------------------------
           1. HÒA MÉP ẢNH VÀO NỀN WEBSITE
           -------------------------------------- */

        var fadeSize = vh * 0.06;

        var entering = smooth(
            clamp(
                (rect.top + fadeSize) / fadeSize,
                0,
                1
            )
        );

        var leaving = smooth(
            clamp(
                (vh + fadeSize - rect.bottom) /
                fadeSize,
                0,
                1
            )
        );

        if (reduceMotion.matches) {

            entering = 0;
            leaving = 0;
        }

        stick.style.setProperty(
            '--fade-top',
            (fadeSize * entering).toFixed(2) + 'px'
        );

        stick.style.setProperty(
            '--fade-bottom',
            (fadeSize * leaving).toFixed(2) + 'px'
        );

        /* --------------------------------------
           2. CROSSFADE GIỮA BA ẢNH
           -------------------------------------- */

        var position = p * n;

        var active = Math.min(
            n - 1,
            Math.floor(position)
        );

        var lower = active;
        var upper = active;
        var mix = 0;

        // Độ dài vùng chuyển tiếp giữa hai ảnh.
        var blend = 0.16;

        if (!reduceMotion.matches) {

            for (var k = 1; k < n; k++) {

                if (
                    position >= k - blend &&
                    position <= k + blend
                ) {

                    lower = k - 1;
                    upper = k;

                    mix = smooth(
                        clamp(
                            (position - (k - blend)) /
                            (blend * 2),
                            0,
                            1
                        )
                    );

                    active = mix < 0.5
                        ? lower
                        : upper;

                    break;
                }
            }
        }

        acts.forEach(function (act, i) {

            var opacity = 0;

            // Giữ ảnh cũ bên dưới.
            if (i === lower) {

                opacity = 1;
            }

            // Ảnh mới hiện dần bên trên.
            if (
                upper !== lower &&
                i === upper
            ) {

                opacity = mix;
            }

            act.classList.toggle(
                'on',
                i === active
            );

            act.style.setProperty(
                'opacity',
                opacity.toFixed(4),
                'important'
            );

            act.style.setProperty(
                'visibility',
                opacity > 0.001
                    ? 'visible'
                    : 'hidden',
                'important'
            );

            act.style.pointerEvents =
                i === active ? 'auto' : 'none';

            act.style.setProperty(
                'z-index',
                i === upper && upper !== lower
                    ? '2'
                    : '1',
                'important'
            );

            /* ----------------------------------
               3. CHUYỂN TIẾP CHỮ

               Chữ cũ biến mất trước khi chữ mới
               xuất hiện để không bị chồng chữ.
               ---------------------------------- */

            var text = act.querySelector(
                '.act-text'
            );

            if (text) {

                var textOpacity = 0;

                if (lower === upper) {

                    textOpacity =
                        i === active ? 1 : 0;

                } else {

                    if (i === lower) {

                        textOpacity = 1 - smooth(
                            clamp(
                                mix * 2,
                                0,
                                1
                            )
                        );
                    }

                    if (i === upper) {

                        textOpacity = smooth(
                            clamp(
                                (mix - 0.5) * 2,
                                0,
                                1
                            )
                        );
                    }
                }

                text.style.setProperty(
                    'opacity',
                    textOpacity.toFixed(4),
                    'important'
                );

                text.style.transform = 'none';
                text.style.filter = 'none';
            }
        });

        /* --------------------------------------
           4. BA CHẤM CHUYỂN CẢNH
           -------------------------------------- */

        dots.forEach(function (dot, i) {

            dot.classList.toggle(
                'on',
                i === active
            );
        });
    }

    /* ==========================================
       CHƯƠNG III - NỀN MỜ DẦN
       ========================================== */

    var fogWrap = $('fogWrap');
    var narrow = $('narrow');

    var panels = Array.prototype.slice.call(
        document.querySelectorAll('.fog-panel')
    );

    function updateFog() {

        if (!fogWrap) return;

        var r = fogWrap.getBoundingClientRect();
        var H = innerHeight;

        var p = progressOf(fogWrap);
        var n = panels.length;

        var enter = smooth(
            (H * 0.55 - r.top) / (H * 0.55)
        );

        var leave = smooth(
            r.bottom / (H * 0.6)
        );

        var f = smooth(
            (p - 0.3) / 0.45
        ) * leave;

        document.body.style.setProperty(
            '--fog',
            f.toFixed(3)
        );

        var minNr = innerWidth < 720
            ? 74
            : 54;

        narrow.style.setProperty(
            '--nr',
            (100 - (100 - minNr) * f)
                .toFixed(1) + '%'
        );

        narrow.style.opacity =
            Math.min(enter, leave).toFixed(3);

        var enterTxt = smooth(
            (H * 0.5 - r.top) / (H * 0.5)
        );

        var leaveTxt = smooth(
            (r.bottom - H * 0.45) /
            (H * 0.45)
        );

        panels.forEach(function (el, i) {

            var w = slotWindow(
                p,
                i,
                n,
                i === 0,
                i === n - 1
            );

            var o = w.o *
                (i === 0 ? enterTxt : 1) *
                (i === n - 1 ? leaveTxt : 1);

            el.style.opacity = o.toFixed(3);

            el.style.visibility =
                o < 0.01
                    ? 'hidden'
                    : 'visible';

            el.style.transform =
                'translate(-50%,calc(-50% + ' +
                w.y.toFixed(1) +
                'px))';

            el.style.filter =
                o > 0.99
                    ? 'none'
                    : 'blur(' +
                    ((1 - o) * 10).toFixed(1) +
                    'px)';
        });

        if (isPinned(fogWrap)) {

            setScene(p < 0.5 ? 5 : 6);
        }
    }

    /* ==========================================
       KHÉP LẠI
       BÌNH MINH → KHOẢNG LẶNG
       ========================================== */

    var dawnWrap = $('dawnWrap');
    var sun = $('sun');
    var blackout = $('blackout');

    var dawnLayer = document.querySelector(
        '.layer.dawn'
    );

    var endEls = [
        $('e0'),
        $('e1'),
        $('e2')
    ];

    var endStart = [
        0.12,
        0.26,
        0.46
    ];

    function updateDawn() {

        if (!dawnWrap) return;

        var p = progressOf(dawnWrap);

        var out = 1 - smooth(
            (p - 0.74) / 0.1
        );

        if (dawnLayer) {

            dawnLayer.style.setProperty(
                '--dawn',
                (
                    0.12 +
                    0.88 * smooth(p / 0.55)
                ).toFixed(3)
            );
        }

        sun.style.opacity = (
            smooth(p / 0.5) * out
        ).toFixed(3);

        sun.style.transform =
            'translateY(' +
            ((1 - smooth(p / 0.6)) * 28) +
            '%)';

        blackout.style.opacity = smooth(
            (p - 0.76) / 0.14
        ).toFixed(3);

        endEls.forEach(function (el, i) {

            if (!el) return;

            var inn = smooth(
                (p - endStart[i]) / 0.14
            );

            el.style.opacity =
                (inn * out).toFixed(3);

            el.style.transform =
                'translateY(' +
                ((1 - inn) * 24) +
                'px)';
        });
    }

    /* ==========================================
       SCROLL ENGINE
       ========================================== */

    var bar = $('progress');
    var ticking = false;

    function update() {

        ticking = false;

        var h =
            document.documentElement.scrollHeight -
            innerHeight;

        if (bar) {

            bar.style.width =
                (h > 0 ? (scrollY / h) * 100 : 0) +
                '%';
        }

        updateTimeline();
        updateReveal();
        updateActs();
        updateFog();
        updateDawn();

        document.body.classList.toggle(
            'inline-caption-scene',
            !!fogWrap && isPinned(fogWrap)
        );
    }

    function onScroll() {

        if (!ticking) {

            ticking = true;

            requestAnimationFrame(update);
        }
    }

    addEventListener(
        'scroll',
        onScroll,
        { passive: true }
    );

    addEventListener(
        'resize',
        onScroll
    );

    addEventListener(
        'load',
        update
    );

    setScene(0);

    update();

    /* ==========================================
       OPENING - MANUAL SPACE CONTROL
       ========================================== */

    var opening = $('opening');

    var openingTrigger = $('openingTrigger');

    if (opening) {

        var hasOpened = false;

        var isEditMode =
            new URLSearchParams(location.search)
                .get('edit') === '1';

        // Luôn đóng cửa khi khởi tạo.

        opening.classList.remove('open');

        function openIt() {

            if (hasOpened) return;

            hasOpened = true;

            // Mở hai cánh cửa đồng thời.

            opening.classList.add('open');

            document.body.classList.remove(
                'opening-locked'
            );

            if (openingTrigger) {

                openingTrigger.disabled = true;

                openingTrigger.blur();

                openingTrigger.setAttribute(
                    'aria-hidden',
                    'true'
                );
            }

            window.removeEventListener(
                'keydown',
                handleOpeningKey
            );

            requestAnimationFrame(function () {

                update();
            });
        }

        function handleOpeningKey(event) {

            if (hasOpened) return;

            var target = event.target;

            // Không can thiệp khi nhập văn bản.

            if (
                target &&
                (
                    target.isContentEditable ||
                    target.matches?.(
                        'input, textarea, select'
                    )
                )
            ) {

                return;
            }

            if (
                event.code === 'Space' ||
                event.key === ' '
            ) {

                event.preventDefault();

                if (event.repeat) return;

                openIt();
            }
        }

        if (isEditMode) {

            // Editor được mở sẵn.

            openIt();

        } else {

            // Trang Main chờ người xem nhấn Space.

            document.body.classList.add(
                'opening-locked'
            );

            window.scrollTo(0, 0);

            window.addEventListener(
                'keydown',
                handleOpeningKey
            );

            if (openingTrigger) {

                openingTrigger.addEventListener(
                    'click',
                    openIt
                );
            }
        }
    }

    /* ==========================================
       CLEAN DEFAULT CAPTIONS
       ========================================== */

    function cleanDefaultCaptions() {

        var pattern =
            /^(ảnh|video)\s*\d+\s*[·:\-]\s*chú thích(?:\s+ảnh|\s+video(?:\s+chính)?)?\s*$/i;

        document.querySelectorAll(
            'figcaption, .op-cap, #cap'
        ).forEach(function (el) {

            var text = el.textContent.trim();

            if (pattern.test(text)) {

                el.textContent = '';
            }

            if (!el.textContent.trim()) {

                el.style.display = 'none';
            }
        });
    }

    if (
        new URLSearchParams(location.search)
            .get('edit') !== '1'
    ) {

        cleanDefaultCaptions();
    }

})();
