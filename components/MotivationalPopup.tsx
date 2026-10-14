'use client';

import { motion } from 'framer-motion';
import { Trophy, HeartHandshake, Flame, ShieldCheck, X } from 'lucide-react';

export default function MotivationalPopup({ nombre, onClose }: { nombre?: string; onClose: () => void }) {
  const displayName = (nombre || '').trim();

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
        className="glass rounded-2xl w-full max-w-md overflow-hidden"
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
          <div className="w-16 h-16 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-gold" />
          </div>
          <h3 className="text-xl font-bold text-white leading-tight">
            ¡Felicidades, {displayName ? displayName : 'Combatiente'}!
          </h3>
          <p className="text-gold text-sm font-medium mt-1">Ya casi llega el día del ascenso</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            Tu esfuerzo de cada día no pasa desapercibido. Cada pregunta que resuelves y cada error que
            corriges te acercan un poco más a la meta que te has propuesto. <span className="text-gold font-semibold">Llevas el ritmo
            de un verdadero Combatiente</span>: disciplina, constancia y corazón.
          </p>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 bg-navy-800/60 rounded-xl p-3 border border-navy-700">
              <HeartHandshake className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                <span className="text-white font-medium">¡Lo estás haciendo genial!</span> Mantén la calma,
                confía en tu preparación y avanza con seguridad.
              </p>
            </div>
            <div className="flex items-start gap-3 bg-navy-800/60 rounded-xl p-3 border border-navy-700">
              <Flame className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                <span className="text-white font-medium">Faltan pocos días.</span> Repasa tus errores con el
                Reforzamiento Táctico y entrena cada día. La constancia vence al talento.
              </p>
            </div>
            <div className="flex items-start gap-3 bg-navy-800/60 rounded-xl p-3 border border-navy-700">
              <ShieldCheck className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                <span className="text-white font-medium">Nos vemos del otro lado, Combatiente.</span> La PNP
                premia al más constante. ¡Dale con todo!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-gold to-gold-dark text-navy-900 font-bold rounded-xl transition-all duration-300 hover:opacity-90 btn-glow"
          >
            ¡A seguir preparándose!
          </button>
          <p className="text-center text-xs text-slate-500">
            Simulador de Ascenso PNP - Promoción 2027
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
