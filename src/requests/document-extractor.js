class DocumentExtractor {

    match(request, response) {
        /*for(const item of response) {
            let helper;

            const placeholder = item.data.item.rendered.sitecore.route.placeholders['headless-main'];
            
            console.log(placeholder);

            if(item.data.item.rendered != null) {
                helper = item.data.item.rendered.sitecore.route.placeholders['headless-main'];
                console.log(helper);
            }
        }*/

        const data = response.data;
        const placeholder = data.item.rendered.sitecore.route.placeholders['headless-main'];
            // Extract only componentName from annotations
        /*const annotations = placeholder.map(component => {
            return { componentName: component.componentName };
        });*/
    
        // Filter objects where dataSource is not null or empty
        const resultPlaceholder = placeholder
            .filter(component => component.dataSource);
        
        // Map to only keep the value for `annotation`
        const filterResult = resultPlaceholder
            .map(component => component.fields.data.dataSource);

        return [{
            'id': data.item.id,
            'type': data.item.rendered.sitecore.route.templateName,
            'name': data.item.rendered.sitecore.route.name,
            'title': data.item.rendered.sitecore.route.fields.title.value,
            'annotation': filterResult,
            'url': data.item.path
        }];
    }
}

module.exports = DocumentExtractor;