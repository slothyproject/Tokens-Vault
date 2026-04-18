/**
 * diagnose-railway-ollama.js - Test Railway Ollama Integration
 * Run this to diagnose connection issues
 */

const axios = require('axios');

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://dissident-tokens-vault-production.up.railway.app';

console.log('🔍 Diagnosing Railway Ollama Integration...\n');
console.log(`Railway URL: ${RAILWAY_URL}\n`);

async function runDiagnostics() {
    const results = [];

    // Test 1: Health Check
    console.log('Test 1: Health Check Endpoint');
    console.log('─────────────────────────────');
    try {
        const response = await axios.get(`${RAILWAY_URL}/api/health`, { timeout: 10000 });
        console.log('✅ Status:', response.status);
        console.log('📊 Response:', JSON.stringify(response.data, null, 2));
        results.push({ test: 'health', status: 'pass', data: response.data });

        if (!response.data.ollamaConfigured) {
            console.log('\n⚠️  WARNING: ollamaConfigured is false!');
            console.log('   This means OLLAMA_API_KEY is not set on Railway.');
        }
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', error.response.data);
        }
        results.push({ test: 'health', status: 'fail', error: error.message });
    }

    // Test 2: Ollama Proxy - Tags
    console.log('\n\nTest 2: Ollama Proxy - List Models');
    console.log('───────────────────────────────────');
    try {
        const response = await axios.get(`${RAILWAY_URL}/api/ollama/tags`, { timeout: 15000 });
        console.log('✅ Status:', response.status);
        console.log('📊 Models found:', response.data.models?.length || response.data.data?.length || 'unknown');
        results.push({ test: 'ollama_tags', status: 'pass' });
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        results.push({ test: 'ollama_tags', status: 'fail', error: error.message });
    }

    // Test 3: Ollama Proxy - Generate (simple test)
    console.log('\n\nTest 3: Ollama Proxy - Generate');
    console.log('─────────────────────────────────');
    try {
        const response = await axios.post(`${RAILWAY_URL}/api/ollama/generate`, {
            model: 'llama3.2:latest',
            prompt: 'Say "test successful"',
            stream: false
        }, { timeout: 60000 });
        console.log('✅ Status:', response.status);
        console.log('📝 Response:', response.data.response?.substring(0, 100) || 'no response');
        results.push({ test: 'ollama_generate', status: 'pass' });
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        results.push({ test: 'ollama_generate', status: 'fail', error: error.message });
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

        console.log('\n💡 Common fixes:');
        console.log('   1. Check Railway Dashboard → Variables');
        console.log('      Ensure OLLAMA_API_KEY is set');
        console.log('   2. Check Railway Dashboard → Deployments');
        console.log('      Ensure latest commit is deployed');
        console.log('   3. Try redeploying from Railway dashboard');
        console.log('   4. Check that OLLAMA_BASE_URL is https://api.ollama.com/v1');
    }
}

runDiagnostics().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
