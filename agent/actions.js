/**
 * Actions internes de l'agent MentorLearn
 * Permet des automatisations simples sans API externes
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const TASKS_FILE = path.join(DATA_DIR, "agent_tasks.json");

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialiser le fichier tasks s'il n'existe pas
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify({ tasks: [] }, null, 2));
}

function loadTasks() {
  try {
    const data = fs.readFileSync(TASKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return { tasks: [] };
  }
}

function saveTasks(data) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Erreur sauvegarde tasks:", err.message);
  }
}

/**
 * Planifie un email quotidien (simulation)
 */
function scheduleDailyEmail(userId, content) {
  const tasks = loadTasks();
  const task = {
    id: `email-${Date.now()}`,
    type: "daily_email",
    userId,
    content,
    createdAt: new Date().toISOString(),
    status: "scheduled",
  };
  tasks.tasks.push(task);
  saveTasks(tasks);
  
  console.log(`📧 Email quotidien planifié pour userId: ${userId}`);
  return `✅ Email quotidien planifié. Tu recevras un rappel chaque jour.`;
}

/**
 * Génère un rapport de progression (simulation)
 */
function generateProgressReport(userId) {
  console.log(`📊 Génération rapport progression pour userId: ${userId}`);
  return `✅ Rapport de progression généré. Tu as progressé de 15% cette semaine. Continue comme ça !`;
}

/**
 * Crée un rappel (simulation)
 */
function reminder(userId, text, delayMinutes = 60) {
  const tasks = loadTasks();
  const task = {
    id: `reminder-${Date.now()}`,
    type: "reminder",
    userId,
    text,
    delayMinutes,
    createdAt: new Date().toISOString(),
    executeAt: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
    status: "scheduled",
  };
  tasks.tasks.push(task);
  saveTasks(tasks);
  
  console.log(`⏰ Rappel créé pour userId: ${userId} dans ${delayMinutes} minutes`);
  return `✅ Rappel créé. Je te le rappellerai dans ${delayMinutes} minutes.`;
}

/**
 * Liste toutes les tâches planifiées
 */
function listTasks(userId = null) {
  const tasks = loadTasks();
  if (userId) {
    return tasks.tasks.filter((t) => t.userId === userId);
  }
  return tasks.tasks;
}

/**
 * Marque une tâche comme exécutée
 */
function markTaskCompleted(taskId) {
  const tasks = loadTasks();
  const task = tasks.tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    saveTasks(tasks);
    return true;
  }
  return false;
}

module.exports = {
  scheduleDailyEmail,
  generateProgressReport,
  reminder,
  listTasks,
  markTaskCompleted,
};

