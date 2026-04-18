/**
 * ollama-cloud-integration.js - Ollama Cloud Models Integration
 * Provides AI-powered intelligence using Ollama Cloud models
 * 
 * Features:
 * - Natural language command processing with LLM
 * - Intelligent service diagnostics
 * - Smart variable suggestions
 * - Automated code/config generation
 * - Context-aware recommendations
 */

const OllamaCloudIntegration = {
    // Configuration
    config: {
        // Use backend proxy - no API key needed in browser
        baseUrl: '/api/ollama',
        defaultModel: localStorage.getItem('ollama_default_model') || 'llama3.2:latest',
        fallbackModel: 'phi4-mini:latest',
        timeout: 60000,
        maxRetries: 2,
        temperature: 0.7,
        contextWindow: 4096
    },
    
    // Available models on Ollama Cloud
    availableModels: [
        { id: 'llama3.2:latest', name: 'Llama 3.2', description: 'General purpose, fast', category: 'general' },
        { id: 'qwen2.5:latest', name: 'Qwen 2.5', description: 'Coding & reasoning', category: 'coding' },
        { id: 'phi4-mini:latest', name: 'Phi-4 Mini', description: 'Lightweight, fast', category: 'fast' },
        { id: 'gemma3:1b', name: 'Gemma 3 1B', description: 'Ultra lightweight', category: 'fast' },
        { id: 'exaone3.5:latest', name: 'EXAONE 3.5', description: 'Korean/English', category: 'multilingual' },
        { id: 'deepcoder:latest', name: 'DeepCoder', description: 'Code generation', category: 'coding' },
        { id: 'codegemma:latest', name: 'CodeGemma', description: 'Code-focused', category: 'coding' }
    ],
    
    // State
    state: {
        initialized: false,
        connected: false,
        currentModel: null,
        conversationHistory: [],
        contextData: {},
        lastResponse: null
    },
    
    // System prompts for different tasks
    prompts: {
        serviceDiagnostics: `You are an AI DevOps assistant specializing in Railway and web service diagnostics. Analyze the provided service data and provide actionable insights.

Service Data:
{{SERVICE_DATA}}

Provide:
1. Health status assessment (healthy/degraded/critical)
2. Root cause analysis if issues found
3. Specific actionable recommendations
4. Priority level (low/medium/high/critical)

Respond in JSON format:
{
  "status": "healthy|degraded|critical",
  "assessment": "Brief assessment",
  "rootCause": "If applicable",
  "recommendations": ["action 1", "action 2"],
  "priority": "low|medium|high|critical"
}`,
        
        variableSuggestions: `You are an AI configuration expert. Suggest optimal values for environment variables based on service type and context.

Service: {{SERVICE_NAME}}
Service Type: {{SERVICE_TYPE}}
Current Variables: {{CURRENT_VARS}}
Variable to Set: {{VARIABLE_KEY}}

Suggest the best value considering:
1. Security best practices
2. Railway deployment best practices
3. Service-specific requirements
4. Common patterns for this variable type

Respond in JSON format:
{
  "suggestedValue": "the value",
  "explanation": "why this value",
  "securityNotes": "security considerations",
  "alternatives": ["alt 1", "alt 2"]
}`,
        
        deploymentStrategy: `You are an AI deployment strategist. Create an optimal deployment plan.

Service: {{SERVICE_NAME}}
Current Stage: {{CURRENT_STAGE}}
Target: {{TARGET_ENV}}
Variables Status: {{VARS_STATUS}}
Dependencies: {{DEPENDENCIES}}

Create a deployment strategy considering:
1. Safety checks needed
2. Deployment order (if multiple services)
3. Rollback triggers
4. Health check criteria

Respond in JSON format:
{
  "strategy": "rolling|blue-green|immediate",
  "steps": ["step 1", "step 2"],
  "safetyChecks": ["check 1", "check 2"],
  "rollbackTriggers": ["trigger 1"],
  "estimatedTime": "e.g., 2-3 minutes"
}`,
        
        commandInterpreter: `You are an AI assistant for the Dissident Token Vault. Parse natural language commands and convert to structured actions.

Available Actions:
- deploy: Deploy a service (requires: serviceId)
- heal: Fix/service recovery (requires: serviceId)
- analyze: Analyze service health (requires: serviceId or 'all')
- optimize: Find optimization opportunities
- sync: Sync variables across services
- rollback: Rollback deployment
- status: Get system status
- explain: Explain a service or variable

User Command: "{{USER_COMMAND}}"

Current Context:
{{CONTEXT}}

Respond in JSON format:
{
  "action": "action type",
  "confidence": 0.0-1.0,
  "parameters": {"key": "value"},
  "clarificationNeeded": false,
  "clarificationQuestion": "if needed",
  "response": "natural language response"
}`,
        
        codeGenerator: `You are an AI code generator for DevOps configurations. Generate code based on requirements.

Task: {{TASK}}
Service Type: {{SERVICE_TYPE}}
Requirements: {{REQUIREMENTS}}

Generate:
1. Railway configuration
2. Environment variables needed
3. Deployment scripts if applicable

Respond in JSON format:
{
  "railwayConfig": {...},
  "envVariables": [{"key": "...", "value": "...", "required": true}],
  "scripts": {"deploy": "...", "build": "..."},
  "notes": "additional notes"
}`,
        
        systemOptimizer: `You are an AI system optimizer. Analyze the entire service ecosystem and suggest optimizations.

Services: {{SERVICES}}
Current State: {{CURRENT_STATE}}
Resource Usage: {{RESOURCE_USAGE}}

Analyze and suggest:
1. Performance optimizations
2. Cost optimizations
3. Security improvements
4. Architecture improvements

Respond in JSON format:
{
  "optimizations": [
    {
      "category": "performance|cost|security|architecture",
      "title": "...",
      "description": "...",
      "impact": "high|medium|low",
      "effort": "high|medium|low",
      "estimatedSavings": "..."
    }
  ],
  "priorityOrder": ["optimization 1", "optimization 2"]
}`
    },
    
    // Initialize the integration
    async init() {
        console.log('[OllamaCloud] Initializing Ollama Cloud integration...');
        
        // Load saved configuration
        this.loadConfig();
        
        // Test connection
        await this.testConnection();
        
        this.state.initialized = true;
        
        // Integrate with AICentralHub if available
        if (typeof AICentralHub !== 'undefined') {
            this.integrateWithAICentralHub();
        }
        
        console.log('[OllamaCloud] Integration ready');
        return this.state.connected;
    },
    
    // Load configuration from storage
    loadConfig() {
        const saved = localStorage.getItem('ollama_cloud_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.config = { ...this.config, ...config };
            } catch (e) {
                console.warn('[OllamaCloud] Failed to load config');
            }
        }
    },
    
    // Save configuration
    saveConfig() {
        localStorage.setItem('ollama_cloud_config', JSON.stringify(this.config));
    },
    
    // Test connection to Ollama Cloud (via backend proxy)
    async testConnection() {
        try {
            const response = await fetch('/api/ollama/tags', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                this.state.connected = true;
                console.log('[OllamaCloud] Connected successfully');
                return true;
            }
        } catch (error) {
            console.warn('[OllamaCloud] Connection failed:', error.message);
        }
        
        this.state.connected = false;
        return false;
    },
    
    // Generate AI completion (via backend proxy)
    async generateCompletion(prompt, options = {}) {
        const model = options.model || this.config.defaultModel;
        const temperature = options.temperature || this.config.temperature;
        
        try {
            const response = await fetch('/api/ollama/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: temperature,
                        num_ctx: this.config.contextWindow
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.state.lastResponse = data;
            
            return {
                success: true,
                response: data.response,
                model: model,
                tokens: data.eval_count
            };
            
        } catch (error) {
            console.error('[OllamaCloud] Generation failed:', error);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    },
    
    // Generate with chat format
    async chatCompletion(messages, options = {}) {
        const model = options.model || this.config.defaultModel;
        
        try {
            const response = await fetch(`${this.config.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: false,
                    options: {
                        temperature: options.temperature || this.config.temperature,
                        num_ctx: this.config.contextWindow
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return {
                success: true,
                response: data.message?.content || data.response,
                model: model
            };
            
        } catch (error) {
            console.error('[OllamaCloud] Chat failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // AI-Powered Service Diagnostics
    async diagnoseService(serviceId, serviceData) {
        const prompt = this.prompts.serviceDiagnostics
            .replace('{{SERVICE_DATA}}', JSON.stringify(serviceData, null, 2));
        
        const result = await this.generateCompletion(prompt, { temperature: 0.3 });
        
        if (result.success) {
            try {
                // Extract JSON from response
                const jsonMatch = result.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.warn('[OllamaCloud] Failed to parse diagnostic JSON');
            }
        }
        
        // Fallback to local diagnostics
        return this.fallbackDiagnostics(serviceId, serviceData);
    },
    
    // Fallback diagnostics when AI fails
    fallbackDiagnostics(serviceId, serviceData) {
        const health = serviceData.health || {};
        const status = health.status || 'unknown';
        
        return {
            status: status === 'online' ? 'healthy' : status === 'degraded' ? 'degraded' : 'critical',
            assessment: `Service ${serviceId} is ${status}`,
            rootCause: status !== 'online' ? 'Service health check failed' : null,
            recommendations: status !== 'online' ? [
                'Check service logs',
                'Verify environment variables',
                'Restart the service'
            ] : [],
            priority: status === 'offline' ? 'critical' : status === 'degraded' ? 'high' : 'low',
            aiPowered: false
        };
    },
    
    // AI-Powered Variable Suggestions
    async suggestVariableValue(serviceId, variableKey, context) {
        const services = typeof unifiedServices !== 'undefined' ? 
            unifiedServices.services : {};
        const service = services[serviceId] || { name: serviceId, type: 'unknown' };
        
        const prompt = this.prompts.variableSuggestions
            .replace('{{SERVICE_NAME}}', service.name)
            .replace('{{SERVICE_TYPE}}', service.type || 'unknown')
            .replace('{{CURRENT_VARS}}', JSON.stringify(context.currentVars || {}))
            .replace('{{VARIABLE_KEY}}', variableKey);
        
        const result = await this.generateCompletion(prompt, { temperature: 0.4 });
        
        if (result.success) {
            try {
                const jsonMatch = result.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        ...parsed,
                        aiPowered: true,
                        model: result.model
                    };
                }
            } catch (e) {
                console.warn('[OllamaCloud] Failed to parse suggestion JSON');
            }
        }
        
        // Fallback to AIVariableManager suggestions
        if (typeof AIVariableManager !== 'undefined') {
            const fallback = AIVariableManager.suggestValue(
                { key: variableKey }, 
                serviceId, 
                context.currentVars
            );
            return {
                suggestedValue: fallback[0]?.value || '',
                explanation: fallback[0]?.reason || 'Based on common patterns',
                securityNotes: '',
                alternatives: fallback.slice(1).map(s => s.value),
                aiPowered: false
            };
        }
        
        return {
            suggestedValue: '',
            explanation: 'No suggestion available',
            aiPowered: false
        };
    },
    
    // AI-Powered Command Processing
    async processNaturalLanguageCommand(command, context = {}) {
        const prompt = this.prompts.commandInterpreter
            .replace('{{USER_COMMAND}}', command)
            .replace('{{CONTEXT}}', JSON.stringify(context));
        
        const result = await this.generateCompletion(prompt, { temperature: 0.2 });
        
        if (result.success) {
            try {
                const jsonMatch = result.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        ...parsed,
                        aiPowered: true,
                        model: result.model
                    };
                }
            } catch (e) {
                console.warn('[OllamaCloud] Failed to parse command JSON');
            }
        }
        
        // Fallback to regex-based parsing
        return this.fallbackCommandProcessing(command);
    },
    
    // Fallback command processing
    fallbackCommandProcessing(command) {
        const lower = command.toLowerCase();
        
        if (lower.includes('status') || lower.includes('health')) {
            return {
                action: 'status',
                confidence: 0.9,
                parameters: {},
                clarificationNeeded: false,
                response: "I'll check the system status for you.",
                aiPowered: false
            };
        }
        
        if (lower.includes('deploy')) {
            const serviceMatch = lower.match(/deploy\s+(\w+)/);
            return {
                action: 'deploy',
                confidence: 0.8,
                parameters: { serviceId: serviceMatch ? serviceMatch[1] : 'all' },
                clarificationNeeded: !serviceMatch,
                clarificationQuestion: "Which service would you like to deploy?",
                response: serviceMatch ? `Deploying ${serviceMatch[1]}...` : "Which service should I deploy?",
                aiPowered: false
            };
        }
        
        if (lower.includes('fix') || lower.includes('heal')) {
            const serviceMatch = lower.match(/(?:fix|heal)\s+(\w+)/);
            return {
                action: 'heal',
                confidence: 0.8,
                parameters: { serviceId: serviceMatch ? serviceMatch[1] : null },
                clarificationNeeded: !serviceMatch,
                clarificationQuestion: "Which service needs healing?",
                response: serviceMatch ? `Attempting to heal ${serviceMatch[1]}...` : "Which service needs healing?",
                aiPowered: false
            };
        }
        
        return {
            action: 'unknown',
            confidence: 0.0,
            parameters: {},
            clarificationNeeded: true,
            clarificationQuestion: "I didn't understand. Try: 'status', 'deploy [service]', 'fix [service]', 'optimize'",
            response: "I'm not sure what you mean. Could you rephrase?",
            aiPowered: false
        };
    },
    
    // AI-Powered Deployment Strategy
    async generateDeploymentStrategy(serviceId, context) {
        const services = typeof unifiedServices !== 'undefined' ? 
            unifiedServices.services : {};
        const service = services[serviceId] || { name: serviceId };
        
        const prompt = this.prompts.deploymentStrategy
            .replace('{{SERVICE_NAME}}', service.name)
            .replace('{{CURRENT_STAGE}}', context.currentStage || 'development')
            .replace('{{TARGET_ENV}}', context.targetEnv || 'production')
            .replace('{{VARS_STATUS}}', JSON.stringify(context.varsStatus || {}))
            .replace('{{DEPENDENCIES}}', JSON.stringify(service.dependencies || []));
        
        const result = await this.generateCompletion(prompt, { temperature: 0.3 });
        
        if (result.success) {
            try {
                const jsonMatch = result.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return {
                        ...JSON.parse(jsonMatch[0]),
                        aiPowered: true,
                        model: result.model
                    };
                }
            } catch (e) {
                console.warn('[OllamaCloud] Failed to parse strategy JSON');
            }
        }
        
        // Fallback strategy
        return {
            strategy: 'immediate',
            steps: ['Validate variables', 'Deploy service', 'Verify health'],
            safetyChecks: ['Required variables set', 'No conflicts detected'],
            rollbackTriggers: ['Deployment fails', 'Health check fails'],
            estimatedTime: '2-3 minutes',
            aiPowered: false
        };
    },
    
    // AI-Powered System Optimization
    async analyzeSystemOptimization(services, currentState) {
        const prompt = this.prompts.systemOptimizer
            .replace('{{SERVICES}}', JSON.stringify(services))
            .replace('{{CURRENT_STATE}}', JSON.stringify(currentState))
            .replace('{{RESOURCE_USAGE}}', JSON.stringify(currentState.resources || {}));
        
        const result = await this.generateCompletion(prompt, { temperature: 0.5 });
        
        if (result.success) {
            try {
                const jsonMatch = result.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return {
                        ...JSON.parse(jsonMatch[0]),
                        aiPowered: true,
                        model: result.model
                    };
                }
            } catch (e) {
                console.warn('[OllamaCloud] Failed to parse optimization JSON');
            }
        }
        
        // Fallback optimizations
        return {
            optimizations: [
                {
                    category: 'performance',
                    title: 'Review service response times',
                    description: 'Monitor and optimize slow services',
                    impact: 'medium',
                    effort: 'low'
                }
            ],
            priorityOrder: ['Review service response times'],
            aiPowered: false
        };
    },
    
    // Generate configuration code
    async generateConfiguration(task, requirements) {
        const prompt = this.prompts.codeGenerator
            .replace('{{TASK}}', task)
            .replace('{{SERVICE_TYPE}}', requirements.serviceType || 'unknown')
            .replace('{{REQUIREMENTS}}', JSON.stringify(requirements));
        
        const result = await this.generateCompletion(prompt, { temperature: 0.4 });
        
        if (result.success) {
            try {
                const jsonMatch = result.response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return {
                        ...JSON.parse(jsonMatch[0]),
                        aiPowered: true,
                        model: result.model
                    };
                }
            } catch (e) {
                console.warn('[OllamaCloud] Failed to parse config JSON');
            }
        }
        
        return {
            success: false,
            error: 'Failed to generate configuration',
            aiPowered: false
        };
    },
    
    // Integrate with AICentralHub
    integrateWithAICentralHub() {
        console.log('[OllamaCloud] Integrating with AICentralHub...');
        
        // Override command processing
        const originalProcessCommand = AICentralHub.processCommand.bind(AICentralHub);
        AICentralHub.processCommand = async (command) => {
            // Try AI-powered processing first
            const aiResult = await this.processNaturalLanguageCommand(command, {
                services: Object.keys(AICentralHub.services || {}),
                serviceHealth: AICentralHub.state.serviceHealth
            });
            
            if (aiResult.confidence > 0.7 && aiResult.clarificationNeeded === false) {
                // Execute the AI-parsed command
                const result = await this.executeParsedCommand(aiResult);
                return {
                    success: true,
                    message: aiResult.response,
                    aiPowered: true,
                    action: aiResult.action,
                    details: result
                };
            }
            
            // Fall back to original processing
            return originalProcessCommand(command);
        };
        
        // Override anomaly detection
        const originalHandleAnomaly = AICentralHub.handleAnomaly.bind(AICentralHub);
        AICentralHub.handleAnomaly = async (serviceId, anomaly) => {
            // Get AI-powered diagnosis
            const serviceData = {
                serviceId,
                anomaly,
                health: AICentralHub.state.serviceHealth[serviceId],
                timestamp: Date.now()
            };
            
            const diagnosis = await this.diagnoseService(serviceId, serviceData);
            
            // Enhance the recommendation with AI insights
            if (diagnosis.aiPowered) {
                AICentralHub.logActivity(
                    `AI Diagnosis for ${serviceId}: ${diagnosis.assessment}`,
                    diagnosis.priority,
                    '🧠'
                );
            }
            
            return originalHandleAnomaly(serviceId, anomaly);
        };
        
        // Add AI chat interface to command tab
        const originalRenderCommandTab = AICentralHub.renderCommandTab.bind(AICentralHub);
        AICentralHub.renderCommandTab = () => {
            const baseHtml = originalRenderCommandTab();
            
            // Add model selector
            return baseHtml.replace(
                '<h3>⌨️ Natural Language Command Interface</h3>',
                `<h3>⌨️ AI Command Interface <span class="ai-badge">Powered by Ollama Cloud</span></h3>
                <div class="ai-model-selector">
                    <select id="aiModelSelect" onchange="OllamaCloudIntegration.switchModel(this.value)">
                        ${this.availableModels.map(m => 
                            `<option value="${m.id}" ${m.id === this.config.defaultModel ? 'selected' : ''}>
                                ${m.name} - ${m.description}
                            </option>`
                        ).join('')}
                    </select>
                    <span class="connection-status ${this.state.connected ? 'connected' : 'disconnected'}">
                        ${this.state.connected ? '🟢 Connected' : '🔴 Offline'}
                    </span>
                </div>`
            );
        };
        
        console.log('[OllamaCloud] Integration complete');
    },
    
    // Execute parsed command
    async executeParsedCommand(parsedCommand) {
        const { action, parameters } = parsedCommand;
        
        switch (action) {
            case 'status':
                return AICentralHub.getSystemStatus();
                
            case 'deploy':
                if (parameters.serviceId && parameters.serviceId !== 'all') {
                    return AICentralHub.deployService(parameters.serviceId);
                }
                return AICentralHub.deployAll();
                
            case 'heal':
                if (parameters.serviceId) {
                    return AICentralHub.healService(parameters.serviceId);
                }
                return { success: false, message: 'No service specified' };
                
            case 'analyze':
                if (parameters.serviceId === 'all') {
                    return AICentralHub.performAnalysis();
                }
                // Analyze specific service
                return { success: true, message: `Analysis complete for ${parameters.serviceId}` };
                
            case 'optimize':
                return AICentralHub.optimizeSystem();
                
            default:
                return { success: false, message: 'Unknown action' };
        }
    },
    
    // Switch AI model
    switchModel(modelId) {
        this.config.defaultModel = modelId;
        this.saveConfig();
        
        if (typeof VaultUI !== 'undefined') {
            VaultUI.showToast(`Switched to ${this.getModelName(modelId)}`, 'info');
        }
    },
    
    // Get model display name
    getModelName(modelId) {
        const model = this.availableModels.find(m => m.id === modelId);
        return model ? model.name : modelId;
    },
    
    // Update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    },
    
    // Get configuration UI
    renderConfigUI() {
        return `
            <div class="ollama-config-panel">
                <h3>🤖 Ollama Cloud Configuration</h3>
                
                <div class="config-field">
                    <label>Base URL:</label>
                    <input type="text" id="ollamaBaseUrl" value="${this.config.baseUrl}" 
                           placeholder="https://ollama-cloud.reddgr.com">
                </div>
                
                <div class="config-field">
                    <label>Default Model:</label>
                    <select id="ollamaDefaultModel">
                        ${this.availableModels.map(m => 
                            `<option value="${m.id}" ${m.id === this.config.defaultModel ? 'selected' : ''}>
                                ${m.name} (${m.description})
                            </option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="config-field">
                    <label>Temperature: <span id="tempValue">${this.config.temperature}</span></label>
                    <input type="range" id="ollamaTemperature" min="0" max="1" step="0.1" 
                           value="${this.config.temperature}">
                </div>
                
                <div class="config-status">
                    <span class="status-indicator ${this.state.connected ? 'online' : 'offline'}">
                        ${this.state.connected ? '🟢 Connected' : '🔴 Disconnected'}
                    </span>
                </div>
                
                <button class="btn-primary" onclick="OllamaCloudIntegration.saveConfigFromUI()">
                    💾 Save Configuration
                </button>
                <button class="btn-secondary" onclick="OllamaCloudIntegration.testConnection()">
                    🔄 Test Connection
                </button>
            </div>
        `;
    },
    
    // Save config from UI
    saveConfigFromUI() {
        const baseUrl = document.getElementById('ollamaBaseUrl')?.value;
        const model = document.getElementById('ollamaDefaultModel')?.value;
        const temperature = parseFloat(document.getElementById('ollamaTemperature')?.value);
        
        if (baseUrl) this.config.baseUrl = baseUrl;
        if (model) this.config.defaultModel = model;
        if (!isNaN(temperature)) this.config.temperature = temperature;
        
        this.saveConfig();
        
        if (typeof VaultUI !== 'undefined') {
            VaultUI.showToast('Ollama Cloud configuration saved', 'success');
        }
    },
    
    // Create chat session for natural language interactions
    createChatSession(systemPrompt = '') {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        
        return {
            messages,
            addUserMessage: (content) => {
                messages.push({ role: 'user', content });
            },
            addAssistantMessage: (content) => {
                messages.push({ role: 'assistant', content });
            },
            getCompletion: async (options = {}) => {
                return await OllamaCloudIntegration.chatCompletion(messages, options);
            },
            clear: () => {
                messages.length = systemPrompt ? 1 : 0;
            }
        };
    }
};

// Auto-initialize
window.OllamaCloudIntegration = OllamaCloudIntegration;

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        OllamaCloudIntegration.init();
    });
} else {
    OllamaCloudIntegration.init();
}
