let shouldPreventCopy = false;
let shouldPreventPaste = false;

browser.storage.local.get("filters").then(filtersStore => {
    shouldPreventCopy = determineIfShouldPreventCopy(filtersStore.filters);
    shouldPreventPaste = determineIfShouldPreventPaste(filtersStore.filters);
});

const determineIfShouldPreventCopy = (filters) => {
    return filters.some(filter => 
        checkUrlAgainstFilter(window.location.href, filter.filter) && filter.copy
    );
}

const determineIfShouldPreventPaste = (filters) => {
    return filters.some(filter => 
        checkUrlAgainstFilter(window.location.href, filter.filter) && filter.paste
    );
}

document.addEventListener("copy", (event) => {
    if (shouldPreventCopy) event.stopImmediatePropagation();
}, { capture: true, once: false });

document.addEventListener("paste", (event) => {
    if (shouldPreventPaste) event.stopImmediatePropagation();
}, { capture: true, once: false })

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.filters) {
        shouldPreventCopy = determineIfShouldPreventCopy(changes.filters.newValue);
        shouldPreventPaste = determineIfShouldPreventPaste(changes.filters.newValue);
    }
});


// Copied from popup.js. maybe find a way to make it accessible from both, or better yet just centrally store the active filters somewhere the popup and this can access it. maybe background script.
/**
 * @param {string} url - The URL
 * @param {string} filter - The filter
 * @returns {boolean} Rather or not the URL matches the filter
 */
const checkUrlAgainstFilter = (url, filter) => {
    const urlLowercase = url.toLowerCase();
    const filterLowercase = filter.toLowerCase();
    
    let url_ptr = 0;
    let fil_ptr = 0;
    let url_last_wildcard = -1;
    let fil_last_wildcard = -1;

    while (url_ptr < urlLowercase.length) {
        if (filterLowercase[fil_ptr] == urlLowercase[url_ptr]) {
            fil_ptr++;
            url_ptr++;
        } else if (filterLowercase[fil_ptr] == "*") {
            fil_ptr++;
            fil_last_wildcard = fil_ptr;
            url_last_wildcard = url_ptr;
        } else if (fil_last_wildcard != -1) {
            fil_ptr = fil_last_wildcard;
            url_ptr = url_last_wildcard;
            url_last_wildcard++;
        } else {
            return false;
        }
    }

    while (filterLowercase[fil_ptr] == "*") {
        fil_ptr++;
    }

    return fil_ptr == filterLowercase.length;
}