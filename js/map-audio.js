
/* ==================================================
   MAP BACKGROUND AUDIO
   Nhạc nền dành riêng cho phân cảnh bản đồ
================================================== */

(() => {
    "use strict";

    // ==============================
    // CẤU HÌNH
    // ==============================

    const AUDIO_PATH = "assets/audio/map-background.mp3";

    const START_VOLUME = 0.65;
    const BACKGROUND_VOLUME = 0.15;
    const FADE_DURATION = 5000;

    const timeline = document.getElementById("timeline");

    if (!timeline) {
        console.warn("[MapAudio] Không tìm thấy timeline.");
        return;
    }

    // ==============================
    // KHỞI TẠO ÂM THANH
    // ==============================

    const AudioContext =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const context = new AudioContext();

    let audioBuffer = null;
    let source = null;
    let gain = null;

    let unlocked = false;
    let insideMap = false;
    let scheduled = false;

    // Tải MP3 trước khi cuộn đến bản đồ
    fetch(AUDIO_PATH)
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }

            return response.arrayBuffer();
        })
        .then(data => context.decodeAudioData(data))
        .then(buffer => {
            audioBuffer = buffer;

            console.log("[MapAudio] MP3 đã sẵn sàng.");

            checkPosition();
        })
        .catch(error => {
            console.error("[MapAudio] Lỗi tải MP3:", error);
        });

    // ==============================
    // MỞ QUYỀN PHÁT ÂM THANH
    // ==============================

    async function unlockAudio() {
        try {
            await context.resume();

            unlocked = context.state === "running";

            if (!unlocked) return;

            console.log("[MapAudio] Đã mở quyền âm thanh.");

            checkPosition();

        } catch (error) {
            console.warn("[MapAudio] Chưa thể phát:", error);
        }
    }

    // Tận dụng phím Space ở Opening
    document.addEventListener("keydown", event => {
        if (
            event.code === "Space" ||
            event.key === " "
        ) {
            unlockAudio();
        }
    }, true);

    // Hỗ trợ thao tác chuột và màn hình cảm ứng
    document.addEventListener("pointerdown", () => {
        if (context.state !== "running") {
            unlockAudio();
        }
    }, true);

    // ==============================
    // PHÁT NHẠC TỪ ĐẦU
    // ==============================

    function startMusic() {
        if (!unlocked || !audioBuffer || source) return;

        if (context.state !== "running") return;

        source = context.createBufferSource();
        gain = context.createGain();

        source.buffer = audioBuffer;

        // Lặp lại nếu vẫn đang ở bản đồ
        source.loop = true;

        source.connect(gain);
        gain.connect(context.destination);

        const now = context.currentTime;

        // Âm lượng ban đầu: 65%
        gain.gain.setValueAtTime(START_VOLUME, now);

        // Giảm dần xuống 15% trong 5 giây
        gain.gain.linearRampToValueAtTime(
            BACKGROUND_VOLUME,
            now + FADE_DURATION / 1000
        );

        // Luôn phát từ giây thứ 0
        source.start(0, 0);

        console.log("[MapAudio] Bắt đầu phát nhạc.");
    }

    // ==============================
    // DỪNG NHẠC
    // ==============================

    function stopMusic() {
        if (!source) return;

        const oldSource = source;
        const oldGain = gain;

        source = null;
        gain = null;

        try {
            oldSource.stop();
        } catch (error) {
            console.warn("[MapAudio]", error);
        }

        oldSource.disconnect();

        if (oldGain) {
            oldGain.disconnect();
        }

        console.log("[MapAudio] Đã dừng nhạc.");
    }

    // ==============================
    // KIỂM TRA VỊ TRÍ CUỘN
    // ==============================

    function checkPosition() {
        const rect = timeline.getBoundingClientRect();

        const viewportHeight = window.innerHeight;

        // Mốc kích hoạt tại giữa màn hình
        const triggerPoint = viewportHeight * 0.5;

        const isVisible =
            rect.top <= triggerPoint &&
            rect.bottom > triggerPoint &&
            !document.hidden;

        insideMap = isVisible;

        if (insideMap) {
            startMusic();
        } else {
            stopMusic();
        }
    }

    // ==============================
    // THEO DÕI SCROLL
    // ==============================

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

    // Dừng nhạc khi chuyển tab
    document.addEventListener(
        "visibilitychange",
        checkPosition
    );

    window.addEventListener("pagehide", stopMusic);

    // Kiểm tra vị trí ban đầu
    checkPosition();

})();
