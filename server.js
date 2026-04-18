/**
 * server.js - Token Vault Backend with Ollama Proxy
 * Serves static files and proxies Ollama Cloud API requests
 * 
 * @version 2.0.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Ollama Cloud Configuration
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://api.ollama.com/v1';

// Validate API key on startup
if (!OLLAMA_API_KEY) {
    console.warn('[WARNING] OLLAMA_API_KEY not set! AI features will be disabled.');
    console.warn('[INFO] Get your API key from: https://ollama.com/settings/keys');
}

// Middleware
// Allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://dissidenttokens.mastertibbles.co.uk',
    'https://dissident-tokens-vault-production.up.railway.app'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health' // Skip health checks
});

const ollamaLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
        error: 'Ollama rate limit exceeded',
        message: 'Please slow down your AI requests'
    }
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/ollama/', ollamaLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// INPUT VALIDATION MIDDLEWARE
// ============================================

/**
 * Validate Ollama generate request
 */
const validateGenerateRequest = (req, res, next) => {
    const { model, prompt } = req.body;
    const errors = [];

    // Validate model
    if (!model) {
        errors.push('model is required');
    } else if (typeof model !== 'string') {
        errors.push('model must be a string');
    } else if (model.length > 100) {
        errors.push('model name too long (max 100 chars)');
    } else if (!/^[a-zA-Z0-9_\-\:\/]+$/.test(model)) {
        errors.push('model contains invalid characters');
    }

    // Validate prompt
    if (!prompt) {
        errors.push('prompt is required');
    } else if (typeof prompt !== 'string') {
        errors.push('prompt must be a string');
    } else if (prompt.length > 10000) {
        errors.push('prompt too long (max 10000 chars)');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            message: errors.join(', '),
            details: errors
        });
    }

    // Sanitize inputs
    req.body.model = model.trim();
    req.body.prompt = prompt.trim();

    next();
};

/**
 * Validate Ollama chat request
 */
const validateChatRequest = (req, res, next) => {
    const { model, messages } = req.body;
    const errors = [];

    // Validate model
    if (!model) {
        errors.push('model is required');
    } else if (typeof model !== 'string') {
        errors.push('model must be a string');
    } else if (model.length > 100) {
        errors.push('model name too long');
    }

    // Validate messages
    if (!messages) {
        errors.push('messages is required');
    } else if (!Array.isArray(messages)) {
        errors.push('messages must be an array');
    } else if (messages.length === 0) {
        errors.push('messages array cannot be empty');
    } else if (messages.length > 100) {
        errors.push('too many messages (max 100)');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            message: errors.join(', '),
            details: errors
        });
    }

    next();
};

// ============================================
// OLLAMA PROXY ENDPOINTS
// ============================================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        ollamaConfigured: !!OLLAMA_API_KEY,
        timestamp: new Date().toISOString()
    });
});

/**
 * Proxy: List available models
 * GET /api/ollama/tags
 */
app.get('/api/ollama/tags', async (req, res) => {
    if (!OLLAMA_API_KEY) {
        return res.status(503).json({
            error: 'Ollama not configured',
            message: 'OLLAMA_API_KEY not set'
        });
    }

    try {
        // Ollama Cloud uses OpenAI-compatible endpoint: /v1/models
        const response = await axios.get(`${OLLAMA_BASE_URL}/models`, {
            headers: {
                'Authorization': `Bearer ${OLLAMA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        res.json(response.data);
    } catch (error) {
        console.error('[Ollama Error] Failed to fetch models:', error.message);
        res.status(500).json({
            error: 'Failed to fetch models',
            message: error.message
        });
    }
});

/**
 * Proxy: Generate text
 * POST /api/ollama/generate
 */
app.post('/api/ollama/generate', validateGenerateRequest, async (req, res) => {
    if (!OLLAMA_API_KEY) {
        return res.status(503).json({
            error: 'Ollama not configured',
            message: 'OLLAMA_API_KEY not set'
        });
    }

    try {
        const { model, prompt, stream = false, options = {} } = req.body;

        if (!model || !prompt) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'model and prompt are required'
            });
        }

        console.log(`[Ollama] Generating with model: ${model}`);

        // Ollama Cloud uses OpenAI-compatible endpoint: /v1/completions
        const response = await axios.post(
            `${OLLAMA_BASE_URL}/completions`,
            {
                model: model,
                prompt: prompt,
                stream: stream,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 2048
            },
            {
                headers: {
                    'Authorization': `Bearer ${OLLAMA_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 seconds for generation
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('[Ollama Error] Generation failed:', error.message);
        res.status(500).json({
            error: 'Generation failed',
            message: error.message,
            details: error.response?.data
        });
    }
});

/**
 * Proxy: Chat completion
 * POST /api/ollama/chat
 */
app.post('/api/ollama/chat', validateChatRequest, async (req, res) => {
    if (!OLLAMA_API_KEY) {
        return res.status(503).json({
            error: 'Ollama not configured',
            message: 'OLLAMA_API_KEY not set'
        });
    }

    try {
        const { model, messages, stream = false, options = {} } = req.body;

        if (!model || !messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'model and messages array are required'
            });
        }

        console.log(`[Ollama] Chat with model: ${model}, messages: ${messages.length}`);

        // Ollama Cloud uses OpenAI-compatible endpoint: /v1/chat/completions
        const response = await axios.post(
            `${OLLAMA_BASE_URL}/chat/completions`,
            {
                model: model,
                messages: messages,
                stream: stream,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.max_tokens ?? 2048
            },
            {
                headers: {
                    'Authorization': `Bearer ${OLLAMA_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('[Ollama Error] Chat failed:', error.message);
        res.status(500).json({
            error: 'Chat failed',
            message: error.message,
            details: error.response?.data
        });
    }
});

// ============================================
// STATIC FILES
// ============================================

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve vault.html
app.get('/vault', (req, res) => {
    res.sendFile(path.join(__dirname, 'vault.html'));
});

// Serve login.html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   🤖 Dissident Token Vault with Ollama AI       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`\nServer running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    
    if (OLLAMA_API_KEY) {
        console.log('\n✅ Ollama AI: CONFIGURED');
        console.log(`   Base URL: ${OLLAMA_BASE_URL}`);
        console.log('   Endpoints:');
        console.log('     - GET  /api/ollama/tags      (List models)');
        console.log('     - POST /api/ollama/generate  (Generate text)');
        console.log('     - POST /api/ollama/chat      (Chat completion)');
    } else {
        console.log('\n⚠️  Ollama AI: NOT CONFIGURED');
        console.log('   Set OLLAMA_API_KEY environment variable to enable AI features');
        console.log('   Get your key at: https://ollama.com/settings/keys');
    }
    
    console.log('\n✨ Ready for connections!\n');
});
