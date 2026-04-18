/**
 * test-ollama-direct.js - Test Ollama Cloud Connection
 * Verifies API key works before deployment
 */

const axios = require('axios');
require('dotenv').config();

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
};

const testDirectConnection = async () => {
    log('\n╔══════════════════════════════════════════════════╗', 'cyan');
    log('║   🦙 Ollama Cloud Connection Test               ║', 'cyan');
    log('╚══════════════════════════════════════════════════╝\n', 'cyan');

    // Check if API key is configured
    const apiKey = process.env.OLLAMA_API_KEY;
    const baseUrl = process.env.OLLAMA_BASE_URL || 'https://api.ollama.com/v1';

    if (!apiKey) {
        log('❌ ERROR: OLLAMA_API_KEY not set!', 'red');
        log('   Please create a .env file with:', 'yellow');
        log('   OLLAMA_API_KEY=your_key_here', 'yellow');
        log('   OLLAMA_BASE_URL=https://api.ollama.com/v1', 'yellow');
        process.exit(1);
    }

    log(`📍 Base URL: ${baseUrl}`, 'blue');
    log(`🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`, 'blue');
    log('\n🔄 Testing connection to Ollama Cloud...\n', 'yellow');

    try {
        // Test 1: List available models
        log('Test 1: Listing available models...', 'yellow');
        const response = await axios.get(`${baseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        log('✅ Connection successful!', 'green');
        log(`\n📊 Available Models (${response.data.data?.length || 0} found):`, 'cyan');
        
        if (response.data.data && response.data.data.length > 0) {
            response.data.data.slice(0, 5).forEach((model, i) => {
                log(`   ${i + 1}. ${model.id || model.name}`, 'green');
            });
            if (response.data.data.length > 5) {
                log(`   ... and ${response.data.data.length - 5} more`, 'yellow');
            }
        }

        // Test 2: Validate response structure
        log('\nTest 2: Validating API response structure...', 'yellow');
        if (response.data && (response.data.data || response.data.models)) {
            log('✅ API response format is correct', 'green');
        } else {
            log('⚠️ Unexpected API response format', 'yellow');
            log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}...`, 'yellow');
        }

        // Test 3: Check authentication
        log('\nTest 3: Verifying authentication...', 'yellow');
        if (response.status === 200) {
            log('✅ Authentication successful', 'green');
        }

        log('\n╔══════════════════════════════════════════════════╗', 'green');
        log('║   ✅ All Tests Passed!                          ║', 'green');
        log('║   Ollama Cloud is ready for use                 ║', 'green');
        log('╚══════════════════════════════════════════════════╝\n', 'green');

        return true;

    } catch (error) {
        log('\n❌ Connection failed!', 'red');
        
        if (error.response) {
            log(`   Status: ${error.response.status}`, 'red');
            log(`   Error: ${JSON.stringify(error.response.data)}`, 'red');
            
            if (error.response.status === 401) {
                log('\n💡 Tip: Your API key may be invalid. Get a new one at:', 'yellow');
                log('   https://ollama.com/settings/keys', 'cyan');
            }
        } else if (error.code === 'ECONNREFUSED') {
            log('   Error: Cannot connect to Ollama Cloud', 'red');
            log('   Check your internet connection', 'yellow');
        } else {
            log(`   Error: ${error.message}`, 'red');
        }

        log('\n╔══════════════════════════════════════════════════╗', 'red');
        log('║   ❌ Tests Failed                               ║', 'red');
        log('║   Please check your configuration               ║', 'red');
        log('╚══════════════════════════════════════════════════╝\n', 'red');

        return false;
    }
};

// Run test
testDirectConnection().then(success => {
    process.exit(success ? 0 : 1);
});
