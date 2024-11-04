"use strict"

var filters = [];
var active = [];
var currentUrl = "";
var allFiltersSearchQuery = "";

const importFilters = async () => {
    const filterStore = await browser.storage.local.get("filters");
    filters = filterStore.filters ?? []; // I cannot figure out how to get it to not wrap the result in an object like this, but we can unrwap it this way
}

const startup = async () => {
    await importFilters();
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    let activeTab = tabs[0];
    if (!activeTab.url.startsWith("http")) {
        document.body.innerHTML = "Not available for this page type";
        document.body.style.height = "unset";
        document.body.style.padding = "10px";
        return;
    }
    active = filters.filter(x => checkUrlAgainstFilter(activeTab.url, x.filter)).sort((a, b) => b.filter.length - a.filter.length);
    currentUrl = activeTab.url;
    document.getElementById("copy-toggle").checked = active[0]?.copy ?? false;
    document.getElementById("paste-toggle").checked = active[0]?.paste ?? false;
    renderFilterLists();
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
    document.getElementById("cancel").onclick = (event) => {
        importFilters().then(() => {
            renderAllFilterList();
            document.getElementById("save-cancel").style.display = "none";
        });
    }
    document.getElementById("save").onclick = (event) => {
        document.getElementById("save-cancel").style.display = "none";
        save();
    }
    document.getElementById("new-filter").onclick = (event) => {
        allFiltersSearchQuery = "";
        document.getElementById("save-cancel").style.display = "flex";
        filters.push(createFilter(getDefaultFilterForUrl(currentUrl), false, false, true));
        renderAllFilterList();
    }
});

const createFilter = (filter, copy, paste, isNew = false) => {
    return {
        uuid: crypto.randomUUID(),
        filter,
        copy,
        paste,
        isNew
    }
}

const modifyActiveFilter = async (copy, paste) => {
    var filter = {};
    if (active.length == 0) {
        filter = createFilter(getDefaultFilterForUrl(currentUrl), copy, paste);
        active.push(filter);
        filters.push(filter);
    } else {
        filter = active[0];
    }
    filter.copy = copy;
    filter.paste = paste;
    await save();
}

const save = async () => {
    await browser.storage.local.set({filters});
    await renderFilterLists();
}

const renderFilterLists = () => {
    renderActiveFilterList();
    renderAllFilterList();
}

const renderFilter = (filter) => {
    const div = document.createElement("div");
    div.classList.add("filter");
    const input = document.createElement("input");
    input.value = filter.filter;
    input.oninput = (event) => {
        document.getElementById("save-cancel").style.display = "flex";
        filters.find(x => x.uuid == event.target.closest('.filter').dataset.uuid).filter = event.target.value;
    }
    div.appendChild(input);
    div.dataset.uuid = filter.uuid;
    return div;
}

const renderActiveFilterList = async () => {
    const applicableFilters = document.getElementById("applicable-filters");
    applicableFilters.innerHTML = "";
    for (var activeFilter of active) {
        applicableFilters.appendChild(renderFilter(activeFilter));
    }
}

const renderAllFilterList = async () => {
    const allFilters = document.getElementById("all-filters");
    allFilters.innerHTML = "";
    for (var currentFilter of filters.sort((a,b) => b.isNew ?? false > a.isNew ?? false)) {
        if (allFiltersSearchQuery != "" && currentFilter.filter.toLowerCase().indexOf(allFiltersSearchQuery) == -1) continue;
        allFilters.appendChild(renderFilter(currentFilter));
    }
}

startup().catch(console.error);