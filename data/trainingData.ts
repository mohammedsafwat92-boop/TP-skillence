
import React from 'react';
import type { Module, Quiz, Lesson } from '../types';
import { ListeningIcon, SpeakingIcon, ReadingIcon, AirlineIcon, GlobeIcon, PhoneIcon, ChartBarIcon } from '../components/Icons';
import { ResourceType } from '../types';

const listeningLessons: Lesson[] = [
    { title: 'Ep01 - First Impressions', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep01', duration: '15 min' },
    { title: 'Ep02 - Networking', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep02', duration: '15 min' },
    { title: 'Ep05 - Small Talk', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep05', duration: '15 min' },
    { title: 'Ep15 - Conflict Management', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep15', duration: '20 min' },
    { title: 'Ep22 - Travel Vocabulary', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep22', duration: '15 min' },
    { title: 'Ep24 - Connection Issues', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep24', duration: '15 min' },
    { title: 'Ep30 - Transitions', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep30', duration: '15 min' },
    { title: 'Ep47 - Professional Disagreement', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep47', duration: '20 min' },
    { title: 'Ep48 - Agree/Disagree Diplomatically', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep48', duration: '20 min' },
    { title: 'Ep50 - Real Business Conversations', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep50', duration: '25 min' },
    { title: 'Ep57 - Arguing a Point Professionally', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep57', duration: '20 min' },
    { title: 'Ep68 - Phrases for Active Listening', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep68', duration: '15 min' },
    { title: 'Ep87 - Investigating a Topic in Detail', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep87', duration: '20 min' },
    { title: 'Ep92 - Bringing Conversation Back on Track', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep92', duration: '15 min' },
    { title: 'UK Travel Planning Podcast', type: ResourceType.Listen, level: 'A2-B1', link: 'https://uktravelplanning.com/uk-travel-planning-podcast-2/', duration: '30 min' },
    { title: 'The Travel Diaries', type: ResourceType.Listen, level: 'A2-B1', link: 'https://thetraveldiariespodcast.com/episodes/', duration: '30 min' },
];

const readingLessons: Lesson[] = [
    { title: 'Hearing vs Listening (CX Today)', level: 'B1', type: ResourceType.Read, link: 'https://www.cxtoday.com/contact-center/hearing-vs-listening-5-ways-to-ace-active-listening-in-call-centers/', duration: '10 min' },
    { title: 'Active Listening is Key (Verint)', level: 'B1', type: ResourceType.Read, link: 'https://www.verint.com/blog/active-listening-is-key-to-great-customer-service/', duration: '10 min' },
    { title: 'Reading Techniques: Scanning & Skimming', level: 'A2-B1', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=_E-ipD-gCgA', duration: '15 min' },
    { title: 'Verbal Reasoning Practice', level: 'B1', type: ResourceType.Practice, link: 'https://www.practiceaptitudetests.com/verbal-reasoning-tests/', duration: '25 min' },
    { title: 'Company Policies Mastery', level: 'A2', type: ResourceType.Practice, objective: 'Read sample policies and answer comprehension questions', duration: '20 min' },
];

const speakingLessons: Lesson[] = [
    { title: 'The Art of Active Listening', level: 'B1-B2', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=aDMtx5ivKK0', duration: '15 min' },
    { title: 'Speaking Clearly over Phone', level: 'B1', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=2QjVoyMJI84', duration: '10 min' },
    { title: 'Shadowing Technique Drill', level: 'B1', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=KDpfN0TA4c4', duration: '15 min' },
    { title: 'Handling Complaints Roleplay', level: 'A2-B1', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=CRMCDGcK9gw', duration: '10 min' },
    { title: 'Empathy Statements Workshop', level: 'A2', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=npsJwLk5vjU', duration: '5 min' },
];

const cultureLessons: Lesson[] = [
    { title: 'The FORD Method', level: 'All', type: ResourceType.Read, duration: '15 min', objective: 'Building Rapport using Family, Occupation, Recreation, and Dreams.' },
    { title: 'UK vs US Communication Styles', level: 'B1-B2', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=_kItsPSG4tI', duration: '15 min' },
    { title: 'British Slang & Expressions', level: 'B1', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=fGnhPZkItjc', duration: '10 min' },
    { title: 'US Values: Directness & Efficiency', level: 'All', type: ResourceType.Read, duration: '10 min', objective: 'Understand the "Time is Money" philosophy in US customer service.' },
    { title: 'Middle East Hospitality & Trust', level: 'All', type: ResourceType.Read, duration: '10 min', objective: 'Building relationships and spend time on greetings.' },
];

const airlineLessons: Lesson[] = [
    { title: 'Airline Alliances (Star Alliance)', level: 'B1', type: ResourceType.Watch, link: 'https://www.youtube.com/shorts/Ugwy4Q2143s', duration: '5 min' },
    { title: 'Codeshare Flights Explained', level: 'B1', type: ResourceType.Watch, link: 'https://www.airhelp.com/en/codeshare-flight/', duration: '10 min' },
    { title: 'Airport Vocabulary & Terminology', level: 'A2-B1', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=fC-ZZfIVfcE', duration: '10 min' },
];

const telecomLessons: Lesson[] = [
    { title: 'US Telecom Norms & Voicemail', level: 'All', type: ResourceType.Read, duration: '15 min', objective: 'Porting, Voicemail etiquette, and Credit Checks.' },
    { title: 'Device Ecosystem & Payment Plans', level: 'All', type: ResourceType.Read, duration: '15 min', objective: 'Understanding device upgrades and US sales tax.' },
    { title: 'Empathy in Telecom Support', level: 'All', type: ResourceType.Practice, duration: '20 min', objective: 'The 4-step resolution process for frustrated tech users.' },
];

const salesLessons: Lesson[] = [
    { title: 'Rapport: The Psychology of Yes', level: 'B1-B2', type: ResourceType.Read, duration: '20 min', objective: 'Psychological triggers that build trust during a sales call.' },
    { title: 'Overcoming Objections: The 3-Step Method', level: 'B1', type: ResourceType.Practice, duration: '15 min', objective: 'Listen, Validate, and Pivot technique for high-rejection scenarios.' },
    { title: 'Upselling: From Economy to Premium', level: 'B1+', type: ResourceType.Watch, duration: '12 min', objective: 'Demonstrating value rather than cost in airline upselling.' },
    { title: 'Closing Techniques for Call Center Success', level: 'B2', type: ResourceType.Listen, duration: '20 min', objective: 'The Assumptive Close and the Alternative Choice Close.' },
    { title: 'Needs Discovery & Questioning', level: 'A2-B1', type: ResourceType.Practice, duration: '15 min', objective: 'Using open-ended questions to uncover customer pain points.' },
];

export const allTrainingModules: { [id: string]: Module } = {
  listening: {
    id: 'listening',
    title: 'Listening Skills',
    icon: React.createElement(ListeningIcon),
    description: 'Master active listening to improve customer interactions and resolve issues effectively.',
    lessons: listeningLessons,
  },
  speaking: {
    id: 'speaking',
    title: 'Speaking Skills',
    icon: React.createElement(SpeakingIcon),
    description: 'Enhance clarity, politeness, and effectiveness in verbal communication.',
    lessons: speakingLessons,
  },
  reading: {
    id: 'reading',
    title: 'Reading Skills',
    icon: React.createElement(ReadingIcon),
    description: 'Improve reading comprehension for policies, requests, and internal communications.',
    lessons: readingLessons,
  },
  sales: {
    id: 'sales',
    title: 'Sales & Negotiation',
    icon: React.createElement(ChartBarIcon),
    description: 'Master the art of upselling, rapport building, and persuasive communication.',
    lessons: salesLessons,
  },
  global_culture: {
    id: 'global_culture',
    title: 'Global Cultural Etiquette',
    icon: React.createElement(GlobeIcon),
    description: "Learn key cultural Do's and Don'ts to build rapport with global customers.",
    lessons: cultureLessons,
  },
  airline: {
    id: 'airline',
    title: 'Airline Knowledge',
    icon: React.createElement(AirlineIcon),
    description: 'Familiarize yourself with airline terminology and industry specifics.',
    lessons: airlineLessons,
  },
  telecom: {
    id: 'telecom',
    title: 'US Telecom & Service',
    icon: React.createElement(PhoneIcon),
    description: 'Master US-specific telecom norms and service handling standards.',
    lessons: telecomLessons,
  }
};

export const quizzes: Quiz[] = [
    {
        id: 'week1_quiz',
        title: 'Week 1 Quiz',
        description: 'Test your knowledge on Core Communication & Listening Skills.',
    },
    {
        id: 'week2_quiz',
        title: 'Week 2 Quiz',
        description: 'Test your knowledge on Sales Techniques & Objections.',
    },
    {
        id: 'week3_quiz',
        title: 'Week 3 Quiz',
        description: 'Test your knowledge on Global Cultural Etiquette.',
    },
    {
        id: 'final_assessment',
        title: 'Final Assessment',
        description: 'A comprehensive assessment covering all TP Skillence modules.',
    },
    {
        id: 'adaptive_test',
        title: 'Adaptive Proficiency Test',
        description: 'A dynamic 20-question test evaluating your current language and sales profile.',
        isAdaptive: true
    }
];

export const quizModuleMapping: { [quizId: string]: string[] } = {
  'week1_quiz': ['listening', 'speaking'],
  'week2_quiz': ['sales', 'reading', 'airline'],
  'week3_quiz': ['global_culture', 'telecom']
};
