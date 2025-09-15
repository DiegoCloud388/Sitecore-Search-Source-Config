// --- RequestExtractor Class ---
/**
 * Třída RequestExtractor načítá potomky z root adresy.
 */
class RequestExtractor {
    constructor(apiKey, apiUrl) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    extract(request, response) {
        let requests = [];
        if (response.body && response.body.data && response.body.data.item && response.body.data.item.children) {
            requests = response.body.data.item.children.results.map((e, i) => {
                let nameItem = e.name;
                let path = JSON.parse(request.body).variables.path + "/" + nameItem;
                let language = JSON.parse(request.body).variables.language;
                
                return {
                    url: request.url,
                    method: 'POST',
                    headers: request.headers,
                    body: JSON.stringify({
                        "query": "query getItem($language: String!, $path: String) {item(language: $language, path: $path) {id path rendered children {results {name rendered}}}}",
                        "operationName": "getItem",
                        "variables": {
                            "path": path,
                            "language": language
                        }
                    })
                };        
            });
        }

        return requests;
    }    
}

module.exports = RequestExtractor;