
import type { ReactNode } from 'react';

export enum ResourceType {
  Watch = 'Watch',
  Read = 'Read',
  Listen = 'Listen',
  Hyperlink = 'Hyperlink',
  Practice = 'Practice',
}

export interface ResourceProgress {
  status: 'locked' | 'open' | 'completed';
  attempts: number;
  score: number;
  lastAttempt?: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  tags: string[];
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  objective?: string;
  progress: ResourceProgress;
}

export interface SHLReport {
  candidateName: string;
  email: string;
  cefrLevel: string;
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation: number;
  overallSpokenScore: number;
}

export interface UserPerformanceData {
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation: number;
  overallSpoken: number;
  testDate: string;
  writing?: number;
  listening?: number;
  understanding?: number;
  analytical?: number;
  content?: number;
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
  languageLevel: string;
  rosterId: string;
  assignedModules: string[];
  performanceData?: UserPerformanceData;
  assignedCoachId?: string;
  generatedCredentials?: UserCredentials;
}

export interface Lesson {
  title: string;
  level: string;
  type: ResourceType;
  link?: string;
  duration?: string;
  objective?: string;
  isCustom?: boolean;
  assignedTo?: string;
}

export interface Module {
  id: string;
  title: string;
  icon: ReactNode;
  description: string;
  lessons: Lesson[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
}

export type View = 
  | { type: 'dashboard' }
  | { type: 'module'; moduleId: string }
  | { type: 'admin' }
  | { type: 'lesson'; resource: Resource; fromModuleId?: string }
  | { type: 'quiz'; quizId: string }
  | { type: 'live-coach' };

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  type?: 'listening' | 'reading' | 'speaking';
  context?: string;
  speakingPrompt?: string;
}

export interface ActivityLog {
  date: string;
  type: 'lesson' | 'quiz' | 'live-session';
  score?: number;
  title?: string;
}

export interface UserProgress {
  completedLessons: string[];
  quizScores: Record<string, number>;
  activityHistory: ActivityLog[];
}
