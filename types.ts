
import type { ReactNode } from 'react';

export enum ResourceType {
  Watch = 'Watch',
  Read = 'Read',
  Listen = 'Listen',
  Hyperlink = 'Hyperlink',
  Practice = 'Practice',
}

export type SkillCategory = 'All' | 'Listening' | 'Speaking' | 'Reading' | 'Writing';

export interface ResourceProgress {
  status: 'locked' | 'assigned' | 'open' | 'completed' | 'not_started' | 'in_progress';
  score?: number;
  attempts?: number;
  lastAttempt?: string;
  assignedBy?: string;
  completedAt?: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  tags: string[];
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'All';
  objective?: string;
  scrapedText?: string;
  duration: number;
  progress: ResourceProgress;
}

export interface UserCredentials {
  tempId: string;
  accessCode: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'coach' | 'agent';
  languageLevel: string;
  rosterId: string;
  metrics?: any; // Uses 'any' to safely parse nested svar/writex objects from the database
  assignedModules?: string[];
  assignedCoach?: string; 
  generatedCredentials?: UserCredentials;
  overallProgress?: number;
  weeklyProgress?: number;
}

export interface Roster {
  id: string;
  name: string;
  coachId: string;
  agentIds: string[];
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
  | { type: 'dashboard', skill?: SkillCategory }
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
