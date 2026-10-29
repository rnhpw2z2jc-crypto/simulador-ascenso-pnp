'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, Home as HomeIcon, TrendingUp, Target, 
  AlertTriangle, Award, Users, User as UserIcon, Loader2, RefreshCw,
  Search, ChevronDown, CalendarDays
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { getCategoryKey, getCategoryDisplayName, categoryNames } from '../lib/categoryUtils';
import { safeGetJSON } from '../lib/storage';
import { getAllUsersPublic } from '../lib/users';
import type { UserData } from '../lib/users';
import { getExamStats } from '../lib/examStats';
import type { ExamStatEntry } from '../lib/examStats';
import type { ExamResult, Question, User } from './types';

const COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

export default function AnalyticsPage({ questions, onBack, user }: {
  questions: Question[];
  onBack: () => void;
  user?: User | null;
}) {
  const history = safeGetJSON<ExamResult[]>('simulador_history', []);
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<'me' | 'users'>(() =>
    user?.role === 'admin' && history.length === 0 ? 'users' : 'me'
  );

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

  if (!isAdmin && history.length === 0) {
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
              <p className="text-xs text-slate-400">
                {isAdmin ? 'Tu progreso y el de tus usuarios' : `${history.length} examenes realizados`}
              </p>
            </div>
          </div>
          <button onClick={onBack} className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors">
            <HomeIcon className="w-4 h-4" /> Volver
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setTab('me')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'me' ? 'bg-gold/20 text-gold' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'
              }`}
            >
              <UserIcon className="w-4 h-4" /> Mi rendimiento
            </button>
            <button
              onClick={() => setTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'users' ? 'bg-gold/20 text-gold' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'
              }`}
            >
              <Users className="w-4 h-4" /> Mis usuarios
            </button>
          </div>
        )}

        {tab === 'me' && (history.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">Aun no tienes examenes propios</h2>
            <p className="text-slate-400 text-sm">Rinde un simulacro para ver tu progreso personal.</p>
          </div>
        ) : (
          <>
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
          </>
        ))}

        {tab === 'users' && isAdmin && (
          <AdminUsersAnalytics questions={questions} currentUserId={user?.id} />
        )}
      </div>
    </motion.div>
  );
}

type AdminSort = 'exams' | 'avg' | 'best' | 'recent' | 'name';

type UserPerformance = {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'user';
  status: 'active' | 'expired' | 'blocked';
  exams: number;
  totalQuestions: number;
  totalCorrect: number;
  avg: number;
  best: number;
  lastDate: string | null;
  uniqueFailed: number;
  trend: number;
  topFailed: Array<{ name: string; count: number }>;
  recent: ExamStatEntry[];
};

function formatAdminDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function scoreTextClass(score: number): string {
  return score >= 70 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger';
}

