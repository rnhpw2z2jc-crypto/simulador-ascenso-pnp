'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { User } from './types';

export default function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) {
  const [form, setForm] = useState({
    nombre: user.nombre, apellido: user.apellido, email: user.email,
    password: '', membershipHours: '' as string | number
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.apellido) return;
    const expiry = form.membershipHours
      ? new Date(Date.now() + Number(form.membershipHours) * 3600000).toISOString()
      : user.membershipExpiry;
    onSave({
      ...user,
      ...form,
      membershipExpiry: expiry,
      password: form.password || user.password,
    });
  };

  const currentExpiry = user.membershipExpiry;
  const isExpired = currentExpiry ? new Date(currentExpiry) < new Date() : false;
  const timeLeft = currentExpiry ? Math.max(0, new Date(currentExpiry).getTime() - Date.now()) : null;
  const daysLeft = timeLeft !== null ? Math.floor(timeLeft / 86400000) : null;
  const hoursLeft = timeLeft !== null ? Math.floor((timeLeft % 86400000) / 3600000) : null;

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
            <div className="grid grid-cols-4 gap-2">
              {[
                { h: 12, label: '12h', sub: 'Prueba' },
                { h: 168, label: '7d', sub: '' },
                { h: 360, label: '15d', sub: '' },
                { h: 720, label: '30d', sub: '' },
                { h: 1440, label: '60d', sub: '' },
                { h: 2160, label: '90d', sub: '' },
                { h: 4320, label: '180d', sub: '' },
                { h: 8760, label: '365d', sub: '' },
              ].map(o => (
                <button key={o.h} type="button" onClick={() => setForm({...form, membershipHours: o.h})}
                  className={`py-1.5 text-xs rounded-lg border transition-colors ${
                    form.membershipHours === o.h ? 'border-tactical-blue bg-tactical-blue/20 text-tactical-blue-light' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-1">12h = periodo de prueba. Sin seleccion = mantener actual</p>
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
