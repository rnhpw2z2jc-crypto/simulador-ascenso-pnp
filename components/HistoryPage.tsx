'use client';

import { motion } from 'framer-motion';
import { BarChart3, Home as HomeIcon, BookOpen } from 'lucide-react';
import type { ExamResult } from './types';

export default function HistoryPage({ onBack }: { onBack: () => void }) {
  const history: ExamResult[] = JSON.parse(localStorage.getItem('simulador_history') || '[]');
  
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      <header className="glass border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-tactical-blue-light" />
            </div>
            <div>
              <h1 className="font-bold text-white">HISTORIAL</h1>
              <p className="text-xs text-slate-400">{history.length} examenes realizados</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Volver
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {history.length === 0 ? (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sin examenes aun</h2>
            <p className="text-slate-400 mb-6">Realiza tu primer examen para ver tu historial aqui</p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-semibold rounded-lg transition-colors"
            >
              Comenzar Ahora
            </button>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-slate-400">Total Examenes</p>
                <p className="text-2xl font-bold text-white">{history.length}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-slate-400">Promedio General</p>
                <p className="text-2xl font-bold text-white">
                  {Math.round(history.reduce((sum, r) => sum + (r.score / r.totalQuestions * 100), 0) / history.length)}%
                </p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-slate-400">Mejor Puntuacion</p>
                <p className="text-2xl font-bold text-success">
                  {Math.max(...history.map(r => Math.round(r.score / r.totalQuestions * 100)))}%
                </p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-slate-400">Aprobados</p>
                <p className="text-2xl font-bold text-gold">
                  {history.filter(r => (r.score / r.totalQuestions * 100) >= 60).length}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {history.reverse().map((result, index) => {
                const percentage = Math.round((result.score / result.totalQuestions) * 100);
                const passed = percentage >= 60;
                
                return (
                  <motion.div
                    key={result.id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl p-4 card-hover"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        passed ? 'bg-success/20' : 'bg-danger/20'
                      }`}>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${passed ? 'text-success' : 'text-danger'}`}>
                            {percentage}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            passed ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                          }`}>
                            {passed ? 'APROBADO' : 'DESAPROBADO'}
                          </span>
                          <span className="px-2 py-0.5 bg-navy-800 text-xs text-slate-400 rounded">
                            {result.totalQuestions} preguntas
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{formatDate(result.date)}</p>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-white">{result.score}/{result.totalQuestions}</p>
                        <p className="text-xs text-slate-500">{formatTime(result.timeUsed)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
