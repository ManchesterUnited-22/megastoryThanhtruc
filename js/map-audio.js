
(() => {
    "use strict";

    // ==========================================
    // CẤU HÌNH ÂM THANH
    // ==========================================

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
    let startedAt = 0;
    let scheduled = false;

    // ==========================================
    // LƯU TRẠNG THÁI RIÊNG CHO TỪNG BÀI NHẠC
    // ==========================================

    const scenes = SCENES.map(config => ({
        ...config,
        element: document.getElementById(config.id),
        buffer: null,

        // Vị trí đã phát
        offset: 0,

        // Trạng thái đã phát hết bài
        finished: false

    })).filter(scene => scene.element);

    // ==========================================
    // TẢI FILE MP3
    // ==========================================

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

    // ==========================================
    // MỞ QUYỀN PHÁT ÂM THANH
    // ==========================================

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

    // ==========================================
    // TẠM DỪNG VÀ LƯU VỊ TRÍ ĐANG PHÁT
    // ==========================================

    function pauseMusic() {
        if (!source || !activeScene) return;

        const elapsed =
            context.currentTime - startedAt;

        activeScene.offset = Math.min(
            activeScene.offset + elapsed,
            activeScene.buffer.duration
        );

        if (
            activeScene.offset >=
            activeScene.buffer.duration
        ) {
            activeScene.finished = true;
        }

        console.log(
            "[SceneAudio] Pause:",
            activeScene.id,
            activeScene.offset.toFixed(2) + "s"
        );

        source.onended = null;

        try {
            source.stop();
        } catch (_) {}

        source.disconnect();

        if (gain) {
            gain.disconnect();
        }

        source = null;
        gain = null;
        activeScene = null;
    }

    // ==========================================
    // PHÁT HOẶC TIẾP TỤC BÀI NHẠC
    // ==========================================

    function startMusic(scene) {

        if (!scene.buffer) return;
        if (scene.finished) return;
        if (context.state !== "running") return;

        if (activeScene === scene && source) return;

        pauseMusic();

        if (scene.offset >= scene.buffer.duration) {
            scene.finished = true;
            return;
        }

        source = context.createBufferSource();
        gain = context.createGain();

        source.buffer = scene.buffer;

        // KHÔNG LẶP LẠI BÀI NHẠC
        source.loop = false;

        source.connect(gain);
        gain.connect(context.destination);

        const now = context.currentTime;

        // Tính âm lượng dựa trên thời gian đã phát
        const progress = Math.min(
            scene.offset / scene.fadeDuration,
            1
        );

        const currentVolume =
            scene.startVolume +
            (
                scene.backgroundVolume -
                scene.startVolume
            ) * progress;

        gain.gain.setValueAtTime(
            currentVolume,
            now
        );

        // Tiếp tục giảm âm lượng nếu chưa đủ 5 giây
        const remainingFade = Math.max(
            scene.fadeDuration - scene.offset,
            0
        );

        if (remainingFade > 0) {
            gain.gain.linearRampToValueAtTime(
                scene.backgroundVolume,
                now + remainingFade
            );
        }

        activeScene = scene;
        startedAt = now;

        const currentSource = source;

        // Khi phát hết bài thì dừng hẳn
        source.onended = () => {

            if (source !== currentSource) return;

            scene.finished = true;
            scene.offset = scene.buffer.duration;

            currentSource.disconnect();

            if (gain) {
                gain.disconnect();
            }

            source = null;
            gain = null;
            activeScene = null;

            console.log(
                "[SceneAudio] Đã phát hết:", scene.id
            );
        };

        // Phát tiếp tại vị trí đã lưu
        source.start(0, scene.offset);

        console.log(
            "[SceneAudio] Play:",
            scene.id,
            scene.offset.toFixed(2) + "s"
        );
    }

    // ==========================================
    // KIỂM TRA PHÂN CẢNH HIỆN TẠI
    // ==========================================

    function checkPosition() {

        if (document.hidden) {
            pauseMusic();
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
            pauseMusic();
            return;
        }

        if (activeScene !== currentScene) {
            pauseMusic();
        }

        startMusic(currentScene);
    }

    // ==========================================
    // THEO DÕI SCROLL
    // ==========================================

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

    window.addEventListener("pagehide", pauseMusic);

    window.addEventListener("pageshow", checkPosition);

    checkPosition();

})();
