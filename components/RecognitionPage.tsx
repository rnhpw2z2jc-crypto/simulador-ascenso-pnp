'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag, Home, Check, X, BookOpen, RefreshCw } from 'lucide-react';
import { getCategoryKey, getCategoryDisplayName } from '../lib/categoryUtils';
import type { Question } from './types';

export default function RecognitionPage({ questions, onBack }: {
  questions: Question[];
  onBack: () => void;
}) {
  const [order, setOrder] = useState<number[]>(() => questions.map((_, i) => i));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<boolean[]>(new Array(questions.length).fill(false));

  const currentQ = questions[order[currentIndex]];
  const isAnswered = selected !== null;
  const isCorrect = isAnswered && selected === currentQ.correctAnswer;
  const answeredCount = order.filter((_, i) => i < currentIndex && selected !== null).length;

  const handleSelect = (answerIndex: number) => {
    if (isAnswered) return;
    setSelected(answerIndex);
  };

  const handleNext = () => {
    if (currentIndex >= order.length - 1) return;
    setSelected(null);
    setCurrentIndex(i => i + 1);
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    setSelected(null);
    setCurrentIndex(i => i - 1);
  };

  const handleBookmark = () => {
    setBookmarks(prev => {
      const next = [...prev];
      next[currentIndex] = !next[currentIndex];
      return next;
    });
  };

  const handleRestart = () => {
    const shuffled = questions
      .map((_, i) => i)
      .sort(() => Math.random() - 0.5);
    setOrder(shuffled);
    setCurrentIndex(0);
    setSelected(null);
    setBookmarks(new Array(questions.length).fill(false));
  };

  const progress = ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col">
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-tactical-blue-light" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm sm:text-base">RECONOCIMIENTO TACTICO 🔭</h1>
                <p className="text-[11px] text-slate-400">Entrenamiento por tema - sin presion de tiempo</p>
              </div>
            </div>
            <button onClick={onBack} className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs text-white rounded-lg flex items-center gap-1.5 transition-colors">
              <Home className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
          <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-tactical-blue to-tactical-blue-light" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>Pregunta {Math.min(currentIndex + 1, questions.length)} de {questions.length}</span>
            <span>{bookmarks.filter(b => b).length} marcadas</span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-24">
        {questions.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center">
            <p className="text-slate-400">Sin preguntas para este reconocimiento.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={currentIndex} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-gold/20 text-gold text-xs font-medium rounded-full">
                  {getCategoryDisplayName(getCategoryKey(currentQ.category))}
                </span>
                <button onClick={handleBookmark}
                  className={`p-2 rounded-lg transition-colors ${bookmarks[currentIndex] ? 'bg-gold/20 text-gold' : 'bg-navy-800 text-slate-400 hover:text-gold'}`}>
                  <Flag className="w-4 h-4" />
                </button>
              </div>

              <div className="glass rounded-xl p-6 mb-6">
                <h2 className="text-lg font-medium text-white leading-relaxed">{currentQ.question}</h2>
              </div>

              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  const isSelect = selected === index;
                  const isRight = index === currentQ.correctAnswer;
                  let optionClass = 'border-navy-700 bg-navy-800/50';
                  if (isAnswered) {
                    if (isRight) optionClass = 'border-success bg-success/20';
                    else if (isSelect) optionClass = 'border-danger bg-danger/20';
                    else optionClass = 'border-navy-700 bg-navy-800/30 opacity-60';
                  } else if (isSelect) {
                    optionClass = 'border-tactical-blue bg-tactical-blue/20';
                  }
                  return (
                    <button key={index} onClick={() => handleSelect(index)} disabled={isAnswered}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${optionClass} ${isAnswered ? 'cursor-default' : 'option-hover'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                          isAnswered && isRight ? 'border-success bg-success text-white'
                          : isAnswered && isSelect ? 'border-danger bg-danger text-white'
                          : isSelect ? 'border-tactical-blue bg-tactical-blue text-white'
                          : 'border-slate-500 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="text-white">{option}</span>
                        {isAnswered && isRight && <Check className="w-5 h-5 text-success ml-auto" />}
                        {isAnswered && isSelect && !isRight && <X className="w-5 h-5 text-danger ml-auto" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-4 rounded-xl border ${isCorrect ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <X className="w-5 h-5 text-danger" />
                    )}
                    <span className={`font-semibold ${isCorrect ? 'text-success' : 'text-danger'}`}>
                      {isCorrect ? 'Correcto' : 'Incorrecto'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{currentQ.explanation}</p>
                  {currentQ.legalBasis && (
                    <p className="text-xs text-slate-500 mt-2">
                      Base legal: {currentQ.legalBasis}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <footer className="glass border-t border-navy-700 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={handlePrev} disabled={currentIndex === 0}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleRestart} title="Reiniciar el recorrido"
              className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            {currentIndex >= questions.length - 1 ? (
              <button onClick={handleRestart} className="px-4 py-2 bg-success hover:bg-success/80 text-white rounded-lg flex items-center gap-2 transition-colors">
                Completado
              </button>
            ) : (
              <button onClick={handleNext}
                className="px-4 py-2 bg-tactical-blue hover:bg-tactical-blue-dark text-white rounded-lg flex items-center gap-2 transition-colors">
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </motion.div>
  );
}