// Modern Glassmorphism LAN Chat Application
// Built with vanilla JavaScript - no frameworks required

class LanChatApp {
  constructor() {
    this.serverManager = new ServerManager();
    this.chatManager = new ChatManager();
    this.profileManager = new ProfileManager();
    this.themeManager = new ThemeManager();
    this.uiController = new UIController(this);
    
    this.currentModel = null;
    this.currentProfile = null;
    this.isGenerating = false;
    
    this.init();
  }
  
  async init() {
    console.log('Initializing LAN Chat...');
    
    // Initialize managers
    this.themeManager.init();
    await this.profileManager.init();
    this.uiController.init();
    
    // Load saved settings
    this.loadSettings();
    
    // Initial server connection attempt
    await this.connectToServer();
    
    console.log('LAN Chat initialized successfully');
  }
  
  loadSettings() {
    const settings = localStorage.getItem('lan-chat-settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      this.serverManager.serverUrl = parsed.serverUrl || 'http://localhost:11434';
      // Update UI
      this.uiController.updateServerUrl(this.serverManager.serverUrl);
    }
  }
  
  saveSettings() {
    const settings = {
      serverUrl: this.serverManager.serverUrl,
      timestamp: Date.now()
    };
    localStorage.setItem('lan-chat-settings', JSON.stringify(settings));
  }
  
  async connectToServer() {
    this.uiController.setConnectionStatus('connecting');
    
    try {
      const models = await this.serverManager.discoverModels();
      this.uiController.setConnectionStatus('connected');
      this.uiController.updateModelList(models);
      
      // Auto-select first model if none selected
      if (!this.currentModel && models.length > 0) {
        this.selectModel(models[0].name);
      }
      
    } catch (error) {
      console.error('Connection failed:', error);
      this.uiController.setConnectionStatus('error', error.message);
      this.uiController.updateModelList([]);
    }
  }
  
  selectModel(modelName) {
    this.currentModel = modelName;
    this.uiController.selectModel(modelName);
    console.log(`Selected model: ${modelName}`);
  }
  
  selectProfile(profileId) {
    this.currentProfile = this.profileManager.getProfile(profileId);
    this.themeManager.updateProfileColor(this.currentProfile?.color || '#007acc');
    console.log(`Selected profile: ${this.currentProfile?.name || 'Default'}`);
  }
  
  async sendMessage(content) {
    if (!content.trim() || this.isGenerating) return;
    if (!this.currentModel) {
      this.uiController.showError('Please select a model first');
      return;
    }
    
    this.isGenerating = true;
    this.uiController.setGenerationState(true);
    
    try {
      // Add user message
      const userMessage = this.chatManager.addMessage('user', content);
      this.uiController.addMessage(userMessage);
      
      // Create assistant message placeholder
      const assistantMessage = this.chatManager.addMessage('assistant', '');
      const messageElement = this.uiController.addMessage(assistantMessage, true);
      
      // Send to server and stream response
      await this.serverManager.sendChatMessage(
        this.currentModel,
        this.chatManager.getMessages(),
        this.currentProfile,
        (chunk) => {
          assistantMessage.content += chunk;
          this.uiController.updateMessageContent(messageElement, assistantMessage.content);
        }
      );
      
    } catch (error) {
      console.error('Chat error:', error);
      this.uiController.showError(`Chat error: ${error.message}`);
      // Remove failed assistant message
      this.chatManager.removeLastMessage();
      this.uiController.removeLastMessage();
    } finally {
      this.isGenerating = false;
      this.uiController.setGenerationState(false);
    }
  }
  
  stopGeneration() {
    this.serverManager.abortCurrentRequest();
    this.isGenerating = false;
    this.uiController.setGenerationState(false);
  }
  
  clearChat() {
    this.chatManager.clearMessages();
    this.uiController.clearMessages();
  }
  
