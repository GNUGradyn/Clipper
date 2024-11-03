"use strict"

var filters = [];
var active = [];
var url = "";

const main = async () => {
    var filters = await browser.storage.local.get("filters");
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => { 
        let activeTab = tabs[0];
        if (!activeTab.url.startsWith("http")) {
            document.body.innerHTML = "Not available for this page type";
            return;
        }
        active = Object.keys(filters).filter(x => checkUrlAgainstFilter(activeTab.url)).sort((a, b) => b.length - a.length);
        url = activeTab.url;
        renderActiveFilterList();
      });

      const renderActiveFilterList = async () => {
        const applicableFilters = document.getElementById("applicable-filters");
        applicableFilters.innerHTML = "";
        for (var activeFilter of active) {
            const paragraph = document.createElement("p");
            paragraph.innerText = activeFilter;
            applicableFilters.appendChild(paragraph);
        }
      }
}

const getDefaultFilterForUrl = (url) => {
    return url.split("/").slice(0,3).join("/") + "/*";
}

/**
 * @param {string} urlLowercase - The URL
 * @param {number} filterLowercase - The filter
 * @returns {boolean} Rather or not the URL matches the filter
 */
const checkUrlAgainstFilter = (url, filter) => {
    const urlLowercase = url.toLowerCase();
    const filterLowercase = filter.toLowerCase();
    
    url_ptr = 0;
    fil_ptr = 0;
    url_last_wildcard = -1;
    fil_last_wildcard = -1;

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
        var filter = getDefaultFilterForUrl(url);
        filters[filter] = {copy,paste}
        await browser.storage.local.set(filters);
        active.push(filter);
        await renderActiveFilterList();
    }
}

main().catch(console.error);