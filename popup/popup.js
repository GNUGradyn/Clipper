const main = async () => {
    let filters = await storage.local.get("filters");
    let filter = null;
}

/**
 * @param {string} url - The URL
 * @param {number} filter - The filter
 * @returns {boolean} Rather or not the URL matches the filter
 */
const checkUrlAgainstFilter = (url, filter) => {
    let wildcard = false;
    let filterPointer = 0;
    for (let urlPointer = 0; urlPointer < url.length; urlPointer++) {
        if (filter[urlPointer] == "*") {
            wildcard = true;
            continue;
        }
        if (filter[filterPointer] == url[urlPointer]) {
            wildcard = false;
            filterPointer++;
            continue;
        } 
        if (wildcard) {
            continue;
        }
        if ((filter[filterPointer] !== url[urlPointer])) {
            return false;
        }
    }
    return true;
}

main();