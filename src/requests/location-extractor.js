class LocationExtractor {

    extract(request, response) {
        var $ = response.html();
        var language = $('html').attr('lang');
        return language;    
    }   
}

module.exports = LocationExtractor;