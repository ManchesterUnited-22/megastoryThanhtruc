
(() => {
    "use strict";

    const wrap = document.getElementById("actsWrap");

    if (!wrap) return;

    let scheduled = false;

    function fixFullscreenImages() {

        const acts = wrap.querySelectorAll(".act");

        acts.forEach((act, index) => {

            const images = [...act.querySelectorAll("img")];

            // Chỉ lấy ảnh thực sự tải thành công
            const validImages = images.filter(img =>
                img.complete &&
                img.naturalWidth > 0
            );

            if (!validImages.length) return;

            // Ưu tiên ảnh được chèn từ Editor
            const editorImages = validImages.filter(img =>
                !img.classList.contains("act-background")
            );

            const candidates = editorImages.length
                ? editorImages
                : validImages;

            // Chọn ảnh lớn nhất trong phân cảnh
            const image = candidates.sort((a, b) =>
                (b.naturalWidth * b.naturalHeight) -
                (a.naturalWidth * a.naturalHeight)
            )[0];

            // Đưa ảnh thật xuống làm nền
            images.forEach(img => {

                const selected = img === image;

                img.classList.toggle(
                    "act-fullscreen-media",
                    selected
                );

                img.classList.toggle(
                    "act-unused-media",
                    !selected
                );
            });

            console.log(
                "[FullscreenActs] Cảnh " + (index + 1),
                image.currentSrc || image.src
            );
        });
    }

    function scheduleFix() {

        if (scheduled) return;

        scheduled = true;

        requestAnimationFrame(() => {

            scheduled = false;

            fixFullscreenImages();
        });
    }

    // Xử lý ảnh sau khi tải thành công
    wrap.addEventListener("load", scheduleFix, true);

    wrap.addEventListener("error", scheduleFix, true);

    // Theo dõi ảnh được CMS và Editor chèn vào
    const observer = new MutationObserver(scheduleFix);

    observer.observe(wrap, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src", "srcset"]
    });

    window.addEventListener("load", scheduleFix);

    scheduleFix();

})();
