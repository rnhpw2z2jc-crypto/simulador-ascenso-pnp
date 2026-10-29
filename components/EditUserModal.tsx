'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Headphones, Check } from 'lucide-react';
import type { User } from './types';

export default function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User, newPassword?: string) => void }) {
  const [form, setForm] = useState({
    nombre: user.nombre, apellido: user.apellido, email: user.email,
    password: '', membership: '' as '' | 'free' | 'vip',
    maxDevices: user.maxDevices,
    audio: !!user.features?.audio
  });

  const VIP_EXPIRY = new Date(2026, 11, 31, 23, 59, 59, 999).toISOString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.apellido) return;
    let expiry: string | null;
    if (form.membership === 'free') {
      expiry = new Date(Date.now() + 12 * 3600000).toISOString();
    } else if (form.membership === 'vip') {
      expiry = VIP_EXPIRY;
    } else {
      expiry = user.membershipExpiry;
    }
    const maxDevices = form.maxDevices;
    const devices = maxDevices === 1 ? user.devices.slice(0, 1) : user.devices;
    onSave({
      ...user,
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      membershipExpiry: expiry,
      maxDevices,
      devices,
      features: { ...user.features, audio: form.audio },
    }, form.password || undefined);
  };

  const currentExpiry = user.membershipExpiry;
  const isExpired = currentExpiry ? new Date(currentExpiry) < new Date() : false;
  const timeLeft = currentExpiry ? Math.max(0, new Date(currentExpiry).getTime() - Date.now()) : null;
  const daysLeft = timeLeft !== null ? Math.floor(timeLeft / 86400000) : null;
  const hoursLeft = timeLeft !== null ? Math.floor((timeLeft % 86400000) / 3600000) : null;
  const currentIsVip = currentExpiry
    ? new Date(currentExpiry).getFullYear() === 2026 && new Date(currentExpiry).getMonth() === 11 && new Date(currentExpiry).getDate() === 31
    : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Editar: {user.username}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Apellido</label>
              <input type="text" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nueva contrasena (vacio = no cambiar)</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Membresia</label>
            {currentExpiry && (
              <p className={`text-xs mb-2 ${isExpired ? 'text-danger' : 'text-success'}`}>
                Actual: {isExpired ? 'Expirada' : `${daysLeft}d ${hoursLeft}h restantes`} ({new Date(currentExpiry).toLocaleDateString('es-PE')})
              </p>
            )}
            {!currentExpiry && (
              <p className="text-xs text-slate-500 mb-2">Sin membresia (acceso ilimitado)</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({...form, membership: form.membership === 'free' ? '' : 'free'})}
                className={`py-2 text-xs rounded-lg border transition-colors ${
                  form.membership === 'free' ? 'border-tactical-blue bg-tactical-blue/20 text-tactical-blue-light' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                }`}>
                FREE - 12h (prueba)
              </button>
              <button type="button" onClick={() => setForm({...form, membership: form.membership === 'vip' ? '' : 'vip'})}
                className={`py-2 text-xs rounded-lg border transition-colors ${
                  form.membership === 'vip' || (form.membership === '' && currentIsVip) ? 'border-gold bg-gold/20 text-gold' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                }`}>
                VIP - hasta 31 dic 2026
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">FREE = 12 horas de prueba. VIP = acceso hasta el 31/12/2026. Sin seleccion = mantener la membresia actual</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Dispositivos permitidos</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({...form, maxDevices: 1})}
                className={`py-2 text-xs rounded-lg border transition-colors ${
                  form.maxDevices === 1 ? 'border-tactical-blue bg-tactical-blue/20 text-tactical-blue-light' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                }`}>
                1 dispositivo
              </button>
              <button type="button" onClick={() => setForm({...form, maxDevices: 2})}
                className={`py-2 text-xs rounded-lg border transition-colors ${
                  form.maxDevices === 2 ? 'border-tactical-blue bg-tactical-blue/20 text-tactical-blue-light' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                }`}>
                2 dispositivos
              </button>
            </div>
            {form.maxDevices === 1 && user.devices.length > 1 && (
              <p className="text-xs text-warning mt-1">Se liberara el dispositivo sobrante (quedan {user.devices.length - 1} vinculado).</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Funcionalidades adicionales</label>
            <button type="button" onClick={() => setForm({ ...form, audio: !form.audio })}
              className={`w-full p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                form.audio ? 'border-gold bg-gold/10' : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
              }`}>
              <span className="flex items-center gap-2 text-left">
                <Headphones className={`w-4 h-4 flex-shrink-0 ${form.audio ? 'text-gold' : 'text-slate-400'}`} />
                <span>
                  <span className={`block text-sm font-medium ${form.audio ? 'text-gold' : 'text-white'}`}>Modo Audio 🎧</span>
                  <span className="block text-[11px] text-slate-500">Audio Tactico: preguntas por tema en voz alta</span>
                </span>
              </span>
              <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                form.audio ? 'border-gold bg-gold' : 'border-slate-500'
              }`}>
                {form.audio && <Check className="w-3 h-3 text-navy-900" />}
              </span>
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg transition-colors">Guardar</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
