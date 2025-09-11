const Trigger = require('./requests/trigger');
const RequestExtractor = require('./requests/request-extractor');
const DocumentExtractor = require('./requests/document-extractor');
const Crawler = require('./Crawler');

const logger = require('./Logger');

class App {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.triggerEn = new Trigger(apiKey, apiUrl, 'en');
    this.triggerCs = new Trigger(apiKey, apiUrl, 'cs');
    this.triggerEnIn = new Trigger(apiKey, apiUrl, 'en-in');
    this.requestExtractor = new RequestExtractor(apiKey, apiUrl);
    this.documentExtractor = new DocumentExtractor();
    this.crawler = new Crawler([
      this.triggerEn, 
      this.triggerCs, 
      this.triggerEnIn,
    ], this.requestExtractor, this.documentExtractor);
  }

  /**
  * Spouští aplikaci a zpracovává data.
  */
  async run() {
    try {
      logger.info('Fetching initial data...');
      const initialPath = '/sitecore/content/Zentiva/zentiva/Home';

      const docs = await this.crawler.crawlPath(initialPath);
      logger.info(`📊 Celkový počet zaindexovaných položek: ${docs.length}`);

      logger.info("📄 Extracted documents:");
      logger.info(JSON.stringify(docs, null, 2));

    } catch (error) {
        logger.error('Error running app:', error.message);
    }
  }
}
module.exports = App;