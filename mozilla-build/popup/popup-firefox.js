// Firefox-compatible popup script
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('error', (event) => {
        console.error('Extension Error:', event.error);
    });

    const DEFAULT_SETTINGS = {
        apiKeys: {
            openai: '',
            anthropic: '',
            deepseek: ''
        },
        lastUsedProvider: 'deepseek',
        lastUsedModel: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 1000,
        theme: 'light',
        fontSize: 'medium',
        layout: 'corner',
        streamResponses: true,
        chatState: 'normal'
    };

    function loadSettings() {
        browser.storage.sync.get(DEFAULT_SETTINGS).then((settings) => {
            try {
                document.getElementById('openaiKey').value = settings.apiKeys?.openai || '';
                document.getElementById('anthropicKey').value = settings.apiKeys?.anthropic || '';
                document.getElementById('deepseekKey').value = settings.apiKeys?.deepseek || '';
                document.getElementById('temperature').value = settings.temperature || 0.7;
                document.getElementById('temperatureValue').textContent = settings.temperature || 0.7;
                document.getElementById('maxTokens').value = settings.maxTokens || 1000;
                document.getElementById('theme').value = settings.theme || 'light';
                document.getElementById('fontSize').value = settings.fontSize || 'medium';
                document.getElementById('layout').value = settings.layout || 'corner';
                document.getElementById('streamResponses').value = 
                    (settings.streamResponses !== false).toString();
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        });
    }

    async function saveSettings() {
        const settings = {
            apiKeys: {
                openai: document.getElementById('openaiKey').value,
                anthropic: document.getElementById('anthropicKey').value,
                deepseek: document.getElementById('deepseekKey').value
            },
            temperature: parseFloat(document.getElementById('temperature').value) || 0.7,
            maxTokens: parseInt(document.getElementById('maxTokens').value) || 1000,
            theme: document.getElementById('theme').value,
            fontSize: document.getElementById('fontSize').value,
            layout: document.getElementById('layout').value,
            streamResponses: document.getElementById('streamResponses').value === 'true'
        };

        try {
            await browser.storage.sync.set(settings);
            console.log('Settings saved:', settings);

            // Notify all tabs
            const tabs = await browser.tabs.query({});
            for (const tab of tabs) {
                if (tab.url?.startsWith('http')) {
                    try {
                        await browser.tabs.sendMessage(tab.id, {
                            type: 'settings_updated',
                            settings: {
                                theme: settings.theme,
                                fontSize: settings.fontSize,
                                layout: settings.layout,
                                streamResponses: settings.streamResponses
                            }
                        });
                    } catch (error) {
                        // Tab not ready, ignore
                    }
                }
            }

            // Show saved message
            const saveBtn = document.getElementById('save');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = '✓ Saved!';
            saveBtn.style.backgroundColor = '#10b981';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.backgroundColor = '';
            }, 2000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings. Please try again.');
        }
    }

    function setupEventListeners() {
        // Temperature slider
        const temperatureInput = document.getElementById('temperature');
        if (temperatureInput) {
            temperatureInput.addEventListener('input', (e) => {
                const tempValue = document.getElementById('temperatureValue');
                if (tempValue) {
                    tempValue.textContent = e.target.value;
                }
            });
        }

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                const targetContent = document.getElementById(tab.dataset.tab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Save button
        const saveButton = document.getElementById('save');
        if (saveButton) {
            saveButton.addEventListener('click', saveSettings);
        }

        // Add Firefox-specific help
        const helpText = document.createElement('div');
        helpText.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: #f0f4f8;
            border-radius: 6px;
            font-size: 12px;
            color: #666;
            text-align: center;
        `;
        helpText.innerHTML = `
            <strong>Firefox Tip:</strong> Use Ctrl+Shift+Y to toggle the chat<br>
            <a href="https://api.deepseek.com" target="_blank" style="color: #667eea;">Get your DeepSeek API key →</a>
        `;
        document.body.appendChild(helpText);
    }

    try {
        loadSettings();
        setupEventListeners();
    } catch (error) {
        console.error('Popup initialization error:', error);
    }
});