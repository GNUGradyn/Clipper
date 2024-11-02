const main = async () => {
    let filters = await storage.local.get("filters");
    let filter = null;
}

/**
 * @param {string} urlLowercase - The URL
 * @param {number} filterLowercase - The filter
 * @returns {boolean} Rather or not the URL matches the filter
 */
const checkUrlAgainstFilter = (url, filter) => {
    const urlLowercase = url.toLowerCase();
    const filterLowercase = filter.toLowerCase();
    let filterPointers = [0];
    let lastWildcard = -1;
    for (let urlPointer = 0; urlPointer < urlLowercase.length; urlPointer++) {
        for (let filterPointerIndex = 0; filterPointerIndex < filterPointers.length; filterPointerIndex++) {
            filterPointer = filterPointers[filterPointerIndex]
            if ((filterLowercase[filterPointer] == urlLowercase[lastWildcard]) && lastWildcard > -1) filterPointers.push(urlPointer);
            if (filterLowercase[filterPointer] == "*") {
                filterPointers = [++filterPointer];
                lastWildcard = filterPointer;
                filterPointerIndex = -1; // Bump this inner loop back to the beginning now that we've cleared the array
                if(filterPointer == filterLowercase.length) return true; // NOT just an optimization. There is a check below to see if the filter pointer is about to go out of bounds. If the filter pointer is ever about to go out of bounds
                // that means either the filter ends on a wildcard (which is handled here) or the filter has ended but there is still more URL indicating a no match. 
            }
            if (lastWildcard != -1 && (filterLowercase[filterPointer] != urlLowercase[urlPointer]))
            {
                filterPointers = filterPointers.filter(x => x != filterPointer);
                if (filterPointers.length == 0) return false;
                lastWildcard = filterPointer;
                filterPointerIndex--; // Bump this inner loop back that we've modified the array
            }
            if (filterLowercase[filterPointer] == urlLowercase[urlPointer]) {
                filterPointers = filterPointers.map(x => x == filterPointer ? ++filterPointer : x);
                lastWildcard = filterPointer;
                filterPointerIndex--; // Bump this inner loop back we've modified the array
            } else if ((filterLowercase[filterPointer] != urlLowercase[urlPointer]) && lastWildcard == -1) {
                return false;
            }
        }
    }
    return filterPointer == filterLowercase.length;
}

main();