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
    currentUrl = activeTab.url;
    updateActiveFilters();
    updateToggles();
    renderFilterLists();
}

const updateActiveFilters = () => active = filters.filter(x => checkUrlAgainstFilter(currentUrl, x.filter)).sort((a, b) => b.filter.length - a.filter.length);

const updateToggles = () => {
    document.getElementById("copy-toggle").checked = active[0]?.copy ?? false;
    document.getElementById("paste-toggle").checked = active[0]?.paste ?? false;
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
            document.getElementById("save-cancel").style.display = "none";
            updateActiveFilters(); // in case they updated an active filter
            renderFilterLists();
        });
    }
    document.getElementById("save").onclick = (event) => {
        document.getElementById("save-cancel").style.display = "none";
        save();
        updateToggles(); // in case they updated the active filter
        updateActiveFilters(); // in case they updated an active filter
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

    const controlDiv = document.createElement("div");
    controlDiv.classList.add("filter-controls");

    const copyButton = document.createElement("div");
    copyButton.onclick = (event) => {
        const target = event.target.closest(".filter-control-icon");
        document.getElementById("save-cancel").style.display = "flex";
        filters.find(x => x.uuid == target.closest('.filter').dataset.uuid).copy = !target.classList.contains("active");
        renderFilterLists();
    }
    const copyIconText = document.createElement("span");
    copyIconText.innerText = "COPY";
    copyButton.appendChild(copyIconText);
    copyButton.classList.add("copy-toggle");
    copyButton.classList.add("filter-control-icon");
    if (filter.copy) copyButton.classList.add("active");
    controlDiv.appendChild(copyButton);

    const pasteButton = document.createElement("div");
    pasteButton.onclick = (event) => {
        const target = event.target.closest(".filter-control-icon");
        document.getElementById("save-cancel").style.display = "flex";
        filters.find(x => x.uuid == target.closest('.filter').dataset.uuid).paste = !target.classList.contains("active");
        renderFilterLists();
    }
    const pasteIconText = document.createElement("span");
    pasteIconText.innerText = "PASTE";
    pasteButton.appendChild(pasteIconText);
    pasteButton.classList.add("paste-toggle");
    pasteButton.classList.add("filter-control-icon");
    if (filter.paste) pasteButton.classList.add("active");
    controlDiv.appendChild(pasteButton);

    const deleteButton = document.createElement("div");
    deleteButton.onclick = (event) => {
        const target = event.target.closest(".filter");
        document.getElementById("save-cancel").style.display = "flex";
        filters = filters.filter(x => x.uuid != target.dataset.uuid);
        updateActiveFilters(); // in case they deleted an active filter
        renderFilterLists();
    }
    deleteButton.classList.add("delete-button");
    const deleteButtonImg = document.createElement("img");
    deleteButtonImg.src = "x.svg";
    deleteButton.appendChild(deleteButtonImg);
    controlDiv.appendChild(deleteButton);

    div.appendChild(controlDiv);
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