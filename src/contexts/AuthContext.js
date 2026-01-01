import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('mentorlearn_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signup = (email, password, name) => {
    const users = JSON.parse(localStorage.getItem('mentorlearn_users') || '[]');
    
    if (users.find(u => u.email === email)) {
      throw new Error('Un compte existe déjà avec cet email');
    }

    const isAdmin = email === 'cyril.tchg@gmail.com';

    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      password,
      plan: isAdmin ? 'pro' : 'free',
      isAdmin: isAdmin,
      questionsToday: 0,
      lastQuestionDate: new Date().toDateString(),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('mentorlearn_users', JSON.stringify(users));
    
    const userToStore = { ...newUser };
    delete userToStore.password;
    
    localStorage.setItem('mentorlearn_user', JSON.stringify(userToStore));
    setUser(userToStore);
    
    return userToStore;
  };

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem('mentorlearn_users') || '[]');
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (!foundUser) {
      throw new Error('Email ou mot de passe incorrect');
    }

    const isAdmin = email === 'cyril.tchg@gmail.com';
    if (isAdmin && foundUser.plan !== 'pro') {
      foundUser.plan = 'pro';
      foundUser.isAdmin = true;
      const userIndex = users.findIndex(u => u.email === email);
      if (userIndex !== -1) {
        users[userIndex] = foundUser;
        localStorage.setItem('mentorlearn_users', JSON.stringify(users));
      }
    }

    const userToStore = { ...foundUser };
    delete userToStore.password;
    
    localStorage.setItem('mentorlearn_user', JSON.stringify(userToStore));
    setUser(userToStore);
    
    return userToStore;
  };

  const logout = () => {
    localStorage.removeItem('mentorlearn_user');
    setUser(null);
  };

  const upgradeToPro = () => {
    if (!user) return;
    if (user.isAdmin) return;
    
    const updatedUser = { ...user, plan: 'pro' };
    
    const users = JSON.parse(localStorage.getItem('mentorlearn_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], plan: 'pro' };
      localStorage.setItem('mentorlearn_users', JSON.stringify(users));
    }
    
    localStorage.setItem('mentorlearn_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const incrementQuestions = () => {
    if (!user) {
      const guestQuestions = parseInt(localStorage.getItem('guest_questions') || '0');
      localStorage.setItem('guest_questions', (guestQuestions + 1).toString());
      return;
    }

    const today = new Date().toDateString();
    let questionsToday = user.questionsToday;
    
    if (user.lastQuestionDate !== today) {
      questionsToday = 0;
    }

    questionsToday++;

    const updatedUser = { 
      ...user, 
      questionsToday,
      lastQuestionDate: today
    };

    const users = JSON.parse(localStorage.getItem('mentorlearn_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex] = { 
        ...users[userIndex], 
        questionsToday,
        lastQuestionDate: today 
      };
      localStorage.setItem('mentorlearn_users', JSON.stringify(users));
    }

    localStorage.setItem('mentorlearn_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const canAskQuestion = () => {
    if (!user) {
      const guestQuestions = parseInt(localStorage.getItem('guest_questions') || '0');
      return guestQuestions < 3;
    }

    if (user.plan === 'pro' || user.isAdmin) return true;

    const today = new Date().toDateString();
    if (user.lastQuestionDate !== today) return true;

    return user.questionsToday < 5;
  };

  const getRemainingQuestions = () => {
    if (!user) {
      const guestQuestions = parseInt(localStorage.getItem('guest_questions') || '0');
      return Math.max(0, 3 - guestQuestions);
    }

    if (user.plan === 'pro') return Infinity;

    const today = new Date().toDateString();
    if (user.lastQuestionDate !== today) return 5;

    return Math.max(0, 5 - user.questionsToday);
  };

  // Gestion des notions validées
  const getValidatedConceptsKey = () => {
    return user ? `mentorlearn_validated_concepts_${user.id}` : 'mentorlearn_validated_concepts_guest';
  };

  const getValidatedConcepts = () => {
    const key = getValidatedConceptsKey();
    const concepts = localStorage.getItem(key);
    return concepts ? JSON.parse(concepts) : [];
  };

  const addValidatedConcept = (concept) => {
    const key = getValidatedConceptsKey();
    const concepts = getValidatedConcepts();
    
    // Ajouter le concept avec timestamp
    const newConcept = {
      name: concept,
      validatedAt: new Date().toISOString(),
      needsReview: false
    };
    
    // Vérifier si le concept n'existe pas déjà
    if (!concepts.find(c => c.name.toLowerCase() === concept.toLowerCase())) {
      concepts.push(newConcept);
      localStorage.setItem(key, JSON.stringify(concepts));
    }
  };

  const isConceptValidated = (concept) => {
    const concepts = getValidatedConcepts();
    return concepts.some(c => c.name.toLowerCase() === concept.toLowerCase());
  };

  const markConceptForReview = (concept) => {
    const key = getValidatedConceptsKey();
    const concepts = getValidatedConcepts();
    const conceptIndex = concepts.findIndex(c => c.name.toLowerCase() === concept.toLowerCase());
    
    if (conceptIndex !== -1) {
      concepts[conceptIndex].needsReview = true;
      localStorage.setItem(key, JSON.stringify(concepts));
    }
  };

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    upgradeToPro,
    incrementQuestions,
    canAskQuestion,
    getRemainingQuestions,
    getValidatedConcepts,
    addValidatedConcept,
    isConceptValidated,
    markConceptForReview,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

