"use strict"

if (typeof self.browser === "undefined") importScripts("browser-polyfill.min.js");

let _filters = null; // do not reference directly. may not be hydrated. use getFilters() instead.
const EXTENSION_BASE_URL = browser.runtime.getURL("");

const getFilters = async () => {
    if (_filters == null) await updateFiltersFromStorage();
    return _filters;
}

const updateFiltersFromStorage = async () => {
    const filterStore = await browser.storage.local.get("filters");
    _filters = filterStore.filters ?? [];
    await pushFlagsToAllTabs();
}

const save = async () => {
    const filters = await getFilters();
    await browser.storage.local.set({filters});
}

void getFilters(); // startup

const determineFlagsForUrl = async (url) => {
    const filters = await getFilters();
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
                return await getFilters();
            case "GET_ALL_FILTERS_APPLICABLE_FOR_URL":
                return (await getFilters()).filter(f => checkUrlAgainstFilter(message.url, f.filter));
            case "SET_FILTERS":
                _filters = message.filters ?? [];
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

    const {shouldPreventCopy, shouldPreventPaste} = await determineFlagsForUrl(url);

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
        void pushFlagsToTab(tabId, tab.url);
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
