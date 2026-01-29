
import React from 'react';
import type { Module, Quiz, Lesson } from '../types';
import { ListeningIcon, SpeakingIcon, ReadingIcon, AirlineIcon, GlobeIcon, PhoneIcon, ChartBarIcon } from '../components/Icons';
import { ResourceType } from '../types';

const listeningLessons: Lesson[] = [
    { title: 'Lufthansa Premium Phonetics', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep50', duration: '15 min', objective: 'Mastering the airline\'s specific greeting and phonetic alphabet usage.' },
    { title: 'Complex Itinerary Active Listening', level: 'B1', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep68', duration: '20 min', objective: 'Handling multi-city bookings and complex schedule changes.' },
    { title: 'Crisis Management & Empathy', level: 'B2', type: ResourceType.Listen, link: 'https://thebusinessenglishpodcast.com/blog-ep15', duration: '25 min', objective: 'De-escalating frustrated passengers during flight delays.' },
];

const cultureLessons: Lesson[] = [
    { title: 'German Business Directness', level: 'All', type: ResourceType.Read, duration: '15 min', objective: 'Understanding "Efficiency First" communication with German travelers.' },
    { title: 'The FORD Method in Travel', level: 'All', type: ResourceType.Read, duration: '10 min', objective: 'Building rapport through Family, Occupation, Recreation, and Dreams.' },
    { title: 'European Dining & Travel Etiquette', level: 'B1', type: ResourceType.Watch, link: 'https://www.youtube.com/watch?v=_kItsPSG4tI', duration: '15 min', objective: 'Nuances of hospitality for premium cabin guests.' },
];

const salesLessons: Lesson[] = [
    { title: 'Upselling Miles & More', level: 'B1', type: ResourceType.Practice, duration: '20 min', objective: 'Demonstrating the value of the loyalty program to infrequent flyers.' },
    { title: 'The Premium Economy Pivot', level: 'B2', type: ResourceType.Watch, duration: '12 min', objective: 'Converting Economy passengers to Premium Economy using value-based selling.' },
    { title: 'Handling Cost Objections', level: 'B1', type: ResourceType.Practice, duration: '15 min', objective: 'Turning price resistance into a benefit-focused conversation.' },
];

const airlineLessons: Lesson[] = [
    { title: 'Star Alliance Network Mastery', level: 'B1', type: ResourceType.Watch, link: 'https://www.youtube.com/shorts/Ugwy4Q2143s', duration: '10 min', objective: 'Understanding codeshare agreements and lounge access rules.' },
    { title: 'IATA Airport Codes & Geography', level: 'A2', type: ResourceType.Practice, duration: '20 min', objective: 'Memorizing key European hubs and transit times.' },
];

export const allTrainingModules: { [id: string]: Module } = {
  airline: {
    id: 'airline',
    title: 'Lufthansa Standards',
    icon: React.createElement(AirlineIcon),
    description: 'Master the technical specifics of the Lufthansa fleet and service standards.',
    lessons: airlineLessons,
  },
  global_culture: {
    id: 'global_culture',
    title: 'Cultural Intelligence',
    icon: React.createElement(GlobeIcon),
    description: "Bridging the gap between Middle Eastern hospitality and European expectations.",
    lessons: cultureLessons,
  },
  sales: {
    id: 'sales',
    title: 'Travel Sales & Upselling',
    icon: React.createElement(ChartBarIcon),
    description: 'Transform support calls into revenue-generating opportunities.',
    lessons: salesLessons,
  },
  listening: {
    id: 'listening',
    title: 'Active Listening',
    icon: React.createElement(ListeningIcon),
    description: 'Precision listening for complex passenger requests and emotions.',
    lessons: listeningLessons,
  }
};

export const quizzes: Quiz[] = [
    {
        id: 'lufthansa_core',
        title: 'Lufthansa Core Proficiency',
        description: 'Testing technical airline knowledge and service etiquette.',
    },
    {
        id: 'sales_mastery',
        title: 'Premium Sales Assessment',
        description: 'Evaluating upselling techniques and objection handling.',
    }
];
