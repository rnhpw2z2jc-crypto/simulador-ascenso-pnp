'use client';

import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';

export default function RegisterPage({ onBack }: { onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tactical-blue/20 border-2 border-tactical-blue mb-4">
            <Shield className="w-8 h-8 text-tactical-blue-light" />
          </div>
          <h1 className="text-2xl font-bold text-white">Registro Deshabilitado</h1>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 text-center"
        >
          <p className="text-slate-300 text-sm mb-4">
            El registro de usuarios esta deshabilitado por seguridad.
          </p>
          <p className="text-slate-400 text-xs mb-6">
            Solo el administrador puede crear cuentas nuevas. Contacte al administrador para obtener acceso.
          </p>
          <button
            onClick={onBack}
            className="w-full py-2.5 bg-navy-700 hover:bg-navy-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Login
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
