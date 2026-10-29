'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, HeartHandshake, Flame, ShieldCheck, Target, BookOpen, Clock, X } from 'lucide-react';

const ICONS = {
  heart: HeartHandshake,
  flame: Flame,
  shield: ShieldCheck,
  target: Target,
  trophy: Trophy,
  book: BookOpen,
  clock: Clock,
} as const;

type IconKey = keyof typeof ICONS;

interface Card {
  icon: IconKey;
  title: string;
  text: string;
}

interface MotivationalMessage {
  headline: string;
  subheadline: string;
  intro: string;
  cards: Card[];
  button: string;
}

const MESSAGES: MotivationalMessage[] = [
  {
    headline: '¡Orgullo, {name}!',
    subheadline: 'Tu ejemplo inspira a toda tu promoción',
    intro: 'No cualquiera sostiene este ritmo de estudio día tras día. Tú lo estás logrando, Combatiente, y eso ya habla de tu temple. Lo que construyes hoy con esfuerzo, mañana será tu nuevo grado.',
    cards: [
      { icon: 'shield', title: 'La disciplina ya es tuya.', text: 'Lo más difícil lo venciste: empezar y no rendirte.' },
      { icon: 'target', title: 'Afina tu puntería.', text: 'Cada repaso corrige un detalle que puede valer puntos.' },
      { icon: 'heart', title: 'No estás solo.', text: 'Tu familia y tu institución caminan contigo, Combatiente.' },
    ],
    button: '¡A demostrarlo!',
  },
  {
    headline: '¡Sigue firme, {name}!',
    subheadline: 'Cada repaso es un paso más hacia el ascenso',
    intro: 'La diferencia entre llegar y quedarse cerca se llama constancia. Hoy sumas un día más de preparación, y ese día cuenta el doble cuando falta poco, Combatiente.',
    cards: [
      { icon: 'book', title: 'Repasa sin cansancio.', text: 'Temas cortos, mente fresca y repetición inteligente.' },
      { icon: 'clock', title: 'Entrena contra el reloj.', text: 'El simulacro con tiempo te da temple para el examen real.' },
      { icon: 'flame', title: 'Mantén el fuego encendido.', text: 'Un esfuerzo diario vale más que uno gigante al final.' },
    ],
    button: '¡Un día más, un paso más!',
  },
  {
    headline: '¡Qué nivel, {name}!',
    subheadline: 'Tu progreso habla por ti',
    intro: 'Mira atrás: ya no eres el mismo que empezó. Tus aciertos crecen y tus errores se hacen cada vez menos. Eso es el resultado de tu esfuerzo, Combatiente, y merece ser reconocido.',
    cards: [
      { icon: 'trophy', title: 'Celebra tus avances.', text: 'Cada mejora en tus estadísticas es una victoria real.' },
      { icon: 'target', title: 'Apunta más alto.', text: 'Ya tienes la base; ahora busca la excelencia.' },
      { icon: 'shield', title: 'No sueltes el ritmo.', text: 'El último tramo también se gana con disciplina.' },
    ],
    button: '¡A superarte!',
  },
  {
    headline: '¡Fuerza, {name}!',
    subheadline: 'El ascenso se gana en la constancia',
    intro: 'Habrá días de cansancio, y está bien sentirlo. Lo importante es lo que haces después: descansar, levantarte y volver a intentarlo. Así entrenan los que llegan, Combatiente.',
    cards: [
      { icon: 'heart', title: 'Descansa lo justo.', text: 'Recuperar energía también es parte de prepararse.' },
      { icon: 'flame', title: 'Vuelve con más fuerza.', text: 'Cada regreso demuestra tu compromiso.' },
      { icon: 'book', title: 'Hoy, una pregunta más.', text: 'Suma pequeñas dosis; el hábito hace la diferencia.' },
    ],
    button: '¡Retoma el entrenamiento!',
  },
  {
    headline: '¡Ya casi, {name}!',
    subheadline: 'El gran día está a la vista',
    intro: 'Falta poco y todo lo que has entrenado empieza a rendir frutos. Mantén la calma, confía en tu preparación y da el último empujón con la seguridad de un verdadero Combatiente.',
    cards: [
      { icon: 'clock', title: 'Cuida tu tiempo.', text: 'Duerme bien, hidrátate y llega al examen con mente clara.' },
      { icon: 'shield', title: 'Confía en tu preparación.', text: 'Ya hiciste el trabajo; ahora solo demuéstralo.' },
      { icon: 'trophy', title: 'Visualiza tu ascenso.', text: 'Imagínate lográndolo y camina hacia esa imagen.' },
    ],
    button: '¡Vamos por ese ascenso!',
  },
];

export default function MotivationalPopup({ nombre, onClose }: { nombre?: string; onClose: () => void }) {
  const [msg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  const displayName = (nombre || '').trim() || 'Combatiente';
  const headline = msg.headline.replace('{name}', displayName);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="glass rounded-2xl w-full max-w-md overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-gold/25 to-gold-dark/10 border-b border-gold/30 px-6 py-7 text-center">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700/70 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: 'spring', damping: 12 }}
            className="w-16 h-16 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center mx-auto mb-3"
          >
            <Trophy className="w-8 h-8 text-gold" />
          </motion.div>
          <h3 className="text-xl font-bold text-white leading-tight">{headline}</h3>
          <p className="text-gold text-sm font-medium mt-1">{msg.subheadline}</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">{msg.intro}</p>

          <div className="space-y-2.5">
            {msg.cards.map((card, i) => {
              const Icon = ICONS[card.icon];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.12 }}
                  className="flex items-start gap-3 bg-navy-800/60 rounded-xl p-3 border border-navy-700"
                >
                  <Icon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    <span className="text-white font-medium">{card.title}</span> {card.text}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-gold to-gold-dark text-navy-900 font-bold rounded-xl transition-all duration-300 hover:opacity-90 btn-glow"
          >
            {msg.button}
          </button>
          <p className="text-center text-xs text-slate-500">
            Simulador de Ascenso PNP - Promoción 2027
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
