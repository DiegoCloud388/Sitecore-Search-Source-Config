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

    // --- REKURZIVNÍ PROCHÁZENÍ ---
    async crawlPath(path, trigger, extractor, visited = new Set()) {
        if (visited.has(path)) {
            return []; // ochrana proti cyklům
        }
        visited.add(path);

        console.log(`🔍 Crawling path: ${path}`);

        const rootResponse = await trigger.requestTrigger(path);
        const documents = [];

        // zpracování kořenové stránky (pokud projde filtrem)
        if (match({ path }, { body: rootResponse })) {
            const docs = extract({ path }, { body: rootResponse });
            documents.push(...docs);
        }

        // vygeneruj requesty na děti
        const requests = extractor.extract(path, rootResponse);

        for (const req of requests) {
            const fetch = (await import('node-fetch')).default;
            const res = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body
            });
            const json = await res.json();

            // zpracuj dítě (stejně jako root)
            if (match(req, { body: json })) {
            const docs = extract(req, { body: json });
            documents.push(...docs);
            }

            // zjisti další potomky a jdi rekurzivně dál
            const childPath = JSON.parse(req.body).variables.path;
            const childDocs = await crawlPath(childPath, trigger, extractor, visited);
            documents.push(...childDocs);
        }

        return documents;
    }
}

module.exports = RequestExtractor;