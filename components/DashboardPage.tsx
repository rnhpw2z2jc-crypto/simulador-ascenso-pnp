'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Settings, User, LogOut, FileText, Target, Trophy, Clock, 
  Hash, BookMarked, Zap, BookOpen, Award, Check, Play, ArrowRight, 
  BarChart3, Brain, Download, AlertTriangle, TrendingUp, Compass 
} from 'lucide-react';
import { getCategoryKey, getCategoryDisplayName } from '../lib/categoryUtils';
import type { User as UserType, ExamConfig, ExamResult, Question, ExamState } from './types';

export default function DashboardPage({ user, questions, onRefreshUser, onStartExam, onStartReinforcement, onStartRecognition, onViewHistory, onGoAnalytics, onLogout, onGoAdmin, onGoProfile, isInstallable, onInstall, hasUpdate, onApplyUpdate, pausedExam, onResumeExam }: {
  user: UserType;
  questions: Question[];
  onRefreshUser: (username: string) => Promise<void>;
  onStartExam: (config: ExamConfig) => void;
  onStartReinforcement: () => boolean;
  onStartRecognition: (category: string | null) => void;
  onViewHistory: () => void;
  onGoAnalytics: () => void;
  onLogout: () => void;
  onGoAdmin: () => void;
  onGoProfile: () => void;
  isInstallable: boolean;
  onInstall: () => void;
  hasUpdate: boolean;
  onApplyUpdate: () => void;
  pausedExam: { state: ExamState; questions: Question[] } | null;
  onResumeExam: () => void;
}) {
  const [selectedQuestions, setSelectedQuestions] = useState(50);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [failedCount, setFailedCount] = useState(0);
  const [recognitionCategory, setRecognitionCategory] = useState<string | null>(null);

  useEffect(() => {
    const failedIds: number[] = JSON.parse(localStorage.getItem('simulador_failed_ids') || '[]');
    setFailedCount(failedIds.length);
  }, []);

  useEffect(() => {
    onRefreshUser(user.username);
  }, [user.username, onRefreshUser]);

  const history = JSON.parse(localStorage.getItem('simulador_history') || '[]');
  const totalExams = history.length;
  const avgScore = totalExams > 0 
    ? Math.round(history.reduce((sum: number, r: ExamResult) => sum + (r.score / r.totalQuestions * 100), 0) / totalExams)
    : 0;
  const bestScore = totalExams > 0
    ? Math.max(...history.map((r: ExamResult) => Math.round(r.score / r.totalQuestions * 100)))
    : 0;
  const studyHours = totalExams > 0
    ? Math.round(history.reduce((sum: number, r: ExamResult) => sum + r.timeUsed, 0) / 3600 * 10) / 10
    : 0;

  const availableCategories = Array.from(new Set(questions.map(q => q.category)));

  const toggleCategory = (cat: string) => {
    if (cat === 'all') {
      setSelectedCategories(['all']);
    } else {
      const newCats = selectedCategories.filter(c => c !== 'all');
      if (newCats.includes(cat)) {
        const filtered = newCats.filter(c => c !== cat);
        setSelectedCategories(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedCategories([...newCats, cat]);
      }
    }
  };

  const handleStart = () => {
    onStartExam({
      numQuestions: selectedQuestions,
      categories: selectedCategories.includes('all') ? availableCategories : selectedCategories,
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-tactical-blue-light" />
            </div>
            <div>
              <h1 className="font-bold text-white">SIMULADOR <span className="text-gold">PNP</span></h1>
              <p className="text-xs text-slate-400">Examen de Ascenso</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user.nombre} {user.apellido}</p>
              <p className="text-xs text-slate-400">{user.email || user.username}</p>
            </div>
            {user.role === 'admin' && (
              <button onClick={onGoAdmin} className="p-2 text-slate-400 hover:text-gold transition-colors" title="Panel de Administración">
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button onClick={onGoProfile} className="p-2 text-slate-400 hover:text-tactical-blue-light transition-colors" title="Mi Perfil">
              <User className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-danger transition-colors" title="Cerrar Sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bienvenido, <span className="text-gold">{user.apellido}</span>
          </h2>
          <p className="text-slate-400">Prepárate para tu examen de ascenso con nuestra plataforma de simulación</p>
          
          {user.membershipExpiry && (() => {
            const remainingMs = new Date(user.membershipExpiry).getTime() - Date.now();
            const remainingDays = Math.ceil(remainingMs / 86400000);
            const expired = remainingMs <= 0;
            if (expired) {
              return (
                <div className="mt-4 p-4 bg-danger/20 border border-danger/50 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0" />
                  <div>
                    <p className="text-danger font-semibold">Membresia expirada</p>
                    <p className="text-sm text-slate-400">Tu acceso ha expirado. Contacta al administrador para renovar.</p>
                  </div>
                </div>
              );
            } else if (remainingDays <= 1) {
              const remainingH = Math.max(1, Math.ceil(remainingMs / 3600000));
              return (
                <div className="mt-4 p-4 bg-warning/20 border border-warning/50 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
                  <div>
                    <p className="text-warning font-semibold">Membresia por vencer</p>
                    <p className="text-sm text-slate-400">Tu membresia vence en {remainingH}h. Contacta al administrador.</p>
                  </div>
                </div>
              );
            } else if (remainingDays <= 7) {
              return (
                <div className="mt-4 p-4 bg-warning/20 border border-warning/50 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
                  <div>
                    <p className="text-warning font-semibold">Membresia por vencer</p>
                    <p className="text-sm text-slate-400">Tu membresia vence en {remainingDays} dia{remainingDays !== 1 ? 's' : ''} ({new Date(user.membershipExpiry).toLocaleDateString('es-PE')})</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {pausedExam && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-gold/20 border border-gold/50 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-gold font-semibold text-sm">Examen en pausa</p>
                  <p className="text-xs text-slate-400">Tienes un examen sin terminar ({pausedExam.questions.length} preguntas). Continualo cuando quieras.</p>
                </div>
              </div>
              <button onClick={onResumeExam} className="px-4 py-2 bg-gold hover:bg-gold/80 text-navy-900 text-sm font-medium rounded-lg transition-colors flex-shrink-0">
                Continuar
              </button>
            </motion.div>
          )}

          {hasUpdate && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-gold/20 border border-gold/50 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/30 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-gold font-semibold text-sm">Actualizacion disponible</p>
                  <p className="text-xs text-slate-400">Nueva version del simulador lista</p>
                </div>
              </div>
              <button onClick={onApplyUpdate} className="px-4 py-2 bg-gold hover:bg-gold/80 text-navy-900 text-sm font-medium rounded-lg transition-colors flex-shrink-0">
                Actualizar
              </button>
            </motion.div>
          )}

          {isInstallable && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-tactical-blue/20 border border-tactical-blue/50 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-tactical-blue/30 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-tactical-blue-light" />
                </div>
                <div>
                  <p className="text-tactical-blue-light font-semibold text-sm">Instalar App</p>
                  <p className="text-xs text-slate-400">Descarga el simulador en tu celular</p>
                </div>
              </div>
              <button onClick={onInstall} className="px-4 py-2 bg-tactical-blue hover:bg-tactical-blue-dark text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0">
                Instalar
              </button>
            </motion.div>
          )}
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-tactical-blue-light" />
              </div>
              <span className="text-sm text-slate-400">Exámenes</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalExams}</p>
            <p className="text-xs text-slate-500 mt-1">Realizados</p>
          </div>
          <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-gold" />
              </div>
              <span className="text-sm text-slate-400">Promedio</span>
            </div>
            <p className="text-3xl font-bold text-white">{avgScore}%</p>
            <p className="text-xs text-slate-500 mt-1">Aciertos</p>
          </div>
          <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm text-slate-400">Mejor</span>
            </div>
            <p className="text-3xl font-bold text-white">{bestScore}%</p>
            <p className="text-xs text-slate-500 mt-1">Puntuación</p>
          </div>
          <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-danger" />
              </div>
              <span className="text-sm text-slate-400">Estudio</span>
            </div>
            <p className="text-3xl font-bold text-white">{studyHours}h</p>
            <p className="text-xs text-slate-500 mt-1">Tiempo total</p>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-gold" />
              Cantidad de Preguntas
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 10, label: 'Quiz Rápido', time: '15 min', icon: Zap },
                { value: 50, label: 'Práctica', time: '75 min', icon: BookOpen },
                { value: 100, label: 'Examen Oficial', time: '150 min', icon: Award }
              ].map((opt) => (
                <button key={opt.value} onClick={() => setSelectedQuestions(opt.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    selectedQuestions === opt.value
                      ? 'border-tactical-blue bg-tactical-blue/20'
                      : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                  }`}>
                  <opt.icon className={`w-6 h-6 mb-2 mx-auto ${selectedQuestions === opt.value ? 'text-tactical-blue-light' : 'text-slate-400'}`} />
                  <p className="text-sm font-medium text-white">{opt.value}</p>
                  <p className="text-xs text-slate-400">{opt.label}</p>
                  <p className="text-xs text-gold mt-1">{opt.time}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-gold" />
              Temas del Examen
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <button onClick={() => toggleCategory('all')}
                className={`w-full p-3 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                  selectedCategories.includes('all')
                    ? 'border-tactical-blue bg-tactical-blue/20'
                    : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                }`}>
                <span className="text-sm font-medium text-white">Todos los Temas</span>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedCategories.includes('all') ? 'border-tactical-blue bg-tactical-blue' : 'border-slate-500'
                }`}>
                  {selectedCategories.includes('all') && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
              {availableCategories.map((cat) => {
                const questionCount = questions.filter(q => q.category === cat).length;
                return (
                  <button key={cat} onClick={() => toggleCategory(cat)}
                    className={`w-full p-3 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                      selectedCategories.includes(cat)
                        ? 'border-tactical-blue bg-tactical-blue/20'
                        : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                    }`}>
                    <div className="flex-1 text-left">
                      <span className="text-sm text-white block">{getCategoryDisplayName(getCategoryKey(cat))}</span>
                      <span className="text-xs text-slate-500">{questionCount} preguntas</span>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedCategories.includes(cat) ? 'border-tactical-blue bg-tactical-blue' : 'border-slate-500'
                    }`}>
                      {selectedCategories.includes(cat) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mb-8">
          <button onClick={handleStart}
            className="flex-1 py-4 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-bold text-lg rounded-xl transition-all duration-300 btn-glow flex items-center justify-center gap-3">
            <Play className="w-6 h-6" />
            INICIAR SIMULADOR
            <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={onViewHistory}
            className="px-8 py-4 bg-navy-800 hover:bg-navy-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Ver Historial
          </button>
          <button onClick={onGoAnalytics}
            className="px-8 py-4 bg-navy-800 hover:bg-navy-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Analytics
          </button>
        </motion.div>

        {failedCount > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.32 }}
            className="mb-8">
            <button onClick={() => {
              if (!onStartReinforcement()) {
                localStorage.removeItem('simulador_failed_ids');
                setFailedCount(0);
              }
            }}
              className="w-full py-4 bg-gradient-to-r from-warning/20 to-gold/20 hover:from-warning/30 hover:to-gold/30 border border-warning/50 text-white font-bold text-lg rounded-xl transition-all duration-300 flex items-center justify-center gap-3">
              <Brain className="w-6 h-6 text-gold" />
              REFORZAMIENTO TACTICO 🔁🔥🧠
              <span className="px-3 py-1 bg-danger/30 text-danger text-sm font-bold rounded-full">{failedCount}</span>
            </button>
            <p className="text-xs text-slate-500 text-center mt-2">
              Repasa las {failedCount} pregunta{failedCount !== 1 ? 's' : ''} que fallaste en examenes anteriores
            </p>
          </motion.div>
        )}

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.33 }}
          className="mb-8">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-tactical-blue/25 flex items-center justify-center">
                  <span className="text-2xl">🔭</span>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">RECONOCIMIENTO TACTICO</h2>
                  <p className="text-xs text-slate-400">Selecciona el tema o norma legal a repasar</p>
                </div>
              </div>
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-tactical-blue/20 border border-tactical-blue/40 text-tactical-blue-light text-sm font-medium rounded-lg">
                <Compass className="w-4 h-4" /> {recognitionCategory ? getCategoryDisplayName(getCategoryKey(recognitionCategory)) : 'Todos'} · {recognitionCategory
                  ? questions.filter(q => q.category === recognitionCategory).length
                  : questions.length} preguntas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button onClick={() => setRecognitionCategory(null)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                  recognitionCategory === null
                    ? 'border-tactical-blue bg-tactical-blue/20 shadow-lg shadow-tactical-blue/20'
                    : 'border-navy-700 bg-navy-800/50 hover:border-navy-500 hover:bg-navy-800'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-tactical-blue to-tactical-blue-dark flex items-center justify-center text-lg">📚</span>
                  {recognitionCategory === null && <Check className="w-5 h-5 text-tactical-blue-light" />}
                </div>
                <p className="font-semibold text-white text-sm leading-tight">Todos los Temas</p>
                <p className="text-xs text-slate-400 mt-1">{questions.length} preguntas</p>
              </button>
              {availableCategories.map((cat) => {
                const count = questions.filter(q => q.category === cat).length;
                const isActive = recognitionCategory === cat;
                return (
                  <button key={cat} onClick={() => setRecognitionCategory(cat)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                      isActive
                        ? 'border-tactical-blue bg-tactical-blue/20 shadow-lg shadow-tactical-blue/20'
                        : 'border-navy-700 bg-navy-800/50 hover:border-navy-500 hover:bg-navy-800'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center text-lg">⚖️</span>
                      {isActive && <Check className="w-5 h-5 text-tactical-blue-light" />}
                    </div>
                    <p className="font-semibold text-white text-sm leading-tight">{getCategoryDisplayName(getCategoryKey(cat))}</p>
                    <p className="text-xs text-slate-400 mt-1">{count} preguntas</p>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={() => onStartRecognition(recognitionCategory)}
            disabled={questions.length === 0}
            className="mt-4 w-full py-4 bg-gradient-to-r from-tactical-blue to-tactical-blue-dark hover:opacity-90 border border-tactical-blue-light/40 text-white font-bold text-lg rounded-xl transition-all duration-300 btn-glow flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="text-2xl">🔭</span>
            INICIAR RECONOCIMIENTO
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-xs text-slate-500 text-center mt-2">
            Revisa y responde por tema o norma, sin presion de tiempo, con retroalimentacion inmediata
          </p>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Target className="w-5 h-5 text-gold" />
              Simulacro Completo por Tema
            </h3>
            <p className="text-xs text-slate-500 mb-4">Todas las preguntas de un solo tema. Tiempo: 1.5 min por pregunta</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableCategories.map((cat) => {
                const count = questions.filter(q => q.category === cat).length;
                const timeMin = Math.ceil(count * 1.5);
                return (
                  <button key={cat}
                    onClick={() => onStartExam({ numQuestions: count, categories: [cat] })}
                    className="p-3 rounded-xl border border-navy-700 bg-navy-800/50 hover:border-gold hover:bg-gold/5 transition-all duration-300 text-left group">
                    <span className="text-sm font-medium text-white group-hover:text-gold block">{getCategoryDisplayName(getCategoryKey(cat))}</span>
                    <span className="text-xs text-slate-500">{count} preguntas</span>
                    <span className="text-xs text-gold/70 ml-2">{timeMin >= 60 ? `${Math.floor(timeMin/60)}h ${timeMin%60}m` : `${timeMin}m`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
