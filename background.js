"use strict"

let filters = [];
const EXTENSION_BASE_URL = browser.runtime.getURL("");

const updateFiltersFromStorage = async () => {
    const filterStore = await browser.storage.local.get("filters");
    filters = filterStore.filters ?? [];
    await pushFlagsToAllTabs();
}

const save = async () => {
    await browser.storage.local.set({filters});
}

updateFiltersFromStorage(); // startup

const determineFlagsForUrl = (url) => {
    const shouldPreventCopy = filters.some(f =>
        checkUrlAgainstFilter(url, f.filter) && f.copy
    );
    const shouldPreventPaste = filters.some(f =>
        checkUrlAgainstFilter(url, f.filter) && f.paste
    );

    return {shouldPreventCopy, shouldPreventPaste};
};

browser.runtime.onMessage.addListener(async (message, sender) => {

    // Gate security sensitive messages to this extension to prevent attacks where an extension is coerced into sending messages to this worker
    if (typeof sender.url == "string" && sender.url.startsWith(EXTENSION_BASE_URL)) {
        switch (message.type) {
            case "GET_ALL_FILTERS":
                return filters;
            case "GET_ALL_FILTERS_APPLICABLE_FOR_URL":
                return filters.filter(f => checkUrlAgainstFilter(message.url, f.filter));
            case "SET_FILTERS":
                filters = message.filters;
                await save();
                await pushFlagsToAllTabs();
                return true;
        }
    } else {
        throw Error("Message from untrusted source");
    }
});

const pushFlagsToTab = async (tabId, url) => {
    if (!url) return;

    const {shouldPreventCopy, shouldPreventPaste} = determineFlagsForUrl(url);

    browser.tabs.sendMessage(tabId, {
        type: "CLIPPER_FLAGS",
        shouldPreventCopy,
        shouldPreventPaste
    }).catch(() => {
        // Content script might not be injected in this tab/frame, ignore instead of crashing the entire worker
    });
}

const pushFlagsToAllTabs = async () => {
    const tabs = await browser.tabs.query({});
    tabs.forEach(tab => pushFlagsToTab(tab.id, tab.url));
}

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
