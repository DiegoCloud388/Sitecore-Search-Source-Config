const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const logger = require('./Logger');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 4, baseDelay = 500) {
    for (let i = 0; i <= retries; i++) {
        const res = await fetch(url, options);
        if (res.status === 429) {
            if (i === retries) {
                throw new Error(`Too many retries (429) for ${url}`);
            }
            const ra = res.headers?.get?.('retry-after');
            const wait = ra ? Number(ra) * 1000 : baseDelay * Math.pow(2, i);
            console.warn(`Rate limited on ${url}. retry ${i + 1}/${retries} after ${wait}ms`);
            await delay(wait);
            continue;
        }
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status} for ${url}`);
        }
        return res;
    }
}

class Crawler {
    constructor(trigger, extractor, documentExtractor, options = {}) {
        this.trigger = trigger;
        this.extractor = extractor;
        this.documentExtractor = documentExtractor;

        // options
        this.CONCURRENCY = options.concurrency ?? 3;
        this.PAUSE_BEFORE_FETCH_MS = options.pauseBeforeFetchMs ?? 200;
    }

    /**
   * Normalize response into { body: <json> } expected by documentExtractor
   */
    _normalizeResponse(raw) {
        // If already in shape { body: ... } just return
        if (raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'body')) {
            return raw;
        }
        // Otherwise wrap
        return { body: raw };
    }

    /**
   * Spustí rekurzivní crawl pro danou cestu.
   */
    async crawlPath(path, visited = new Set()) {
        if (visited.has(path)) {
            return []; // ochrana proti cyklům
        }
        if (path.includes("/Data/")) {
            logger.info(`⛔ Skipping path: ${path}`);
            return []; // přeskočit datové cesty
        }

        visited.add(path);
        logger.info(`🔍 Crawling path: ${path}`);

        // 1) získat rootResponse
        let rootRaw;
        try {
            rootRaw = await this.trigger.requestTrigger(path);
        } catch (err) {
            logger.error(`Failed to get root response for ${path}:`, err);
            return [];
        }

        const normalizedRoot = this._normalizeResponse(rootRaw);

        // zpracování kořenové stránky (pokud projde filtrem)
        // if (this.documentExtractor.match({ path }, { body: rootResponse })) {
        //     documents.push(...this.documentExtractor.extract({ path }, { body: rootResponse }));
        // }

        // bezpečnostní kontrola: body a body.data
        if (!normalizedRoot.body || typeof normalizedRoot.body !== 'object') {
            logger.error(`Root response for ${path} has no body or not an object. Skipping root processing. rootRaw:`, normalizedRoot);
        }

        const documents = [];

        // 2) zpracování kořenové stránky (pokud projde filtrem)
        try {
            if (this.documentExtractor.match({ path }, normalizedRoot)) {
                // před voláním extract ověřit, že očekávané vlastnosti jsou přítomné
                if (!normalizedRoot.body?.data) {
                    logger.error(`Warning: documentExtractor.match returned true but root body.data is missing for ${path}`);
                }
                const extracted = this.documentExtractor.extract({ path }, normalizedRoot);
                if (Array.isArray(extracted)) documents.push(...extracted);
            }
        } catch (err) {
            logger.error(`Error extracting root for ${path}:`, err);
        }

        // 3) získat requesty na děti
    let requests = [];
    try {
        // extractor pravděpodobně očekává "raw" (to co trigger vrací), předáváme rootRaw
        requests = this.extractor.extract(path, rootRaw) || [];
    } catch (err) {
        logger.error(`Error extracting child requests for ${path}:`, err);
        requests = [];
    }

    // 4) zpracovat děti s omezenou paralelizací
    const results = [];
    for (let i = 0; i < requests.length; i += this.CONCURRENCY) {
        const chunk = requests.slice(i, i + this.CONCURRENCY);
        const promises = chunk.map(async (req) => {
            // lehké zpomalení před každým fetchem (snižuje šanci na 429)
            await delay(this.PAUSE_BEFORE_FETCH_MS);
            try {
                const res = await fetchWithRetry(req.url, {
                    method: req.method,
                    headers: req.headers,
                    body: req.body,
                });

                let json;
                try {
                    json = await res.json();
                } catch (e) {
                    logger.error(`Invalid JSON for request ${req.url}:`, e);
                    return []; // nic k extrakci
                }

                const docs = [];

                // validace tvaru JSON před extrakcí
                if (!json || typeof json !== 'object') {
                    logger.error(`Empty/invalid JSON body from ${req.url}`);
                } else {
                    try {
                        const normalizedChild = { body: json };

                        if (this.documentExtractor.match(req, normalizedChild)) {
                            if (!normalizedChild.body?.data) {
                                logger.error(`Warning: child response matched but body.data missing for req ${req.url}`);
                            }
                            const extracted = this.documentExtractor.extract(req, normalizedChild);
                            if (Array.isArray(extracted)) {
                                logger.info("Extracted Documents:", extracted);
                                docs.push(...extracted);
                            }
                        }
                    } catch (err) {
                        logger.error(`Error extracting document from ${req.url}:`, err);
                    }
                }

                // zjisti childPath bezpečně
                let childPath = null;
                try {
                    const bodyObj = req.body ? JSON.parse(req.body) : {};
                    childPath = bodyObj?.variables?.path;
                } catch (err) {
                    // ignore, provavelmente není JSON
                    childPath = null;
                }

                if (childPath) {
                    try {
                        const nested = await this.crawlPath(childPath, visited);
                        docs.push(...nested);
                    } catch (err) {
                        logger.error(`Error crawling childPath ${childPath}:`, err);
                    }
                }

                return docs;
            } catch (err) {
                logger.error(`Fetch/error for ${req.url}:`, err);
                return [];
            }
        });

        const chunkResults = await Promise.all(promises);
        results.push(...chunkResults.flat());
    }

    documents.push(...results);
    return documents;

    }
}

module.exports = Crawler;