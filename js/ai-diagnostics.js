/**
 * ai-diagnostics.js - Comprehensive Testing & Debugging System
 * Automated diagnostic suite for AI Central Hub
 */

const AIDiagnostics = {
    // Test results storage
    results: {
        timestamp: null,
        tests: [],
        summary: {
            passed: 0,
            failed: 0,
            warnings: 0
        }
    },
    
    // Test configuration
    config: {
        timeout: 5000,
        verbose: true,
        autoFix: false
    },
    
    // Initialize diagnostics
    init() {
        console.log('🔧 [AIDiagnostics] Initializing test suite...');
        this.results.timestamp = new Date().toISOString();
    },
    
    // ============================================
    // MAIN TEST RUNNER
    // ============================================
    
    async runAllTests() {
        console.log('🧪 [AIDiagnostics] Starting comprehensive test suite...\n');
        
        this.init();
        
        // Run all test categories
        await this.testFileAvailability();
        await this.testJavaScriptModules();
        await this.testDOMElements();
        await this.testServiceConfigurations();
        await this.testVariableManager();
        await this.testDeploymentPipeline();
        await this.testCentralHub();
        await this.testStorage();
        await this.testNetworkConnectivity();
        
        // Generate report
        this.generateReport();
        
        return this.results;
    },
    
    // ============================================
    // TEST CATEGORY 1: File Availability
    // ============================================
    
    async testFileAvailability() {
        this.logTestCategory('FILE AVAILABILITY');
        
        const files = [
            { path: 'js/ai-variable-manager.js', critical: true },
            { path: 'js/ai-deployment-pipeline.js', critical: true },
            { path: 'js/ai-central-hub.js', critical: true },
            { path: 'js/ai-diagnostics.js', critical: false },
            { path: 'css/central-hub.css', critical: true },
            { path: 'js/unified-services.js', critical: true },
            { path: 'js/vault-validation.js', critical: false }
        ];
        
        for (const file of files) {
            const result = await this.checkFileExists(file.path);
            this.logTest(
                `File: ${file.path}`,
                result.success,
                result.message,
                file.critical ? 'critical' : 'normal'
            );
        }
    },
    
    async checkFileExists(path) {
        try {
            const response = await fetch(path, { method: 'HEAD', mode: 'no-cors' });
            return {
                success: response.ok || response.status === 0, // 0 is OK for no-cors
                message: response.ok ? 'File accessible' : `HTTP ${response.status}`
            };
        } catch (error) {
            return {
                success: false,
                message: `Fetch failed: ${error.message}`
            };
        }
    },
    
    // ============================================
    // TEST CATEGORY 2: JavaScript Modules
    // ============================================
    
    async testJavaScriptModules() {
        this.logTestCategory('JAVASCRIPT MODULES');
        
        const modules = [
            { name: 'AIVariableManager', object: 'AIVariableManager', methods: ['init', 'analyzeService', 'validateVariable'] },
            { name: 'AIDeploymentPipeline', object: 'AIDeploymentPipeline', methods: ['init', 'deploy', 'validate'] },
            { name: 'AICentralHub', object: 'AICentralHub', methods: ['init', 'render', 'checkAllServices'] },
            { name: 'AIDiagnostics', object: 'AIDiagnostics', methods: ['init', 'runAllTests'] }
        ];
        
        for (const module of modules) {
            const result = this.checkModule(module);
            this.logTest(
                `Module: ${module.name}`,
                result.success,
                result.message,
                'critical'
            );
            
            // Test methods if module exists
            if (result.success && module.methods) {
                for (const method of module.methods) {
                    const hasMethod = typeof window[module.object][method] === 'function';
                    this.logTest(
                        `  └─ Method: ${method}()`,
                        hasMethod,
                        hasMethod ? 'Method exists' : 'Method missing',
                        'normal'
                    );
                }
            }
        }
    },
    
    checkModule(module) {
        const exists = typeof window[module.object] !== 'undefined';
        return {
            success: exists,
            message: exists ? 'Module loaded' : 'Module not found in global scope'
        };
    },
    
    // ============================================
    // TEST CATEGORY 3: DOM Elements
    // ============================================
    
    async testDOMElements() {
        this.logTestCategory('DOM ELEMENTS');
        
        const elements = [
            { id: 'aiCentralHub', name: 'AI Central Hub Container', critical: true },
            { id: 'serviceList', name: 'Service List', critical: true },
            { id: 'welcomeScreen', name: 'Welcome Screen', critical: true },
            { id: 'serviceContent', name: 'Service Content', critical: true },
            { id: 'toastContainer', name: 'Toast Container', critical: false },
            { id: 'sessionTimer', name: 'Session Timer', critical: false }
        ];
        
        for (const el of elements) {
            const element = document.getElementById(el.id);
            const exists = !!element;
            this.logTest(
                `Element: ${el.name} (#${el.id})`,
                exists,
                exists ? 'Found in DOM' : 'Not found',
                el.critical ? 'critical' : 'normal'
            );
        }
    },
    
    // ============================================
    // TEST CATEGORY 4: Service Configurations
    // ============================================
    
    async testServiceConfigurations() {
        this.logTestCategory('SERVICE CONFIGURATIONS');
        
        // Check if unifiedServices is available
        const hasUnifiedServices = typeof unifiedServices !== 'undefined';
        this.logTest(
            'unifiedServices object',
            hasUnifiedServices,
            hasUnifiedServices ? 'Configuration loaded' : 'Using fallback',
            'critical'
        );
        
        if (hasUnifiedServices) {
            const serviceCount = Object.keys(unifiedServices.services || {}).length;
            this.logTest(
                'Service count',
                serviceCount > 0,
                `${serviceCount} services configured`,
                'normal'
            );
            
            // Check each service
            for (const [id, service] of Object.entries(unifiedServices.services || {})) {
                const hasVariables = service.variables && service.variables.length > 0;
                this.logTest(
                    `  └─ ${service.name || id}`,
                    hasVariables,
                    hasVariables ? `${service.variables.length} variables` : 'No variables',
                    'normal'
                );
            }
        }
    },
    
    // ============================================
    // TEST CATEGORY 5: Variable Manager
    // ============================================
    
    async testVariableManager() {
        this.logTestCategory('VARIABLE MANAGER');
        
        if (typeof AIVariableManager === 'undefined') {
            this.logTest('Variable Manager', false, 'Module not loaded', 'critical');
            return;
        }
        
        // Test initialization
        this.logTest(
            'Initialization',
            AIVariableManager.state?.initialized,
            AIVariableManager.state?.initialized ? 'Initialized' : 'Not initialized',
            'critical'
        );
        
        // Test service analysis
        const analysis = AIVariableManager.state?.serviceAnalysis;
        const hasAnalysis = analysis && Object.keys(analysis).length > 0;
        this.logTest(
            'Service Analysis',
            hasAnalysis,
            hasAnalysis ? `${Object.keys(analysis).length} services analyzed` : 'No analysis data',
            'normal'
        );
        
        // Test patterns
        const patterns = AIVariableManager.patterns;
        const hasPatterns = patterns && Object.keys(patterns).length > 0;
        this.logTest(
            'Variable Patterns',
            hasPatterns,
            hasPatterns ? `${Object.keys(patterns).length} patterns loaded` : 'No patterns',
            'normal'
        );
        
        // Test templates
        const templates = AIVariableManager.templates;
        const hasTemplates = templates && Object.keys(templates).length > 0;
        this.logTest(
            'Templates',
            hasTemplates,
            hasTemplates ? `${Object.keys(templates).length} templates available` : 'No templates',
            'normal'
        );
    },
    
    // ============================================
    // TEST CATEGORY 6: Deployment Pipeline
    // ============================================
    
    async testDeploymentPipeline() {
        this.logTestCategory('DEPLOYMENT PIPELINE');
        
        if (typeof AIDeploymentPipeline === 'undefined') {
            this.logTest('Deployment Pipeline', false, 'Module not loaded', 'critical');
            return;
        }
        
        // Test initialization
        this.logTest(
            'Initialization',
            AIDeploymentPipeline.state !== undefined,
            'Pipeline initialized',
            'critical'
        );
        
        // Test configuration
        const config = AIDeploymentPipeline.config;
        const hasConfig = config && config.stages;
        this.logTest(
            'Configuration',
            hasConfig,
            hasConfig ? `${config.stages.length} stages configured` : 'No config',
            'normal'
        );
        
        // Test history
        const history = AIDeploymentPipeline.state?.deploymentHistory;
        this.logTest(
            'Deployment History',
            true,
            history ? `${history.length} past deployments` : 'No history',
            'normal'
        );
    },
    
    // ============================================
    // TEST CATEGORY 7: Central Hub
    // ============================================
    
    async testCentralHub() {
        this.logTestCategory('AI CENTRAL HUB');
        
        if (typeof AICentralHub === 'undefined') {
            this.logTest('Central Hub', false, 'Module not loaded', 'critical');
            return;
        }
        
        // Test initialization
        this.logTest(
            'Initialization',
            AICentralHub.state?.initialized,
            AICentralHub.state?.initialized ? 'Hub initialized' : 'Not initialized',
            'critical'
        );
        
        // Test services loaded
        const services = AICentralHub.services;
        const hasServices = services && Object.keys(services).length > 0;
        this.logTest(
            'Services Loaded',
            hasServices,
            hasServices ? `${Object.keys(services).length} services` : 'No services',
            'critical'
        );
        
        // Test health monitoring
        const health = AICentralHub.state?.serviceHealth;
        this.logTest(
            'Health Monitoring',
            !!health,
            health ? 'Health data available' : 'No health data',
            'normal'
        );
        
        // Test intelligence
        const intelligence = AICentralHub.intelligence;
        this.logTest(
            'AI Intelligence',
            !!intelligence,
            intelligence ? 'AI models initialized' : 'No AI models',
            'normal'
        );
    },
    
    // ============================================
    // TEST CATEGORY 8: Storage
    // ============================================
    
    async testStorage() {
        this.logTestCategory('STORAGE');
        
        // Test localStorage
        try {
            localStorage.setItem('ai_test', 'test');
            const value = localStorage.getItem('ai_test');
            localStorage.removeItem('ai_test');
            this.logTest(
                'localStorage',
                value === 'test',
                'localStorage working',
                'critical'
            );
        } catch (e) {
            this.logTest('localStorage', false, `Error: ${e.message}`, 'critical');
        }
        
        // Test VaultCore storage
        if (typeof VaultCore !== 'undefined') {
            const diagnostics = VaultCore.getDiagnostics();
            this.logTest(
                'VaultCore Storage',
                diagnostics?.storageAvailable,
                diagnostics?.storageAvailable ? 'Storage available' : 'Storage issues',
                'critical'
            );
            
            this.logTest(
                'Encryption',
                diagnostics?.cryptoJsLoaded,
                diagnostics?.cryptoJsLoaded ? 'CryptoJS loaded' : 'Encryption unavailable',
                'warning'
            );
        }
    },
    
    // ============================================
    // TEST CATEGORY 9: Network Connectivity
    // ============================================
    
    async testNetworkConnectivity() {
        this.logTestCategory('NETWORK CONNECTIVITY');
        
        // Test Railway API connectivity
        try {
            const start = Date.now();
            const response = await fetch('https://backboard.railway.app/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: '{ __typename }' }),
                mode: 'no-cors'
            });
            const latency = Date.now() - start;
            
            this.logTest(
                'Railway API',
                true,
                `Reachable (${latency}ms)`,
                'normal'
            );
        } catch (error) {
            this.logTest(
                'Railway API',
                false,
                `Unreachable: ${error.message}`,
                'warning'
            );
        }
        
        // Test if online
        this.logTest(
            'Internet Connection',
            navigator.onLine,
            navigator.onLine ? 'Online' : 'Offline',
            'critical'
        );
    },
    
    // ============================================
    // REPORTING
    // ============================================
    
    logTestCategory(category) {
        console.log(`\n📋 ${category}`);
        console.log('='.repeat(50));
        
        this.results.tests.push({
            type: 'category',
            name: category
        });
    },
    
    logTest(name, success, message, severity = 'normal') {
        const icon = success ? '✅' : severity === 'critical' ? '❌' : '⚠️';
        const status = success ? 'PASS' : severity === 'critical' ? 'FAIL' : 'WARN';
        
        console.log(`${icon} [${status}] ${name}`);
        if (this.config.verbose) {
            console.log(`   └─ ${message}`);
        }
        
        this.results.tests.push({
            type: 'test',
            name,
            success,
            message,
            severity
        });
        
        // Update summary
        if (success) {
            this.results.summary.passed++;
        } else if (severity === 'critical') {
            this.results.summary.failed++;
        } else {
            this.results.summary.warnings++;
        }
    },
    
    generateReport() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 DIAGNOSTIC REPORT SUMMARY');
        console.log('='.repeat(50));
        console.log(`Timestamp: ${this.results.timestamp}`);
        console.log(`Total Tests: ${this.results.tests.length}`);
        console.log(`✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
        
        const overallStatus = this.results.summary.failed === 0 
            ? '✅ ALL CRITICAL TESTS PASSED'
            : this.results.summary.failed > 0 
                ? '❌ CRITICAL FAILURES DETECTED'
                : '⚠️  WARNINGS BUT FUNCTIONAL';
        
        console.log(`\nOverall Status: ${overallStatus}`);
        console.log('='.repeat(50));
        
        // Store report
        localStorage.setItem('ai_diagnostics_last_report', JSON.stringify(this.results));
        
        // Show UI report if container exists
        this.renderUIReport();
        
        return this.results;
    },
    
    // ============================================
    // UI REPORT RENDERING
    // ============================================
    
    renderUIReport() {
        const container = document.getElementById('aiDiagnosticsReport');
        if (!container) {
            // Create floating report button
            this.createReportButton();
            return;
        }
        
        const { passed, failed, warnings } = this.results.summary;
        const total = passed + failed + warnings;
        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        
        container.innerHTML = `
            <div class="diagnostics-report">
                <div class="report-header">
                    <h3>🔧 System Diagnostics</h3>
                    <span class="report-timestamp">${new Date().toLocaleTimeString()}</span>
                </div>
                
                <div class="report-summary">
                    <div class="summary-item ${failed === 0 ? 'good' : 'bad'}">
                        <span class="summary-value">${successRate}%</span>
                        <span class="summary-label">Success Rate</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-value">${passed}</span>
                        <span class="summary-label">Passed</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-value">${failed}</span>
                        <span class="summary-label">Failed</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-value">${warnings}</span>
                        <span class="summary-label">Warnings</span>
                    </div>
                </div>
                
                <div class="report-details">
                    ${this.results.tests.filter(t => t.type === 'test').map(test => `
                        <div class="test-item ${test.success ? 'pass' : test.severity === 'critical' ? 'fail' : 'warn'}">
                            <span class="test-icon">${test.success ? '✅' : test.severity === 'critical' ? '❌' : '⚠️'}</span>
                            <span class="test-name">${test.name}</span>
                            <span class="test-message">${test.message}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="report-actions">
                    <button onclick="AIDiagnostics.runAllTests()">🔄 Re-run Tests</button>
                    <button onclick="AIDiagnostics.exportReport()">📥 Export Report</button>
                </div>
            </div>
        `;
        
        container.style.display = 'block';
    },
    
    createReportButton() {
        // Create a floating diagnostics button
        const button = document.createElement('button');
        button.id = 'aiDiagnosticsTrigger';
        button.className = 'diagnostics-trigger';
        button.innerHTML = '🔧 Diagnostics';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: var(--accent-blue);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        button.onclick = () => {
            this.showDiagnosticsModal();
        };
        
        document.body.appendChild(button);
    },
    
    showDiagnosticsModal() {
        // Create modal
        let modal = document.getElementById('aiDiagnosticsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'aiDiagnosticsModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="document.getElementById('aiDiagnosticsModal').style.display='none'"></div>
                <div class="modal-content diagnostics-modal">
                    <div class="modal-header">
                        <h2>🔧 AI Central Hub Diagnostics</h2>
                        <button class="btn-close" onclick="document.getElementById('aiDiagnosticsModal').style.display='none'">✕</button>
                    </div>
                    <div class="modal-body">
                        <div id="aiDiagnosticsReport" style="max-height: 60vh; overflow-y: auto;">
                            <p style="text-align: center; padding: 40px;">
                                🧪 Running diagnostics...<br>
                                <small>Check browser console for detailed output</small>
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary" onclick="AIDiagnostics.runAllTests().then(() => AIDiagnostics.renderUIReport())">
                            🔄 Run Tests
                        </button>
                        <button class="btn-secondary" onclick="document.getElementById('aiDiagnosticsModal').style.display='none'">
                            Close
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'block';
        
        // Run tests
        this.runAllTests().then(() => {
            this.renderUIReport();
        });
    },
    
    exportReport() {
        const report = JSON.stringify(this.results, null, 2);
        const blob = new Blob([report], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-diagnostics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📥 Diagnostics report exported');
    },
    
    // Quick check function for console use
    quickCheck() {
        console.log('🔧 Quick System Check\n');
        
        const checks = {
            'AI Variable Manager': typeof AIVariableManager !== 'undefined',
            'AI Deployment Pipeline': typeof AIDeploymentPipeline !== 'undefined',
            'AI Central Hub': typeof AICentralHub !== 'undefined',
            'AI Diagnostics': typeof AIDiagnostics !== 'undefined',
            'Vault Core': typeof VaultCore !== 'undefined',
            'Vault UI': typeof VaultUI !== 'undefined',
            'localStorage': (() => {
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    return true;
                } catch (e) {
                    return false;
                }
            })()
        };
        
        Object.entries(checks).forEach(([name, status]) => {
            console.log(`${status ? '✅' : '❌'} ${name}: ${status ? 'OK' : 'NOT FOUND'}`);
        });
        
        const allGood = Object.values(checks).every(v => v);
        console.log(`\n${allGood ? '✅' : '❌'} Overall: ${allGood ? 'All systems operational' : 'Some systems missing'}`);
        
        return checks;
    }
};

// Auto-initialize and expose
window.AIDiagnostics = AIDiagnostics;

// Add keyboard shortcut (Ctrl+Shift+D)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        AIDiagnostics.showDiagnosticsModal();
    }
});

console.log('🔧 [AIDiagnostics] Loaded. Press Ctrl+Shift+D to run diagnostics.');