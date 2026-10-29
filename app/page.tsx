'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, Loader2, Clock } from 'lucide-react';
import { usePWA } from './usePWA';
import { seedDefaultAdmin, migrateDeviceFields, getUserByUsername, updateUser } from '../lib/users';
import { saveExamStat } from '../lib/examStats';
import { useQuestions } from '../components/useQuestions';
import { useSessionTimeout } from '../lib/useSessionTimeout';
import { safeGetJSON, safeSetJSON, safeRemove } from '../lib/storage';
import ErrorBoundary from '../components/ErrorBoundary';
import { hasAudioAccess } from '../components/types';
import type { FeatureMode } from '../components/DashboardPage';
import type { ThemeMode, ThemeSelection } from '../components/ThemeSelectPage';
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
const RecognitionPage = dynamic(() => import('../components/RecognitionPage'), { ssr: false });
const AudioTacticoPage = dynamic(() => import('../components/AudioTacticoPage'), { ssr: false });
const ThemeSelectPage = dynamic(() => import('../components/ThemeSelectPage'), { ssr: false });

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
  const [currentPage, setCurrentPage] = useState<'login' | 'register' | 'dashboard' | 'themes' | 'config' | 'exam' | 'results' | 'history' | 'admin' | 'profile' | 'analytics' | 'recognition' | 'audio'>('login');
  const [themeMode, setThemeMode] = useState<ThemeMode>('simulacro');
  const [audioCategory, setAudioCategory] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [recognitionQuestions, setRecognitionQuestions] = useState<Question[]>([]);
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
      safeRemove('simulador_user');
      safeRemove('simulador_last_activity');
      setSessionExpired(false);
      setCurrentPage('login');
    }, 3000);
  }, []);

  useSessionTimeout(!!user && !sessionExpired, handleSessionTimeout, !!examState?.isPaused);

  useEffect(() => {
    seedDefaultAdmin().catch(() => {});
    migrateDeviceFields().catch(() => {});
    const parsed = safeGetJSON<{ state: ExamState; questions: Question[] } | null>(EXAM_STORAGE_KEY, null);
    if (parsed && parsed.state && !parsed.state.isFinished && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      setPausedExam(parsed);
    } else if (parsed) {
      safeRemove(EXAM_STORAGE_KEY);
    }
    const savedUser = safeGetJSON<User | null>('simulador_user', null);
    if (savedUser) {
      setUser(savedUser);
      setCurrentPage('dashboard');
    }
    const hist = safeGetJSON<ExamResult[]>('simulador_history', []);
    if (hist.length > 40) {
      safeSetJSON('simulador_history', hist.slice(-40));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    const heartbeat = async () => {
      try {
        await updateUser({ id: uid, online: true, lastSeen: Date.now() });
      } catch {}
    };
    heartbeat();
    const iv = setInterval(heartbeat, 60000);
    const goOffline = () => {
      try { updateUser({ id: uid, online: false }); } catch {}
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') goOffline();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', goOffline);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!examState) {
      safeRemove(EXAM_STORAGE_KEY);
      setPausedExam(null);
      return;
    }
    if (examState.isFinished) {
      safeRemove(EXAM_STORAGE_KEY);
      setPausedExam(null);
      return;
    }
    safeSetJSON(EXAM_STORAGE_KEY, { state: examState, questions: examQuestions });
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
            const { password: _, ...safeFresh } = fresh as unknown as Record<string, unknown>;
            const userData = { ...safeFresh, id: fresh.id } as unknown as User;
            setUser(userData);
            safeSetJSON('simulador_user', userData);
          }
        } catch {}
      }, 60000);
    }
    return () => { if (userRefreshRef.current) clearInterval(userRefreshRef.current); };
  }, [user?.username, sessionExpired, handleSessionTimeout]);

  const handleLogin = (userData: User) => {
    const { password: _, ...safeData } = userData as unknown as Record<string, unknown>;
    const safeUser = safeData as unknown as User;
    if (safeUser.membershipExpiry && new Date(safeUser.membershipExpiry) < new Date()) {
      safeUser.status = 'expired';
    }
    if (safeUser.status === 'blocked') {
      return;
    }
    setUser(safeUser);
    safeSetJSON('simulador_user', safeUser);
    try { sessionStorage.setItem('simulador_motiv_show', '1'); } catch {}
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    safeRemove('simulador_user');
    setCurrentPage('login');
  };

  const refreshUserData = useCallback(async (username: string) => {
    try {
      const fresh = await getUserByUsername(username);
      if (fresh) {
        if (fresh.membershipExpiry && new Date(fresh.membershipExpiry) < new Date()) {
          fresh.status = 'expired';
        }
        const { password: _, ...safeFresh } = fresh as unknown as Record<string, unknown>;
        const userData = { ...safeFresh, id: fresh.id } as unknown as User;
        setUser(userData);
        safeSetJSON('simulador_user', userData);
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
    const failedIds = safeGetJSON<number[]>('simulador_failed_ids', []);
    if (failedIds.length === 0) return false;
    const failedQuestions = questions.filter(q => failedIds.includes(q.id));
    if (failedQuestions.length === 0) return false;
    safeRemove('simulador_failed_ids');
    const timeLimit = Math.ceil(failedQuestions.length * 1.5) * 60;
    beginExam(failedQuestions, timeLimit);
    return true;
  };

  const beginExam = (qs: Question[], timeLimit: number) => {
    safeRemove(EXAM_STORAGE_KEY);
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

  const startRecognition = (category: string | null) => {
    const filtered = category
      ? questions.filter(q => q.category === category)
      : questions;
    setRecognitionQuestions(filtered);
    setCurrentPage('recognition');
  };

  const resumeExam = () => {
    if (!pausedExam) return;
    setExamQuestions(pausedExam.questions);
    setExamState({ ...pausedExam.state, isPaused: false });
    setCurrentPage('exam');
  };

  const finishExam = (result: ExamResult) => {
    setCurrentResult(result);
    const failedIds: number[] = result.questions
      .filter((q, i) => result.answers[i] !== q.correctAnswer)
      .map(q => q.id);
    if (user) {
      saveExamStat({
        userId: user.id,
        username: user.username,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        failedQuestionIds: failedIds,
      }).catch(() => {});
    }
    try {
      safeSetJSON('simulador_failed_ids', failedIds);
      const history = safeGetJSON<ExamResult[]>('simulador_history', []);
      history.push(result);
      safeSetJSON('simulador_history', history.slice(-40));
    } catch {
      // si el almacenamiento falla (cuota llena/modo privado), igual se muestra el resultado
    }
    setCurrentPage('results');
  };

  if (questionsLoading && (currentPage === 'themes' || currentPage === 'config' || currentPage === 'exam' || currentPage === 'dashboard' || currentPage === 'audio')) {
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
            onBack={() => setCurrentPage('login')} 
          />
        )}
        {currentPage === 'dashboard' && user && (
          <DashboardPage 
            key="dashboard"
            user={user} 
            questions={questions}
            onRefreshUser={refreshUserData}
            onPickMode={(mode: FeatureMode) => {
              setThemeMode(mode);
              setCurrentPage('themes');
            }}
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
        {currentPage === 'themes' && user && (
          <ThemeSelectPage
            key="themes"
            mode={themeMode}
            questions={questions}
            onBack={() => setCurrentPage('dashboard')}
            onConfirm={(selection: ThemeSelection) => {
              if (themeMode === 'simulacro') {
                startExam({ numQuestions: selection.numQuestions, categories: selection.categories });
                return;
              }
              if (themeMode === 'recognition') {
                startRecognition(selection.category);
                return;
              }
              setAudioCategory(selection.category);
              setCurrentPage('audio');
            }}
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
            onExit={() => {
              setExamState(prev => prev ? { ...prev, isPaused: true } : prev);
              setCurrentPage('dashboard');
            }}
          />
        )}
        {currentPage === 'recognition' && (
          <RecognitionPage
            key="recognition"
            questions={recognitionQuestions}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'audio' && user && hasAudioAccess(user) && (
          <AudioTacticoPage
            key="audio"
            questions={questions}
            initialCategory={audioCategory}
            onChangeTheme={() => setCurrentPage('themes')}
            onBack={() => setCurrentPage('dashboard')}
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
            onUpdate={(updated) => {
              const { password: _, ...safeUpdated } = updated as unknown as Record<string, unknown>;
              const safeUser = safeUpdated as unknown as User;
              setUser(safeUser);
              safeSetJSON('simulador_user', safeUser);
            }}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
