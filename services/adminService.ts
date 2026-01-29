
import type { UserProfile, Lesson, UserPerformanceData, Roster } from '../types';

const USERS_KEY = 'tp_skillence_users';
const ROSTERS_KEY = 'tp_skillence_rosters';
const CUSTOM_LESSONS_KEY = 'tp_skillence_custom_lessons';

const defaultModules = ['listening', 'speaking', 'reading', 'sales', 'global_culture', 'airline', 'telecom'];

// Fix: Ensure all required fields in UserPerformanceData are initialized
const mockPerformance = (overrides: Partial<UserPerformanceData> = {}): UserPerformanceData => ({
  grammar: 60,
  vocabulary: 60,
  fluency: 60,
  pronunciation: 60,
  overallSpoken: 60,
  writing: 60,
  listening: 60,
  understanding: 60,
  analytical: 60,
  testDate: 'May 2025',
  ...overrides
});

const initialRosters: Roster[] = [
  { id: 'roster_A', name: 'Alpha - English Primary', assignedCoachId: 'coach-tp-01' },
  { id: 'roster_B', name: 'Beta - Sales Excellence', assignedCoachId: 'coach-tp-02' },
  { id: 'roster_C', name: 'Gamma - Intensive Care', assignedCoachId: 'coach-tp-01' },
  { id: 'MASTER', name: 'Admin Operations' }
];

const initialUsers: UserProfile[] = [
  {
    id: 'admin-tp-01',
    name: 'TP Super Admin',
    role: 'admin',
    languageLevel: 'C1',
    assignedModules: defaultModules,
    rosterId: 'MASTER'
  },
  {
    id: 'coach-tp-01',
    name: 'Coach Sarah Miller',
    role: 'coach',
    rosterId: 'roster_A',
    languageLevel: 'C1',
    assignedModules: defaultModules
  },
  {
    id: 'coach-tp-02',
    name: 'Coach Ahmed Hassan',
    role: 'coach',
    rosterId: 'roster_B',
    languageLevel: 'B2',
    assignedModules: defaultModules
  },
  {
    id: '1773984510',
    name: 'Hesham Mohammed Mostafa',
    role: 'agent',
    languageLevel: 'B1',
    rosterId: 'roster_A',
    assignedCoachId: 'coach-tp-01',
    assignedModules: defaultModules,
    performanceData: mockPerformance({ 
      writing: 5, 
      fluency: 57, 
      grammar: 100, 
      listening: 85, 
      pronunciation: 87, 
      understanding: 60, 
      analytical: 84,
      vocabulary: 75,
      overallSpoken: 82
    })
  },
  {
    id: '1773984511',
    name: 'Adam Abdelsamie Salah',
    role: 'agent',
    languageLevel: 'B2',
    rosterId: 'roster_A',
    assignedCoachId: 'coach-tp-01',
    assignedModules: defaultModules,
    performanceData: mockPerformance({ 
      writing: 58, 
      fluency: 58, 
      grammar: 89, 
      listening: 85, 
      pronunciation: 43, 
      understanding: 80, 
      analytical: 74, 
      content: 45,
      vocabulary: 80,
      overallSpoken: 70
    })
  },
  {
    id: '177398451122501',
    name: 'Mona Emad Ibrahim',
    role: 'agent',
    languageLevel: 'B2',
    rosterId: 'roster_B',
    assignedCoachId: 'coach-tp-02',
    assignedModules: defaultModules,
    performanceData: mockPerformance({ 
      writing: 36, 
      fluency: 57, 
      grammar: 67, 
      listening: 78, 
      pronunciation: 87, 
      understanding: 60, 
      analytical: 84, 
      content: 5,
      vocabulary: 70,
      overallSpoken: 75
    })
  },
  {
    id: '177398451069724',
    name: 'Yousef Mahmoud El Sayed',
    role: 'agent',
    languageLevel: 'B2',
    rosterId: 'roster_B',
    assignedCoachId: 'coach-tp-02',
    assignedModules: defaultModules,
    performanceData: mockPerformance({ 
      writing: 5, 
      fluency: 65, 
      grammar: 5, 
      listening: 86, 
      pronunciation: 47, 
      understanding: 60, 
      analytical: 37, 
      content: 5,
      vocabulary: 50,
      overallSpoken: 55
    })
  },
  {
    id: '177398451165673',
    name: 'Dua Abdelmagid',
    role: 'agent',
    languageLevel: 'B2',
    rosterId: 'roster_A',
    assignedCoachId: 'coach-tp-01',
    assignedModules: defaultModules,
    performanceData: mockPerformance({ 
      writing: 55, 
      fluency: 57, 
      grammar: 46, 
      listening: 78, 
      pronunciation: 62, 
      understanding: 40, 
      analytical: 84,
      vocabulary: 65,
      overallSpoken: 60
    })
  }
];

export const getUsers = (): UserProfile[] => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (!stored) {
      localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(stored);
  } catch (e) {
    return initialUsers;
  }
};

export const saveUsers = (users: UserProfile[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getRosters = (): Roster[] => {
  try {
    const stored = localStorage.getItem(ROSTERS_KEY);
    if (!stored) {
      localStorage.setItem(ROSTERS_KEY, JSON.stringify(initialRosters));
      return initialRosters;
    }
    return JSON.parse(stored);
  } catch (e) {
    return initialRosters;
  }
};

export const saveRosters = (rosters: Roster[]) => {
  localStorage.setItem(ROSTERS_KEY, JSON.stringify(rosters));
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
  if (!allCustom[moduleId]) allCustom[moduleId] = [];
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
    if (allCustom[moduleId].length === 0) delete allCustom[moduleId];
    saveCustomLessons(allCustom);
  }
};
