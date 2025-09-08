// --- Trigger Class ---
/**
 * Třída Trigger načítá data z API.
 */

class Trigger {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async requestTrigger(path) {
    try {
      const fetch = (await import('node-fetch')).default; // Používáme vestavěný fetch (od Node.js 18)

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'sc_apikey': this.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `query getItem($path: String) {
                    item(language: "en", path: $path) {
                        id
                        path
                        children {
                            results {
                                name
                                rendered
                            }
                        }
                    }
                }`,
                variables: { path },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error.message);
        throw new Error('Failed to fetch data');
    }
  }
}

module.exports = Trigger;