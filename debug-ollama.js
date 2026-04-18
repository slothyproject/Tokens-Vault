/**
 * debug-ollama.js - Debug Ollama configuration
 */

const axios = require('axios');

// Test with different base URLs
const TEST_URLS = [
    'https://ollama.com/api',
    'https://api.ollama.com/v1',
    'https://ollama.com/api/v1'
];

const API_KEY = '19a27be275154b33ac107ea5b271afee.L68BtHj24_Y2Cv8jiPdAirIi';

async function testUrl(baseUrl) {
    console.log(`\n🔍 Testing: ${baseUrl}`);
    console.log('─'.repeat(60));
    
    try {
        // Test GET /tags
        const tagsResponse = await axios.get(`${baseUrl}/tags`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` },
            timeout: 10000
        });
        console.log('✅ GET /tags:', tagsResponse.status, '- Models:', tagsResponse.data.models?.length || 0);
    } catch (error) {
        console.log('❌ GET /tags:', error.response?.status, error.response?.data?.error || error.message);
    }
    
    try {
        // Test POST /generate
        const genResponse = await axios.post(`${baseUrl}/generate`, {
            model: 'llama3.2:latest',
            prompt: 'test',
            stream: false
        }, {
            headers: { 'Authorization': `Bearer ${API_KEY}` },
            timeout: 30000
        });
        console.log('✅ POST /generate:', genResponse.status);
    } catch (error) {
        console.log('❌ POST /generate:', error.response?.status, error.response?.data?.error || error.message);
    }
    
    try {
        // Test POST /chat
        const chatResponse = await axios.post(`${baseUrl}/chat`, {
            model: 'llama3.2:latest',
            messages: [{ role: 'user', content: 'hello' }],
            stream: false
        }, {
            headers: { 'Authorization': `Bearer ${API_KEY}` },
            timeout: 30000
        });
        console.log('✅ POST /chat:', chatResponse.status);
    } catch (error) {
        console.log('❌ POST /chat:', error.response?.status, error.response?.data?.error || error.message);
    }
}

async function main() {
    console.log('🔧 Debugging Ollama Cloud Endpoints\n');
    console.log('API Key:', API_KEY.substring(0, 8) + '...' + API_KEY.substring(API_KEY.length - 4));
    
    for (const url of TEST_URLS) {
        await testUrl(url);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('Summary:');
    console.log('If all tests fail with 401, the API key is invalid or expired.');
    console.log('If GET works but POST fails, the key may have limited permissions.');
}

main().catch(console.error);