  updateServerUrl(url) {
    this.serverManager.serverUrl = url;
    this.saveSettings();
    this.connectToServer();
  }
}

// Theme Management Class
class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
  }
  
  init() {
    // Detect system preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('lan-chat-theme');
    
    // Set initial theme
    this.currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    this.applyTheme(this.currentTheme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('lan-chat-theme')) {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
      }
    });
  }
  
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('lan-chat-theme', this.currentTheme);
  }
  
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Add subtle animation class
    document.body.style.transition = 'all 0.3s ease-out';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 300);
  }
  
  updateProfileColor(color) {
    const root = document.documentElement;
    const { r, g, b } = this.hexToRgb(color);
    
    // Create gradient variations
    const lightVariation = this.lighten(color, 20);
    const gradient = `linear-gradient(135deg, ${color}, ${lightVariation})`;
    
    root.style.setProperty('--lc-profile-color', color);
    root.style.setProperty('--lc-profile-gradient', gradient);
    
    // Update CSS custom property for rgba usage
    root.style.setProperty('--lc-profile-color-rgb', `${r}, ${g}, ${b}`);
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 122, b: 204 };
  }
  
  lighten(color, percent) {
    const { r, g, b } = this.hexToRgb(color);
    const factor = (100 + percent) / 100;
    
    const newR = Math.min(255, Math.round(r * factor));
    const newG = Math.min(255, Math.round(g * factor));
    const newB = Math.min(255, Math.round(b * factor));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  }
}

// Server Management Class
class ServerManager {
  constructor() {
    this.serverUrl = 'http://localhost:11434';
    this.abortController = null;
  }
  