function AdminUsersAnalytics({ questions, currentUserId }: { questions: Question[]; currentUserId?: string }) {
  const [users, setUsers] = useState<Array<Omit<UserData, 'password'>>>([]);
  const [stats, setStats] = useState<ExamStatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<AdminSort>('exams');
  const [showNoExams, setShowNoExams] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allUsers, entries] = await Promise.all([
        getAllUsersPublic(),
        getExamStats(5000),
      ]);
      setUsers(allUsers);
      setStats(entries);
    } catch {
      setError('No se pudieron cargar los datos de tus usuarios. Revisa tu conexion e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const questionById = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);

  const rows = useMemo<UserPerformance[]>(() => {
    const byUser = new Map<string, ExamStatEntry[]>();
    stats.forEach(entry => {
      [entry.userId, entry.username].filter(Boolean).forEach(key => {
        const list = byUser.get(key) || [];
        list.push(entry);
        byUser.set(key, list);
      });
    });

    return users
      .filter(u => u.id !== currentUserId)
      .map(u => {
        const seen = new Set<string>();
        const entries: ExamStatEntry[] = [];
        [...(byUser.get(u.id) || []), ...(byUser.get(u.username) || [])].forEach(entry => {
          if (seen.has(entry.id)) return;
          seen.add(entry.id);
          entries.push(entry);
        });
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalQuestions = entries.reduce((s, e) => s + (e.totalQuestions || 0), 0);
        const totalCorrect = entries.reduce((s, e) => s + (e.correctAnswers || 0), 0);
        const percents = entries.map(e =>
          e.totalQuestions > 0 ? (e.correctAnswers / e.totalQuestions) * 100 : 0
        );
        const avg = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const best = percents.length > 0 ? Math.round(Math.max(...percents)) : 0;
        const mean = (list: number[]) =>
          list.length > 0 ? Math.round(list.reduce((s, n) => s + n, 0) / list.length) : 0;
        const trend = percents.length >= 4
          ? mean(percents.slice(0, 3)) - mean(percents.slice(-3))
          : 0;

        const failedIds = new Set<number>();
        entries.forEach(e => (e.failedQuestionIds || []).forEach(id => failedIds.add(id)));
        const failedByCategory = new Map<string, number>();
        failedIds.forEach(id => {
          const q = questionById.get(id);
          const name = q ? getCategoryDisplayName(getCategoryKey(q.category)) : 'Sin clasificar';
          failedByCategory.set(name, (failedByCategory.get(name) || 0) + 1);
        });
        const topFailed = Array.from(failedByCategory.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          id: u.id,
          username: u.username,
          fullName: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.username,
          role: u.role,
          status: u.status,
          exams: entries.length,
          totalQuestions,
          totalCorrect,
          avg,
          best,
          lastDate: entries[0]?.date || null,
          uniqueFailed: failedIds.size,
          trend,
          topFailed,
          recent: entries.slice(0, 5),
        };
      });
  }, [users, stats, questionById, currentUserId]);

  const withExams = rows.filter(r => r.exams > 0);
  const totalQuestions = withExams.reduce((s, r) => s + r.totalQuestions, 0);
  const totalCorrect = withExams.reduce((s, r) => s + r.totalCorrect, 0);
  const globalAvg = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const bestRow = withExams.length > 0
    ? [...withExams].sort((a, b) => b.avg - a.avg || b.exams - a.exams)[0]
    : null;
  const recentActive = withExams.filter(r =>
    r.lastDate && Date.now() - new Date(r.lastDate).getTime() <= 7 * 86400000
  ).length;
  const noExamsCount = rows.length - withExams.length;

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = rows.filter(r => {
      if (!showNoExams && r.exams === 0) return false;
      if (!term) return true;
      return r.fullName.toLowerCase().includes(term) || r.username.toLowerCase().includes(term);
    });
    const sorters: Record<AdminSort, (a: UserPerformance, b: UserPerformance) => number> = {
      exams: (a, b) => b.exams - a.exams || b.avg - a.avg,
      avg: (a, b) => b.avg - a.avg || b.exams - a.exams,
      best: (a, b) => b.best - a.best || b.avg - a.avg,
      recent: (a, b) => new Date(b.lastDate || 0).getTime() - new Date(a.lastDate || 0).getTime(),
      name: (a, b) => a.fullName.localeCompare(b.fullName, 'es'),
    };
    return [...list].sort(sorters[sortBy]);
  }, [rows, search, showNoExams, sortBy]);

  if (loading && users.length === 0) {
    return (
      <div className="glass rounded-xl p-10 text-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Cargando rendimiento de tus usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" /> Rendimiento de tus usuarios
          </h2>
          <p className="text-xs text-slate-400">
            {withExams.length} de {rows.length} cuentas con examenes · {recentActive} activas en los ultimos 7 dias
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-2 bg-navy-800 hover:bg-navy-700 disabled:opacity-50 text-xs text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-danger/40 text-sm text-danger flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={load} className="px-3 py-1.5 bg-danger/20 rounded-lg text-xs flex-shrink-0">Reintentar</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400">Usuarios evaluados</p>
          <p className="text-2xl font-bold text-white">{withExams.length}<span className="text-sm text-slate-500"> / {rows.length}</span></p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400">Examenes registrados</p>
          <p className="text-2xl font-bold text-white">{withExams.reduce((s, r) => s + r.exams, 0)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400">Promedio general</p>
          <p className={`text-2xl font-bold ${scoreTextClass(globalAvg)}`}>{globalAvg}%</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400">Mejor promedio</p>
          <p className="text-2xl font-bold text-gold">{bestRow ? `${bestRow.avg}%` : '—'}</p>
          <p className="text-[11px] text-slate-500 truncate">{bestRow ? bestRow.fullName : 'Sin datos'}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o usuario..."
            className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-gold/60"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as AdminSort)}
          className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/60"
        >
          <option value="exams">Mas examenes</option>
          <option value="avg">Mejor promedio</option>
          <option value="best">Mejor nota</option>
          <option value="recent">Actividad reciente</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      {filteredRows.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            {rows.length === 0
              ? 'Todavia no hay cuentas de usuario registradas.'
              : 'No hay resultados con ese filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRows.map(row => {
            const initials = (row.fullName || row.username)
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0]?.toUpperCase())
              .join('');
            const isOpen = expanded === row.id;
            return (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl border border-navy-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : row.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-navy-800/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center font-bold text-gold flex-shrink-0">
                    {initials || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white text-sm truncate">{row.fullName}</p>
                      <span className="text-xs text-slate-500">@{row.username}</span>
                      {row.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded bg-tactical-blue/20 text-tactical-blue-light text-[10px] font-semibold">ADMIN</span>
                      )}
                      {row.status === 'blocked' && (
                        <span className="px-1.5 py-0.5 rounded bg-danger/20 text-danger text-[10px] font-semibold">BLOQUEADO</span>
                      )}
                      {row.status === 'expired' && (
                        <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning text-[10px] font-semibold">VENCIDO</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                      <span>{row.exams} examen{row.exams !== 1 ? 'es' : ''}</span>
                      <span>Promedio <span className={`font-semibold ${scoreTextClass(row.avg)}`}>{row.avg}%</span></span>
                      <span>Mejor <span className="font-semibold text-white">{row.best}%</span></span>
                      <span>Ultimo: {formatAdminDate(row.lastDate)}</span>
                      {row.exams >= 4 && row.trend !== 0 && (
                        <span className={`flex items-center gap-1 ${row.trend > 0 ? 'text-success' : 'text-danger'}`}>
                          <TrendingUp className={`w-3 h-3 ${row.trend < 0 ? 'rotate-180' : ''}`} />
                          {row.trend > 0 ? '+' : ''}{row.trend}%
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                    row.exams === 0
                      ? 'bg-navy-800 text-slate-500'
                      : row.avg >= 60
                        ? 'bg-success/20 text-success'
                        : 'bg-danger/20 text-danger'
                  }`}>
                    {row.exams === 0 ? 'SIN DATOS' : row.avg >= 60 ? 'APROBADO' : 'DESAPROBADO'}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-navy-800 p-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">Promedio general de la cuenta</span>
                        <span className={`font-semibold ${scoreTextClass(row.avg)}`}>{row.avg}%</span>
                      </div>
                      <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.avg >= 70 ? 'bg-success' : row.avg >= 50 ? 'bg-warning' : 'bg-danger'}`}
                          style={{ width: `${Math.min(100, row.avg)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-navy-800/60 rounded-lg py-2">
                        <p className="text-lg font-bold text-white">{row.exams}</p>
                        <p className="text-[10px] text-slate-500">Examenes</p>
                      </div>
                      <div className="bg-navy-800/60 rounded-lg py-2">
                        <p className="text-lg font-bold text-white">{row.best}%</p>
                        <p className="text-[10px] text-slate-500">Mejor nota</p>
                      </div>
                      <div className="bg-navy-800/60 rounded-lg py-2">
                        <p className="text-lg font-bold text-danger">{row.uniqueFailed}</p>
                        <p className="text-[10px] text-slate-500">Fallos unicos</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-danger" /> Materias con mas fallos
                        </p>
                        {row.topFailed.length === 0 ? (
                          <p className="text-xs text-slate-500">Sin fallos registrados.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {row.topFailed.map(f => (
                              <div key={f.name} className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-300 flex-1 truncate">{f.name}</span>
                                <div className="w-20 bg-navy-800 rounded-full h-1.5 overflow-hidden flex-shrink-0">
                                  <div className="h-full bg-danger/80 rounded-full" style={{ width: `${(f.count / row.topFailed[0].count) * 100}%` }} />
                                </div>
                                <span className="text-[11px] text-danger w-6 text-right flex-shrink-0">{f.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-tactical-blue-light" /> Ultimos examenes
                        </p>
                        {row.recent.length === 0 ? (
                          <p className="text-xs text-slate-500">Sin examenes registrados.</p>
                        ) : (
                          <div>
                            {row.recent.map(e => {
                              const pct = e.totalQuestions > 0 ? Math.round((e.correctAnswers / e.totalQuestions) * 100) : 0;
                              return (
                                <div key={e.id} className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-navy-800/60 last:border-0">
                                  <span className="text-slate-400">{formatAdminDate(e.date)}</span>
                                  <span className="text-slate-500">{e.correctAnswers}/{e.totalQuestions}</span>
                                  <span className={`font-semibold ${scoreTextClass(pct)}`}>{pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {noExamsCount > 0 && (
        <button
          onClick={() => setShowNoExams(v => !v)}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showNoExams ? 'Ocultar' : 'Mostrar'} {noExamsCount} cuenta{noExamsCount !== 1 ? 's' : ''} sin examenes
        </button>
      )}
    </div>
  );
}
