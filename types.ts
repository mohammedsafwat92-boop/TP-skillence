
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
  isCustom?: boolean; // Flag to identify admin-added lessons
  assignedTo?: string; // User ID if assigned to a specific person
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
  context?: string; // For reading passages or listening transcripts
  options?: string[]; // For MC, Listening, Reading
  correctAnswer?: number; // Index for MC
  speakingPrompt?: string; // Specific prompt for speaking tasks
}

export interface Quiz {
    id: string;
    title: string;
    description: string;
    isAdaptive?: boolean; // Flag for the new generated tests
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'agent';
  languageLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  assignedModules: string[]; // List of Module IDs visible to this user
}

export type View = 
  | { type: 'dashboard' }
  | { type: 'module'; moduleId: string }
  | { type: 'quiz'; quizId: string }
  | { type: 'admin' };

export interface ActivityLog {
  date: string; // ISO string
  type: 'lesson' | 'quiz';
  itemId: string;
  score?: number;
}

export interface UserProgress {
  completedLessons: string[];
  quizScores: { [quizId: string]: number };
  activityHistory: ActivityLog[];
}
