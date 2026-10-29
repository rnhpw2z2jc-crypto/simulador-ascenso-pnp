'use client';

import { useState, useEffect } from 'react';
import type { ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Settings, User, LogOut, FileText, Target, Trophy, Clock,
  Zap, BarChart3, Brain, Download, AlertTriangle, TrendingUp,
  Headphones, ArrowRight, Lock, PlayCircle, Sparkles
} from 'lucide-react';
import { safeGetJSON, safeRemove } from '../lib/storage';
import { hasAudioAccess } from './types';
import MotivationalPopup from './MotivationalPopup';
import type { User as UserType, ExamResult, Question, ExamState } from './types';

const MOTIVATIONAL_ENABLED = true;
const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA?.slice(0, 7) || '';

let motivationalShownThisLoad = false;

export type FeatureMode = 'simulacro' | 'repaso' | 'recognition' | 'audio';

export default function DashboardPage({
  user, questions, onRefreshUser, onPickMode, onStartReinforcement,
  onViewHistory, onGoAnalytics, onLogout, onGoAdmin, onGoProfile,
  isInstallable, onInstall, hasUpdate, onApplyUpdate, pausedExam, onResumeExam,
}: {
  user: UserType;
  questions: Question[];
  onRefreshUser: (username: string) => Promise<void>;
  onPickMode: (mode: FeatureMode) => void;
  onStartReinforcement: () => boolean;
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
  const [failedCount, setFailedCount] = useState(0);
  // Esta pantalla es la misma para todas las cuentas (admin y usuarios).
  // Lo unico que depende del panel admin es el Modo Audio: el admin puede
  // activarlo o desactivarlo por usuario, y su propia cuenta siempre lo tiene.
  const audioEnabled = hasAudioAccess(user);

  useEffect(() => {
    const failedIds = safeGetJSON<number[]>('simulador_failed_ids', []);
    setFailedCount(failedIds.length);
  }, []);

  useEffect(() => {
    onRefreshUser(user.username);
  }, [user.username, onRefreshUser]);

  const [showMotivational, setShowMotivational] = useState(false);

  useEffect(() => {
    if (!MOTIVATIONAL_ENABLED) return;
    let pendingLogin = false;
    try {
      pendingLogin = sessionStorage.getItem('simulador_motiv_show') === '1';
      sessionStorage.removeItem('simulador_motiv_show');
    } catch {}
    if (!motivationalShownThisLoad || pendingLogin) {
      motivationalShownThisLoad = true;
      setShowMotivational(true);
    }
  }, []);

  const history = safeGetJSON<ExamResult[]>('simulador_history', []);
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

  const stats = [
    { label: 'Exámenes', value: totalExams, icon: FileText, color: 'text-tactical-blue-light', bg: 'bg-tactical-blue/20' },
    { label: 'Promedio', value: `${avgScore}%`, icon: Target, color: 'text-gold', bg: 'bg-gold/20' },
    { label: 'Mejor', value: `${bestScore}%`, icon: Trophy, color: 'text-success', bg: 'bg-success/20' },
    { label: 'Estudio', value: `${studyHours}h`, icon: Clock, color: 'text-danger', bg: 'bg-danger/20' },
  ];

  const tiles: Array<{
    id: string;
    title: string;
    description: string;
    icon: ElementType;
    badge?: string;
    enabled: boolean;
    onClick: () => void;
    accent: string;
    iconBg: string;
    iconColor: string;
    hover: string;
  }> = [
    {
      id: 'simulacro',
      title: 'Simulacro',
      description: 'Examen cronometrado con la cantidad que elijas',
      icon: FileText,
      badge: `${questions.length}`,
      enabled: questions.length > 0,
      onClick: () => onPickMode('simulacro'),
      accent: 'border-tactical-blue/60 hover:border-tactical-blue',
      iconBg: 'bg-gradient-to-br from-tactical-blue to-tactical-blue-dark',
      iconColor: 'text-white',
      hover: 'hover:shadow-[0_0_30px_-8px_rgba(37,99,235,0.6)]',
    },
    {
      id: 'recognition',
      title: 'Reconocimiento',
      description: 'Repasa pregunta por pregunta, sin presión de tiempo',
      icon: Target,
      enabled: questions.length > 0,
      onClick: () => onPickMode('recognition'),
      accent: 'border-cyan-500/40 hover:border-cyan-400',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-tactical-blue-dark',
      iconColor: 'text-white',
      hover: 'hover:shadow-[0_0_30px_-8px_rgba(6,182,212,0.55)]',
    },
    {
      id: 'audio',
      title: 'Audio Táctico',
      description: audioEnabled
        ? 'Escucha pregunta, respuesta y sustento legal'
        : 'Pide al administrador activar el Modo Audio',
      icon: Headphones,
      badge: audioEnabled ? 'Complemento' : 'Bloqueado',
      enabled: audioEnabled,
      onClick: () => onPickMode('audio'),
      accent: 'border-gold/60 hover:border-gold',
      iconBg: 'bg-gradient-to-br from-gold to-gold-dark',
      iconColor: 'text-navy-900',
      hover: 'hover:shadow-[0_0_30px_-8px_rgba(234,179,8,0.55)]',
    },
    {
      id: 'reforzamiento',
      title: 'Reforzamiento',
      description: failedCount > 0
        ? `Repasa las ${failedCount} pregunta${failedCount !== 1 ? 's' : ''} que fallaste`
        : 'Sin preguntas falladas por ahora',
      icon: Brain,
      badge: failedCount > 0 ? `${failedCount}` : undefined,
      enabled: failedCount > 0,
      onClick: () => {
        if (!onStartReinforcement()) {
          safeRemove('simulador_failed_ids');
          setFailedCount(0);
        }
      },
      accent: 'border-warning/60 hover:border-warning',
      iconBg: 'bg-gradient-to-br from-warning to-gold-dark',
      iconColor: 'text-navy-900',
      hover: 'hover:shadow-[0_0_30px_-8px_rgba(245,158,11,0.55)]',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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

      <div className="max-w-6xl mx-auto px-4 py-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            Bienvenido, <span className="text-gold">{user.apellido}</span>
          </h2>
          <p className="text-slate-400 text-sm">Elige cómo quieres entrenar hoy</p>

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

        {/* Resumen compacto */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
          className="glass rounded-2xl px-4 py-3 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(stat => (
            <div key={stat.label} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-white leading-none">{stat.value}</p>
                <p className="text-[11px] text-slate-500 truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Accesos principales */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">¿Qué quieres hacer hoy?</h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tiles.map(tile => (
              <button
                key={tile.id}
                onClick={tile.onClick}
                disabled={!tile.enabled}
                className={`group relative aspect-square rounded-2xl border-2 p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                  tile.enabled
                    ? `glass ${tile.accent} ${tile.hover} hover:-translate-y-1`
                    : 'bg-navy-800/30 border-navy-800 opacity-55 cursor-not-allowed'
                }`}
              >
                {tile.badge && (
                  <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    tile.enabled ? 'bg-white/10 text-slate-200' : 'bg-navy-800 text-slate-500'
                  }`}>
                    {tile.badge}
                  </span>
                )}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 ${tile.iconBg} ${tile.enabled ? 'group-hover:scale-110' : ''} ${!tile.enabled ? 'grayscale' : ''}`}>
                  {tile.enabled ? (
                    <tile.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${tile.iconColor}`} />
                  ) : (
                    <Lock className={`w-6 h-6 sm:w-7 sm:h-7 ${tile.iconColor}`} />
                  )}
                </div>
                <p className={`font-bold text-sm sm:text-base leading-tight ${tile.enabled ? 'text-white' : 'text-slate-400'}`}>{tile.title}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 leading-snug line-clamp-2 px-1">{tile.description}</p>
                {tile.enabled && (
                  <ArrowRight className="w-4 h-4 text-slate-500 mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                )}
              </button>
            ))}
          </div>

          {/* Repaso completo por tema */}
          <button
            onClick={() => onPickMode('repaso')}
            disabled={questions.length === 0}
            className={`group mt-4 w-full rounded-2xl border-2 p-4 sm:p-5 flex items-center gap-4 text-left transition-all duration-300 ${
              questions.length > 0
                ? 'glass border-gold/50 hover:border-gold hover:-translate-y-0.5 hover:shadow-[0_0_30px_-8px_rgba(234,179,8,0.55)]'
                : 'bg-navy-800/30 border-navy-800 opacity-55 cursor-not-allowed'
            }`}
          >
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-gold to-gold-dark transition-transform duration-300 ${questions.length > 0 ? 'group-hover:scale-105' : 'grayscale'}`}>
              <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-navy-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm sm:text-base leading-tight ${questions.length > 0 ? 'text-white' : 'text-slate-400'}`}>
                Repaso completo por tema
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1 leading-snug">
                Todas las preguntas del tema, con tiempo de examen
              </p>
            </div>
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-gold/20 text-gold text-[10px] font-semibold flex-shrink-0">
              1.5 min/pregunta
            </span>
            {questions.length > 0 && (
              <ArrowRight className="w-5 h-5 text-slate-500 flex-shrink-0 group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
            )}
          </button>
        </motion.div>

        {/* Accesos secundarios */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={onViewHistory}
            className="glass rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white hover:border-navy-600 border border-navy-700 transition-colors">
            <BarChart3 className="w-4 h-4 text-tactical-blue-light" />
            Historial
          </button>
          <button onClick={onGoAnalytics}
            className="glass rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white hover:border-navy-600 border border-navy-700 transition-colors">
            <TrendingUp className="w-4 h-4 text-success" />
            Analytics
          </button>
        </motion.div>

        <p className="text-center text-xs text-slate-600 mt-6 flex items-center justify-center gap-1.5">
          <PlayCircle className="w-3.5 h-3.5" />
          Cada repaso te acerca al ascenso
          {BUILD_SHA && <span className="text-slate-700">· {BUILD_SHA}</span>}
        </p>
      </div>

      <AnimatePresence>
        {showMotivational && (
          <MotivationalPopup nombre={user.nombre} onClose={() => setShowMotivational(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
