
import type { ReactElement } from 'react';

export enum ResourceType {
  Watch = 'Watch',
  Read = 'Read',
  Listen = 'Listen',
  Hyperlink = 'Hyperlink',
  Practice = 'Practice',
}

export interface Lesson {
  title: string;
  level: string;
  type: ResourceType;
  link?: string;
  objective?: string;
  duration?: string;
  isCustom?: boolean;
  assignedTo?: string;
}

export interface Module {
  id: string;
  title: string;
  icon: ReactElement;
  description: string;
  lessons: Lesson[];
}

export type QuestionType = 'multiple_choice' | 'listening' | 'reading' | 'speaking';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  context?: string;
  options?: string[];
  correctAnswer?: number;
  speakingPrompt?: string;
}

export interface Quiz {
    id: string;
    title: string;
    description: string;
    isAdaptive?: boolean;
}

export interface UserPerformanceData {
  writing: number;
  fluency: number;
  grammar: number;
  listening: number;
  pronunciation: number;
  understanding: number;
  analytical: number;
  content?: number;
  testDate?: string;
}

export interface UserCredentials {
  tempId: string;
  accessCode: string;
}

export interface Roster {
  id: string;
  name: string;
  assignedCoachId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'coach' | 'agent';
  languageLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  assignedModules: string[];
  rosterId: string;
  assignedCoachId?: string; // Direct link to a coach
  performanceData?: UserPerformanceData;
  generatedCredentials?: UserCredentials;
}

export type View = 
  | { type: 'dashboard' }
  | { type: 'module'; moduleId: string }
  | { type: 'quiz'; quizId: string }
  | { type: 'admin' }
  | { type: 'lesson'; lesson: Lesson; fromModuleId?: string };

export interface ActivityLog {
  date: string;
  type: 'lesson' | 'quiz';
  itemId: string;
  score?: number;
}

export interface UserProgress {
  completedLessons: string[];
  quizScores: { [quizId: string]: number };
  activityHistory: ActivityLog[];
}
