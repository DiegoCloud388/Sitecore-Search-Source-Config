const Trigger = require('./requests/trigger');
const RequestExtractor = require('./requests/request-extractor');
const DocumentExtractor = require('./requests/document-extractor');

class App {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.trigger = new Trigger(apiKey, apiUrl);
    this.requestExtractor = new RequestExtractor(apiKey, apiUrl);
    this.documentExtractor = new DocumentExtractor();
  }

  /**
  * Spouští aplikaci a zpracovává data.
  */
  async run() {
    try {
      console.log('Fetching initial data...');
      const initialPath = '/sitecore/content/Zentiva/zentiva/Home';

      const initialData = await this.trigger.requestTrigger(initialPath);
      console.log('Trigger requests:', initialData);

      console.log('Extracting requests...');
      const extractedRequests = this.requestExtractor.extract(initialPath, initialData);
      console.log('Extracted requests:', extractedRequests);

      const docs = await this.crawlPath(initialPath);
      console.log(`📊 Celkový počet extrahovaných dokumentů: ${docs.length}`);

      console.log("📄 Extracted documents:");
      console.log(JSON.stringify(docs, null, 2));

    } catch (error) {
      console.error('Error running app:', error.message);
    }
  }

  /**
   * Spustí rekurzivní crawl pro danou cestu.
   */
  async crawlPath(path, visited = new Set()) {
    if (visited.has(path)) {
      return []; // ochrana proti cyklům
    }
    if (path.includes("/Data/")) {
      return []; // přeskočit datové cesty
    }

    visited.add(path);

    console.log(`🔍 Crawling path: ${path}`);

    const rootResponse = await this.trigger.requestTrigger(path);
    const documents = [];

    // zpracování kořenové stránky (pokud projde filtrem)
    if (this.documentExtractor.match({ path }, { body: rootResponse })) {
      documents.push(...this.extract({ path }, { body: rootResponse }));
    }

    // vygeneruj requesty na potomky
    const requests = this.extractor.extract(path, rootResponse);

    const childDocs = await Promise.all(
      requests.map(async (req) => {
        await delay(500); // zpoždění kvůli Sitecore Search - error 429

        const res = await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });
        const json = await res.json();

        const docs = [];
        if (this.documentExtractor.match(req, { body: json })) {
          const extracted = this.extract(req, { body: json });
          console.log("Extracted Documents:", extracted);
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

        return docs;
      })
    );

    documents.push(...childDocs.flat());

    return documents;
  }
}
  
module.exports = App;