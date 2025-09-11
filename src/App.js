const Trigger = require('./requests/trigger');
const RequestExtractor = require('./requests/request-extractor');
const DocumentExtractor = require('./requests/document-extractor');
const Crawler = require('./Crawler');
const logger = require('./Logger');

class App {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.trigger = new Trigger(apiKey, apiUrl);
    this.requestExtractor = new RequestExtractor(apiKey, apiUrl);
    this.documentExtractor = new DocumentExtractor();
    this.crawler = new Crawler(this.trigger, this.requestExtractor, this.documentExtractor);
  }

  /**
  * Spouští aplikaci a zpracovává data.
  */
  async run() {
    try {
      logger.info('Fetching initial data...');
      const initialPath = '/sitecore/content/Zentiva/zentiva/Home';

      // const initialData = await this.trigger.requestTrigger(initialPath);
      // console.log('Trigger requests:', initialData);

      // console.log('Extracting requests...');
      // const extractedRequests = this.requestExtractor.extract(initialPath, initialData);
      // console.log('Extracted requests:', extractedRequests);

      const docs = await this.crawler.crawlPath(initialPath);
      logger.info(`📊 Celkový počet extrahovaných dokumentů: ${docs.length}`);

      logger.info("📄 Extracted documents:");
      logger.info(JSON.stringify(docs, null, 2));

    } catch (error) {
        logger.error('Error running app:', error.message);
    }
  }
}
module.exports = App;