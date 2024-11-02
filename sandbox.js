var checkUrlAgainstFilter = (url, filter) => {
    let filterPointer = 0;
    let lastWildcard = -1;
    for (let urlPointer = 0; urlPointer < url.length; urlPointer++) {
        if (filter[filterPointer] == "*") {
            lastWildcard = ++filterPointer;
            continue;
        }
        if (filter[filterPointer] == url[urlPointer]) {
            filterPointer++;
            continue;
        }
        else if(lastWildcard == -1){
            filterPointer = lastWildcard;
        }
        if (lastWildcard != -1) {
            continue;
        }
        if ((filter[filterPointer] != url[urlPointer])) {
            return false;
        }
    }
    return filterPointer == filter.length;
}

console.log(
    checkUrlAgainstFilter("https://egg.sites.google.com/eg/eg/eg/eg/eg/eg/eg/eg/egg/sdfjshdkfjhsdfkjshdkfjhsdf/sa/df/asdf", "https://*.google.com/*/egg/*")
)