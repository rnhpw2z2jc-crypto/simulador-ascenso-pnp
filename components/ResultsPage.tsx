'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Check, X, Filter, Brain, Home as HomeIcon, 
  CheckCircle2, XCircle 
} from 'lucide-react';
import { getCategoryKey, getCategoryDisplayName } from '../lib/categoryUtils';
import type { ExamResult } from './types';

export default function ResultsPage({ result, onBack, onStartReinforcement }: { result: ExamResult; onBack: () => void; onStartReinforcement: () => boolean }) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  
  const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
  const passed = percentage >= 60;
  const timeMinutes = Math.floor(result.timeUsed / 60);
  const timeSeconds = result.timeUsed % 60;

  const passedMessages = [
    '¡Excelente resultado! 🏆 Mantén el ritmo de estudio y no te confíes. ¡El ascenso te espera! 👮‍♂️⭐🎖️',
    '¡Aprobado con nota! 🎯 Tu disciplina da frutos. ¡Sigue así y alcanzarás la meta! 💪🔥',
    '¡Así se hace, soldado! 🛡️ Tu preparación es impecable. ¡El camino al ascenso está abierto! 🏅✨',
    '¡Dominio total! 🧠📚 No hay quien te detenga. ¡Mantén esa consistencia! 🚀👮‍♂️',
    '¡Gran desempeño! 🌟 Cada hora de estudio cuenta. ¡El mérito es tuyo! 🎖️💪',
  ];

  const failedMessages = [
    '¡Este solo es el comienzo! 🚀 Cada error corregido es un paso más hacia tu ascenso. 🔥 ¡A ajustar la táctica y volver a intentar! 🛡️⚡',
    '¡No te rindas, guerrero! 💪 Los retos forjan el carácter. Analiza tus errores y vuelve más fuerte. 🔥👮‍♂️',
    '¡Ánimo, que el camino al ascenso es de perseverantes! 📚 Refuerza tus puntos débiles y lo lograrás. 🛡️✨',
    '¡El fracaso es temporal, la deserción es permanente! ⚡ Estudia, repite y conquista. 🏅💪',
    '¡Los mejores policias caen y se levantan! 🥋 Refuerza lo que fallaste y vuelve por tu ascenso. 🚀⭐',
  ];

  const motivationalMessage = passed
    ? passedMessages[Math.floor(Math.random() * passedMessages.length)]
    : failedMessages[Math.floor(Math.random() * failedMessages.length)];

  const filteredQuestions = result.questions.filter((q, i) => {
    const isCorrect = result.answers[i] === q.correctAnswer;
    if (filter === 'correct') return isCorrect;
    if (filter === 'incorrect') return !isCorrect;
    return true;
  });

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
              <Shield className="w-6 h-6 text-tactical-blue-light" />
            </div>
            <h1 className="font-bold text-white">RESULTADOS</h1>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Inicio
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`rounded-2xl p-6 mb-6 ${
            passed 
              ? 'bg-gradient-to-br from-success/20 to-success/5 border border-success/30'
              : 'bg-gradient-to-br from-danger/20 to-danger/5 border border-danger/30'
          }`}
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
              passed ? 'bg-success/20' : 'bg-danger/20'
            }`}>
              <div className="text-center">
                <p className={`text-4xl font-bold ${passed ? 'text-success' : 'text-danger'}`}>
                  {percentage}%
                </p>
                <p className={`text-sm ${passed ? 'text-success' : 'text-danger'}`}>
                  {result.correctAnswers}/{result.totalQuestions}
                </p>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3 ${
                passed ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
              }`}>
                {passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-bold text-lg">{passed ? 'APROBADO' : 'DESAPROBADO'}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{result.correctAnswers}</p>
                  <p className="text-xs text-slate-400">Correctas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{result.totalQuestions - result.correctAnswers}</p>
                  <p className="text-xs text-slate-400">Incorrectas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{timeMinutes}:{timeSeconds.toString().padStart(2, '0')}</p>
                  <p className="text-xs text-slate-400">Tiempo</p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`mt-4 p-3 rounded-xl text-sm text-center md:text-left ${
                  passed ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}
              >
                {motivationalMessage}
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['all', 'correct', 'incorrect'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? f === 'correct' ? 'bg-success/20 text-success' : f === 'incorrect' ? 'bg-danger/20 text-danger' : 'bg-tactical-blue/20 text-tactical-blue-light'
                  : 'bg-navy-800 text-slate-400 hover:bg-navy-700'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'correct' ? 'Correctas' : 'Incorrectas'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredQuestions.map((q, filterIdx) => {
            const originalIndex = result.questions.indexOf(q);
            const userAnswer = result.answers[originalIndex];
            const isCorrect = userAnswer === q.correctAnswer;
            
            return (
              <motion.div
                key={q.id}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: filterIdx * 0.05 }}
                className={`glass rounded-xl p-4 border-l-4 ${
                  isCorrect ? 'border-l-success' : 'border-l-danger'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCorrect ? 'bg-success/20' : 'bg-danger/20'
                  }`}>
                    {isCorrect ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-danger" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-500">Pregunta {originalIndex + 1}</span>
                      <span className="px-2 py-0.5 bg-navy-800 text-xs text-slate-400 rounded">{getCategoryDisplayName(getCategoryKey(q.category))}</span>
                    </div>
                    <p className="text-white font-medium mb-3">{q.question}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt, optIdx) => {
                        const isUserAnswer = userAnswer === optIdx;
                        const isCorrectAnswer = optIdx === q.correctAnswer;
                        
                        let bgClass = 'bg-navy-800/50';
                        if (isCorrectAnswer) bgClass = 'bg-success/10 border border-success/30';
                        if (isUserAnswer && !isCorrect) bgClass = 'bg-danger/10 border border-danger/30';
                        
                        return (
                          <div key={optIdx} className={`p-2 rounded-lg text-sm ${bgClass}`}>
                            <span className="font-medium text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>{' '}
                            <span className={isCorrectAnswer ? 'text-success' : isUserAnswer ? 'text-danger' : 'text-slate-300'}>
                              {opt}
                            </span>
                            {isCorrectAnswer && <Check className="w-3 h-3 text-success inline ml-1" />}
                            {isUserAnswer && !isCorrect && <X className="w-3 h-3 text-danger inline ml-1" />}
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-navy-800/30 rounded-lg">
                      <p className="text-xs text-gold font-medium mb-1">Explicacion:</p>
                      <p className="text-sm text-slate-300">{q.explanation}</p>
                      {q.legalBasis && (
                        <p className="text-xs text-slate-500 mt-1">Legislacion: {q.legalBasis}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          {!passed && result.totalQuestions - result.correctAnswers > 0 && (
            <button
              onClick={onStartReinforcement}
              className="flex-1 py-3 bg-gradient-to-r from-warning/20 to-gold/20 hover:from-warning/30 hover:to-gold/30 border border-warning/50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Brain className="w-5 h-5 text-gold" />
              REFORZAMIENTO TACTICO
            </button>
          )}
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-navy-800 hover:bg-navy-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <HomeIcon className="w-5 h-5" />
            Volver al Inicio
          </button>
        </div>
      </div>
    </motion.div>
  );
}
