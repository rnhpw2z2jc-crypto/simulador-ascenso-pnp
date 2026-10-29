'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, FileText, Target, Headphones,
  Clock, BookMarked, Hash, Play
} from 'lucide-react';
import { getCategoryDisplayName, getCategoryKey } from '../lib/categoryUtils';
import type { Question } from './types';

export type ThemeMode = 'simulacro' | 'recognition' | 'audio';

export interface ThemeSelection {
  categories: string[];
  category: string | null;
  numQuestions: number;
}

const MODE_META: Record<ThemeMode, {
  title: string;
  subtitle: string;
  icon: typeof FileText;
  iconBg: string;
  iconColor: string;
  accent: string;
  button: string;
  confirm: string;
}> = {
  simulacro: {
    title: 'SIMULACRO',
    subtitle: 'Elige los temas y la cantidad de preguntas',
    icon: FileText,
    iconBg: 'bg-tactical-blue/20',
    iconColor: 'text-tactical-blue-light',
    accent: 'border-tactical-blue bg-tactical-blue/10',
    button: 'bg-gradient-to-r from-tactical-blue to-tactical-blue-dark border-tactical-blue-light/40 text-white',
    confirm: 'INICIAR SIMULACRO',
  },
  recognition: {
    title: 'RECONOCIMIENTO TACTICO',
    subtitle: 'Elige el tema que quieres repasar',
    icon: Target,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-300',
    accent: 'border-cyan-500 bg-cyan-500/10',
    button: 'bg-gradient-to-r from-cyan-500 to-tactical-blue-dark border-cyan-400/40 text-white',
    confirm: 'INICIAR RECONOCIMIENTO',
  },
  audio: {
    title: 'AUDIO TACTICO',
    subtitle: 'Elige el tema que quieres escuchar',
    icon: Headphones,
    iconBg: 'bg-gold/20',
    iconColor: 'text-gold',
    accent: 'border-gold bg-gold/10',
    button: 'bg-gradient-to-r from-gold to-gold-dark border-gold/40 text-navy-900',
    confirm: 'CONTINUAR',
  },
};

