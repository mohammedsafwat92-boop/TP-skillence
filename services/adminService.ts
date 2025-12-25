
import type { UserProfile, Lesson } from '../types';

const USERS_KEY = 'tp_skillence_users';
const CUSTOM_LESSONS_KEY = 'tp_skillence_custom_lessons';

const defaultAdmin: UserProfile = {
  id: 'admin-tp-01',
  name: 'TP Admin',
  role: 'admin',
  languageLevel: 'C1',
  assignedModules: ['listening', 'speaking', 'reading', 'sales', 'global_culture', 'airline', 'telecom']
};

const defaultAgent: UserProfile = {
  id: 'agent-tp-egypt',
  name: 'TP Egypt Agent',
  role: 'agent',
  languageLevel: 'B1',
  assignedModules: ['listening', 'speaking', 'reading', 'sales', 'global_culture', 'airline']
};

export const getUsers = (): UserProfile[] => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (!stored) {
      const initial = [defaultAdmin, defaultAgent];
      localStorage.setItem(USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(stored);
  } catch (e) {
    return [defaultAdmin];
  }
};

export const saveUsers = (users: UserProfile[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getCustomLessons = (): { [moduleId: string]: Lesson[] } => {
  try {
    const stored = localStorage.getItem(CUSTOM_LESSONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

export const saveCustomLessons = (lessons: { [moduleId: string]: Lesson[] }) => {
  localStorage.setItem(CUSTOM_LESSONS_KEY, JSON.stringify(lessons));
};

export const addCustomLesson = (moduleId: string, lesson: Lesson) => {
  const allCustom = getCustomLessons();
  if (!allCustom[moduleId]) {
    allCustom[moduleId] = [];
  }
  
  const exists = allCustom[moduleId].some(l => l.title === lesson.title);
  if (!exists) {
      allCustom[moduleId].push({ ...lesson, isCustom: true });
      saveCustomLessons(allCustom);
  }
};

export const removeCustomLesson = (moduleId: string, lessonTitle: string) => {
  const allCustom = getCustomLessons();
  if (allCustom[moduleId]) {
    allCustom[moduleId] = allCustom[moduleId].filter(l => l.title !== lessonTitle);
    if (allCustom[moduleId].length === 0) {
        delete allCustom[moduleId];
    }
    saveCustomLessons(allCustom);
  }
};
