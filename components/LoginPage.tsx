'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertTriangle, User, Eye, EyeOff, Loader2, LogOut } from 'lucide-react';
import { checkRateLimit, sanitizeUserInput } from '../lib/security';
import { getUserByUsername, updateUser } from '../lib/users';
import { getDeviceId, getDeviceInfo } from '../lib/device';
import { logAccessAttempt } from '../lib/accessLog';
import { isLockedOut, recordFailedAttempt, clearFailedAttempts } from '../lib/loginAttempts';
import { verifyPassword, isBcryptHash, hashPassword } from '../lib/password';
import type { User as UserType } from './types';

export default function LoginPage({ onLogin }: { onLogin: (user: UserType) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!checkRateLimit(username, 10, 60000)) {
        setError('Demasiados intentos. Espere 1 minuto.');
        setLoading(false);
        return;
      }

      const lockStatus = await isLockedOut(username);
      if (lockStatus.locked) {
        const mins = lockStatus.unlockTime 
          ? Math.ceil((lockStatus.unlockTime.getTime() - Date.now()) / 60000) 
          : 15;
        setError(`Cuenta bloqueada por intentos fallidos. Intente en ${mins} minuto${mins !== 1 ? 's' : ''}.`);
        setLoading(false);
        return;
      }

      const cleanUsername = sanitizeUserInput({ username }).username;
      const found = await getUserByUsername(cleanUsername);
      
      if (found && await verifyPassword(password, found.password)) {
        await clearFailedAttempts(cleanUsername);
        setAttemptsLeft(null);

        // Migración: si la contraseña no está hasheada, hashearla y guardar
        if (!isBcryptHash(found.password)) {
          const hashed = await hashPassword(password);
          await updateUser({ ...found, password: hashed });
          found.password = hashed;
        }

        if (found.status === 'blocked') {
          setError('Tu cuenta ha sido bloqueada. Contacta al administrador.');
          setLoading(false);
          return;
        }

        const currentDeviceId = await getDeviceId();
        const { platform, browser } = getDeviceInfo();
        const isAdmin = found.role === 'admin';

        if (!isAdmin && !found.devices.includes(currentDeviceId) && found.devices.length >= found.maxDevices) {
          await logAccessAttempt({
            userId: found.id,
            username: found.username,
            deviceId: currentDeviceId,
            platform,
            browser,
            status: 'blocked',
            reason: `Limite de ${found.maxDevices} dispositivo${found.maxDevices !== 1 ? 's' : ''} alcanzado`,
          });
          setError(`Esta cuenta solo puede usarse en ${found.maxDevices} dispositivo${found.maxDevices !== 1 ? 's' : ''}. Si cambio de equipo, comuniquese con el administrador.`);
          setLoading(false);
          return;
        }

        if (isAdmin) {
          await logAccessAttempt({
            userId: found.id,
            username: found.username,
            deviceId: currentDeviceId,
            platform,
            browser,
            status: 'allowed',
            reason: 'Admin - acceso libre',
          });
          onLogin(found);
        } else if (!found.devices.includes(currentDeviceId)) {
          const updatedUser = { ...found, devices: [...found.devices, currentDeviceId] };
          await updateUser(updatedUser);
          await logAccessAttempt({
            userId: found.id,
            username: found.username,
            deviceId: currentDeviceId,
            platform,
            browser,
            status: 'allowed',
            reason: 'Nuevo dispositivo vinculado',
          });
          onLogin(updatedUser);
        } else {
          await logAccessAttempt({
            userId: found.id,
            username: found.username,
            deviceId: currentDeviceId,
            platform,
            browser,
            status: 'allowed',
            reason: 'Dispositivo coincide',
          });
          onLogin(found);
        }
      } else {
        const result = await recordFailedAttempt(cleanUsername);
        setAttemptsLeft(result.attemptsLeft);
        if (result.locked) {
          setError('Cuenta bloqueada por 3 intentos fallidos. Espere 15 minutos o contacte al administrador.');
        } else {
          setError(`Credenciales incorrectas. ${result.attemptsLeft} intento${result.attemptsLeft !== 1 ? 's' : ''} restante${result.attemptsLeft !== 1 ? 's' : ''}.`);
        }
      }
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
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-tactical-blue/20 border-2 border-tactical-blue mb-4">
            <Shield className="w-10 h-10 text-tactical-blue-light" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            SIMULADOR <span className="text-gold">PNP</span>
          </h1>
          <p className="text-slate-400">Examen de Ascenso - Policía Nacional del Perú</p>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8"
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gold" />
            Iniciar Sesión
          </h2>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-danger/20 border border-danger/50 rounded-lg p-3 mb-4 flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
              <span className="text-sm text-danger">{error}</span>
            </motion.div>
          )}

          {attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft < 3 && (
            <div className="mb-4 flex items-center gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= attemptsLeft ? 'bg-warning' : 'bg-danger'}`} />
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-tactical-blue focus:ring-1 focus:ring-tactical-blue transition-colors"
                  placeholder="Ingrese su usuario"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-tactical-blue focus:ring-1 focus:ring-tactical-blue transition-colors"
                  placeholder="Ingrese su contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-semibold rounded-lg transition-all duration-300 btn-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5 rotate-180" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
