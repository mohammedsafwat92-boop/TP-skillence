
import type { ReactNode } from 'react';

export enum ResourceType {
  Watch = 'Watch',
  Read = 'Read',
  Listen = 'Listen',
  Hyperlink = 'Hyperlink',
  Practice = 'Practice',
}

export interface ResourceProgress {
  status: 'locked' | 'assigned' | 'open' | 'completed';
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
  testDate: string;
  cefrLevel: string;
  svar: {
    overall: number;
    pronunciation: number;
    fluency: number;
    activeListening: number;
    understanding: number;
    vocabulary: number;
    grammar: number;
  };
  writex: {
    content: number;
    grammar: number;
    coherence: number;
  };
  competencies?: {
    behavioralIndicators: string[];
    skillBreakdown: Record<string, number>;
  };
}

/**
 * Enhanced performance metrics for language academy tracking
 */
export interface UserPerformanceData {
  grammar: number;
  vocabulary: number;
  fluency: number;
  pronunciation: number;
  overallSpoken: number;
  writing: number;
  listening: number;
  understanding: number;
  analytical: number;
  content?: number;
  coherence?: number;
  testDate: string;
  competencies?: string[];
}

/**
 * Credentials for impersonation and sandbox access
 */
export interface UserCredentials {
  tempId: string;
  accessCode: string;
}

/**
 * Organizational team structure for agents and coaches
 */
export interface Roster {
  id: string;
  name: string;
  assignedCoachId?: string;
}

/**
 * Comprehensive user profile supporting admin, coach, and agent roles
 */
export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'coach' | 'agent';
  languageLevel: string;
  rosterId: string;
  shlData?: SHLReport;
  performanceData?: UserPerformanceData;
  assignedModules?: string[];
  assignedCoachId?: string;
  assignedCoach?: string; // New: email of the assigned coach
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
