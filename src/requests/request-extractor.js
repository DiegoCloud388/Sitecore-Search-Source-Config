class RequestExtractor {
    constructor(apiKey, apiUrl) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    extract(request, response) {
        const requests = [];
        this.processChildren(request, response.data.item, requests);
        
        return requests;
    }

    processChildren(request, currentItem, requests) {
        if (!currentItem || !currentItem.children || !currentItem.children.results) {
            return;
        }

        for (const child of currentItem.children.results) {
            const nameItem = child.name;
            const path = `${request}/${nameItem}`;
            requests.push({
                url: this.apiUrl,
                method: 'POST',
                headers: {
                    'content-type': ['application/json'],
                    'sc_apikey': [this.apiKey],
                },
                body: JSON.stringify({
                    query: `query getItem($path: String) {
                        item(language: "en", path: $path) {
                            id
                            path
                            rendered
                            children(first: 100) {
                                results {
                                    name
                                    rendered
                                }
                            }
                        }
                    }`,
                    operationName: 'getItem',
                    variables: { path },
                }),
            });

            // Rekurzivně zpracuj podpotomky
            if (child.children) {
                this.processChildren(path, child, requests);
            }
        }
    }
}

module.exports = RequestExtractor;