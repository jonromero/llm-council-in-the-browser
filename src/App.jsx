import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import Notification from './components/Notification';
import IntroModal from './components/IntroModal';
import { useSettings } from './contexts/SettingsContext';
import { storageService } from './services/StorageService';
import { CouncilService } from './services/CouncilService';
import { getSupabaseService } from './services/SupabaseService';
import './App.css';

function App() {
  const {
    openRouterApiKey,
    councilModels,
    chairmanModel,
    isConfigured,
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured,
  } = useSettings();

  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Keep StorageService in sync with Supabase credentials
  useEffect(() => {
    storageService.setSupabaseCredentials(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  // Check for intro seen status on mount
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('llm_council_intro_seen');
    if (!hasSeenIntro) {
      setIsIntroOpen(true);
    } else if (!isConfigured) {
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

  // Load conversations on mount (with optional Supabase hydration)
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

  const loadConversations = async () => {
    // Try async variant (hydrates from Supabase if localStorage is empty)
    const convs = await storageService.listConversationsAsync();
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

  /**
   * Re-run a single model in a specific message's Stage 1 results.
   * @param {number} msgIndex   – index in conversation.messages (the assistant message)
   * @param {number} slotIndex  – index within stage1 array
   * @param {string} modelName  – model to re-query
   */
  const handleRedoModel = async (msgIndex, slotIndex, modelName) => {
    if (!currentConversationId || !openRouterApiKey) return;

    const conversation = storageService.getConversation(currentConversationId);
    if (!conversation) return;

    // Find the user message just before this assistant message
    const userMsg = conversation.messages
      .slice(0, msgIndex)
      .reverse()
      .find(m => m.role === 'user');
    if (!userMsg) return;

    const assistantMsg = conversation.messages[msgIndex];
    if (!assistantMsg?.stage1) return;

    // Mark that slot as loading
    assistantMsg.stage1[slotIndex] = {
      ...assistantMsg.stage1[slotIndex],
      loading: true,
    };
    storageService.saveConversation(conversation);
    setCurrentConversation({ ...conversation });

    // Build history up to (but not including) this exchange
    const prevMessages = conversation.messages.slice(0, msgIndex - 1);
    const councilService = new CouncilService(openRouterApiKey, councilModels, chairmanModel);
    const history = councilService.buildHistory(prevMessages);

    const content = await councilService.querySingleModel(
      modelName, userMsg.content, [], history,
      (evtType, data) => {
        if (evtType === 'warning') showNotification(data.message, 'warning');
      }
    );

    // Update slot with new response
    const conv2 = storageService.getConversation(currentConversationId);
    if (conv2?.messages[msgIndex]?.stage1) {
      conv2.messages[msgIndex].stage1[slotIndex] = {
        model: modelName,
        response: content || 'Error: no response received.',
        loading: false,
      };
      storageService.saveConversation(conv2);
      setCurrentConversation({ ...conv2 });
    }
  };

  /**
   * Change the model for a specific slot and re-run it.
   * @param {number} msgIndex   – index in conversation.messages (the assistant message)
   * @param {number} slotIndex  – index within stage1 array
   * @param {string} oldModel   – previous model id (unused but useful for debugging)
   * @param {string} newModel   – new model id to query
   */
  const handleChangeModel = async (msgIndex, slotIndex, oldModel, newModel) => {
    if (!currentConversationId || !openRouterApiKey) return;
    if (!newModel || newModel === oldModel) return;

    const conversation = storageService.getConversation(currentConversationId);
    if (!conversation?.messages[msgIndex]?.stage1) return;

    // Swap the model name and set loading
    conversation.messages[msgIndex].stage1[slotIndex] = {
      model: newModel,
      response: null,
      loading: true,
    };
    storageService.saveConversation(conversation);
    setCurrentConversation({ ...conversation });

    const userMsg = conversation.messages
      .slice(0, msgIndex)
      .reverse()
      .find(m => m.role === 'user');
    if (!userMsg) return;

    const prevMessages = conversation.messages.slice(0, msgIndex - 1);
    const councilService = new CouncilService(openRouterApiKey, councilModels, chairmanModel);
    const history = councilService.buildHistory(prevMessages);

    const content = await councilService.querySingleModel(
      newModel, userMsg.content, [], history,
      (evtType, data) => {
        if (evtType === 'warning') showNotification(data.message, 'warning');
      }
    );

    const conv2 = storageService.getConversation(currentConversationId);
    if (conv2?.messages[msgIndex]?.stage1) {
      conv2.messages[msgIndex].stage1[slotIndex] = {
        model: newModel,
        response: content || 'Error: no response received.',
        loading: false,
      };
      storageService.saveConversation(conv2);
      setCurrentConversation({ ...conv2 });
    }
  };

  /**
   * Send a message to the full council.
   * @param {string} content        – user text
   * @param {Array}  attachments    – processed attachment objects (from DocumentService)
   * @param {Array}  rawFiles       – original File objects (for Supabase Storage upload)
   */
  const handleSendMessage = async (content, attachments = [], rawFiles = []) => {
    if (!currentConversationId) return;

    if (!openRouterApiKey) {
      setNotification({
        type: 'error',
        message: 'Please configure your OpenRouter API Key in Settings before asking questions.'
      });
      return;
    }

    setIsLoading(true);

    // 1. Save user message (with attachment file names for display)
    const conversation = storageService.getConversation(currentConversationId);
    const userMessage = {
      role: 'user',
      content: content || '',
      attachmentNames: attachments.map(a => a.name),
    };
    conversation.messages.push(userMessage);
    storageService.saveConversation(conversation);
    setCurrentConversation({ ...conversation });

    // 2. Upload raw files to Supabase Storage (background)
    if (rawFiles.length > 0 && isSupabaseConfigured) {
      const svc = getSupabaseService(supabaseUrl, supabaseAnonKey);
      if (svc) {
        const msgId = `${currentConversationId}_${Date.now()}`;
        rawFiles.forEach(file => {
          svc.uploadFile(currentConversationId, msgId, file).catch(console.error);
        });
      }
    }

    // 3. Prepare assistant message placeholder
    const assistantMessage = {
      role: 'assistant',
      stage1: null,
      stage2: null,
      stage3: null,
      metadata: null,
      loading: { stage1: false, stage2: false, stage3: false },
    };
    conversation.messages.push(assistantMessage);
    storageService.saveConversation(conversation);
    setCurrentConversation({ ...conversation });

    // 4. Collect prior settled messages for conversation history
    // All messages except the two we just added (user + assistant placeholder)
    const previousMessages = conversation.messages.slice(0, conversation.messages.length - 2);

    // 5. Run full council
    const councilService = new CouncilService(openRouterApiKey, councilModels, chairmanModel);

    await councilService.runFullCouncil(
      content,
      (eventType, data) => {
        const conv = storageService.getConversation(currentConversationId);
        if (!conv) return;

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
            loadConversations();
            break;

          case 'warning':
            showNotification(data.message, 'warning');
            break;

          case 'error':
            console.error('Council error:', data);
            lastMsg.error = data.message;
            showNotification(data.message, 'error');
            setIsLoading(false);
            break;

          case 'complete':
            setIsLoading(false);
            break;
        }

        if (!['title_complete', 'warning', 'error'].includes(eventType)) {
          storageService.saveConversation(conv);
        }
        setCurrentConversation({ ...conv });
      },
      attachments,
      previousMessages
    );
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
        onRedoModel={handleRedoModel}
        onChangeModel={handleChangeModel}
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
