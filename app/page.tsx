'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, Loader2, Clock } from 'lucide-react';
import { usePWA } from './usePWA';
import { seedDefaultAdmin, migrateDeviceFields, getUserByUsername } from '../lib/users';
import { saveExamStat } from '../lib/examStats';
import { useQuestions } from '../components/useQuestions';
import { useSessionTimeout } from '../lib/useSessionTimeout';
import ErrorBoundary from '../components/ErrorBoundary';
import type { ExamConfig, ExamState, ExamResult, User, Question } from '../components/types';

const LoginPage = dynamic(() => import('../components/LoginPage'), { ssr: false, loading: () => <SplashLoader /> });
const RegisterPage = dynamic(() => import('../components/RegisterPage'), { ssr: false });
const DashboardPage = dynamic(() => import('../components/DashboardPage'), { ssr: false });
const ConfigPage = dynamic(() => import('../components/ConfigPage'), { ssr: false });
const ExamPage = dynamic(() => import('../components/ExamPage'), { ssr: false });
const ResultsPage = dynamic(() => import('../components/ResultsPage'), { ssr: false });
const HistoryPage = dynamic(() => import('../components/HistoryPage'), { ssr: false });
const AdminPage = dynamic(() => import('../components/AdminPage'), { ssr: false });
const ProfilePage = dynamic(() => import('../components/ProfilePage'), { ssr: false });
const AnalyticsPage = dynamic(() => import('../components/AnalyticsPage'), { ssr: false });

