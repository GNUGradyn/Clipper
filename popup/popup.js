"use strict"

const main = async () => {
    let filters = await browser.storage.local.get("filters");
    let filter = null;

    browser.tabs.query({active: true, currentWindow: true}, (tabs) => { 
        const activeTab = tabs[0];
        const results = Object.keys(filters).filter(x => checkUrlAgainstFilter(activeTab.url));
        if (results.length > 0) filter = Math.max(...(results.map(el => el.length)));

        document.getElementById("match").innerText = filter ?? getDefaultFilterForUrl(activeTab.url);
      });
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

main().catch(console.error);