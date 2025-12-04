let shouldPreventCopy = false;
let shouldPreventPaste = false;

browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "CLIPPER_FLAGS") {
        console.log(message);
        shouldPreventCopy = message.shouldPreventCopy;
        shouldPreventPaste = message.shouldPreventPaste;
    }
});

document.addEventListener("copy", (event) => {
    if (shouldPreventCopy) event.stopImmediatePropagation();
}, {capture: true, once: false});

document.addEventListener("paste", (event) => {
    if (shouldPreventPaste) event.stopImmediatePropagation();
}, {capture: true, once: false});
