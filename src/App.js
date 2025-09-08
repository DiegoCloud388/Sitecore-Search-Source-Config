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

            const initialData = await this.trigger.requestTrigger(initialPath);
            console.log('Trigger requests:', initialData);

            // Child Pages
            // TODO: procházení potmomků
            console.log('Extracting requests...');
            const extractedRequests = this.requestExtractor.extract(initialPath, initialData);
            console.log('Extracted requests:', extractedRequests);

            const docs = await crawlPath(initialPath, this.trigger, this.requestExtractor);

            console.log("📄 Extracted documents:");
            console.log(JSON.stringify(docs, null, 2));

        } catch (error) {
            console.error('Error running app:', error.message);
        }
    }
}

async function crawlPath(path, trigger, extractor, visited = new Set()) {
  if (visited.has(path)) {
    return []; // ochrana proti cyklům
  }
  if(path.includes("/Data/")) {
    console.log(`⛔ Skipping path: ${path}`);
    return [];
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
      console.log("Extracted Documents:", docs);
      documents.push(...docs);
    }

    // zjisti další potomky a jdi rekurzivně dál
    const childPath = JSON.parse(req.body).variables.path;
    const childDocs = await crawlPath(childPath, trigger, extractor, visited);
    documents.push(...childDocs);
  }

  return documents;
}

function match(request, response) {
  var data = response.body.data;
  return data?.item?.rendered != null &&
    data?.item?.rendered?.sitecore?.route?.placeholders['headless-main']?.length > 0 &&
    data?.item?.rendered?.sitecore?.route?.fields?.ChangeFrequency?.name != 'do not include';
}

function extract(request, response) {
  const data = response.body.data;

    const headlessMain = data.item.rendered.sitecore?.route?.placeholders?.['headless-main'];
    const templateName = data.item.rendered.sitecore?.route.templateName ?? '';
    const rawTags = data.item.rendered.sitecore?.route?.fields?.tags;
    const language = data.item.rendered.sitecore?.context?.language;
    let annotation = data.item.rendered.sitecore?.route?.fields?.annotation?.value?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    let imageUrl = data.item.rendered.sitecore?.route?.fields?.image?.value?.src;

    const tags = Array.isArray(rawTags)
    ? rawTags.map(tag => tag?.fields?.name?.value).filter(Boolean)
    : [];

    const participationTags = Array.isArray(data.item.rendered.sitecore?.route?.fields?.participationTags)
        ? data.item.rendered.sitecore.route.fields.participationTags
            .map(tag => tag?.fields?.name?.value)
            .filter(Boolean)
        : [];

    const tagNames = [...tags, ...participationTags];
    
    // Category
    let category = null;

    if (templateName === 'Event') {
        category = headlessMain
            .find(x => x.componentName === 'EventDetail')
            ?.fields?.data?.item?.ancestors?.[0]?.title?.value;
    } else if (templateName === 'News Article') {
        category = headlessMain
            .flatMap(item => Object.values(item.placeholders || {}))
            .flat()
            .find(x => x.componentName === 'NewsArticleDetail')
            ?.fields?.data?.item?.ancestors?.[0]?.title?.value;
    } else if (templateName === 'Media File') {
        category = headlessMain
            .find(x => x.componentName === 'MediaFile')
            ?.fields?.data?.item?.ancestors?.[0]?.title?.value;
        annotation = data.item.rendered.sitecore?.route?.fields?.description?.value?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        imageUrl = data.item.rendered.sitecore?.route?.fields?.mediaImage?.value?.src;
    }

    // Content Title
    const contentTitle = headlessMain
        .map(item => item.fields?.data?.contextItem?.title?.field?.value)
        .filter(title => title) // Remove undefined or null values
        .join(" ");

    // Rekurzivní funkce pro extrakci všech textových hodnot z RichText komponent
    function extractRichTextValues(components) {
        let texts = [];

        for (const component of components) {
            // RichText – přímý text
            const text = component?.fields?.text?.value;
            if (text) {
                texts.push(text);
            }

            // Rekurzivně zanořené komponenty v placeholders
            if (component?.placeholders) {
                for (const nested of Object.values(component.placeholders)) {
                    if (Array.isArray(nested)) {
                        texts = texts.concat(extractRichTextValues(nested));
                    }
                }
            }
        }

        return texts;
    }

    // Content Text
    const contentText = extractRichTextValues(headlessMain)
        .filter(text => text) // Remove undefined or null values
        .join(" ");
    
    // Extract URL and split it into an array
    const url = data.item.rendered.sitecore?.context?.itemPath;
    const urlDetail = url.split('/').filter(segment => segment); // Remove empty segments

  return [{
    'annotation': annotation,
        'type': data.item.rendered.sitecore?.route?.templateName,
        'id': data.item.id + '-' + language,
        'tags': tagNames,
        'publish_date': data.item.rendered.sitecore?.route?.fields?.publishDate?.value,
        'language': language,
        'name': data.item.rendered.sitecore?.route?.name,
        'subtitle': data.item.rendered.sitecore?.route?.fields?.subtitle?.value,
        'title': data.item.rendered.sitecore?.route?.fields?.title?.value,
        'content_title': contentTitle,
        'content_text': contentText?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' '),
        'category': category,
        'url': url,
        'url_detail': urlDetail,
        'image_url': imageUrl,
        'date_from': data.item.rendered.sitecore?.route?.fields?.dateFrom?.value,
        'date_to': data.item.rendered.sitecore?.route?.fields?.dateTo?.value,
        'attendance': data.item.rendered.sitecore?.route?.fields?.attendance?.fields?.title?.value,
        'location_address_1': data.item.rendered.sitecore?.route?.fields?.locationAddressLine1?.value,
        'location_address_2': data.item.rendered.sitecore?.route?.fields?.locationAddressLine2?.value,
        'event_organizer': data.item.rendered.sitecore?.route?.fields?.eventOrganizer?.fields?.title?.value,
        'time_zone': data.item.rendered.sitecore?.route?.fields?.timeZone?.fields?.title?.value,
        'file_size': data.item.rendered.sitecore?.route?.fields?.file?.value?.size
  }];
}

module.exports = App;