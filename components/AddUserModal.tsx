'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { hashPassword } from '../lib/password';
import { sanitizeUserInput, validateUsername, validateEmail } from '../lib/security';
import type { User } from './types';

export default function AddUserModal({ onClose, onAdd }: { onClose: () => void; onAdd: (u: User, password: string) => void }) {
  const [form, setForm] = useState({
    username: '', password: '', nombre: '', apellido: '', email: '',
    membershipHours: '' as string | number
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.nombre || !form.apellido) {
      setError('Complete usuario, contrasena, nombre y apellido');
      return;
    }
    const usernameError = validateUsername(form.username);
    if (usernameError) { setError(usernameError); return; }
    if (form.email) {
      const emailError = validateEmail(form.email);
      if (emailError) { setError(emailError); return; }
    }
    if (form.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    const clean = sanitizeUserInput({
      username: form.username,
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
    });
    const hashedPassword = await hashPassword(form.password);
    let expiry: string | null = null;
    if (form.membershipHours === 'eoy') {
      const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
      expiry = endOfYear.toISOString();
    } else if (form.membershipHours) {
      expiry = new Date(Date.now() + Number(form.membershipHours) * 3600000).toISOString();
    }
    onAdd({
      id: Date.now().toString(),
      username: clean.username,
      nombre: clean.nombre,
      apellido: clean.apellido,
      email: clean.email,
      role: 'user',
      membershipExpiry: expiry,
      createdAt: new Date().toISOString(),
      status: 'active',
      devices: [],
      maxDevices: 1,
    }, hashedPassword);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Nuevo Usuario</h3>
        {error && <div className="bg-danger/20 border border-danger/50 rounded-lg p-2 mb-3 text-danger text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
              <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Apellido *</label>
              <input type="text" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" required />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Usuario *</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Contrasena *</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Membresia</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { h: 12, label: '12h' },
                { h: 168, label: '7d' },
                { h: 720, label: '30d' },
                { h: 2160, label: '90d' },
                { h: 8760, label: '365d' },
              ].map(o => (
                <button key={o.h} type="button" onClick={() => setForm({...form, membershipHours: o.h})}
                  className={`py-1.5 text-xs rounded-lg border transition-colors ${
                    form.membershipHours === o.h ? 'border-tactical-blue bg-tactical-blue/20 text-tactical-blue-light' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                  }`}>
                  {o.label}
                </button>
              ))}
              <button type="button" onClick={() => setForm({...form, membershipHours: form.membershipHours === 'eoy' ? '' : 'eoy'})}
                className={`py-1.5 text-xs rounded-lg border transition-colors ${
                  form.membershipHours === 'eoy' ? 'border-gold bg-gold/20 text-gold' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                }`}>
                31 dic
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">12h = prueba. 31 dic = hasta el {new Date().getFullYear()}-12-31. Sin seleccion = ilimitado</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg transition-colors">Crear</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
