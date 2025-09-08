class DocumentExtractor {

    extract(request, response) {
        const data = response?.body?.data;

        const headlessMain = data.item.rendered.sitecore?.route?.placeholders?.['headless-main'];
        const templateName = data.item.rendered.sitecore?.route.templateName ?? '';
        const rawTags = data.item.rendered.sitecore?.route?.fields?.tags;
        const language = data.item.rendered.sitecore?.context?.language;

        let annotation = data.item.rendered.sitecore?.route?.fields?.annotation?.value
            ?.replace(/<[^>]*>/g, '')
            ?.replace(/&nbsp;/g, ' ');

        return [{
            'id': data.item.id + '-' + language,
            'type': templateName,
            'annotation': annotation,
            'url': data.item.rendered.sitecore?.context?.itemPath
        }];
    }
}

module.exports = DocumentExtractor;