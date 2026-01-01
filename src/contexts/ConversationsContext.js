import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ConversationsContext = createContext();

export const useConversations = () => {
  const context = useContext(ConversationsContext);
  if (!context) throw new Error('useConversations must be used within ConversationsProvider');
  return context;
};

export const ConversationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadConversations = () => {
    const key = user ? `conversations_${user.id}` : 'conversations_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      const convs = JSON.parse(saved);
      setConversations(convs);
      if (convs.length > 0 && !currentConversation) {
        setCurrentConversation(convs[0].id);
      }
    }
  };

  const saveConversations = (convs) => {
    const key = user ? `conversations_${user.id}` : 'conversations_guest';
    localStorage.setItem(key, JSON.stringify(convs));
    setConversations(convs);
  };

  const generateTitle = (message) => {
    const cleaned = message.replace(/[^\w\s]/gi, '').trim();
    const words = cleaned.split(/\s+/).slice(0, 6);
    return words.join(' ') || 'Nouvelle discussion';
  };

  const createConversation = (firstMessage = null, mode = 'prof') => {
    const newConv = {
      id: Date.now().toString(),
      title: firstMessage ? generateTitle(firstMessage) : 'Nouvelle discussion',
      messages: [],
      mode: mode, // 'prof' ou 'prompt'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newConv, ...conversations];
    saveConversations(updated);
    setCurrentConversation(newConv.id);
    return newConv.id;
  };

  const addMessage = (conversationId, message) => {
    const updated = conversations.map(conv => {
      if (conv.id === conversationId) {
        const messages = [...conv.messages, message];
        return {
          ...conv,
          messages,
          title: messages.length === 1 ? generateTitle(message.content) : conv.title,
          updatedAt: new Date().toISOString(),
        };
      }
      return conv;
    });
    saveConversations(updated);
  };

  const updateConversationSettings = (conversationId, settings) => {
    const updated = conversations.map(conv => {
      if (conv.id === conversationId) {
        return { ...conv, ...settings, updatedAt: new Date().toISOString() };
      }
      return conv;
    });
    saveConversations(updated);
  };

  const deleteConversation = (conversationId) => {
    const updated = conversations.filter(c => c.id !== conversationId);
    saveConversations(updated);
    if (currentConversation === conversationId) {
      setCurrentConversation(updated[0]?.id || null);
    }
  };

  const getCurrentConversation = () => {
    return conversations.find(c => c.id === currentConversation);
  };

  const getConversationsByMode = (mode) => {
    return conversations.filter(c => c.mode === mode);
  };

  const getCurrentConversationForMode = (mode) => {
    const modeConvs = getConversationsByMode(mode);
    return modeConvs.length > 0 ? modeConvs[0] : null;
  };

  const switchToMode = (mode) => {
    // Cherche la conversation la plus récente pour ce mode
    const modeConv = getCurrentConversationForMode(mode);
    if (modeConv) {
      setCurrentConversation(modeConv.id);
    } else {
      // Créer une nouvelle conversation pour ce mode
      createConversation(null, mode);
    }
  };

  const value = {
    conversations,
    currentConversation,
    setCurrentConversation,
    createConversation,
    addMessage,
    updateConversationSettings,
    deleteConversation,
    getCurrentConversation,
    getConversationsByMode,
    getCurrentConversationForMode,
    switchToMode,
  };

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
};