  async discoverModels() {
    const response = await this.fetchWithTimeout(`${this.serverUrl}/api/tags`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.models || [];
  }
  
  async sendChatMessage(model, messages, profile, onChunk) {
    this.abortController = new AbortController();
    
    // Build request body
    const requestBody = {
      model: model,
      messages: this.buildMessagesForAPI(messages, profile),
      stream: true
    };
    
    // Add profile temperature if available
    if (profile?.temperature !== undefined) {
      requestBody.options = { temperature: profile.temperature };
    }
    
    const response = await this.fetchWithTimeout(`${this.serverUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: this.abortController.signal
    });
    
    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status} ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) {
              onChunk(parsed.message.content);
            }
            
            if (parsed.done) {
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
            console.warn('Invalid JSON line:', line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  buildMessagesForAPI(messages, profile) {
    const apiMessages = [];
    
    // Add system message from profile if available
    if (profile?.systemPrompt) {
      apiMessages.push({
        role: 'system',
        content: profile.systemPrompt
      });
    }
    
    // Add conversation messages
    for (const msg of messages) {
      apiMessages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    return apiMessages;
  }
  
  abortCurrentRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
  
  async fetchWithTimeout(url, options, timeout = 30000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }
}

// Chat Management Class
class ChatManager {
  constructor() {
    this.messages = [];
  }
  
  addMessage(role, content) {
    const message = {
      id: this.generateId(),
      role: role,
      content: content,
      timestamp: new Date()
    };
    
    this.messages.push(message);
    return message;
  }
  
  removeLastMessage() {
    return this.messages.pop();
  }
  
  getMessages() {
    return this.messages;
  }
  
  clearMessages() {
    this.messages = [];
  }
  
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Profile Management Class
class ProfileManager {
  constructor() {
    this.profiles = new Map();
    this.colorPresets = [
      { name: 'Ocean Blue', color: '#007acc' },
      { name: 'Forest Green', color: '#28a745' },
      { name: 'Sunset Orange', color: '#fd7e14' },
      { name: 'Royal Purple', color: '#6f42c1' },
      { name: 'Rose Pink', color: '#e83e8c' },
      { name: 'Golden Yellow', color: '#ffc107' },
      { name: 'Crimson Red', color: '#dc3545' }
    ];
  }
  
  async init() {
    this.loadProfiles();
    
    // Ensure default profiles exist
    this.ensureDefaultProfiles();
  }
  
  loadProfiles() {
    const saved = localStorage.getItem('lan-chat-profiles');
    if (saved) {
      try {
        const profiles = JSON.parse(saved);
        for (const profile of profiles) {
          // Ensure profile has color property
          if (!profile.color) {
            profile.color = '#007acc';
          }
          this.profiles.set(profile.id, profile);
        }
      } catch (error) {
        console.error('Failed to load profiles:', error);
      }
    }
  }
  
  saveProfiles() {
    const profiles = Array.from(this.profiles.values());
    localStorage.setItem('lan-chat-profiles', JSON.stringify(profiles));
  }
  
  ensureDefaultProfiles() {
    const defaultProfiles = [
      {
        id: 'default',
        name: 'Default Assistant',
        systemPrompt: 'You are a helpful, harmless, and honest assistant.',
        temperature: 0.7,
        color: '#007acc',
        isDefault: true
      },
      {
        id: 'creative',
        name: 'Creative Writer',
        systemPrompt: 'You are a creative writing assistant who helps with storytelling, poetry, and creative expression. Be imaginative and inspiring.',
        temperature: 0.9,
        color: '#e83e8c',
        isDefault: false
      },
      {
        id: 'code',
        name: 'Code Helper',
        systemPrompt: 'You are a programming assistant. Provide clear, well-commented code examples and explain technical concepts clearly.',
        temperature: 0.3,
        color: '#28a745',
        isDefault: false
      }
    ];
    
    for (const profile of defaultProfiles) {
      if (!this.profiles.has(profile.id)) {
        this.profiles.set(profile.id, profile);
      }
    }
    
    this.saveProfiles();
  }
  
  getProfile(id) {
    return this.profiles.get(id);
  }
  
  getAllProfiles() {
    return Array.from(this.profiles.values());
  }
  
  saveProfile(profile) {
    if (!profile.id) {
      profile.id = this.generateId();
    }
    
    // Ensure profile has a color
    if (!profile.color) {
      profile.color = '#007acc';
    }
    
    this.profiles.set(profile.id, profile);
    this.saveProfiles();
    return profile;
  }
  
  deleteProfile(id) {
    // Don't allow deletion of default profile
    if (id === 'default') return false;
    
    const deleted = this.profiles.delete(id);
    if (deleted) {
      this.saveProfiles();
    }
    return deleted;
  }
  
  generateId() {
    return 'profile-' + Math.random().toString(36).substr(2, 9);
  }
  
  getColorPresets() {
    return this.colorPresets;
  }
}

// UI Controller Class
class UIController {
  constructor(app) {
    this.app = app;
    this.elements = {};
    this.currentEditingProfile = null;
    this.selectedColor = '#007acc';
  }
  
  init() {
    this.cacheElements();
    this.bindEvents();
    this.updateProfileList();
    this.selectProfile('default');
    this.initializeColorPicker();
  }
  
  cacheElements() {
    this.elements = {
      // Theme toggle
      themeToggle: document.getElementById('theme-toggle'),
      
      // Status
      statusIndicator: document.getElementById('status-indicator'),
      statusText: document.getElementById('status-text'),
      
      // Controls
      serverSelect: document.getElementById('server-select'),
      modelSelect: document.getElementById('model-select'),
      profileSelect: document.getElementById('profile-select'),
      
      // Chat
      chatMessages: document.getElementById('chat-messages'),
      chatInput: document.getElementById('chat-input'),
      sendBtn: document.getElementById('send-btn'),
      
      // Buttons
      settingsBtn: document.getElementById('settings-btn'),
      profileManageBtn: document.getElementById('profile-manage-btn'),
      clearChatBtn: document.getElementById('clear-chat-btn'),
      stopGenerationBtn: document.getElementById('stop-generation-btn'),
      
      // Modals
      settingsModal: document.getElementById('settings-modal'),
      profileModal: document.getElementById('profile-modal'),
      
      // Settings
      serverUrl: document.getElementById('server-url'),
      temperature: document.getElementById('temperature'),
      temperatureValue: document.getElementById('temperature-value'),
      
      // Profile Management
      profileList: document.getElementById('profile-list'),
      profileForm: document.getElementById('profile-form'),
      profileName: document.getElementById('profile-name'),
      profilePrompt: document.getElementById('profile-prompt'),
      profileTemp: document.getElementById('profile-temp'),
      profileTempValue: document.getElementById('profile-temp-value'),
      
      // Color Picker
      colorPresets: document.getElementById('color-presets'),
      profileColorCustom: document.getElementById('profile-color-custom'),
      profileColorHex: document.getElementById('profile-color-hex')
    };
  }
  
  bindEvents() {
    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => {
      this.app.themeManager.toggleTheme();
    });
    
    // Chat input
    this.elements.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
    
    this.elements.chatInput.addEventListener('input', () => {
      this.adjustTextareaHeight();
      this.updateSendButton();
    });
    
    this.elements.sendBtn.addEventListener('click', () => {
      this.handleSendMessage();
    });
    
    // Controls
    this.elements.modelSelect.addEventListener('change', (e) => {
      this.app.selectModel(e.target.value);
    });
    
    this.elements.profileSelect.addEventListener('change', (e) => {
      this.app.selectProfile(e.target.value);
    });
    
    // Buttons
    this.elements.settingsBtn.addEventListener('click', () => {
      this.showSettingsModal();
    });
    
    this.elements.profileManageBtn.addEventListener('click', () => {
      this.showProfileModal();
    });
    
    this.elements.clearChatBtn.addEventListener('click', () => {
      this.app.clearChat();
    });
    
    this.elements.stopGenerationBtn.addEventListener('click', () => {
      this.app.stopGeneration();
    });
    
    // Settings
    this.elements.temperature.addEventListener('input', (e) => {
      this.elements.temperatureValue.textContent = e.target.value;
    });
    
    // Profile temperature
    this.elements.profileTemp.addEventListener('input', (e) => {
      this.elements.profileTempValue.textContent = e.target.value;
    });
    
    // Color picker events
    this.bindColorPickerEvents();
    
    // Modal close handlers
    this.bindModalEvents();
  }
  
  bindColorPickerEvents() {
    // Color preset selection
    this.elements.colorPresets.addEventListener('click', (e) => {
      if (e.target.classList.contains('color-preset')) {
        // Remove active class from all presets
        this.elements.colorPresets.querySelectorAll('.color-preset').forEach(preset => {
          preset.classList.remove('active');
        });
        
        // Add active class to clicked preset
        e.target.classList.add('active');
        
        // Update selected color
        this.selectedColor = e.target.dataset.color;
        this.elements.profileColorCustom.value = this.selectedColor;
        this.elements.profileColorHex.value = this.selectedColor;
        
        // Update preview
        this.app.themeManager.updateProfileColor(this.selectedColor);
      }
    });
    
    // Custom color input
    this.elements.profileColorCustom.addEventListener('change', (e) => {
      this.selectedColor = e.target.value;
      this.elements.profileColorHex.value = this.selectedColor;
      this.updateActiveColorPreset();
      this.app.themeManager.updateProfileColor(this.selectedColor);
    });
    
    // Hex input
    this.elements.profileColorHex.addEventListener('input', (e) => {
      const value = e.target.value;
      if (this.isValidHex(value)) {
        this.selectedColor = value;
        this.elements.profileColorCustom.value = value;
        this.updateActiveColorPreset();
        this.app.themeManager.updateProfileColor(this.selectedColor);
      }
    });
  }
  
  initializeColorPicker() {
    // Set up color presets
    const presets = this.app.profileManager.getColorPresets();
    this.elements.colorPresets.innerHTML = '';
    
    presets.forEach((preset, index) => {
      const presetElement = document.createElement('div');
      presetElement.className = `color-preset ${index === 0 ? 'active' : ''}`;
      presetElement.dataset.color = preset.color;
      presetElement.style.background = `linear-gradient(135deg, ${preset.color}, ${this.lightenColor(preset.color)})`;
      presetElement.title = preset.name;
      this.elements.colorPresets.appendChild(presetElement);
    });
  }
  
  lightenColor(color) {
    // Simple color lightening function
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 40);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 40);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 40);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  updateActiveColorPreset() {
    // Remove active class from all presets
    this.elements.colorPresets.querySelectorAll('.color-preset').forEach(preset => {
      preset.classList.remove('active');
    });
    
    // Find matching preset
    const matchingPreset = this.elements.colorPresets.querySelector(`[data-color="${this.selectedColor}"]`);
    if (matchingPreset) {
      matchingPreset.classList.add('active');
    }
  }
  
  isValidHex(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }
  
  bindModalEvents() {
    // Settings modal
    document.getElementById('settings-close').addEventListener('click', () => {
      this.hideModal('settings');
    });
    
    document.getElementById('settings-save').addEventListener('click', () => {
      this.saveSettings();
    });
    
    document.getElementById('settings-cancel').addEventListener('click', () => {
      this.hideModal('settings');
    });
    
    // Profile modal
    document.getElementById('profile-close').addEventListener('click', () => {
      this.hideModal('profile');
    });
    
    document.getElementById('profile-new').addEventListener('click', () => {
      this.showProfileForm();
    });
    
    document.getElementById('profile-save').addEventListener('click', () => {
      this.saveProfile();
    });
    
    document.getElementById('profile-cancel').addEventListener('click', () => {
      this.hideProfileForm();
    });
    
    // Close modals on outside click
    [this.elements.settingsModal, this.elements.profileModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    });
  }
  
  handleSendMessage() {
    const content = this.elements.chatInput.value.trim();
    if (!content) return;
    
    this.elements.chatInput.value = '';
    this.adjustTextareaHeight();
    this.updateSendButton();
    
    this.app.sendMessage(content);
  }
  
  adjustTextareaHeight() {
    const textarea = this.elements.chatInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }
  
  updateSendButton() {
    const hasContent = this.elements.chatInput.value.trim().length > 0;
    this.elements.sendBtn.disabled = !hasContent || this.app.isGenerating;
  }
  
  setConnectionStatus(status, message = '') {
    this.elements.statusIndicator.className = `status-indicator ${status}`;
    
    const statusMessages = {
      connecting: 'Connecting...',
      connected: 'Connected',
      error: message || 'Connection failed'
    };
    
    this.elements.statusText.textContent = statusMessages[status] || status;
  }
  
  updateModelList(models) {
    this.elements.modelSelect.innerHTML = '';
    
    if (models.length === 0) {
      this.elements.modelSelect.innerHTML = '<option value="">No models available</option>';
      return;
    }
    
    for (const model of models) {
      const option = document.createElement('option');
      option.value = model.name;
      option.textContent = model.name;
      this.elements.modelSelect.appendChild(option);
    }
  }
  
  selectModel(modelName) {
    this.elements.modelSelect.value = modelName;
  }
  
  updateServerUrl(url) {
    this.elements.serverUrl.value = url;
  }
  
  addMessage(message, isStreaming = false) {
    // Remove welcome message if it exists
    const welcomeMessage = this.elements.chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => welcomeMessage.remove(), 300);
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role}`;
    messageElement.innerHTML = `
      <div class="message-avatar">${message.role === 'user' ? '👤' : '🤖'}</div>
      <div class="message-content">
        <div class="message-text">${isStreaming ? '<span class="message-loading"></span>' : this.formatContent(message.content)}</div>
        <div class="message-time">${this.formatTime(message.timestamp)}</div>
      </div>
    `;
    
    // Add staggered animation
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    this.elements.chatMessages.appendChild(messageElement);
    
    // Trigger animation
    requestAnimationFrame(() => {
      messageElement.style.transition = 'all 0.4s ease-out';
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
    });
    
    this.scrollToBottom();
    
    return messageElement;
  }
  
  updateMessageContent(messageElement, content) {
    const textElement = messageElement.querySelector('.message-text');
    textElement.innerHTML = this.formatContent(content);
    this.scrollToBottom();
  }
  
  removeLastMessage() {
    const messages = this.elements.chatMessages.querySelectorAll('.message');
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => lastMessage.remove(), 300);
    }
  }
  
