
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

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'coach' | 'agent';
  cefrLevel: string;
  rosterId: string;
}

export interface SHLReport {
  candidateName: string;
  email: string;
  cefrLevel: string;
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation: number;
}

export interface ActivityLog {
  date: string;
  type: 'lesson' | 'quiz';
  title: string;
  score?: number;
}

export interface UserProgress {
  completedLessons: string[];
  quizScores: { [quizId: string]: number };
  activityHistory?: ActivityLog[];
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
  testDate: string;
}

export interface UserCredentials {
  tempId: string;
  accessCode: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'coach' | 'agent';
  languageLevel: string;
  rosterId: string;
  assignedModules: string[];
  assignedCoachId?: string;
  performanceData?: UserPerformanceData;
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
  isAdaptive?: boolean;
}

export interface Roster {
  id: string;
  name: string;
  assignedCoachId?: string;
}

// Updated View type to use resource: Resource for type: 'lesson' to resolve type mismatches in App.tsx
export type View = 
  | { type: 'dashboard' }
  | { type: 'module'; moduleId: string }
  | { type: 'admin' }
  | { type: 'lesson'; resource: Resource; fromModuleId?: string }
  | { type: 'quiz'; quizId: string };

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  type?: 'listening' | 'reading' | 'speaking';
  context?: string;
  speakingPrompt?: string;
}
