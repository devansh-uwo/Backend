import axios from 'axios';
import { VertexAI } from '@google-cloud/vertexai';
import { vertexAI, modelName } from '../config/vertex.js';

/**
 * Search Service for AIVA
 * Integrates directly with Vertex AI Grounding (Google Search)
 * This doesn't require a separate API key since we already use ADC for Vertex!
 */

const SEARCH_PROVIDER = process.env.SEARCH_PROVIDER || 'vertex'; // google, serpapi, vertex

/**
 * Perform web search using configured provider
 */
export async function performWebSearch(query, maxResults = 5) {
    try {
        console.log(`[SEARCH] Performing web search for: "${query}"`);

        if (SEARCH_PROVIDER === 'vertex') {
            return await vertexGroundingSearch(query, maxResults);
        } else if (SEARCH_PROVIDER === 'google' && process.env.SEARCH_API_KEY && process.env.SEARCH_ENGINE_ID) {
            return await googleCustomSearch(query, maxResults);
        } else if (SEARCH_PROVIDER === 'serpapi' && process.env.SEARCH_API_KEY) {
            return await serpApiSearch(query, maxResults);
        } else {
            // Fallback: use Vertex Grounding automatically if keys are missing
            console.log('[SEARCH] No external API keys found, falling back to Vertex AI Deep Search...');
            return await vertexGroundingSearch(query, maxResults);
        }
    } catch (error) {
        console.error('[SEARCH] Error performing web search:', error);
        return null;
    }
}

/**
 * Vertex AI Grounding search (Uses native Google Search directly via our existing Vertex auth)
 */
async function vertexGroundingSearch(query, maxResults) {
    try {
        const generativeModel = vertexAI.preview.getGenerativeModel({
            model: modelName,
            tools: [{ googleSearch: {} }],
        });

        const chat = generativeModel.startChat({});
        const result = await chat.sendMessage(`Perform a deep Google Search to gather data specifically for this query: "${query}". You MUST reply with specific data, real names, and deep details. Do not hallucinate. Provide raw facts. Make it a detailed list.`);
        const response = await result.response;

        // Extract grounding chunks from Vertex's response
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

        let extractedLinks = [];
        if (groundingMetadata && groundingMetadata.groundingChunks) {
            extractedLinks = groundingMetadata.groundingChunks.filter(c => c.web).map(chunk => ({
                title: chunk.web.title,
                link: chunk.web.uri,
                snippet: "Sourced via Google Search Grounding API"
            }));
        }

        let text = '';
        if (typeof response.text === 'function') {
            text = response.text();
        } else if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        }

        // Even if we don't have perfect snippet formatting, we inject the Vertex answer as a mega-snippet
        // Because the AI literally just searched Google for it.
        return {
            results: [
                {
                    title: `Deep Search Results for ${query}`,
                    snippet: text.substring(0, 4000), // Feed the deep answer back to the main router
                    link: extractedLinks.length > 0 ? extractedLinks[0].link : 'https://google.com',
                    source: 'Google Search via Vertex AI'
                },
                ...extractedLinks.slice(0, 3)
            ]
        };

    } catch (e) {
        console.error('[VERTEX GROUNDING ERROR]', e.message);
        return getMockSearchResults(query);
    }
}

/**
 * Google Custom Search API
 */
async function googleCustomSearch(query, maxResults) {
    const url = 'https://www.googleapis.com/customsearch/v1';

    const response = await axios.get(url, {
        params: {
            key: SEARCH_API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: query,
            num: maxResults
        }
    });

    if (!response.data.items) {
        return null;
    }

    return {
        results: response.data.items.map(item => ({
            title: item.title,
            snippet: item.snippet,
            link: item.link,
            source: extractDomain(item.link)
        }))
    };
}

/**
 * SerpAPI Search
 */
async function serpApiSearch(query, maxResults) {
    const url = 'https://serpapi.com/search';

    const response = await axios.get(url, {
        params: {
            api_key: SEARCH_API_KEY,
            q: query,
            num: maxResults,
            engine: 'google'
        }
    });

    if (!response.data.organic_results) {
        return null;
    }

    return {
        results: response.data.organic_results.map(item => ({
            title: item.title,
            snippet: item.snippet,
            link: item.link,
            source: extractDomain(item.link)
        }))
    };
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return 'Unknown Source';
    }
}

/**
 * Mock search results for testing (when no API key)
 */
function getMockSearchResults(query) {
    return {
        results: [
            {
                title: `Latest information about ${query}`,
                snippet: `This is a mock search result for "${query}". Configure SEARCH_API_KEY and SEARCH_ENGINE_ID in .env to enable real web search.`,
                link: 'https://example.com',
                source: 'example.com'
            }
        ]
    };
}

export { SEARCH_PROVIDER };
