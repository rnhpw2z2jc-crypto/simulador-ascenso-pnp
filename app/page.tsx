'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';
import { usePWA } from './usePWA';
import { seedDefaultAdmin, migrateDeviceFields } from '../lib/users';
import { saveExamStat } from '../lib/examStats';
import { useQuestions } from '../components/useQuestions';
import type { ExamConfig, ExamState, ExamResult, User, Question } from '../components/types';

import LoginPage from '../components/LoginPage';
import RegisterPage from '../components/RegisterPage';
import DashboardPage from '../components/DashboardPage';
import ConfigPage from '../components/ConfigPage';
import ExamPage from '../components/ExamPage';
import ResultsPage from '../components/ResultsPage';
import HistoryPage from '../components/HistoryPage';
import AdminPage from '../components/AdminPage';
import ProfilePage from '../components/ProfilePage';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'login' | 'register' | 'dashboard' | 'config' | 'exam' | 'results' | 'history' | 'admin' | 'profile'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const { isInstallable, install, hasUpdate, applyUpdate } = usePWA();
  const { questions, loading: questionsLoading, seeding, seedProgress } = useQuestions();

  useEffect(() => {
    seedDefaultAdmin().catch(() => {});
    migrateDeviceFields().catch(() => {});
    const savedUser = localStorage.getItem('simulador_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentPage('dashboard');
    }
  }, []);

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

  const startExam = (config: ExamConfig) => {
    setExamConfig(config);
    setCurrentPage('config');
  };

  const startReinforcement = () => {
    const failedIds: number[] = JSON.parse(localStorage.getItem('simulador_failed_ids') || '[]');
    if (failedIds.length === 0) return false;
    const failedQuestions = questions.filter(q => failedIds.includes(q.id));
    if (failedQuestions.length === 0) return false;
    const timeLimit = Math.ceil(failedQuestions.length * 1.5) * 60;
    beginExam(failedQuestions, timeLimit);
    return true;
  };

  const beginExam = (qs: Question[], timeLimit: number) => {
    setExamQuestions(qs);
    setExamState({
      currentQuestion: 0,
      answers: new Array(qs.length).fill(null),
      bookmarks: new Array(qs.length).fill(false),
      timeRemaining: timeLimit,
      startTime: Date.now(),
      isFinished: false,
    });
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
    const existingFailed: number[] = JSON.parse(localStorage.getItem('simulador_failed_ids') || '[]');
    const mergedFailed = Array.from(new Set([...existingFailed, ...failedIds]));
    localStorage.setItem('simulador_failed_ids', JSON.stringify(mergedFailed));
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

  if (questionsLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-tactical-blue/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-tactical-blue-light" />
          </div>
          {seeding ? (
            <>
              <p className="text-white font-semibold mb-2">Preparando banco de preguntas...</p>
              <p className="text-slate-400 text-sm">{seedProgress.current} / {seedProgress.total}</p>
              <div className="w-64 h-2 bg-navy-800 rounded-full mt-3 mx-auto overflow-hidden">
                <div 
                  className="h-full bg-tactical-blue rounded-full transition-all duration-300"
                  style={{ width: `${seedProgress.total > 0 ? (seedProgress.current / seedProgress.total) * 100 : 0}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Cargando...</span>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
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
            onStartExam={startExam}
            onStartReinforcement={startReinforcement}
            onViewHistory={() => setCurrentPage('history')}
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
  );
}
