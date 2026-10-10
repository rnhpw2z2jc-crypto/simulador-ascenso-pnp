'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Grid3X3, Flag, AlertTriangle, ChevronLeft, ChevronRight, Pause, Play, LogOut } from 'lucide-react';
import { getCategoryKey, getCategoryDisplayName } from '../lib/categoryUtils';
import type { Question, ExamState, ExamResult } from './types';

export default function ExamPage({ questions: examQuestions, state, setState, onFinish, onExit }: {
  questions: Question[];
  state: ExamState;
  setState: React.Dispatch<React.SetStateAction<ExamState>>;
  onFinish: (result: ExamResult) => void;
  onExit: () => void;
}) {
  const [showNav, setShowNav] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const currentQ = examQuestions[state.currentQuestion];
  const progress = ((state.currentQuestion + 1) / examQuestions.length) * 100;
  const answeredCount = state.answers.filter(a => a !== null).length;
  const bookmarkedCount = state.bookmarks.filter(b => b).length;

  const handleFinish = useCallback(() => {
    if (state.isFinished) return;
    setShowConfirm(false);
    const timeUsed = Math.floor((Date.now() - state.startTime) / 1000);
    let correctAnswers = 0;
    examQuestions.forEach((q, i) => {
      if (state.answers[i] === q.correctAnswer) correctAnswers++;
    });
    const result: ExamResult = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      config: { numQuestions: examQuestions.length, categories: ['mixed'] },
      score: correctAnswers,
      totalQuestions: examQuestions.length,
      correctAnswers,
      timeUsed,
      answers: state.answers,
      questions: examQuestions,
    };
    setState(prev => ({ ...prev, isFinished: true }));
    try {
      onFinish(result);
    } catch {
      // nunca dejar la pantalla trabada si el guardado/planilla falla
    }
  }, [state, examQuestions, onFinish, setState]);

  useEffect(() => {
    if (state.isFinished || state.isPaused) return;
    const timer = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 0) {
          clearInterval(timer);
          return prev;
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.isFinished, state.isPaused, setState]);

  useEffect(() => {
    if (state.timeRemaining <= 0 && !state.isFinished) {
      handleFinish();
    }
  }, [state.timeRemaining, state.isFinished, handleFinish]);

  useEffect(() => {
    if (state.isFinished) return;
    const autoPause = () => {
      setState(prev => (prev.isFinished || prev.isPaused ? prev : { ...prev, isPaused: true }));
    };
    const onVis = () => {
      if (document.hidden) autoPause();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', autoPause);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', autoPause);
    };
  }, [state.isFinished, state.isPaused, setState]);

  const handleAnswer = (answerIndex: number) => {
    if (state.isFinished) return;
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestion] = answerIndex;
    setState({ ...state, answers: newAnswers });
  };

  const handleBookmark = () => {
    const newBookmarks = [...state.bookmarks];
    newBookmarks[state.currentQuestion] = !newBookmarks[state.currentQuestion];
    setState({ ...state, bookmarks: newBookmarks });
  };

  const handleTogglePause = () => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalExamTime = examQuestions.length <= 10 ? 900 : examQuestions.length <= 50 ? 4500 : examQuestions.length <= 100 ? 9000 : Math.ceil(examQuestions.length * 1.5) * 60;
  const isTimeLow = state.timeRemaining < 300;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col">
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isTimeLow ? 'bg-danger/20' : 'bg-navy-800'}`}>
                <Clock className={`w-4 h-4 ${isTimeLow ? 'text-danger animate-pulse' : 'text-slate-400'}`} />
                <span className={`font-mono font-bold ${isTimeLow ? 'text-danger' : 'text-white'}`}>{formatTime(state.timeRemaining)}</span>
              </div>
              <span className="text-sm text-slate-400">{state.currentQuestion + 1} / {examQuestions.length}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleTogglePause}
                className="px-3 py-1.5 bg-gold/20 hover:bg-gold/40 rounded-lg text-sm text-gold font-medium flex items-center gap-2 transition-colors">
                <Pause className="w-4 h-4" />
                <span className="hidden sm:inline">Pausar</span>
              </button>
              <button onClick={() => setShowNav(!showNav)}
                className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-white flex items-center gap-2 transition-colors">
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Navegación</span>
              </button>
              <button onClick={() => setShowConfirm(true)}
                className="px-3 py-1.5 bg-danger hover:bg-red-600 rounded-lg text-sm text-white font-medium transition-colors">
                Finalizar
              </button>
              <button onClick={() => setShowExit(true)}
                className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-white flex items-center gap-2 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Guardar y salir</span>
              </button>
            </div>
          </div>
          <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-tactical-blue to-tactical-blue-light progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>{answeredCount} respondidas</span>
            <span>{bookmarkedCount} marcadas</span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-20">
        <AnimatePresence mode="wait">
          <motion.div key={state.currentQuestion} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-gold/20 text-gold text-xs font-medium rounded-full">
                {getCategoryDisplayName(getCategoryKey(currentQ.category))}
              </span>
              <button onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors ${state.bookmarks[state.currentQuestion] ? 'bg-gold/20 text-gold' : 'bg-navy-800 text-slate-400 hover:text-gold'}`}>
                <Flag className="w-4 h-4" />
              </button>
            </div>
            <div className="glass rounded-xl p-6 mb-6">
              <h2 className="text-lg font-medium text-white leading-relaxed">{currentQ.question}</h2>
            </div>
            <div className="space-y-3">
              {currentQ.options.map((option, index) => {
                const isSelected = state.answers[state.currentQuestion] === index;
                let optionClass = 'border-navy-700 bg-navy-800/50';
                if (isSelected) optionClass = 'border-tactical-blue bg-tactical-blue/20';
                return (
                  <button key={index} onClick={() => handleAnswer(index)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 option-hover ${optionClass}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'border-tactical-blue bg-tactical-blue text-white' : 'border-slate-500 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-white">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="glass border-t border-navy-700 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setState({ ...state, currentQuestion: Math.max(0, state.currentQuestion - 1) })}
            disabled={state.currentQuestion === 0}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <button onClick={() => setState({ ...state, currentQuestion: Math.min(examQuestions.length - 1, state.currentQuestion + 1) })}
            disabled={state.currentQuestion === examQuestions.length - 1}
            className="px-4 py-2 bg-tactical-blue hover:bg-tactical-blue-dark text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {showNav && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowNav(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-gold" /> Navegación de Preguntas
              </h3>
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                {examQuestions.map((_, index) => {
                  const isAnswered = state.answers[index] !== null;
                  const isBookmarked = state.bookmarks[index];
                  const isCurrent = index === state.currentQuestion;
                  return (
                    <button key={index} onClick={() => { setState({ ...state, currentQuestion: index }); setShowNav(false); }}
                      className={`w-full aspect-square rounded-lg text-sm font-medium transition-all ${
                        isCurrent ? 'bg-tactical-blue text-white ring-2 ring-tactical-blue-light'
                          : isAnswered ? 'bg-success/20 text-success border border-success/30'
                          : isBookmarked ? 'bg-gold/20 text-gold border border-gold/30'
                          : 'bg-navy-800 text-slate-400 border border-navy-700 hover:border-navy-600'
                      }`}>
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success/20 border border-success/30"></div>Respondida</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gold/20 border border-gold/30"></div>Marcada</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-navy-800 border border-navy-700"></div>Sin responder</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¿Finalizar Examen?</h3>
              <p className="text-slate-400 mb-6">
                {answeredCount} de {examQuestions.length} preguntas respondidas.
                {examQuestions.length - answeredCount > 0 && (
                  <span className="text-warning"> Hay {examQuestions.length - answeredCount} sin responder.</span>
                )}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-colors">Continuar</button>
                <button onClick={handleFinish} className="flex-1 py-3 bg-danger hover:bg-red-600 text-white font-semibold rounded-lg transition-colors">Finalizar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    <AnimatePresence>
        {showExit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¿Guardar y salir?</h3>
              <p className="text-slate-400 mb-6">
                Tu examen quedara <span className="text-gold font-semibold">pendiente de continuar</span> y se guardara automaticamente.
                Podras retomarlo desde el inicio cuando vuelvas.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowExit(false)} className="flex-1 py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-colors">Cancelar</button>
                <button onClick={() => { setShowExit(false); onExit(); }} className="flex-1 py-3 bg-gold hover:bg-gold/80 text-navy-900 font-semibold rounded-lg transition-colors">Guardar y salir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.isPaused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-8 w-full max-w-md text-center">
              <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <Pause className="w-8 h-8 text-gold" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Examen en Pausa</h3>
              <p className="text-slate-400 mb-2">El examen se pauso automaticamente cuando saliste de la aplicacion.</p>
              <p className="text-xs text-slate-500 mb-6">Tu progreso y tiempo se guardaron. Continualo desde donde te quedaste.</p>
              <button onClick={handleTogglePause}
                className="w-full py-3 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
                <Play className="w-5 h-5" /> Continuar Examen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
