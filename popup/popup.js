"use strict"

var filters = [];
var active = [];
var currentUrl = "";
var allFiltersSearchQuery = "";

const importFilters = async () => {
    filters = await browser.runtime.sendMessage({type: "GET_ALL_FILTERS"}) ?? [];
    await updateActiveFilters();
}

const startup = async () => {
    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    let activeTab = tabs[0];
    if (!activeTab.url.startsWith("http")) {
        document.body.innerHTML = "Not available for this page type";
        document.body.style.height = "unset";
        document.body.style.padding = "10px";
        return;
    }
    currentUrl = activeTab.url;
    await importFilters();
    updateToggles();
    await renderFilterLists();
}

const updateActiveFilters = async () => active = await browser.runtime.sendMessage({
    type: "GET_ALL_FILTERS_APPLICABLE_FOR_URL",
    url: currentUrl
}) ?? [];

const updateToggles = () => {
    document.getElementById("copy-toggle").checked = active[0]?.copy ?? false;
    document.getElementById("paste-toggle").checked = active[0]?.paste ?? false;
}

const getDefaultFilterForUrl = (url) => {
    return url.split("/").slice(0, 3).join("/") + "/*";
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
    document.getElementById("all-filter-search").oninput = async (event) => {
        allFiltersSearchQuery = event.target.value;
       await renderFilterLists();
    }
    document.getElementById("cancel").onclick = async (event) => {
        await importFilters();
        document.getElementById("save-cancel").style.display = "none";
        await renderFilterLists();
    }
    document.getElementById("save").onclick = async (event) => {
        document.getElementById("save-cancel").style.display = "none";
        await save();
        updateToggles(); // in case they updated the active filter
    }
    document.getElementById("new-filter").onclick = async (event) => {
        allFiltersSearchQuery = "";
        document.getElementById("save-cancel").style.display = "flex";
        filters.push(createFilter(getDefaultFilterForUrl(currentUrl), false, false, true));
        await renderFilterLists();
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
    let filter = {};
    if (active.length === 0) {
        filter = createFilter(getDefaultFilterForUrl(currentUrl), copy, paste);
        active.push(filter);
        filters.push(filter);
    } else {
        filter = active[0];
    }
    filter.copy = copy;
    filter.paste = paste;
    await renderFilterLists();
    await save();
}

const save = async () => {
    await browser.runtime.sendMessage({type: "SET_FILTERS", filters: filters});
    await updateActiveFilters(); // in case the active filter was modified
    await renderFilterLists();
}

const renderFilterLists = async () => {
    await renderActiveFilterList();
    await renderAllFilterList();
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
    copyButton.onclick = async (event) => {
        const target = event.target.closest(".filter-control-icon");
        document.getElementById("save-cancel").style.display = "flex";
        filters.find(x => x.uuid == target.closest('.filter').dataset.uuid).copy = !target.classList.contains("active");
        await renderFilterLists();
    }
    const copyIconText = document.createElement("span");
    copyIconText.innerText = "COPY";
    copyButton.appendChild(copyIconText);
    copyButton.classList.add("copy-toggle");
    copyButton.classList.add("filter-control-icon");
    if (filter.copy) copyButton.classList.add("active");
    controlDiv.appendChild(copyButton);

    const pasteButton = document.createElement("div");
    pasteButton.onclick = async (event) => {
        const target = event.target.closest(".filter-control-icon");
        document.getElementById("save-cancel").style.display = "flex";
        filters.find(x => x.uuid == target.closest('.filter').dataset.uuid).paste = !target.classList.contains("active");
        await renderFilterLists();
    }
    const pasteIconText = document.createElement("span");
    pasteIconText.innerText = "PASTE";
    pasteButton.appendChild(pasteIconText);
    pasteButton.classList.add("paste-toggle");
    pasteButton.classList.add("filter-control-icon");
    if (filter.paste) pasteButton.classList.add("active");
    controlDiv.appendChild(pasteButton);

    const deleteButton = document.createElement("div");
    deleteButton.onclick = async (event) => {
        const target = event.target.closest(".filter");
        document.getElementById("save-cancel").style.display = "flex";
        filters = filters.filter(x => x.uuid != target.dataset.uuid);
        await renderFilterLists();
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
    for (var currentFilter of filters.sort((a, b) => b.isNew ?? false > a.isNew ?? false)) {
        if (allFiltersSearchQuery != "" && currentFilter.filter.toLowerCase().indexOf(allFiltersSearchQuery) == -1) continue;
        allFilters.appendChild(renderFilter(currentFilter));
    }
}

startup().catch(console.error);
