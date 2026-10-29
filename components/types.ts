export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  explanation: string;
  legalBasis?: string;
}

export interface UserFeatures {
  /** Audio Tactico: escuchar las preguntas por temas */
  audio?: boolean;
}

export interface User {
  id: string;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  role: 'admin' | 'user';
  membershipExpiry: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'blocked';
  devices: string[];
  maxDevices: number;
  features?: UserFeatures;
  online?: boolean;
  lastSeen?: number | null;
}

/** El audio es un complemento del plan. El admin siempre puede probarlo. */
export function hasAudioAccess(user: Pick<User, 'role' | 'features'> | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin' || !!user.features?.audio;
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
