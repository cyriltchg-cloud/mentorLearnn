/**
 * Mémoire utilisateur légère (en RAM)
 * Stocke le contexte de chaque utilisateur pour reprendre automatiquement
 */

const userStates = new Map();

/**
 * Structure d'un état utilisateur:
 * {
 *   userId: string,
 *   lastTopic: string,
 *   lastStep: string,
 *   lastMode: "prof" | "prompt",
 *   lastSummary: string,
 *   lastUpdated: Date,
 * }
 */

function getUserState(userId) {
  if (!userId) return null;
  return userStates.get(userId) || null;
}

function setUserState(userId, state) {
  if (!userId) return;
  userStates.set(userId, {
    ...state,
    userId,
    lastUpdated: new Date(),
  });
}

function updateUserState(userId, partial) {
  if (!userId) return;
  const current = getUserState(userId) || {};
  setUserState(userId, { ...current, ...partial });
}

function clearUserState(userId) {
  if (!userId) return;
  userStates.delete(userId);
}

function getAllStates() {
  return Array.from(userStates.values());
}

module.exports = {
  getUserState,
  setUserState,
  updateUserState,
  clearUserState,
  getAllStates,
};

