import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import Notification from './components/Notification';
import IntroModal from './components/IntroModal';
import { useSettings } from './contexts/SettingsContext';
import { storageService } from './services/StorageService';
import { CouncilService } from './services/CouncilService';
import './App.css';

function App() {
  const { openRouterApiKey, councilModels, chairmanModel, isConfigured } = useSettings();

  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check for intro seen status on mount
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('llm_council_intro_seen');
    if (!hasSeenIntro) {
      setIsIntroOpen(true);
    } else if (!isConfigured) {
      // If intro seen but not configured, show settings
      setIsSettingsOpen(true);
    }
  }, [isConfigured]);

  const handleIntroClose = () => {
    localStorage.setItem('llm_council_intro_seen', 'true');
    setIsIntroOpen(false);
    if (!isConfigured) {
      setIsSettingsOpen(true);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    } else {
      setCurrentConversation(null);
    }
  }, [currentConversationId]);

  const loadConversations = () => {
    const convs = storageService.listConversations();
    setConversations(convs);
  };

  const loadConversation = (id) => {
    const conv = storageService.getConversation(id);
    setCurrentConversation(conv);
  };

  const handleNewConversation = () => {
    const newConv = storageService.createConversation();
    setConversations(storageService.listConversations());
    setCurrentConversationId(newConv.id);
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = (id) => {
    storageService.deleteConversation(id);
    setConversations(storageService.listConversations());
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const handleSendMessage = async (content) => {
    if (!currentConversationId || !isConfigured) return;

    // Check if API key is configured
    if (!openRouterApiKey) {
      setNotification({
        type: 'error',
        message: 'Please configure your OpenRouter API Key in Settings before asking questions.'
      });
      return;
    }

    setIsLoading(true);

    // 1. Save user message
    const conversation = storageService.getConversation(currentConversationId);
    conversation.messages.push({ role: 'user', content });
    storageService.saveConversation(conversation);

    // Update UI state immediately
    setCurrentConversation({ ...conversation });

    // 2. Prepare assistant message placeholder
    const assistantMessage = {
      role: 'assistant',
      stage1: null,
      stage2: null,
      stage3: null,
      metadata: null,
      loading: {
        stage1: false,
        stage2: false,
        stage3: false,
      },
    };

    // Add placeholder to local state
    conversation.messages.push(assistantMessage);
    storageService.saveConversation(conversation);
    setCurrentConversation({ ...conversation });

    // 3. Initialize Council Service
    const councilService = new CouncilService(openRouterApiKey, councilModels, chairmanModel);

    // 4. Run full council with event updates
    await councilService.runFullCouncil(content, (eventType, data) => {
      // Refresh conversation from storage
      const conv = storageService.getConversation(currentConversationId);
      if (!conv) return;

      // Get the last message (the assistant one)
      const lastMsg = conv.messages[conv.messages.length - 1];

      switch (eventType) {
        case 'stage1_start':
          lastMsg.loading.stage1 = true;
          break;

        case 'stage1_complete':
          lastMsg.stage1 = data;
          lastMsg.loading.stage1 = false;
          break;

        case 'stage2_start':
          lastMsg.loading.stage2 = true;
          break;

        case 'stage2_complete':
          lastMsg.stage2 = data.data;
          lastMsg.metadata = data.metadata;
          lastMsg.loading.stage2 = false;
          break;

        case 'stage3_start':
          lastMsg.loading.stage3 = true;
          break;

        case 'stage3_complete':
          lastMsg.stage3 = data;
          lastMsg.loading.stage3 = false;
          break;

        case 'title_complete':
          storageService.updateConversationTitle(currentConversationId, data);
          loadConversations(); // Reload list to show new title
          break;

        case 'warning':
          showNotification(data.message, 'warning');
          break;

        case 'error':
          console.error('Council error:', data);
          // Handle error state in UI
          lastMsg.error = data.message;
          showNotification(data.message, 'error');
          setIsLoading(false);
          break;

        case 'complete':
          setIsLoading(false);
          break;
      }

      // Save updated state and update UI
      if (eventType !== 'title_complete' && eventType !== 'warning' && eventType !== 'error') {
        storageService.saveConversation(conv);
      }
      setCurrentConversation({ ...conv });
    });
  };

  return (
    <div className="app relative">
      <button
        className="hamburger-btn"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          handleSelectConversation(id);
          setIsSidebarOpen(false);
        }}
        onNewConversation={() => {
          handleNewConversation();
          setIsSidebarOpen(false);
        }}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => {
          setIsSettingsOpen(true);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <IntroModal
        isOpen={isIntroOpen}
        onClose={handleIntroClose}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

export default App;
