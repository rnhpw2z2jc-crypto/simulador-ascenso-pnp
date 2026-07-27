'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, Loader2, Play } from 'lucide-react';
import { categories, getCategoryKey, getCategoryDisplayName } from '../lib/categoryUtils';
import type { Question, ExamConfig } from './types';

export default function ConfigPage({ config, questions, onStart, onBack }: {
  config: ExamConfig;
  questions: Question[];
  onStart: (questions: Question[], timeLimit: number) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const filteredQuestions = questions.filter(q => 
    config.categories.includes(q.category)
  );

  const timeLimits: Record<number, number> = {
    10: 15 * 60,
    50: 75 * 60,
    100: 150 * 60,
  };

  const getTimeLimit = (count: number) => {
    if (timeLimits[count]) return timeLimits[count];
    return Math.ceil(count * 1.5) * 60;
  };

  const categoryStats = config.categories.map(cat => ({
    name: getCategoryDisplayName(getCategoryKey(cat)),
    count: filteredQuestions.filter(q => q.category === cat).length
  }));

  const handleStart = () => {
    setLoading(true);
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, config.numQuestions);
    setTimeout(() => {
      onStart(selected, getTimeLimit(config.numQuestions));
    }, 500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-2xl p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
            <Timer className="w-10 h-10 text-gold animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Preparado para comenzar</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-3 bg-navy-800/50 rounded-lg">
              <span className="text-slate-400">Preguntas:</span>
              <span className="text-white font-semibold">{config.numQuestions}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-navy-800/50 rounded-lg">
              <span className="text-slate-400">Tiempo:</span>
              <span className="text-white font-semibold">
                {(() => {
                  const totalMin = Math.ceil(getTimeLimit(config.numQuestions) / 60);
                  return totalMin >= 60 ? `${Math.floor(totalMin/60)}h ${totalMin%60}min` : `${totalMin} min`;
                })()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-navy-800/50 rounded-lg">
              <span className="text-slate-400">Temas:</span>
              <span className="text-white font-semibold text-sm">
                {config.categories.length === categories.length ? 'Todos' : `${config.categories.length} temas`}
              </span>
            </div>
            {filteredQuestions.length > config.numQuestions && (
              <div className="flex justify-between items-center p-3 bg-navy-800/50 rounded-lg">
                <span className="text-slate-400">Disponibles:</span>
                <span className="text-white font-semibold text-sm">{filteredQuestions.length} preguntas</span>
              </div>
            )}
          </div>

          {config.categories.length < categories.length && (
            <div className="mb-6 p-3 bg-navy-800/30 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Temas seleccionados:</p>
              <div className="flex flex-wrap gap-1">
                {categoryStats.map(stat => (
                  <span key={stat.name} className="px-2 py-0.5 bg-navy-700 text-xs text-slate-300 rounded">
                    {stat.name} ({stat.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onBack}
              className="flex-1 py-3 bg-navy-700 hover:bg-navy-600 text-white font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={handleStart} disabled={loading}
              className="flex-1 py-3 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-semibold rounded-lg transition-colors btn-glow disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  COMENZAR
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
