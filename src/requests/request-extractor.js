class RequestExtractor {
    constructor(apiKey, apiUrl) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    extract(request, response) {
        let requests = [];
        if (response && response.data && response.data.item && response.data.item.children) {
            requests = response.data.item.children.results.map((e) => {
                let nameItem = e.name;
                let path = request + "/" + nameItem;
                return {
                    url: this.apiUrl,
                    method: 'POST',
                    headers: {
                        'content-type': ['application/json'],
                        'sc_apikey' : this.apiKey
                    },
                    body: JSON.stringify({
                        "query": "query getItem($path: String) {item(language: \"en\", path: $path) {id path rendered children {results {name rendered}}}}",
                        "operationName": "getItem",
                        "variables": {
                            "path": path
                        }
                    })
                };        
            });
        }
        return requests;
    }    
}

module.exports = RequestExtractor;