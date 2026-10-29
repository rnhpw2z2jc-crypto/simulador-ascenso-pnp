'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Headphones, Check } from 'lucide-react';
import { hashPassword } from '../lib/password';
import { sanitizeUserInput, validateUsername, validateEmail } from '../lib/security';
import { getAllUsersPublic } from '../lib/users';
import type { User } from './types';

export default function AddUserModal({ onClose, onAdd }: { onClose: () => void; onAdd: (u: User, password: string) => void }) {
  const [form, setForm] = useState({
    username: '', password: '', nombre: '', apellido: '', email: '',
    membership: 'free' as 'free' | 'vip',
    audio: false
  });
  const [error, setError] = useState('');
  const [existingUsernames, setExistingUsernames] = useState<string[]>([]);
  const [usernameCheck, setUsernameCheck] = useState<'idle' | 'ok' | 'taken'>('idle');
  const VIP_EXPIRY = new Date(2026, 11, 31, 23, 59, 59, 999).toISOString();

  const normalize = (s: string) => s.trim().toLowerCase();

  useEffect(() => {
    getAllUsersPublic()
      .then(users => setExistingUsernames(users.map(u => normalize(u.username))))
      .catch(() => setExistingUsernames([]));
  }, []);

  const handleUsernameChange = (value: string) => {
    setForm({ ...form, username: value });
    const n = normalize(value);
    setUsernameCheck(!value.trim() ? 'idle' : existingUsernames.includes(n) ? 'taken' : 'ok');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.nombre || !form.apellido) {
      setError('Complete usuario, contrasena, nombre y apellido');
      return;
    }
    const usernameError = validateUsername(form.username);
    if (usernameError) { setError(usernameError); return; }
    if (usernameCheck === 'taken') {
      setError('Ese usuario ya esta en uso. Elija otro nombre');
      return;
    }
    if (usernameCheck === 'idle' && existingUsernames.includes(normalize(form.username))) {
      setError('Ese usuario ya esta en uso. Elija otro nombre');
      return;
    }
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
    const expiry: string | null = form.membership === 'vip' ? VIP_EXPIRY : new Date(Date.now() + 12 * 3600000).toISOString();
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
      features: { audio: form.audio },
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
            <input type="text" value={form.username} onChange={e => handleUsernameChange(e.target.value)}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
              style={usernameCheck === 'taken' ? { borderColor: '#ef4444' } : usernameCheck === 'ok' ? { borderColor: '#22c55e' } : undefined} required />
            {usernameCheck === 'taken' && <p className="text-xs text-danger mt-1">Ese nombre ya esta en uso</p>}
            {usernameCheck === 'ok' && <p className="text-xs text-success mt-1">Nombre disponible</p>}
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
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({...form, membership: 'free'})}
                className={`py-2 text-xs rounded-lg border transition-colors ${
                  form.membership === 'free' ? 'border-tactical-blue bg-tactical-blue/20 text-tactical-blue-light' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                }`}>
                FREE - 12h (prueba)
              </button>
              <button type="button" onClick={() => setForm({...form, membership: 'vip'})}
                className={`py-2 text-xs rounded-lg border transition-colors ${
                  form.membership === 'vip' ? 'border-gold bg-gold/20 text-gold' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                }`}>
                VIP - hasta 31 dic 2026
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">FREE = 12 horas de prueba. VIP = acceso hasta el 31/12/2026.</p>
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
            <button type="submit" className="flex-1 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg transition-colors">Crear</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