function SplashLoader() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="w-20 h-20 rounded-full bg-tactical-blue/20 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-tactical-blue-light" />
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cargando...</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'login' | 'register' | 'dashboard' | 'config' | 'exam' | 'results' | 'history' | 'admin' | 'profile' | 'analytics'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const { isInstallable, install, hasUpdate, applyUpdate } = usePWA();
  const { questions, loading: questionsLoading } = useQuestions();
  const [sessionExpired, setSessionExpired] = useState(false);
  const userRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pausedExam, setPausedExam] = useState<{ state: ExamState; questions: Question[] } | null>(null);

  const EXAM_STORAGE_KEY = 'simulador_paused_exam';

  const handleSessionTimeout = useCallback(() => {
    setSessionExpired(true);
    setTimeout(() => {
      setUser(null);
      localStorage.removeItem('simulador_user');
      localStorage.removeItem('simulador_last_activity');
      setSessionExpired(false);
      setCurrentPage('login');
    }, 3000);
  }, []);

  useSessionTimeout(!!user && !sessionExpired, handleSessionTimeout);

  useEffect(() => {
    seedDefaultAdmin().catch(() => {});
    migrateDeviceFields().catch(() => {});
    const savedExams = localStorage.getItem(EXAM_STORAGE_KEY);
    if (savedExams) {
      try {
        const parsed = JSON.parse(savedExams) as { state: ExamState; questions: Question[] };
        if (parsed.state && !parsed.state.isFinished && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          setPausedExam(parsed);
        } else {
          localStorage.removeItem(EXAM_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(EXAM_STORAGE_KEY);
      }
    }
    const savedUser = localStorage.getItem('simulador_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentPage('dashboard');
    }
  }, []);

  useEffect(() => {
    if (!examState) {
      localStorage.removeItem(EXAM_STORAGE_KEY);
      setPausedExam(null);
      return;
    }
    if (examState.isFinished) {
      localStorage.removeItem(EXAM_STORAGE_KEY);
      setPausedExam(null);
      return;
    }
    localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify({ state: examState, questions: examQuestions }));
    setPausedExam(examState.isPaused ? { state: examState, questions: examQuestions } : null);
  }, [examState, examQuestions]);

  useEffect(() => {
    if (user && !sessionExpired) {
      userRefreshRef.current = setInterval(async () => {
        try {
          const fresh = await getUserByUsername(user.username);
          if (fresh) {
            if (fresh.status === 'blocked' || fresh.status === 'expired') {
              handleSessionTimeout();
              return;
            }
            if (fresh.membershipExpiry && new Date(fresh.membershipExpiry) < new Date()) {
              fresh.status = 'expired';
            }
            setUser({ ...fresh, id: fresh.id });
            localStorage.setItem('simulador_user', JSON.stringify({ ...fresh, id: fresh.id }));
          }
        } catch {}
      }, 60000);
    }
    return () => { if (userRefreshRef.current) clearInterval(userRefreshRef.current); };
  }, [user?.username, sessionExpired, handleSessionTimeout]);

  const handleLogin = (userData: User) => {
    if (userData.membershipExpiry && new Date(userData.membershipExpiry) < new Date()) {
      userData.status = 'expired';
    }
    if (userData.status === 'blocked') {
      return;
    }
    setUser(userData);
    localStorage.setItem('simulador_user', JSON.stringify(userData));
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('simulador_user');
    setCurrentPage('login');
  };

  const refreshUserData = useCallback(async (username: string) => {
    try {
      const fresh = await getUserByUsername(username);
      if (fresh) {
        if (fresh.membershipExpiry && new Date(fresh.membershipExpiry) < new Date()) {
          fresh.status = 'expired';
        }
        const userData = { ...fresh, id: fresh.id };
        setUser(userData);
        localStorage.setItem('simulador_user', JSON.stringify(userData));
      }
    } catch {
      // silencioso - si falla la consulta, usa datos en cache
    }
  }, []);

  const startExam = (config: ExamConfig) => {
    setExamConfig(config);
    setCurrentPage('config');
  };

  const startReinforcement = () => {
    const failedIds: number[] = JSON.parse(localStorage.getItem('simulador_failed_ids') || '[]');
    if (failedIds.length === 0) return false;
    const failedQuestions = questions.filter(q => failedIds.includes(q.id));
    if (failedQuestions.length === 0) return false;
    localStorage.removeItem('simulador_failed_ids');
    const timeLimit = Math.ceil(failedQuestions.length * 1.5) * 60;
    beginExam(failedQuestions, timeLimit);
    return true;
  };

  const beginExam = (qs: Question[], timeLimit: number) => {
    localStorage.removeItem(EXAM_STORAGE_KEY);
    setPausedExam(null);
    setExamQuestions(qs);
    setExamState({
      currentQuestion: 0,
      answers: new Array(qs.length).fill(null),
      bookmarks: new Array(qs.length).fill(false),
      timeRemaining: timeLimit,
      startTime: Date.now(),
      isFinished: false,
      isPaused: false,
    });
    setCurrentPage('exam');
  };

  const resumeExam = () => {
    if (!pausedExam) return;
    setExamQuestions(pausedExam.questions);
    setExamState(pausedExam.state);
    setCurrentPage('exam');
  };

  const finishExam = (result: ExamResult) => {
    setCurrentResult(result);
    const history = JSON.parse(localStorage.getItem('simulador_history') || '[]');
    history.push(result);
    localStorage.setItem('simulador_history', JSON.stringify(history));
    const failedIds: number[] = result.questions
      .filter((q, i) => result.answers[i] !== q.correctAnswer)
      .map(q => q.id);
    localStorage.setItem('simulador_failed_ids', JSON.stringify(failedIds));
    if (user) {
      saveExamStat({
        userId: user.id,
        username: user.username,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        failedQuestionIds: failedIds,
      }).catch(() => {});
    }
    setCurrentPage('results');
  };

  if (questionsLoading && (currentPage === 'config' || currentPage === 'exam' || currentPage === 'dashboard')) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-tactical-blue/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-tactical-blue-light" />
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Cargando banco de preguntas...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-navy-900">
      <AnimatePresence mode="wait">
        {sessionExpired && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-navy-900/95 flex items-center justify-center">
            <div className="text-center">
              <Clock className="w-12 h-12 text-warning mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Sesion Expirada</h2>
              <p className="text-slate-400 text-sm">Tu sesion ha caducado por inactividad.</p>
              <p className="text-slate-500 text-xs mt-1">Redirigiendo al login...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {currentPage === 'login' && (
          <LoginPage 
            key="login"
            onLogin={handleLogin} 
          />
        )}
        {currentPage === 'register' && (
          <RegisterPage 
            key="register"
            onRegister={handleLogin} 
            onBack={() => setCurrentPage('login')} 
          />
        )}
        {currentPage === 'dashboard' && user && (
          <DashboardPage 
            key="dashboard"
            user={user} 
            questions={questions}
            onRefreshUser={refreshUserData}
            onStartExam={startExam}
            onStartReinforcement={startReinforcement}
            pausedExam={pausedExam}
            onResumeExam={resumeExam}
            onViewHistory={() => setCurrentPage('history')}
            onGoAnalytics={() => setCurrentPage('analytics')}
            onLogout={handleLogout}
            onGoAdmin={() => setCurrentPage('admin')}
            onGoProfile={() => setCurrentPage('profile')}
            isInstallable={isInstallable}
            onInstall={install}
            hasUpdate={hasUpdate}
            onApplyUpdate={applyUpdate}
          />
        )}
        {currentPage === 'config' && examConfig && (
          <ConfigPage 
            key="config"
            config={examConfig}
            questions={questions}
            onStart={beginExam}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'exam' && examState && (
          <ExamPage 
            key="exam"
            questions={examQuestions}
            state={examState}
            setState={setExamState as React.Dispatch<React.SetStateAction<ExamState>>}
            onFinish={finishExam}
          />
        )}
        {currentPage === 'results' && currentResult && (
          <ResultsPage 
            key="results"
            result={currentResult}
            onBack={() => setCurrentPage('dashboard')}
            onStartReinforcement={startReinforcement}
          />
        )}
        {currentPage === 'history' && (
          <HistoryPage 
            key="history"
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'analytics' && (
          <AnalyticsPage 
            key="analytics"
            questions={questions}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'admin' && user && user.role === 'admin' && (
          <AdminPage 
            key="admin"
            currentUser={user}
            questions={questions}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'profile' && user && (
          <ProfilePage 
            key="profile"
            user={user}
            onUpdate={(updated) => { setUser(updated); localStorage.setItem('simulador_user', JSON.stringify(updated)); }}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
