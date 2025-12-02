"use strict"
let filters = [];

const updateFiltersFromStorage = async () => {
    const filterStore = await browser.storage.local.get("filters");
    filters = filterStore.filters ?? [];
}

updateFiltersFromStorage(); // startup

const determineFlagsForUrl = (url) => {
    const shouldPreventCopy = filters.some(f =>
        checkUrlAgainstFilter(url, f.filter) && f.copy
    );
    const shouldPreventPaste = filters.some(f =>
        checkUrlAgainstFilter(url, f.filter) && f.paste
    );

    return { shouldPreventCopy, shouldPreventPaste };
};

const pushFlagsToTab = (tabId, url) => {
    if (!url) return;

    const { shouldPreventCopy, shouldPreventPaste } = determineFlagsForUrl(url);

    browser.tabs.sendMessage(tabId, {
        type: "CLIPPER_FLAGS",
        shouldPreventCopy,
        shouldPreventPaste
    }).catch(() => {
        // Content script might not be injected in this tab/frame, ignore instead of crashing the entire worker
    });
}

browser.storage.onChanged.addListener((changes, area) => {
    if (area == "local" && changes.filters) updateFiltersFromStorage();
});

// browser.tabs.onCreated.addListener((tab) => {
//     pushFlagsToTab(tab.id, tab.url);
// });

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // URL changed OR load completed -> we know the "real" top URL
    if (changeInfo.url || changeInfo.status === "complete") {
        pushFlagsToTab(tabId, tab.url);
    }
});

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
