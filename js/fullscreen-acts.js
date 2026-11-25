
(() => {
    "use strict";

    const SCENES = [
        {
            name: "Bữa ăn",
            key: "new-434f78dd-e43e-4517-b40f-1b3b61bab323"
        },
        {
            name: "Bài tập",
            key: "new-bbfdefd5-e62f-4c97-bb73-9822a7003e66"
        },
        {
            name: "Kỹ năng",
            key: "new-147d3a65-0ed9-44eb-8193-39f68b0d321d"
        }
    ];

    let scheduled = false;

    function applyFullscreen() {

        const acts = document.querySelectorAll(
            "#actsWrap .act"
        );

        SCENES.forEach((scene, index) => {

            const act = acts[index];

            const image = document.querySelector(
                `img[data-mega-key="${scene.key}"]`
            );

            if (!act || !image) return;

            const url = image.currentSrc || image.src;

            if (!url) return;

            // Dùng ảnh Supabase làm nền toàn màn hình
            act.style.setProperty(
                "background-image",
                `url("${url}")`,
                "important"
            );

            act.style.setProperty(
                "background-size",
                "cover",
                "important"
            );

            act.style.setProperty(
                "background-position",
                "center center",
                "important"
            );

            act.style.setProperty(
                "background-repeat",
                "no-repeat",
                "important"
            );

            act.style.setProperty(
                "translate",
                "none",
                "important"
            );

            // Ẩn ảnh nhỏ cũ do Editor chèn
            image.style.setProperty(
                "display",
                "none",
                "important"
            );

            // Ẩn ảnh mặc định bị lỗi 404
            act.querySelectorAll(".act-background")
                .forEach(img => {
                    img.style.setProperty(
                        "display",
                        "none",
                        "important"
                    );
                });

            // Đưa chữ lên trên ảnh
            const text = act.querySelector(".act-text");

            if (text) {
                text.style.setProperty(
                    "z-index",
                    "2000",
                    "important"
                );
            }

            console.log(
                "[FullscreenActs] Thành công:",
                scene.name
            );
        });
    }

    function scheduleFix() {

        if (scheduled) return;

        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            applyFullscreen();
        });
    }

    // Ngăn thanh cuộn ngang
    document.documentElement.style.setProperty(
        "overflow-x",
        "clip",
        "important"
    );

    document.body.style.setProperty(
        "overflow-x",
        "clip",
        "important"
    );

    // Theo dõi dữ liệu ảnh được CMS tải vào BODY
    const observer = new MutationObserver(scheduleFix);

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset"]
    });

    document.addEventListener(
        "load",
        scheduleFix,
        true
    );

    window.addEventListener(
        "load",
        scheduleFix
    );

    window.addEventListener(
        "resize",
        scheduleFix
    );

    // Chờ CMS hoàn thành tải dữ liệu
    Promise.resolve(window.MEGA_CMS?.ready)
        .then(scheduleFix)
        .catch(console.error);

    scheduleFix();

})();
