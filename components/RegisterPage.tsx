'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, AlertTriangle, Loader2, Check } from 'lucide-react';
import { sanitizeUserInput, validatePassword, validateUsername, validateEmail, checkRateLimit } from '../lib/security';
import { getUserByUsername, createUser } from '../lib/users';
import { getDeviceId } from '../lib/device';
import { hashPassword } from '../lib/password';
import type { User } from './types';

export default function RegisterPage({ onRegister, onBack }: { onRegister: (user: User) => void; onBack: () => void }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellido: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!checkRateLimit('register', 3, 300000)) {
      setError('Demasiados registros. Espere 5 minutos.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden');
      setLoading(false);
      return;
    }

    const pwError = validatePassword(formData.password);
    if (pwError) { setError(pwError); setLoading(false); return; }

    const userError = validateUsername(formData.username);
    if (userError) { setError(userError); setLoading(false); return; }

    if (formData.email) {
      const emailError = validateEmail(formData.email);
      if (emailError) { setError(emailError); setLoading(false); return; }
    }

    const clean = sanitizeUserInput({
      username: formData.username,
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
    });

    const currentDeviceId = await getDeviceId();
    const hashedPassword = await hashPassword(formData.password);
    const newUser: User = {
      id: Date.now().toString(),
      username: clean.username,
      password: hashedPassword,
      nombre: clean.nombre,
      apellido: clean.apellido,
      email: clean.email,
      role: 'user',
      membershipExpiry: null,
      createdAt: new Date().toISOString(),
      status: 'active',
      devices: [currentDeviceId],
    };

    try {
      const existing = await getUserByUsername(formData.username);
      if (existing) {
        setError('El usuario ya existe');
        setLoading(false);
        return;
      }
      await createUser(newUser);
      onRegister(newUser);
    } catch {
      setError('Error de conexion. Intente de nuevo.');
    }
    setLoading(false);
  };

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
            <GraduationCap className="w-8 h-8 text-tactical-blue-light" />
          </div>
          <h1 className="text-2xl font-bold text-white">Crear Cuenta</h1>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-danger/20 border border-danger/50 rounded-lg p-3 mb-4 flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-danger" />
              <span className="text-sm text-danger">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Apellido</label>
                <input
                  type="text"
                  value={formData.apellido}
                  onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Correo</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Usuario</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-2.5 bg-navy-700 hover:bg-navy-600 text-white font-medium rounded-lg transition-colors"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Registrarse
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
