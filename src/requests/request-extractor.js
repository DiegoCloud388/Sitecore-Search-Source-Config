class RequestExtractor {
    constructor(apiKey, apiUrl) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    extract(request, response) {
        const requests = [];
        if (response && response.data && response.data.item && response.data.item.children) {
            requests = response.body.data.item.children.results.map((e, i) => {
                const path = `${request}/${child.name}`;
                requests.push({
                    url: this.apiUrl,
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'sc_apikey': this.apiKey,
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
            });
        }

        return requests;
    }
}

module.exports = RequestExtractor;