export default function ThemeSelectPage({ mode, questions, onBack, onConfirm }: {
  mode: ThemeMode;
  questions: Question[];
  onBack: () => void;
  onConfirm: (selection: ThemeSelection) => void;
}) {
  const meta = MODE_META[mode];
  const multiple = mode === 'simulacro';

  const [selected, setSelected] = useState<string[]>(['all']);
  const [single, setSingle] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(10);

  const categories = useMemo(
    () => Array.from(new Set(questions.map(q => q.category))),
    [questions]
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) map.set(q.category, (map.get(q.category) || 0) + 1);
    return map;
  }, [questions]);

  const allSelected = selected.includes('all');
  const activeCategories = multiple
    ? (allSelected ? categories : selected)
    : (single ? [single] : categories);

  const pool = useMemo(
    () => activeCategories.reduce((sum, cat) => sum + (counts.get(cat) || 0), 0),
    [activeCategories, counts]
  );

  const finalCount = multiple
    ? Math.min(numQuestions === 0 ? pool : numQuestions, pool)
    : pool;

  const totalMinutes = Math.ceil(finalCount * 1.5);
  const timeLabel = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 ? `${totalMinutes % 60}m` : ''}`.trim()
    : `${totalMinutes} min`;

  const toggleCategory = (cat: string) => {
    if (!multiple) {
      setSingle(prev => (prev === cat ? null : cat));
      return;
    }
    if (cat === 'all') {
      setSelected(['all']);
      return;
    }
    const rest = selected.filter(c => c !== 'all');
    if (rest.includes(cat)) {
      const next = rest.filter(c => c !== cat);
      setSelected(next.length === 0 ? ['all'] : next);
    } else {
      setSelected([...rest, cat]);
    }
  };

  const isChecked = (cat: string | null) => {
    if (multiple) return cat === null ? allSelected : selected.includes(cat);
    return cat === null ? single === null : single === cat;
  };

  const canContinue = pool > 0 && finalCount > 0;

  const handleConfirm = () => {
    if (!canContinue) return;
    onConfirm({
      categories: activeCategories,
      category: multiple ? (allSelected ? null : selected[0] ?? null) : single,
      numQuestions: finalCount,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col"
    >
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-navy-800"
            title="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>
            <meta.icon className={`w-5 h-5 ${meta.iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-white text-sm sm:text-base truncate">{meta.title}</h1>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">{meta.subtitle}</p>
          </div>
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-navy-800 text-xs text-slate-300 flex-shrink-0">
            {questions.length} preguntas
          </span>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-28">
        {multiple && (
          <div className="glass rounded-2xl p-5 sm:p-6 mb-4">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
              <Hash className="w-4 h-4 text-gold" /> Cantidad de preguntas
            </h2>
            <p className="text-xs text-slate-400 mb-4">Se seleccionan al azar del tema o temas elegidos.</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 10, label: '10', hint: 'Quiz' },
                { value: 50, label: '50', hint: 'Práctica' },
                { value: 100, label: '100', hint: 'Oficial' },
                { value: 0, label: 'Todas', hint: `${pool}` },
              ].map(opt => {
                const active = numQuestions === opt.value;
                const disabled = opt.value > 0 && opt.value > pool;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setNumQuestions(opt.value)}
                    disabled={disabled}
                    className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                      active
                        ? 'border-tactical-blue bg-tactical-blue/15 text-white'
                        : disabled
                          ? 'border-navy-800 bg-navy-800/30 text-slate-600 cursor-not-allowed'
                          : 'border-navy-700 bg-navy-800/50 text-slate-300 hover:border-tactical-blue/60'
                    }`}
                  >
                    <span className="block text-base font-bold">{opt.label}</span>
                    <span className="block text-[10px] text-slate-500">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {pool > 0
                ? `${finalCount} pregunta${finalCount !== 1 ? 's' : ''} · ~${timeLabel} · 1.5 min por pregunta`
                : 'No hay preguntas disponibles en la selección.'}
            </p>
          </div>
        )}

        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-gold" />
              {multiple ? 'Temas del examen' : 'Elige el tema'}
            </h2>
            <span className="text-[11px] text-slate-500">
              {multiple
                ? (allSelected ? 'Todos los temas' : `${activeCategories.length} tema${activeCategories.length !== 1 ? 's' : ''}`)
                : (single ? '1 tema' : 'Todos los temas')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            {multiple
              ? 'Puedes combinar varios temas. Pulsa “Todos los temas” para quitarlos.'
              : 'Puedes cambiarlo después desde la pantalla del módulo.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <button
              onClick={() => toggleCategory('all')}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                isChecked(null) ? meta.accent : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`text-sm font-medium ${isChecked(null) ? 'text-white' : 'text-slate-200'}`}>
                  📚 Todos los temas
                </span>
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  isChecked(null) ? 'border-white/40 bg-white/20' : 'border-slate-600'
                }`}>
                  {isChecked(null) && <Check className="w-3 h-3 text-white" />}
                </span>
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">{questions.length} preguntas</span>
            </button>

            {categories.map(cat => {
              const count = counts.get(cat) || 0;
              const checked = isChecked(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                    checked ? meta.accent : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium leading-snug ${checked ? 'text-white' : 'text-slate-200'}`}>
                      {getCategoryDisplayName(getCategoryKey(cat))}
                    </span>
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      checked ? 'border-white/40 bg-white/20' : 'border-slate-600'
                    }`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">{count} preguntas</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-40 glass border-t border-navy-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 truncate">
              {multiple
                ? `${finalCount} preguntas · ~${timeLabel}`
                : `${finalCount} preguntas${single ? '' : ' · todos los temas'}`}
            </p>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {multiple ? 'Tiempo estimado 1.5 min por pregunta' : 'Sin límite de tiempo'}
            </p>
          </div>
          <button
            onClick={handleConfirm}
            disabled={!canContinue}
            className={`px-5 sm:px-7 py-3 rounded-xl font-bold text-sm sm:text-base border transition-all duration-300 btn-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${meta.button}`}
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5" />
            {meta.confirm}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
