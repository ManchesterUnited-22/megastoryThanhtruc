
(() => {
    "use strict";

    // Cấu hình âm thanh cho từng phân cảnh
    const SCENES = [
        {
            id: "timeline",
            path: "assets/audio/map-background.mp3",
            startVolume: 0.65,
            backgroundVolume: 0.15,
            fadeDuration: 5
        },
        {
            id: "c5",
            path: "assets/audio/closing-background.mp3",
            startVolume: 0.65,
            backgroundVolume: 0.15,
            fadeDuration: 5
        }
    ];

    const AudioContext =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const context = new AudioContext();

    let activeScene = null;
    let source = null;
    let gain = null;
    let scheduled = false;

    // Khởi tạo từng phân cảnh
    const scenes = SCENES.map(config => ({
        ...config,
        element: document.getElementById(config.id),
        buffer: null
    })).filter(scene => scene.element);

    // Tải trước toàn bộ âm thanh
    scenes.forEach(async scene => {
        try {
            const response = await fetch(scene.path);

            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }

            const data = await response.arrayBuffer();

            scene.buffer =
                await context.decodeAudioData(data);

            console.log(
                "[SceneAudio] Đã tải:", scene.id
            );

            checkPosition();

        } catch (error) {
            console.error(
                "[SceneAudio] Lỗi tải:", scene.path, error
            );
        }
    });

    // Mở quyền âm thanh bằng Space hoặc chuột
    async function unlockAudio() {
        try {
            await context.resume();
            checkPosition();
        } catch (error) {
            console.warn("[SceneAudio]", error);
        }
    }

    document.addEventListener("keydown", event => {
        if (event.code === "Space") {
            unlockAudio();
        }
    }, true);

    document.addEventListener("pointerdown", () => {
        if (context.state !== "running") {
            unlockAudio();
        }
    }, true);

    // Dừng âm thanh hiện tại
    function stopMusic() {
        if (source) {
            try {
                source.stop();
            } catch (_) {}

            source.disconnect();
            source = null;
        }

        if (gain) {
            gain.disconnect();
            gain = null;
        }

        activeScene = null;
    }

    // Phát âm thanh của phân cảnh
    function startMusic(scene) {
        if (!scene.buffer) return;
        if (context.state !== "running") return;

        // Không phát lại liên tục khi đang cuộn
        if (activeScene === scene && source) return;

        // Dừng nhạc cũ trước khi phát nhạc mới
        stopMusic();

        source = context.createBufferSource();
        gain = context.createGain();

        source.buffer = scene.buffer;
        source.loop = true;

        source.connect(gain);
        gain.connect(context.destination);

        const now = context.currentTime;

        gain.gain.setValueAtTime(
            scene.startVolume,
            now
        );

        gain.gain.linearRampToValueAtTime(
            scene.backgroundVolume,
            now + scene.fadeDuration
        );

        source.start(0, 0);

        activeScene = scene;

        console.log(
            "[SceneAudio] Đang phát:", scene.id
        );
    }

    // Xác định phân cảnh hiện tại
    function checkPosition() {
        if (document.hidden) {
            stopMusic();
            return;
        }

        const triggerPoint = window.innerHeight * 0.5;

        const currentScene = scenes.find(scene => {
            const rect =
                scene.element.getBoundingClientRect();

            return (
                rect.top <= triggerPoint &&
                rect.bottom > triggerPoint
            );
        });

        if (!currentScene) {
            stopMusic();
            return;
        }

        if (activeScene !== currentScene) {
            stopMusic();
        }

        startMusic(currentScene);
    }

    // Theo dõi thao tác cuộn
    function handleScroll() {
        if (scheduled) return;

        scheduled = true;

        requestAnimationFrame(() => {
            checkPosition();
            scheduled = false;
        });
    }

    window.addEventListener("scroll", handleScroll, {
        passive: true
    });

    window.addEventListener("resize", handleScroll);

    document.addEventListener(
        "visibilitychange",
        checkPosition
    );

    window.addEventListener("pagehide", stopMusic);

    window.addEventListener("pageshow", checkPosition);

    checkPosition();

})();
