"use strict"

var filters = {};
var active = [];
var currentUrl = "";

const startup = async () => {
    const filterStore = await browser.storage.local.get("filters");
    filters = filterStore.filters; // I cannot figure out how to get it to not wrap the result in an object like this, but we can unrwap it this way
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => { 
        let activeTab = tabs[0];
        if (!activeTab.url.startsWith("http")) {
            document.body.innerHTML = "Not available for this page type";
            return;
        }
        active = Object.keys(filters).filter(x => checkUrlAgainstFilter(activeTab.url, x)).sort((a, b) => b.length - a.length);
        currentUrl = activeTab.url;
        renderFilterLists();
      });
}

const getDefaultFilterForUrl = (url) => {
    return url.split("/").slice(0,3).join("/") + "/*";
}

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

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("copy-toggle").onchange = () => {
        modifyActiveFilter(
            document.getElementById("copy-toggle").checked,
            document.getElementById("paste-toggle").checked
        );
    }
});

const modifyActiveFilter = async (copy, paste) => {
    if (active.length == 0) {
        var filter = getDefaultFilterForUrl(currentUrl);
        filters[filter] = {copy,paste}
        await browser.storage.local.set({filters});
        active.push(filter);
        await renderFilterLists();
    }
}

const renderFilterLists = () => {
    renderActiveFilterList();
    renderAllFilterList();
}

const renderActiveFilterList = async () => {
    const applicableFilters = document.getElementById("applicable-filters");
    applicableFilters.innerHTML = "";
    for (var activeFilter of active) {
        const paragraph = document.createElement("p");
        paragraph.innerText = activeFilter;
        applicableFilters.appendChild(paragraph);
    }
}

const renderAllFilterList = async () => {
    const allFilters = document.getElementById("all-filters");
    allFilters.innerHTML = "";
    for (var currentFilter of Object.keys(filters)) {
        const paragraph = document.createElement("p");
        paragraph.innerText = currentFilter;
        allFilters.appendChild(paragraph);
    }
}

startup().catch(console.error);