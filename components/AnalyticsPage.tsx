'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Home as HomeIcon, TrendingUp, Target, 
  AlertTriangle, Award, Brain 
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { getCategoryKey, getCategoryDisplayName, categoryNames } from '../lib/categoryUtils';
import type { ExamResult, Question } from './types';

const COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

export default function AnalyticsPage({ questions, onBack }: { questions: Question[]; onBack: () => void }) {
  const history: ExamResult[] = JSON.parse(localStorage.getItem('simulador_history') || '[]');

  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; correct: number; wrong: number; exams: number }> = {};
    
    Object.keys(categoryNames).forEach(key => {
      stats[key] = { total: 0, correct: 0, wrong: 0, exams: 0 };
    });

    history.forEach(exam => {
      exam.questions.forEach((q, i) => {
        const key = getCategoryKey(q.category);
        if (!stats[key]) stats[key] = { total: 0, correct: 0, wrong: 0, exams: 0 };
        stats[key].total++;
        if (exam.answers[i] === q.correctAnswer) {
          stats[key].correct++;
        } else {
          stats[key].wrong++;
        }
      });
    });

    return Object.entries(stats)
      .filter(([_, s]) => s.total > 0)
      .map(([key, s]) => ({
        key,
        name: getCategoryDisplayName(key).length > 25 
          ? getCategoryDisplayName(key).substring(0, 22) + '...' 
          : getCategoryDisplayName(key),
        fullName: getCategoryDisplayName(key),
        total: s.total,
        correct: s.correct,
        wrong: s.wrong,
        rate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [history]);

  const progressData = useMemo(() => {
    return history.map((exam, i) => ({
      exam: i + 1,
      score: Math.round((exam.correctAnswers / exam.totalQuestions) * 100),
      date: new Date(exam.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
      questions: exam.totalQuestions,
    }));
  }, [history]);

  const weakCategories = useMemo(() => {
    return categoryStats
      .filter(c => c.wrong > 0)
      .sort((a, b) => (b.wrong / b.total) - (a.wrong / a.total))
      .slice(0, 8);
  }, [categoryStats]);

  const overallStats = useMemo(() => {
    if (history.length === 0) return null;
    const totalQ = history.reduce((s, r) => s + r.totalQuestions, 0);
    const totalCorrect = history.reduce((s, r) => s + r.correctAnswers, 0);
    const avgScore = Math.round((totalCorrect / totalQ) * 100);
    const bestScore = Math.max(...history.map(r => Math.round((r.score / r.totalQuestions) * 100)));
    const worstScore = Math.min(...history.map(r => Math.round((r.score / r.totalQuestions) * 100)));
    const totalTime = history.reduce((s, r) => s + r.timeUsed, 0);
    const avgTime = Math.round(totalTime / history.length);
    
    const recent3 = history.slice(-3);
    const recentAvg = recent3.length > 0 
      ? Math.round(recent3.reduce((s, r) => s + (r.correctAnswers / r.totalQuestions * 100), 0) / recent3.length)
      : 0;
    
    const first3 = history.slice(0, 3);
    const firstAvg = first3.length > 0
      ? Math.round(first3.reduce((s, r) => s + (r.correctAnswers / r.totalQuestions * 100), 0) / first3.length)
      : 0;

    return { totalQ, totalCorrect, avgScore, bestScore, worstScore, avgTime, recentAvg, firstAvg, trend: recentAvg - firstAvg };
  }, [history]);

  const radarData = useMemo(() => {
    return categoryStats.slice(0, 10).map(c => ({
      subject: c.name.length > 15 ? c.name.substring(0, 12) + '...' : c.name,
      score: c.rate,
      fullMark: 100,
    }));
  }, [categoryStats]);

  if (history.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
        <header className="glass border-b border-navy-700">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-tactical-blue-light" />
              </div>
              <h1 className="font-bold text-white">ANALYTICS</h1>
            </div>
            <button onClick={onBack} className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors">
              <HomeIcon className="w-4 h-4" /> Volver
            </button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Sin datos aun</h2>
          <p className="text-slate-400 mb-6">Realiza tu primer examen para ver tus estadisticas de progreso</p>
          <button onClick={onBack} className="px-6 py-3 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-semibold rounded-lg transition-colors">
            Comenzar Ahora
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-tactical-blue-light" />
            </div>
            <div>
              <h1 className="font-bold text-white">ANALYTICS</h1>
              <p className="text-xs text-slate-400">{history.length} examenes realizados</p>
            </div>
          </div>
          <button onClick={onBack} className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors">
            <HomeIcon className="w-4 h-4" /> Volver
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {overallStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-400">Promedio General</p>
              <p className="text-2xl font-bold text-white">{overallStats.avgScore}%</p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-1">
                <p className="text-xs text-slate-400">Tendencia</p>
                {overallStats.trend > 0 ? <TrendingUp className="w-3 h-3 text-success" /> : overallStats.trend < 0 ? <TrendingUp className="w-3 h-3 text-danger rotate-180" /> : null}
              </div>
              <p className={`text-2xl font-bold ${overallStats.trend >= 0 ? 'text-success' : 'text-danger'}`}>
                {overallStats.trend >= 0 ? '+' : ''}{overallStats.trend}%
              </p>
              <p className="text-xs text-slate-500">vs primeros 3 examenes</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-400">Mejor / Peor</p>
              <p className="text-xl font-bold">
                <span className="text-success">{overallStats.bestScore}%</span>
                <span className="text-slate-600 mx-1">/</span>
                <span className="text-danger">{overallStats.worstScore}%</span>
              </p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-400">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-white">
                {Math.floor(overallStats.avgTime / 60)}m {overallStats.avgTime % 60}s
              </p>
            </div>
          </div>
        )}

        {progressData.length > 1 && (
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-tactical-blue-light" />
              Progreso por Examen
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="exam" stroke="#64748b" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value) => [`${value}%`, 'Puntuacion']}
                    labelFormatter={(label) => `Examen ${label}`}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gold" />
              Rendimiento por Materia
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={140} stroke="#64748b" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value, name) => {
                      if (name === 'rate') return [`${value}%`, 'Acierto'];
                      return [value, name === 'correct' ? 'Correctas' : 'Incorrectas'];
                    }}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                    {categoryStats.map((entry, i) => (
                      <Cell key={i} fill={entry.rate >= 70 ? '#22c55e' : entry.rate >= 50 ? '#eab308' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {radarData.length >= 3 && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-tactical-blue-light" />
                Perfil de Competencia
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Radar name="Acierto" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {weakCategories.length > 0 && (
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" />
              Puntos Debiles - Materias con mas errores
            </h3>
            <div className="space-y-3">
              {weakCategories.map((cat, i) => {
                const wrongRate = Math.round((cat.wrong / cat.total) * 100);
                return (
                  <motion.div
                    key={cat.key}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-48 flex-shrink-0">
                      <p className="text-sm text-white font-medium truncate">{cat.fullName}</p>
                      <p className="text-xs text-slate-500">{cat.correct}/{cat.total} correctas</p>
                    </div>
                    <div className="flex-1 bg-navy-800 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-success to-success/80" 
                        style={{ width: `${cat.rate}%` }} />
                    </div>
                    <div className="w-16 text-right flex-shrink-0">
                      <span className={`text-sm font-bold ${cat.rate >= 70 ? 'text-success' : cat.rate >= 50 ? 'text-warning' : 'text-danger'}`}>
                        {cat.rate}%
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-gold" />
            Desglose por Materia
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Materia</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Preguntas</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Correctas</th>
                  <th className="text-center py-2 text-slate-400 font-medium">Incorrectas</th>
                  <th className="text-center py-2 text-slate-400 font-medium">% Acierto</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map(cat => (
                  <tr key={cat.key} className="border-b border-navy-800 hover:bg-navy-800/50">
                    <td className="py-2.5 text-white">{cat.fullName}</td>
                    <td className="text-center py-2.5 text-slate-300">{cat.total}</td>
                    <td className="text-center py-2.5 text-success">{cat.correct}</td>
                    <td className="text-center py-2.5 text-danger">{cat.wrong}</td>
                    <td className="text-center py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        cat.rate >= 70 ? 'bg-success/20 text-success' : cat.rate >= 50 ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'
                      }`}>
                        {cat.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
