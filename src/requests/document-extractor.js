// --- DocumentExtractor Class ---
/**
 * Třída DocumentExtractor filtruje načtené requesty pomocí metody match a mapuje výsledky do index dokumentu.
 */
class DocumentExtractor {

    // Kontroluje, zda odpověď odpovídá kritériím pro extrakci
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
        const rawTags = data.item.rendered.sitecore?.route?.fields?.tags;
        const rawActiveIngredients = data.item.rendered.sitecore?.route?.fields?.activeIngredients;
        const rawPackSize = data.item.rendered.sitecore?.route?.fields?.packSize;
        const language = data.item.rendered.sitecore?.context?.language;
        let annotation = data.item.rendered.sitecore?.route?.fields?.annotation?.value?.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        let imageUrl = data.item.rendered.sitecore?.route?.fields?.imageName?.value?.src;

        const tags = Array.isArray(rawTags)
            ? rawTags.map(tag => tag?.fields?.name?.value).filter(Boolean)
            : [];
        
        const activeIngredients = Array.isArray(rawActiveIngredients)
            ? rawActiveIngredients.map(ing => ing?.fields?.title?.value).filter(Boolean)
            : [];

        const packSize = Array.isArray(rawPackSize)
            ? rawPackSize.map(pack => pack?.fields?.title?.value).filter(Boolean)
            : [];

        // Content Title
        const contentTitle = headlessMain
            .map(item => item.fields?.data?.contextItem?.title?.field?.value)
            .filter(title => title) // Remove undefined or null values
            .join(" ");
        
        // Extract URL and split it into an array
        const url = data.item.rendered.sitecore?.context?.itemPath;
        const urlDetail = url.split('/').filter(segment => segment); // Remove empty segments

        return [{
            'annotation': annotation,
            'type': data.item.rendered.sitecore?.route?.templateName,
            'id': data.item.id + '-' + language,
            'tags': tags,
            'publish_date': data.item.rendered.sitecore?.route?.fields?.publishDate?.value,
            'language': language,
            'name': data.item.rendered.sitecore?.route?.name,
            'title': data.item.rendered.sitecore?.route?.fields?.title?.value,
            'content_title': contentTitle,
            'category': "Products",
            'url': url,
            'url_detail': urlDetail,
            'image_url': imageUrl,    
            'active_ingredients': activeIngredients,     
            'product_form_title': data.item.rendered.sitecore?.route?.fields?.productForm?.title?.value,
            'product_form_icon': data.item.rendered.sitecore?.route?.fields?.productForm?.icon?.value,
            'pack_size': packSize,
            'product_type_general_icon': data.item.rendered.sitecore?.route?.fields?.productTypeGeneral?.fields?.icon?.value,
            'product_type_general_title': data.item.rendered.sitecore?.route?.fields?.productTypeGeneral?.fields?.title?.value,
            'product_leaflet': data.item.rendered.sitecore?.route?.fields?.productLeaflet?.field?.value?.src,
        }];
    }
}

module.exports = DocumentExtractor;