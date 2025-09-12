const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const logger = require('./Logger');

// Pomocná funkce pro zpoždění
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Pomocná funkce, která opakuje asynchronní volání s určitým počtem pokusů a zpožděním
async function withRetry(fn, retries = 3, delayMs = 1000) {
    for (let i = 0; i < retries; i++) {
        const res = await fn();

        if(res.status != 429) {
            return res;
        }

        // Výpočet čekající doby na základě hlavičky Retry-After
        const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
        const waitTime = retryAfter > 0 ? retryAfter * 1000 : delayMs;
        logger.warn(`⚠️ Rate limit hit, retrying in ${waitTime}ms...`);

        await delay(waitTime);
        delayMs *= 2; // Exponenciální backoff
    }

    throw new logger.error("Too many retries, aborting.");
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
            //await delay(1000);

            // Získání root response
            const rootResponse = await trigger.requestTrigger(path);
        
            // kořenový node
            if (this.documentExtractor.match({ path }, { body: rootResponse })) {
                const extracted = this.documentExtractor.extract({ path }, { body: rootResponse });
                logger.info("Extracted root documents:", extracted);
                documents.push(...extracted);
            }

            // requesty na potomky
            const requests = this.requestExtractor.extract(path, rootResponse);

            for (const req of requests) {
                //await delay(1000);

                const res = await withRetry(() =>
                    fetch(req.url, {
                        method: req.method,
                        headers: req.headers,
                        body: req.body,
                    })
                );

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

                documents.push(...docs);
            }
        }                  

        return documents;
    }    
}

module.exports = Crawler;