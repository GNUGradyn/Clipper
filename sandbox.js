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
        while (filterPointers.length > 0) {
            filterPointer = Math.min(...filterPointers)
            if ((filterLowercase[filterPointer] == urlLowercase[lastWildcard]) && lastWildcard > -1) filterPointers.push(filterPointer);
            if (filterLowercase[filterPointer] == "*") {
                filterPointers = [++filterPointer];
                lastWildcard = filterPointer;
                if(filterPointer == filterLowercase.length) return true; // NOT just an optimization. There is a check below to see if the filter pointer is about to go out of bounds. If the filter pointer is ever about to go out of bounds
                // that means either the filter ends on a wildcard (which is handled here) or the filter has ended but there is still more URL indicating a no match. 
            }
            if (lastWildcard != -1 && (filterLowercase[filterPointer] != urlLowercase[urlPointer]))
            {
                if (filterPointers.length == 1) {
                    filterPointers = filterPointers.map(x => x == filterPointer ? ++filterPointer : x);
                } else {
                    filterPointers = filterPointers.filter(x => x != filterPointer);
                }
            }
            if (filterLowercase[filterPointer] == urlLowercase[urlPointer]) {
                filterPointers = filterPointers.map(x => x == filterPointer ? ++filterPointer : x);
            } else if ((filterLowercase[filterPointer] != urlLowercase[urlPointer]) && lastWildcard == -1) {
                return false;
            }
        }
    }
    return filterPointer == filterLowercase.length;
}


console.log(!checkUrlAgainstFilter("https://egg.sites.google.com/eg/eg/eg/eg/eg/eg/eg/egg/eggg/sdfjshdkfjhsdfkjshdkfjhsdf/sa/df/asdf", "https://*.google.com/*/egg/"))
console.log(checkUrlAgainstFilter("https://egg.sites.google.com/eg/eg/eg/eg/eg/eg/eg/egg/eggg/sdfjshdkfjhsdfkjshdkfjhsdf/sa/df/asdf", "https://*.google.com/*/egg/*"))
console.log(checkUrlAgainstFilter("https://egg.sites.google.com/eg/eg/eg/eg/eg/eg/eg/eg/egg/sdfjshdkfjhsdfkjshdkfjhsdf/sa/df/asdf", "https://*.google.com/*/egg/*"))
console.log(checkUrlAgainstFilter("cactus", "*cactus")) 
console.log(checkUrlAgainstFilter("cacactus", "*cactus"))

// Exact match, no wildcards in filter
console.log(checkUrlAgainstFilter("https://example.com/path", "https://example.com/path")); // true

// Mismatched URL with no wildcards
console.log(!checkUrlAgainstFilter("https://example.com/otherpath", "https://example.com/path")); // true

// Wildcard in subdomain
console.log(checkUrlAgainstFilter("https://sub.example.com/path", "https://*.example.com/path")); // true
console.log(!checkUrlAgainstFilter("https://example.com/path", "https://*.example.com/path")); // true

// Wildcard at the beginning of the domain
console.log(checkUrlAgainstFilter("https://anything.com", "https://*.com")); // true

// Wildcard in path
console.log(checkUrlAgainstFilter("https://example.com/path/other", "https://example.com/path/*")); // true
console.log(!checkUrlAgainstFilter("https://example.com/path", "https://example.com/path/*")); // true

// Multiple wildcards in filter
console.log(checkUrlAgainstFilter("https://abc.def.example.com/path/file", "https://*.example.com/*/file")); // true
console.log(!checkUrlAgainstFilter("https://example.com/path/file", "https://*.example.com/*/file")); // true

// Only wildcard in domain
console.log(checkUrlAgainstFilter("https://anything.anything/path", "https://*.*/*")); // true

// Wildcard-only filter
console.log(checkUrlAgainstFilter("https://any.url.com/path", "*")); // true
console.log(checkUrlAgainstFilter("https://example.com", "*")); // true

// Empty URL should fail
console.log(!checkUrlAgainstFilter("", "https://*.example.com/*")); // true

// Wildcard for entire path
console.log(checkUrlAgainstFilter("https://example.com/any/path", "https://example.com/*")); // true

// Wildcard in TLD
console.log(checkUrlAgainstFilter("https://example.co.uk", "https://example.*")); // true
console.log(!checkUrlAgainstFilter("https://example.com", "https://example.co.uk")); // true

// Edge case: wildcard in protocol
console.log(checkUrlAgainstFilter("http://example.com/path", "*://example.com/path")); // true

// Special characters in URL path
console.log(checkUrlAgainstFilter("https://example.com/path-with-special_chars!@#", "https://example.com/*")); // true

// Mismatched protocols
console.log(!checkUrlAgainstFilter("http://example.com/path", "https://example.com/*")); // true
console.log(checkUrlAgainstFilter("https://example.com/path", "*://example.com/*")); // true

// Query parameters ignored
console.log(checkUrlAgainstFilter("https://example.com/path?query=123", "https://example.com/path*")); // true

// Case-sensitivity test
console.log(!checkUrlAgainstFilter("https://EXAMPLE.com/path", "https://example.com/path")); // true
