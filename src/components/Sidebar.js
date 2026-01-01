import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConversations } from '../contexts/ConversationsContext';
import './Sidebar.css';

const Sidebar = ({ onUpgradeClick, onAuthClick, currentMode }) => {
  const { user, logout } = useAuth();
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    createConversation,
    deleteConversation,
    getConversationsByMode,
  } = useConversations();
  
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Filtrer les conversations par mode actuel
  const filteredConversations = getConversationsByMode(currentMode || 'prof');

  const handleNewChat = () => {
    createConversation(null, currentMode || 'prof');
  };

  const handleDeleteConversation = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Supprimer cette discussion ?')) {
      deleteConversation(id);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">ML</span>
          <span className="logo-text">MentorLearn</span>
        </div>
        <button className="btn-new-chat" onClick={handleNewChat}>
          <span>+</span> Nouvelle discussion
        </button>
      </div>

      <div className="sidebar-conversations">
        {filteredConversations.length === 0 ? (
          <div className="empty-state">
            Aucune discussion en {currentMode === 'prof' ? 'Mode Prof' : 'Mode Prompt'}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${currentConversation === conv.id ? 'active' : ''}`}
              onClick={() => setCurrentConversation(conv.id)}
            >
              <div className="conversation-content">
                <div className="conversation-title">{conv.title}</div>
                <div className="conversation-meta">
                  {new Date(conv.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
              </div>
              <button
                className="conversation-delete"
                onClick={(e) => handleDeleteConversation(e, conv.id)}
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        {!user && (
          <button className="btn-auth" onClick={onAuthClick}>
            Se connecter
          </button>
        )}

        {user && user.plan === 'free' && !user.isAdmin && (
          <button className="btn-upgrade" onClick={onUpgradeClick}>
            <span className="upgrade-icon">⚡</span>
            Passer à Pro
          </button>
        )}
        
        {user && user.isAdmin && (
          <div className="admin-badge">
            👑 Admin
          </div>
        )}

        {user && (
          <div className="user-menu-wrapper">
            <button
              className="user-menu-trigger"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-plan">
                  {user.isAdmin ? 'Admin' : (user.plan === 'pro' ? 'Pro' : 'Gratuit')}
                </div>
              </div>
            </button>

            {showUserMenu && (
              <div className="user-menu-dropdown">
                {user.plan === 'free' && !user.isAdmin && (
                  <button onClick={onUpgradeClick}>
                    Passer à Pro
                  </button>
                )}
                <button onClick={logout}>Déconnexion</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

