class DocumentExtractor {

    match(request, response) {
        var data = response.body.data;
        return data?.item?.rendered != null &&
            data?.item?.rendered?.sitecore?.route?.placeholders['headless-main']?.length > 0 &&
            data?.item?.rendered?.sitecore?.route?.fields?.ChangeFrequency?.name != 'do not include';
    }
    
    // Extrahuje dokumenty z odpovědi
    extract(request, response) {
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
}

module.exports = DocumentExtractor;