  clearMessages() {
    // Animate out existing messages
    const messages = this.elements.chatMessages.querySelectorAll('.message');
    messages.forEach((message, index) => {
      setTimeout(() => {
        message.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => message.remove(), 300);
      }, index * 50);
    });
    
    // Add welcome message back after clearing
    setTimeout(() => {
      this.elements.chatMessages.innerHTML = `
        <div class="welcome-message">
          <h3>Welcome to LAN Chat!</h3>
          <p>Select a model and start chatting with your local AI.</p>
        </div>
      `;
    }, messages.length * 50 + 300);
  }
  
  setGenerationState(isGenerating) {
    this.updateSendButton();
    if (isGenerating) {
      this.elements.stopGenerationBtn.classList.remove('hidden');
    } else {
      this.elements.stopGenerationBtn.classList.add('hidden');
    }
  }
  
  formatContent(content) {
    // Simple formatting - escape HTML and handle line breaks
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
  
  formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  scrollToBottom() {
    this.elements.chatMessages.scrollTo({
      top: this.elements.chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  }
  
  showError(message) {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--lc-glass-bg);
      backdrop-filter: var(--lc-blur);
      border: 1px solid var(--lc-danger);
      color: var(--lc-danger);
      padding: var(--lc-spacing-md);
      border-radius: var(--lc-radius-md);
      box-shadow: var(--lc-shadow-glass);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }
  
  // Modal management
  showModal(modalName) {
    const modal = document.getElementById(`${modalName}-modal`);
    modal.classList.add('show');
  }
  
  hideModal(modalName) {
    const modal = document.getElementById(`${modalName}-modal`);
    modal.classList.remove('show');
  }
  
  showSettingsModal() {
    this.elements.serverUrl.value = this.app.serverManager.serverUrl;
    this.showModal('settings');
  }
  
  saveSettings() {
    const newServerUrl = this.elements.serverUrl.value.trim();
    if (newServerUrl && newServerUrl !== this.app.serverManager.serverUrl) {
      this.app.updateServerUrl(newServerUrl);
    }
    this.hideModal('settings');
  }
  
  // Profile management
  updateProfileList() {
    const profiles = this.app.profileManager.getAllProfiles();
    
    // Update select dropdown
    this.elements.profileSelect.innerHTML = '';
    for (const profile of profiles) {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      this.elements.profileSelect.appendChild(option);
    }
    
    // Update profile management list
    this.elements.profileList.innerHTML = '';
    for (const profile of profiles) {
      const item = document.createElement('div');
      item.className = 'profile-item';
      item.innerHTML = `
        <div class="profile-info">
          <h4>${profile.name}</h4>
          <p>${profile.systemPrompt.substring(0, 100)}...</p>
          <div style="margin-top: 8px;">
            <span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background: ${profile.color || '#007acc'}; margin-right: 8px;"></span>
            <span style="font-size: 0.75rem; color: var(--lc-text-muted);">Temperature: ${profile.temperature}</span>
          </div>
        </div>
        <div class="profile-actions">
          <button class="profile-action-btn" onclick="ui.editProfile('${profile.id}')">Edit</button>
          ${!profile.isDefault ? `<button class="profile-action-btn" onclick="ui.deleteProfile('${profile.id}')">Delete</button>` : ''}
        </div>
      `;
      this.elements.profileList.appendChild(item);
    }
  }
  
  selectProfile(profileId) {
    this.elements.profileSelect.value = profileId;
    this.app.selectProfile(profileId);
  }
  
  showProfileModal() {
    this.updateProfileList();
    this.showModal('profile');
  }
  
  showProfileForm(profile = null) {
    this.currentEditingProfile = profile;
    
    if (profile) {
      this.elements.profileName.value = profile.name;
      this.elements.profilePrompt.value = profile.systemPrompt;
      this.elements.profileTemp.value = profile.temperature;
      this.elements.profileTempValue.textContent = profile.temperature;
      this.selectedColor = profile.color || '#007acc';
      this.elements.profileColorCustom.value = this.selectedColor;
      this.elements.profileColorHex.value = this.selectedColor;
    } else {
      this.elements.profileName.value = '';
      this.elements.profilePrompt.value = '';
      this.elements.profileTemp.value = '0.7';
      this.elements.profileTempValue.textContent = '0.7';
      this.selectedColor = '#007acc';
      this.elements.profileColorCustom.value = this.selectedColor;
      this.elements.profileColorHex.value = this.selectedColor;
    }
    
    // Update color picker state
    this.updateActiveColorPreset();
    this.app.themeManager.updateProfileColor(this.selectedColor);
    
    this.elements.profileForm.classList.remove('hidden');
    document.getElementById('profile-new').classList.add('hidden');
    document.getElementById('profile-save').classList.remove('hidden');
    document.getElementById('profile-cancel').classList.remove('hidden');
  }
  
  hideProfileForm() {
    this.elements.profileForm.classList.add('hidden');
    document.getElementById('profile-new').classList.remove('hidden');
    document.getElementById('profile-save').classList.add('hidden');
    document.getElementById('profile-cancel').classList.add('hidden');
    this.currentEditingProfile = null;
    
    // Reset to current profile color
    const currentProfile = this.app.profileManager.getProfile(this.elements.profileSelect.value);
    if (currentProfile) {
      this.app.themeManager.updateProfileColor(currentProfile.color || '#007acc');
    }
  }
  
  saveProfile() {
    const name = this.elements.profileName.value.trim();
    const systemPrompt = this.elements.profilePrompt.value.trim();
    const temperature = parseFloat(this.elements.profileTemp.value);
    
    if (!name || !systemPrompt) {
      this.showError('Please fill in all fields');
      return;
    }
    
    const profile = {
      id: this.currentEditingProfile?.id || null,
      name: name,
      systemPrompt: systemPrompt,
      temperature: temperature,
      color: this.selectedColor,
      isDefault: false
    };
    
    this.app.profileManager.saveProfile(profile);
    this.updateProfileList();
    this.hideProfileForm();
    
    // Update current profile if editing the selected one
    if (this.currentEditingProfile && this.currentEditingProfile.id === this.elements.profileSelect.value) {
      this.app.selectProfile(this.currentEditingProfile.id);
    }
  }
  
  editProfile(profileId) {
    const profile = this.app.profileManager.getProfile(profileId);
    if (profile) {
      this.showProfileForm(profile);
    }
  }
  
  deleteProfile(profileId) {
    if (confirm('Are you sure you want to delete this profile?')) {
      this.app.profileManager.deleteProfile(profileId);
      this.updateProfileList();
      
      // If deleted profile was selected, switch to default
      if (this.elements.profileSelect.value === profileId) {
        this.selectProfile('default');
      }
    }
  }
}

// Global reference for inline event handlers
let ui;

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new LanChatApp();
  ui = app.uiController; // Global reference for inline handlers
  
  // Add custom animations to CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(300px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slideOut {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(300px); }
    }
  `;
  document.head.appendChild(style);
});