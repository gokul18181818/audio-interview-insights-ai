export interface DesignPhase {
  id: string;
  name: string;
  duration: number; // minutes
  description: string;
  guidingQuestions: string[];
  completionCriteria: string[];
  aiPrompt: string;
}

export interface SystemDesignSession {
  id: string;
  interview_session_id: string;
  problem_statement: string;
  current_phase: string;
  phase_timings: Record<string, number>;
  whiteboard_snapshots: WhiteboardSnapshot[];
  requirements_gathered: Record<string, any>;
  ai_feedback_history: AIFeedback[];
  created_at: string;
  updated_at: string;
}

export interface WhiteboardSnapshot {
  id: string;
  timestamp: number;
  image_data: string;
  elements_data: any;
  phase: string;
}

export interface AIFeedback {
  id: string;
  timestamp: number;
  phase: string;
  feedback_text: string;
  diagram_analysis: string;
  transcript: string;
  suggestions: string[];
}

export interface DesignRequirement {
  key: string;
  question: string;
  type: 'scale' | 'feature' | 'constraint' | 'performance';
  value?: string;
  importance: 'high' | 'medium' | 'low';
}

export const MVP_DESIGN_PHASES: DesignPhase[] = [
  {
    id: 'requirements',
    name: 'Requirements Clarification',
    duration: 8,
    description: 'Understand the problem scope, scale, and constraints',
    guidingQuestions: [
      'How many URLs do we need to shorten per day?',
      'What is the expected read/write ratio?',
      'Do we need custom aliases?',
      'How long should URLs be stored?',
      'Do we need analytics on URL clicks?',
      'What are the latency requirements?'
    ],
    completionCriteria: [
      'Scale defined (users, requests per day)',
      'Key features identified',
      'Performance constraints understood',
      'Storage requirements clarified'
    ],
    aiPrompt: 'Focus on whether the candidate is asking the right clarifying questions and gathering appropriate requirements for scale, features, and constraints. Evaluate if they understand the scope.'
  },
  {
    id: 'architecture',
    name: 'High-Level Design',
    duration: 15,
    description: 'Design the core system architecture and data flow',
    guidingQuestions: [
      'What are the main services needed?',
      'How will data flow through the system?',
      'What does the API look like?',
      'How will we store the URL mappings?',
      'What about the database schema?',
      'How do clients interact with the system?'
    ],
    completionCriteria: [
      'API endpoints defined',
      'Database schema outlined',
      'Major services identified',
      'Data flow documented'
    ],
    aiPrompt: 'Evaluate the high-level architecture design. Look for appropriate service breakdown, API design, and data flow. Check if the design matches the requirements gathered.'
  },
  {
    id: 'scaling',
    name: 'Scale & Optimize',
    duration: 12,
    description: 'Address scalability, performance, and reliability concerns',
    guidingQuestions: [
      'How do we handle millions of requests?',
      'What about caching strategies?',
      'How do we ensure high availability?',
      'What could be potential bottlenecks?',
      'How do we handle database scaling?',
      'What about geographic distribution?'
    ],
    completionCriteria: [
      'Caching strategy defined',
      'Load balancing considered',
      'Database scaling addressed',
      'Bottlenecks identified and solved'
    ],
    aiPrompt: 'Assess scalability solutions including caching, load balancing, database scaling, and performance optimizations. Look for understanding of distributed systems concepts.'
  }
];

export const URL_SHORTENER_PROBLEM = {
  title: "Design a URL Shortener (like bit.ly)",
  description: "Design a web service that can shorten long URLs and redirect users to the original URL when they access the shortened link.",
  difficulty: 'intermediate',
  expectedDuration: 35,
  keyAreas: ['API Design', 'Database Schema', 'Caching', 'Scaling'],
  sampleRequirements: {
    scale: '100M URLs shortened per day',
    readWriteRatio: '100:1',
    urlLength: '7 characters',
    customAliases: 'Optional',
    analytics: 'Basic click tracking'
  }
};

export const REQUIREMENTS_TEMPLATE: DesignRequirement[] = [
  {
    key: 'daily_urls',
    question: 'How many URLs are shortened per day?',
    type: 'scale',
    importance: 'high'
  },
  {
    key: 'read_write_ratio',
    question: 'What is the read to write ratio?',
    type: 'scale',
    importance: 'high'
  },
  {
    key: 'url_length',
    question: 'How long should the shortened URL be?',
    type: 'feature',
    importance: 'medium'
  },
  {
    key: 'custom_aliases',
    question: 'Do we need to support custom aliases?',
    type: 'feature',
    importance: 'medium'
  },
  {
    key: 'expiration',
    question: 'Should URLs expire after a certain time?',
    type: 'feature',
    importance: 'low'
  },
  {
    key: 'analytics',
    question: 'Do we need click analytics and tracking?',
    type: 'feature',
    importance: 'medium'
  },
  {
    key: 'latency',
    question: 'What are the latency requirements?',
    type: 'performance',
    importance: 'high'
  },
  {
    key: 'availability',
    question: 'What availability do we need (99.9%, 99.99%)?',
    type: 'performance',
    importance: 'high'
  }
]; 