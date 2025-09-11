const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const logger = require('./Logger');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Crawler {
    constructor(triggers, requestExtractor, documentExtractor) {
        this.triggers = Array.isArray(triggers) ? triggers : [triggers];
        this.requestExtractor = requestExtractor;
        this.documentExtractor = documentExtractor;
    }

    /**
   * Spustí rekurzivní crawl pro danou cestu.
   */
    async crawlPath(path, visited = new Set()) {
        if (visited.has(path)) {
            return []; // ochrana proti cyklům
        }
        if (path.includes("/Data")) {
            logger.info(`⛔ Skipping path: ${path}`);
            return []; // přeskočit datové cesty
        }

        visited.add(path);
        logger.info(`🔍 Crawling path: ${path}`);

        // Root request
        
        const documents = [];

        for (const trigger of this.triggers) {
            await delay(1000);
            const rootResponse = await trigger.requestTrigger(path);
        
            // kořenový node
            if (this.documentExtractor.match({ path }, { body: rootResponse })) {
                const extracted = this.documentExtractor.extract({ path }, { body: rootResponse });
                logger.info("Extracted root documents:", extracted);
                documents.push(...extracted);
            }

            // requesty na potomky
            const requests = this.requestExtractor.extract(path, rootResponse);

            const childDocs = await Promise.all(
                requests.map(async (req) => {
                    await delay(1000);

                    const res = await fetch(req.url, {
                        method: req.method,
                        headers: req.headers,
                        body: req.body,
                    });

                    const json = await res.json();

                    const docs = [];

                    if(this.documentExtractor.match(req, { body: json })) {
                        const extracted = this.documentExtractor.extract(req, { body: json });
                        logger.info("Extracted child documents:", extracted);
                        docs.push(...extracted);
                    }

                    let childPath;
                    try {
                        const bodyObj = JSON.parse(req.body || "{}");
                        childPath = bodyObj.variables?.path;
                    } catch {
                        childPath = null;
                    }

                    if (childPath) {
                        const nestedDocs = await this.crawlPath(childPath, visited);
                        docs.push(...nestedDocs);
                    }

                    return docs; // vrací jenom dokumenty z této větve
                })
            );

            documents.push(...childDocs.flat());  
        }                  

        return documents;
    }    
}

module.exports = Crawler;