'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Play, Pause, SkipBack, SkipForward, RotateCcw, Volume2,
  Headphones, Eye, Scale, Check, AlertTriangle, Gauge, ListMusic
} from 'lucide-react';
import { getCategoryKey, getCategoryDisplayName } from '../lib/categoryUtils';
import { formatLegalBasis } from '../lib/legalBasis';
import { safeGetJSON, safeSetJSON } from '../lib/storage';
import { useSpeech } from '../lib/useSpeech';
import type { Question } from './types';

const PROGRESS_KEY = 'simulador_audio_progress';
const LETTERS = 'ABCDEFGHIJ';

type ProgressMap = Record<string, number>;
type StudyMode = 'estudio' | 'evaluacion';

const RATES = [0.5, 0.8, 1];

function letterAt(i: number): string {
  return LETTERS[i] || String(i + 1);
}

function sentence(text: string): string {
  const value = (text || '').trim();
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function buildAnswerSegments(q: Question): string[] {
  const norm = getCategoryDisplayName(getCategoryKey(q.category));
  const legal = formatLegalBasis(q.legalBasis);
  return [
    `Respuesta correcta. Opción ${letterAt(q.correctAnswer)}. ${sentence(q.options[q.correctAnswer])}`,
    `Sustento legal. ${norm}.${legal ? ` ${sentence(legal)}` : ''}`,
  ];
}

function buildQuestionSegments(q: Question, index: number, total: number, withAnswer: boolean, readOptions: boolean): string[] {
  const segments: string[] = [];
  segments.push(`Pregunta ${index + 1} de ${total}.`);
  segments.push(sentence(q.question));
  if (readOptions) {
    q.options.forEach((option, i) => {
      segments.push(`Opción ${letterAt(i)}. ${sentence(option)}`);
    });
  }
  if (withAnswer) {
    segments.push(...buildAnswerSegments(q));
  } else {
    segments.push(readOptions ? 'Piense su respuesta.' : 'Tome unos segundos para recordar la respuesta.');
  }
  return segments;
}

export default function AudioTacticoPage({ questions, onBack, initialCategory, onChangeTheme }: {
  questions: Question[];
  onBack: () => void;
  initialCategory?: string | null;
  onChangeTheme?: () => void;
}) {
  const [category] = useState<string | null>(initialCategory ?? null);
  const [size, setSize] = useState<number>(10);
  const [mode, setMode] = useState<StudyMode>('estudio');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [readOptions, setReadOptions] = useState(false);
  const [started, setStarted] = useState(false);
  const [session, setSession] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});

  const {
    supported, speaking, paused, voices, voiceURI, setVoiceURI,
    rate, setRate, speak, stop, togglePause,
  } = useSpeech();

  const sessionRef = useRef<Question[]>([]);
  const indexRef = useRef(0);
  const modeRef = useRef<StudyMode>('estudio');
  const autoAdvanceRef = useRef(true);
  const readOptionsRef = useRef(false);
  const categoryRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playRef = useRef<(list: Question[], i: number, reveal?: boolean) => void>(() => {});

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { autoAdvanceRef.current = autoAdvance; }, [autoAdvance]);
  useEffect(() => { readOptionsRef.current = readOptions; }, [readOptions]);
  useEffect(() => { categoryRef.current = category; }, [category]);

  useEffect(() => {
    if (mode === 'evaluacion') setShowAnswer(false);
  }, [mode]);

  useEffect(() => {
    setProgressMap(safeGetJSON<ProgressMap>(PROGRESS_KEY, {}));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Mantiene la pantalla encendida mientras se reproduce
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (!speaking || !nav.wakeLock || document.visibilityState !== 'visible') return;
        const acquired = await nav.wakeLock.request('screen');
        if (cancelled) {
          acquired.release().catch(() => {});
        } else {
          lock = acquired;
        }
      } catch {
        // El wake lock es opcional
      }
    };
    if (speaking) request();
    return () => {
      cancelled = true;
      if (lock) lock.release().catch(() => {});
    };
  }, [speaking]);

  const playIndex = (list: Question[], i: number, revealOverride?: boolean) => {
    const q = list[i];
    if (!q) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    indexRef.current = i;
    setIndex(i);

    const reveal = revealOverride ?? (modeRef.current === 'estudio');
    setShowAnswer(reveal);

    // En Evaluacion las opciones son necesarias; en Estudio son opcionales
    const withOptions = modeRef.current === 'evaluacion' || readOptionsRef.current;
    const segments = buildQuestionSegments(q, i, list.length, reveal, withOptions);
    speak(segments, {
      onEnd: () => {
        if (modeRef.current !== 'estudio' || !autoAdvanceRef.current) return;
        if (i >= list.length - 1) return;
        timerRef.current = setTimeout(() => {
          playRef.current(list, i + 1);
        }, 1000);
      },
    });

    const key = categoryRef.current ?? 'all';
    setProgressMap(prev => {
      const next = { ...prev, [key]: i };
      safeSetJSON(PROGRESS_KEY, next);
      return next;
    });
  };

  useEffect(() => {
    playRef.current = playIndex;
  });

  const pool = category ? questions.filter(q => q.category === category) : questions;
  const current = session[index];
  const normName = current ? getCategoryDisplayName(getCategoryKey(current.category)) : '';
  const legalBasis = formatLegalBasis(current?.legalBasis);
  const savedIndex = progressMap[category ?? 'all'] ?? 0;
  const spanishVoices = voices.filter(v => /^es/i.test(v.lang));

  const startSession = () => {
    if (pool.length === 0) return;
    const list = size === 0 ? pool : pool.slice(0, Math.min(size, pool.length));
    const startAt = Math.min(Math.max(0, savedIndex), list.length - 1);

    sessionRef.current = list;
    setSession(list);
    setStarted(true);
    setIndex(startAt);
    setShowAnswer(false);
    playRef.current(list, startAt);
  };

  const jump = (i: number) => {
    const list = sessionRef.current;
    if (i < 0 || i >= list.length) return;
    playRef.current(list, i);
  };

  const handlePlayPause = () => {
    if (!started) {
      startSession();
      return;
    }
    if (speaking) {
      togglePause();
      return;
    }
    playRef.current(sessionRef.current, indexRef.current);
  };

  const revealAnswer = () => {
    const list = sessionRef.current;
    const q = list[indexRef.current];
    if (!q) return;
    setShowAnswer(true);
    speak(buildAnswerSegments(q));
  };

  const restartSession = () => {
    stop();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    sessionRef.current = [];
    setSession([]);
    setStarted(false);
    setIndex(0);
    setShowAnswer(false);
  };

  const handleBack = () => {
    stop();
    onBack();
  };

  const answered = mode === 'estudio' || showAnswer;
  const isPlaying = speaking && !paused;
  const canRestart = started && session.length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen flex flex-col">
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-5 h-5 text-gold" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-white text-sm sm:text-base truncate">AUDIO TACTICO 🎧</h1>
                <p className="text-[11px] text-slate-400 truncate">Escucha las preguntas por tema, sin mirar la pantalla</p>
              </div>
            </div>
            <button onClick={handleBack} className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs text-white rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0">
              <Home className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
          {started && session.length > 0 && (
            <>
              <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-gold to-gold-dark"
                  animate={{ width: `${((index + 1) / session.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>Pregunta {index + 1} de {session.length}</span>
                <span className="hidden sm:inline">{normName}</span>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-40">
        {!supported && (
          <div className="mb-4 p-4 bg-warning/15 border border-warning/40 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-warning font-semibold text-sm">Tu navegador no soporta la voz</p>
              <p className="text-xs text-slate-400">Prueba con Chrome, Edge o Safari actualizado. Tambien puedes escuchar el audio desde tu celular.</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!started ? (
            <motion.div key="setup" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="space-y-5">
              <div className="glass rounded-2xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Tema seleccionado</p>
                    <h2 className="text-white font-semibold flex items-center gap-2 truncate">
                      <ListMusic className="w-5 h-5 text-gold flex-shrink-0" />
                      {category ? getCategoryDisplayName(getCategoryKey(category)) : '📚 Todos los temas'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {pool.length} preguntas disponibles · se leerá la pregunta, la respuesta correcta y el sustento legal.
                    </p>
                  </div>
                  {onChangeTheme && (
                    <button
                      onClick={() => { stop(); onChangeTheme(); }}
                      className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 transition-colors flex-shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Cambiar tema
                    </button>
                  )}
                </div>
              </div>

              <div className="glass rounded-2xl p-5 sm:p-6">
                <h2 className="text-white font-semibold mb-3">Tamano de la sesion</h2>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 10, label: '10 preguntas', hint: '~8 min' },
                    { value: 20, label: '20 preguntas', hint: '~15 min' },
                    { value: 0, label: 'Todas', hint: 'sin limite' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSize(opt.value)}
                      className={`p-3 rounded-xl border text-center transition-all duration-200 ${
                        size === opt.value
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-navy-700 bg-navy-800/50 text-slate-300 hover:border-gold/60'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className="block text-[11px] text-slate-500">{opt.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Tienes {pool.length} preguntas disponibles en {category ? getCategoryDisplayName(getCategoryKey(category)) : 'todos los temas'}.
                </p>
              </div>

              <div className="glass rounded-2xl p-5 sm:p-6">
                <h2 className="text-white font-semibold mb-3">Modo de escucha</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('estudio')}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                      mode === 'estudio'
                        ? 'border-gold bg-gold/10'
                        : 'border-navy-700 bg-navy-800/50 hover:border-gold/60'
                    }`}
                  >
                    <span className={`block text-sm font-semibold ${mode === 'estudio' ? 'text-gold' : 'text-white'}`}>🎧 Estudio</span>
                    <span className="block text-xs text-slate-400">Pregunta, respuesta correcta y sustento legal. Sin alternativas por defecto.</span>
                  </button>
                  <button
                    onClick={() => setMode('evaluacion')}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                      mode === 'evaluacion'
                        ? 'border-gold bg-gold/10'
                        : 'border-navy-700 bg-navy-800/50 hover:border-gold/60'
                    }`}
                  >
                    <span className={`block text-sm font-semibold ${mode === 'evaluacion' ? 'text-gold' : 'text-white'}`}>🧠 Evaluacion</span>
                    <span className="block text-xs text-slate-400">Lee la pregunta y las opciones. La respuesta se revela a tu ritmo.</span>
                  </button>
                </div>
                <label className="mt-4 flex items-center justify-between gap-3 p-3 rounded-xl bg-navy-800/50 border border-navy-700 cursor-pointer">
                  <span className="text-sm text-slate-300">Avance automatico (solo en Estudio)</span>
                  <input
                    type="checkbox"
                    checked={autoAdvance}
                    onChange={e => setAutoAdvance(e.target.checked)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                </label>
                <label className="mt-2 flex items-center justify-between gap-3 p-3 rounded-xl bg-navy-800/50 border border-navy-700 cursor-pointer">
                  <span>
                    <span className="block text-sm text-slate-300">Leer tambien las opciones</span>
                    <span className="block text-[11px] text-slate-500">Solo en Estudio. En Evaluacion siempre se leen.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={readOptions}
                    onChange={e => setReadOptions(e.target.checked)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                </label>
              </div>

              <button
                onClick={startSession}
                disabled={pool.length === 0}
                className="w-full py-4 bg-gradient-to-r from-gold to-gold-dark hover:opacity-90 text-navy-900 font-bold text-lg rounded-xl transition-all duration-300 btn-glow flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-6 h-6" />
                INICIAR AUDIO
              </button>
              <p className="text-xs text-slate-500 text-center">
                Usa audifonos. La reproduccion requiere un toque en pantalla; nunca inicia sola.
              </p>
            </motion.div>
          ) : (
            <motion.div key="player" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-gold/20 text-gold text-xs font-medium rounded-full">
                  {current ? getCategoryDisplayName(getCategoryKey(current.category)) : 'Sesion'}
                </span>
                <span className="px-3 py-1 bg-navy-800 text-slate-300 text-xs rounded-full">
                  {mode === 'estudio' ? '🎧 Estudio' : '🧠 Evaluacion'}
                </span>
                <button onClick={() => { if (onChangeTheme) { stop(); onChangeTheme(); } else { restartSession(); } }} className="ml-auto px-3 py-1 bg-navy-800 hover:bg-navy-700 text-slate-300 text-xs rounded-lg flex items-center gap-1.5 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Cambiar tema
                </button>
              </div>

              {current ? (
                <div className="glass rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500">Pregunta {index + 1} de {session.length}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5" /> {isPlaying ? 'Reproduciendo' : paused ? 'En pausa' : 'Detenido'}
                    </span>
                  </div>

                  <h2 className="text-lg text-white leading-relaxed mb-4">{current.question}</h2>

                  <div className="space-y-2">
                    {current.options.map((option, i) => {
                      const isRight = i === current.correctAnswer;
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border flex items-start gap-3 ${
                            answered && isRight
                              ? 'border-success bg-success/15'
                              : 'border-navy-700 bg-navy-800/40'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            answered && isRight
                              ? 'border-success bg-success text-white'
                              : 'border-slate-500 text-slate-400'
                          }`}>
                            {letterAt(i)}
                          </span>
                          <span className={`text-sm leading-relaxed ${answered && isRight ? 'text-white' : 'text-slate-300'}`}>
                            {option}
                          </span>
                          {answered && isRight && <Check className="w-4 h-4 text-success ml-auto flex-shrink-0 mt-1" />}
                        </div>
                      );
                    })}
                  </div>

                  {answered && (
                    <div className="mt-4 p-3 rounded-lg bg-navy-800/40 border border-white/10">
                      <div className="flex items-start gap-2">
                        <Scale className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-gold font-semibold">Sustento legal</p>
                          <p className="text-sm text-white font-medium mt-0.5">{normName}</p>
                          {legalBasis && <p className="text-xs text-slate-400 mt-0.5">{legalBasis}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {!answered && (
                    <button
                      onClick={revealAnswer}
                      className="mt-4 w-full py-3 bg-navy-800 hover:bg-navy-700 border border-gold/40 text-gold font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-5 h-5" /> MOSTRAR RESPUESTA
                    </button>
                  )}
                </div>
              ) : (
                <div className="glass rounded-xl p-10 text-center">
                  <p className="text-slate-400">Sin preguntas para este audio.</p>
                </div>
              )}

              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5"><Gauge className="w-4 h-4" /> Velocidad</span>
                  <div className="flex gap-1.5">
                    {RATES.map(r => (
                      <button
                        key={r}
                        onClick={() => setRate(r)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                          rate === r
                            ? 'border-gold bg-gold/20 text-gold'
                            : 'border-navy-700 bg-navy-800/60 text-slate-400 hover:border-gold/50'
                        }`}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Voz</span>
                  {(spanishVoices.length > 0 ? spanishVoices : voices).length > 0 ? (
                    <select
                      value={voiceURI}
                      onChange={e => setVoiceURI(e.target.value)}
                      className="max-w-[220px] sm:max-w-xs bg-navy-800 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-gold"
                    >
                      {(spanishVoices.length > 0 ? spanishVoices : voices).map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-500">Voz del sistema</span>
                  )}
                </div>
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Leer opciones (solo en Estudio)
                  </span>
                  <input
                    type="checkbox"
                    checked={readOptions}
                    onChange={e => setReadOptions(e.target.checked)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {started && (
        <footer className="glass border-t border-navy-700 sticky bottom-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
            <button
              onClick={() => jump(index - 1)}
              disabled={index === 0}
              className="p-3 bg-navy-800 hover:bg-navy-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Anterior"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={!supported || session.length === 0}
              className="flex-1 max-w-xs py-3 bg-gradient-to-r from-gold to-gold-dark hover:opacity-90 text-navy-900 font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isPlaying ? 'PAUSAR' : paused ? 'CONTINUAR' : 'REPRODUCIR'}
            </button>

            <button
              onClick={() => jump(index + 1)}
              disabled={index >= session.length - 1}
              className="p-3 bg-navy-800 hover:bg-navy-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Siguiente"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={() => playRef.current(sessionRef.current, indexRef.current)}
              disabled={session.length === 0}
              className="p-3 bg-navy-800 hover:bg-navy-700 text-slate-300 rounded-xl transition-colors disabled:opacity-40"
              title="Repetir"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          {canRestart && (
            <div className="max-w-4xl mx-auto px-4 pb-3 -mt-1 text-center">
              <span className="text-[11px] text-slate-500">
                Progreso guardado: {category ? getCategoryDisplayName(getCategoryKey(category)) : 'Todos los temas'} · pregunta {savedIndex + 1}
              </span>
            </div>
          )}
        </footer>
      )}
    </motion.div>
  );
}
