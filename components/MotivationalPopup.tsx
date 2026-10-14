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
    headline: '¡Felicidades, {name}!',
    subheadline: 'Ya casi llega el día del ascenso',
    intro: 'Tu esfuerzo de cada día no pasa desapercibido. Cada pregunta que resuelves y cada error que corriges te acercan un poco más a la meta. Llevas el ritmo de un verdadero Combatiente: disciplina, constancia y corazón.',
    cards: [
      { icon: 'heart', title: '¡Lo estás haciendo genial!', text: 'Mantén la calma, confía en tu preparación y avanza con seguridad.' },
      { icon: 'flame', title: 'Faltan pocos días.', text: 'Repasa tus errores con el Reforzamiento Táctico y entrena cada día. La constancia vence al talento.' },
      { icon: 'shield', title: 'Nos vemos del otro lado, Combatiente.', text: 'La PNP premia al más constante. ¡Dale con todo!' },
    ],
    button: '¡A seguir preparándose!',
  },
  {
    headline: '¡Adelante, {name}!',
    subheadline: 'Cada pregunta te acerca a tu ascenso',
    intro: 'El examen está cerca, pero tu preparación está aún más cerca de la meta. Recorre este tramo final con la disciplina que te caracteriza, Combatiente.',
    cards: [
      { icon: 'target', title: 'Enfócate en lo que fallas.', text: 'Refuerza tus puntos débiles; ahí está tu mayor avance.' },
      { icon: 'flame', title: 'Constancia, no prisa.', text: 'Un poco cada día vale más que todo de golpe.' },
      { icon: 'trophy', title: 'La meta es tuya.', text: 'Visualízate ascendiendo. Ya estás muy cerca.' },
    ],
    button: '¡Vamos con todo!',
  },
  {
    headline: '¡Ánimo, {name}!',
    subheadline: 'El ascenso se gana con constancia',
    intro: 'Los grandes logros se construyen con pequeños actos repetidos cada día. Tú ya vas por buen camino, Combatiente, y el examen está a la vuelta de la esquina.',
    cards: [
      { icon: 'book', title: 'Estudia con método.', text: 'Alterna temas, descansa y vuelve con la mente fresca.' },
      { icon: 'flame', title: 'No aflojes ahora.', text: 'El tramo final es el que más pesa. Sigue firme.' },
      { icon: 'heart', title: 'Estamos contigo.', text: 'Cada vez que entrenas, te acompañamos.' },
    ],
    button: '¡Seguimos entrenando!',
  },
  {
    headline: '¡Buen trabajo, {name}!',
    subheadline: 'Tu disciplina es tu mejor arma',
    intro: 'Cada minuto que dedicas a prepararte cuenta el doble. Llegaste hasta aquí por mérito propio, Combatiente, y falta muy poco para el gran día.',
    cards: [
      { icon: 'shield', title: 'Protege tu enfoque.', text: 'Menos distracciones, más preguntas resueltas.' },
      { icon: 'clock', title: 'Administra tu tiempo.', text: 'Practica con el cronómetro del simulacro para llegar sobrado.' },
      { icon: 'trophy', title: 'Confía en ti.', text: 'Ya tienes el nivel. Solo falta demostrarlo.' },
    ],
    button: '¡A por el ascenso!',
  },
  {
    headline: '¡Vamos, {name}!',
    subheadline: 'Falta poco para el gran día',
    intro: 'Si hoy dudas, mañana agradecerás no haberte rendido. Tu preparación es la mejor prueba de tu compromiso, Combatiente. El ascenso se acerca y tú estás listo.',
    cards: [
      { icon: 'flame', title: 'La pasión te mueve.', text: 'Recuerda por qué empezaste y sigue adelante.' },
      { icon: 'target', title: 'Mide tu progreso.', text: 'Mira tus estadísticas y celebra cada mejora.' },
      { icon: 'heart', title: 'Cuenta con nosotros.', text: 'Aquí estás entrenando como los grandes.' },
    ],
    button: '¡No te detengas!',
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
