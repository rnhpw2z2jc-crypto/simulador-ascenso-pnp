export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  explanation: string;
  legalBasis?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  email: string;
  role: 'admin' | 'user';
  membershipExpiry: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'blocked';
  devices: string[];
  maxDevices: number;
}

export interface ExamConfig {
  numQuestions: number;
  categories: string[];
}

export interface ExamState {
  currentQuestion: number;
  answers: (number | null)[];
  bookmarks: boolean[];
  timeRemaining: number;
  startTime: number;
  isFinished: boolean;
  isPaused: boolean;
}

export interface ExamResult {
  id: string;
  date: string;
  config: ExamConfig;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeUsed: number;
  answers: (number | null)[];
  questions: Question[];
}
