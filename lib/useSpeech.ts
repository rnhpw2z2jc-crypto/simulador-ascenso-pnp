'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeakOptions {
  /** Se llama al terminar toda la cola */
  onEnd?: () => void;
  /** Se llama al empezar cada segmento (índice) */
  onSegment?: (index: number) => void;
}

export interface UseSpeech {
  supported: boolean;
  speaking: boolean;
  paused: boolean;
  voices: SpeechSynthesisVoice[];
  voiceURI: string;
  setVoiceURI: (uri: string) => void;
  rate: number;
  setRate: (rate: number) => void;
  speak: (segments: string[], options?: SpeakOptions) => boolean;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
}

const SEGMENT_GAP_MS = 60;

/**
 * Voz del navegador (Web Speech API) para el modulo Audio Tactico.
 * - Sin costo ni servidores.
 * - Requiere un gesto del usuario (iOS/Android no permiten autoplay).
 * - Las voces cargan de forma asincrona: se escucha `voiceschanged`.
 */
export function useSpeech(): UseSpeech {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState('');
  const [rate, setRateState] = useState(1);

  const queueRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const optionsRef = useRef<SpeakOptions>({});
  const stoppedRef = useRef(true);
  const rateRef = useRef(1);
  const voiceRef = useRef('');
  const supportedRef = useRef(false);
  const runRef = useRef<() => void>(() => {});

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    voiceRef.current = voiceURI;
  }, [voiceURI]);

  // Carga de voces (async en Chrome/Android/iOS)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    supportedRef.current = true;
    setSupported(true);

    const loadVoices = () => {
      const all = synth.getVoices();
      if (!all || all.length === 0) return;
      setVoices(all);
      setVoiceURIState(prev => {
        if (prev && all.some(v => v.voiceURI === prev)) return prev;
        const femaleHint = /paulina|sabina|m[oó]nica|helena|laura|luc[ií]a|isabela|camila|marisol|female/i;
        const mx = all.filter(v => /^es[-_]MX/i.test(v.lang));
        const pick =
          mx.find(v => femaleHint.test(v.name)) ||
          mx[0] ||
          all.find(v => /^es[-_]419/i.test(v.lang)) ||
          all.find(v => /^es[-_]US/i.test(v.lang)) ||
          all.find(v => /^es[-_]PE/i.test(v.lang)) ||
          all.find(v => /^es[-_]ES/i.test(v.lang)) ||
          all.find(v => /^es/i.test(v.lang)) ||
          all[0];
        return pick ? pick.voiceURI : prev;
      });
    };

    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);
    const timer = setTimeout(loadVoices, 500);

    return () => {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', loadVoices);
      try { synth.cancel(); } catch {}
    };
  }, []);

  const run = () => {
    if (!supportedRef.current || stoppedRef.current) return;
    const synth = window.speechSynthesis;
    const queue = queueRef.current;
    const i = indexRef.current;

    if (i >= queue.length) {
      stoppedRef.current = true;
      setSpeaking(false);
      setPaused(false);
      const cb = optionsRef.current.onEnd;
      optionsRef.current = {};
      cb?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(queue[i]);
    utterance.rate = rateRef.current;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'es-MX';

    const voice = synth.getVoices().find(v => v.voiceURI === voiceRef.current);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    let finished = false;
    const goNext = () => {
      if (finished) return;
      finished = true;
      if (stoppedRef.current) return;
      indexRef.current = i + 1;
      optionsRef.current.onSegment?.(i + 1);
      runRef.current();
    };

    utterance.onend = goNext;
    utterance.onerror = (event) => {
      // "interrupted"/"canceled" son parte de stop() o cambios de voz
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      goNext();
    };

    optionsRef.current.onSegment?.(i);

    try {
      synth.speak(utterance);
    } catch {
      goNext();
    }
  };

  useEffect(() => {
    runRef.current = run;
  });

  const speak = useCallback((segments: string[], options?: SpeakOptions) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    const clean = segments.map(s => (s || '').trim()).filter(Boolean);
    if (clean.length === 0) return false;

    const synth = window.speechSynthesis;
    synth.cancel();

    stoppedRef.current = false;
    queueRef.current = clean;
    indexRef.current = 0;
    optionsRef.current = options || {};
    setSpeaking(true);
    setPaused(false);

    // Algunos navegadores ignoran speak() justo despues de cancel()
    setTimeout(() => {
      if (!stoppedRef.current) runRef.current();
    }, SEGMENT_GAP_MS);

    return true;
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    queueRef.current = [];
    indexRef.current = 0;
    optionsRef.current = {};
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    setSpeaking(false);
    setPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.pause();
      setPaused(true);
    } catch {}
  }, []);

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.resume();
      setPaused(false);
    } catch {}
  }, []);

  const togglePause = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (window.speechSynthesis.paused) {
      resume();
    } else if (window.speechSynthesis.speaking) {
      pause();
    } else {
      // Nada en curso: el componente decide que reproducir
      setPaused(false);
    }
  }, [pause, resume]);

  // Fallback: si el navegador deja de reportar "speaking", el estado se sincroniza
  useEffect(() => {
    if (!speaking) return;
    const iv = setInterval(() => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const synth = window.speechSynthesis;
      if (!synth.speaking && !synth.pending && !synth.paused && !stoppedRef.current) {
        // La cola ya termino sin disparar onEnd (caso iOS)
        stoppedRef.current = true;
        setSpeaking(false);
        setPaused(false);
        const cb = optionsRef.current.onEnd;
        optionsRef.current = {};
        cb?.();
      }
    }, 1200);
    return () => clearInterval(iv);
  }, [speaking]);

  const setVoiceURI = useCallback((uri: string) => {
    setVoiceURIState(uri);
    voiceRef.current = uri;
  }, []);

  const setRate = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0.5, Math.round(value * 10) / 10));
    setRateState(clamped);
    rateRef.current = clamped;
  }, []);

  return {
    supported,
    speaking,
    paused,
    voices,
    voiceURI,
    setVoiceURI,
    rate,
    setRate,
    speak,
    stop,
    pause,
    resume,
    togglePause,
  };
}
