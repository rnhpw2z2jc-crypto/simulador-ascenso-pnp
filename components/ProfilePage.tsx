'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Home as HomeIcon } from 'lucide-react';
import { hashPassword, verifyPassword } from '../lib/password';
import { updateUser } from '../lib/users';
import type { ExamResult } from './types';
import type { User as UserType } from './types';

export default function ProfilePage({ user, onUpdate, onBack }: { user: UserType; onUpdate: (u: UserType) => void; onBack: () => void }) {
  const [form, setForm] = useState({
    nombre: user.nombre, apellido: user.apellido, email: user.email
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  const history: ExamResult[] = JSON.parse(localStorage.getItem('simulador_history') || '[]');
  const totalExams = history.length;
  const avgScore = totalExams > 0 ? Math.round(history.reduce((s, r) => s + (r.score / r.totalQuestions * 100), 0) / totalExams) : 0;
  const bestScore = totalExams > 0 ? Math.max(...history.map(r => Math.round(r.score / r.totalQuestions * 100))) : 0;

  const handleSaveProfile = async () => {
    const updated = { ...user, ...form };
    await updateUser(updated);
    onUpdate(updated);
    setMsg('Perfil actualizado');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleChangePassword = async () => {
    const passwordValid = await verifyPassword(passwordForm.current, user.password);
    if (!passwordValid) { setMsg('Contrasena actual incorrecta'); return; }
    if (passwordForm.newPass.length < 6) { setMsg('Minimo 6 caracteres'); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { setMsg('Las contrasenas no coinciden'); return; }
    const hashedPassword = await hashPassword(passwordForm.newPass);
    const updated = { ...user, password: hashedPassword };
    await updateUser(updated);
    onUpdate(updated);
    setPasswordForm({ current: '', newPass: '', confirm: '' });
    setMsg('Contrasena cambiada');
    setTimeout(() => setMsg(''), 3000);
  };

  const remaining = user.membershipExpiry
    ? Math.max(0, Math.ceil((new Date(user.membershipExpiry).getTime() - Date.now()) / 86400000))
    : null;
  const expired = user.membershipExpiry ? new Date(user.membershipExpiry) < new Date() : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
              <User className="w-6 h-6 text-tactical-blue-light" />
            </div>
            <h1 className="font-bold text-white">MI PERFIL</h1>
          </div>
          <button onClick={onBack} className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors">
            <HomeIcon className="w-4 h-4" /> Volver
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {msg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg p-3 mb-4 text-sm ${msg.includes('incorrecta') || msg.includes('coinciden') ? 'bg-danger/20 border border-danger/50 text-danger' : 'bg-success/20 border border-success/50 text-success'}`}>
            {msg}
          </motion.div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400">Examenes</p>
            <p className="text-2xl font-bold text-white">{totalExams}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400">Promedio</p>
            <p className="text-2xl font-bold text-white">{avgScore}%</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400">Mejor</p>
            <p className="text-2xl font-bold text-success">{bestScore}%</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-slate-400">Membresia</p>
            {user.membershipExpiry ? (
              expired ? <p className="text-lg font-bold text-danger">Expirada</p> :
              <p className="text-lg font-bold text-success">{remaining}d</p>
            ) : (
              <p className="text-lg font-bold text-gold">Ilimitada</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('profile')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'profile' ? 'bg-tactical-blue/20 text-tactical-blue-light' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
            Datos Personales
          </button>
          <button onClick={() => setTab('password')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'password' ? 'bg-tactical-blue/20 text-tactical-blue-light' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
            Cambiar Contrasena
          </button>
        </div>

        {tab === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Datos Personales</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Usuario</label>
                  <p className="px-3 py-2 bg-navy-800/50 rounded-lg text-white text-sm">{user.username}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rol</label>
                  <p className="px-3 py-2 bg-navy-800/50 rounded-lg text-white text-sm">{user.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
                </div>
              </div>
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
              <button onClick={handleSaveProfile}
                className="px-6 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg transition-colors">
                Guardar Cambios
              </button>
            </div>
          </motion.div>
        )}

        {tab === 'password' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Cambiar Contrasena</h3>
            <div className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contrasena actual</label>
                <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nueva contrasena</label>
                <input type="password" value={passwordForm.newPass} onChange={e => setPasswordForm({...passwordForm, newPass: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Confirmar nueva contrasena</label>
                <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
              </div>
              <button onClick={handleChangePassword}
                className="px-6 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg transition-colors">
                Cambiar Contrasena
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
