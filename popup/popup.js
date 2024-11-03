"use strict"

var filters = {};
var active = [];
var currentUrl = "";
var allFiltersSearchQuery = "";

const startup = async () => {
    const filterStore = await browser.storage.local.get("filters");
    filters = filterStore.filters ?? {}; // I cannot figure out how to get it to not wrap the result in an object like this, but we can unrwap it this way
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    let activeTab = tabs[0];
    if (!activeTab.url.startsWith("http")) {
        document.body.innerHTML = "Not available for this page type";
        document.body.style.height = "unset";
        return;
    }
    active = Object.keys(filters).filter(x => checkUrlAgainstFilter(activeTab.url, x)).sort((a, b) => b.length - a.length);
    currentUrl = activeTab.url;
    document.getElementById("copy-toggle").checked = filters[active[0]]?.copy ?? false;
    document.getElementById("paste-toggle").checked = filters[active[0]]?.paste ?? false;
    renderFilterLists();
}

const fixBottomBar = () => {
    document.body.style.marginBottom = document.getElementById("bottom-bar").getBoundingClientRect().height;
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
    fixBottomBar();
    document.getElementById("copy-toggle").onchange = () => {
        modifyActiveFilter(
            document.getElementById("copy-toggle").checked,
            document.getElementById("paste-toggle").checked
        );
    }
    document.getElementById("paste-toggle").onchange = () => {
        modifyActiveFilter(
            document.getElementById("copy-toggle").checked,
            document.getElementById("paste-toggle").checked
        );
    }
    document.getElementById("all-filter-search").oninput = (event) => {
        allFiltersSearchQuery = event.target.value;
        renderAllFilterList();
    }
});

const modifyActiveFilter = async (copy, paste) => {
    var filter = "";
    if (active.length == 0) {
        filter = getDefaultFilterForUrl(currentUrl);
        active.push(filter);
    } else {
        filter = active[0];
    }
    filters[filter] = {copy,paste}
    await browser.storage.local.set({filters});
    renderFilterLists();
}

const renderFilterLists = () => {
    renderActiveFilterList();
    renderAllFilterList();
}

const renderFilter = (filter, copy, paste) => {
    const div = document.createElement("div");
    div.classList.add("filter");
    const input = document.createElement("input");
    input.value = filter;
    input.oninput = (event) => {
        document.getElementById("save-cancel").style.display = "flex";
    }
    div.appendChild(input);
    return div;
}

const renderActiveFilterList = async () => {
    const applicableFilters = document.getElementById("applicable-filters");
    applicableFilters.innerHTML = "";
    for (var activeFilter of active) {
        const filterData = filters[activeFilter];
        applicableFilters.appendChild(renderFilter(activeFilter, filterData.copy, filterData.paste));
    }
}

const renderAllFilterList = async () => {
    const allFilters = document.getElementById("all-filters");
    allFilters.innerHTML = "";
    for (var currentFilter of Object.keys(filters)) {
        if (allFiltersSearchQuery != "" && currentFilter.toLowerCase().indexOf(allFiltersSearchQuery) == -1) continue;
        const filterData = filters[currentFilter];
        allFilters.appendChild(renderFilter(currentFilter, filterData.copy, filterData.paste));
    }
}

startup().catch(console.error);