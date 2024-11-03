document.addEventListener("copy", (event) => {
    event.stopImmediatePropagation();
}, { capture: true, once: false });

// // Use a MutationObserver to detect attempts to override the listener
// const observer = new MutationObserver((mutations) => {
//     for (const mutation of mutations) {
//         if (mutation.type === "childList" || mutation.type === "attributes") {
//             // Reattach listener to prevent overrides
//             document.addEventListener("copy", (event) => {
//                 event.stopImmediatePropagation();
//             }, { capture: true, once: false });
//         }
//     }
// });

// // Observe the whole document
// observer.observe(document, { attributes: true, childList: true, subtree: true });