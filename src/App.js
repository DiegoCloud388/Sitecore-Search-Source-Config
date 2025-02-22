const Trigger = require('./requests/trigger');
const RequestExtractor = require('./requests/request-extractor');
const FetchData = require('./fetchData');
const DocumentExtractor = require('./requests/document-extractor');

class App {
    constructor(apiKey, apiUrl) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.trigger = new Trigger(apiKey, apiUrl);
        this.requestExtractor = new RequestExtractor(apiKey, apiUrl);
        this.fetchData = new FetchData(apiUrl);
        this.documentExtractor = new DocumentExtractor();
    }

    /**
     * Spouští aplikaci a zpracovává data.
     */
    async run() {
        try {
            console.log('Fetching initial data...');
            const initialPath = '/sitecore/content/Zentiva/zentiva/Home';

            const initialData = await this.trigger.fetchData(initialPath);
            console.log('Trigger requests:', initialData);

            console.log('Extracting requests...');
            const extractedRequests = this.requestExtractor.extract(initialPath, initialData);
            console.log('Extracted requests:', extractedRequests);

            console.log('Fetch Document extractor...');
            const fetchDocumentExtractor = await this.fetchData.fetch(extractedRequests);
            console.log('Fetch Document extractor:', fetchDocumentExtractor);

            for(const item of fetchDocumentExtractor) {
                const documentExtractor = this.documentExtractor.match({}, item);
                console.log(documentExtractor);
            }

        } catch (error) {
            console.error('Error running app:', error.message);
        }
    }
}

module.exports = App;