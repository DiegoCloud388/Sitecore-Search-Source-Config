class FetchData {
    constructor(apiUrl, request) {
        this.apiUrl = apiUrl;
      }

    async fetch(requests) {
        const results = [];
        for(const request of requests) {
            try {
                  const fetch = (await import('node-fetch')).default; // Používáme vestavěný fetch (od Node.js 18)
          
                  const response = await fetch(this.apiUrl, {
                      method: request.method,
                      headers: request.headers,
                      body: request.body                    
                  });            
          
                  if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                  }
          
                  const jsonData = await response.json(); // Await the parsed JSON data
                  results.push(jsonData); // Push the actual data, not the Promise
            } catch (error) {
                console.error('Error fetching data:', error.message);
                results.push(null);
                throw new Error('Failed to fetch data');
            }
        }    

        return results;
    }
}

module.exports = FetchData;