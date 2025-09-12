const Trigger = require('./requests/trigger');
const RequestExtractor = require('./requests/request-extractor');
const DocumentExtractor = require('./requests/document-extractor');
const LocationExtractor = require('./requests/location-extractor');
const Crawler = require('./Crawler');

const logger = require('./Logger');

class App {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    //this.triggerEn = new Trigger(apiKey, apiUrl, 'en');
    this.triggerCs = new Trigger(apiKey, apiUrl, 'cs');
    //this.triggerEnDK = new Trigger(apiKey, apiUrl, 'en-DK');
    // this.triggerEt = new Trigger(apiKey, apiUrl, 'et');
    // this.triggerLv = new Trigger(apiKey, apiUrl, 'lv');
    // this.triggerLt = new Trigger(apiKey, apiUrl, 'lt');
    // this.triggerBg = new Trigger(apiKey, apiUrl, 'bg');
    // this.triggerUk = new Trigger(apiKey, apiUrl, 'uk');
    // this.triggerRo = new Trigger(apiKey, apiUrl, 'ro');
    //this.triggerEnIn = new Trigger(apiKey, apiUrl, 'en-in');
    //this.triggerNl = new Trigger(apiKey, apiUrl, 'nl');    
    this.requestExtractor = new RequestExtractor(apiKey, apiUrl);
    this.documentExtractor = new DocumentExtractor();
    this.locationExtractor = new LocationExtractor();
    this.crawler = new Crawler([
      //this.triggerEn, 
      this.triggerCs, 
      //this.triggerEnDK,
      // this.triggerEt,
      // this.triggerLv,
      // this.triggerLt,
      // this.triggerBg,
      // this.triggerUk,
      // this.triggerRo,
      //this.triggerEnIn,
      //this.triggerNl      
    ], this.requestExtractor, this.documentExtractor, this.locationExtractor);
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