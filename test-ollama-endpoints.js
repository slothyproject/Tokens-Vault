/**
 * test-ollama-endpoints.js - Test Ollama API endpoints
 */

const axios = require('axios');

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://dissident-tokens-vault-production.up.railway.app';

console.log('🔍 Testing Ollama Endpoints...\n');
console.log(`Railway URL: ${RAILWAY_URL}\n`);

async function testEndpoints() {
    const results = [];

    // Test 1: Health Check
    console.log('Test 1: Health Check');
    console.log('─────────────────────');
    try {
        const response = await axios.get(`${RAILWAY_URL}/api/health`, { timeout: 10000 });
        console.log('✅ Status:', response.status);
        console.log('📊 Response:', JSON.stringify(response.data, null, 2));
        results.push({ test: 'health', status: 'pass' });
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        results.push({ test: 'health', status: 'fail', error: error.message });
    }

    // Test 2: List Models (GET)
    console.log('\n\nTest 2: List Models (GET /api/ollama/tags)');
    console.log('───────────────────────────────────────────');
    try {
        const response = await axios.get(`${RAILWAY_URL}/api/ollama/tags`, { timeout: 15000 });
        console.log('✅ Status:', response.status);
        console.log('📊 Models:', response.data.data?.length || 'unknown');
        results.push({ test: 'tags', status: 'pass' });
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        results.push({ test: 'tags', status: 'fail', error: error.message });
    }

    // Test 3: Generate (POST)
    console.log('\n\nTest 3: Generate (POST /api/ollama/generate)');
    console.log('─────────────────────────────────────────────');
    try {
        const response = await axios.post(`${RAILWAY_URL}/api/ollama/generate`, {
            model: 'llama3.2:latest',
            prompt: 'Say "test successful"',
            stream: false
        }, { timeout: 60000 });
        console.log('✅ Status:', response.status);
        console.log('📝 Response:', response.data.choices?.[0]?.text || response.data.response || 'no response');
        results.push({ test: 'generate', status: 'pass' });
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        results.push({ test: 'generate', status: 'fail', error: error.message });
    }

    // Test 4: Chat (POST)
    console.log('\n\nTest 4: Chat (POST /api/ollama/chat)');
    console.log('────────────────────────────────────────');
    try {
        const response = await axios.post(`${RAILWAY_URL}/api/ollama/chat`, {
            model: 'llama3.2:latest',
            messages: [
                { role: 'user', content: 'Hello' }
            ],
            stream: false
        }, { timeout: 60000 });
        console.log('✅ Status:', response.status);
        console.log('📝 Response:', response.data.choices?.[0]?.message?.content || 'no response');
        results.push({ test: 'chat', status: 'pass' });
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        results.push({ test: 'chat', status: 'fail', error: error.message });
    }

    // Summary
    console.log('\n\n═══════════════════════════════════════════');
    console.log('               SUMMARY');
    console.log('═══════════════════════════════════════════');
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    console.log(`✅ Passed: ${passed}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);

    if (failed > 0) {
        console.log('\n🔧 Troubleshooting:');
        results.filter(r => r.status === 'fail').forEach(r => {
            console.log(`   - ${r.test}: ${r.error}`);
        });
    }
}

testEndpoints().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
