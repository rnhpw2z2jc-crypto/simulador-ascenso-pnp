'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, User, Lock, Eye, EyeOff, BarChart3, Clock, Trophy, 
  Target, BookOpen, ChevronRight, ChevronLeft, Check, X, 
  AlertTriangle, Flag, Grid3X3, RotateCcw, Home as HomeIcon, LogOut,
  Settings, Play, Timer, Brain, Star, TrendingUp, Calendar,
  FileText, CheckCircle2, XCircle, Filter, Search, Award,
  Zap, BookMarked, Hash, ArrowRight, Loader2, Users, GraduationCap, Download
} from 'lucide-react';
import { questions, categories, Question, categoryNames, getCategoryKey, getCategoryDisplayName } from '../data/questions';
import { usePWA } from './usePWA';
import { getUserByUsername, createUser, getAllUsers, updateUser, deleteUser, seedDefaultAdmin, migrateDeviceFields } from '../lib/users';
import type { UserData } from '../lib/users';
import { checkRateLimit, sanitizeUserInput, validateUsername, validatePassword, validateEmail } from '../lib/security';
import { getDeviceId, getDeviceInfo } from '../lib/device';
import { logAccessAttempt, getAccessLogs } from '../lib/accessLog';
import type { AccessLogEntry } from '../lib/accessLog';
import { saveExamStat, getExamStats } from '../lib/examStats';
import type { ExamStatEntry } from '../lib/examStats';

// ============== TYPES ==============
interface User {
  id: string;
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  email: string;
  role: 'admin' | 'user';
  membershipExpiry: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'blocked';
  deviceId: string | null;
  deviceLocked: boolean;
}

interface ExamConfig {
  numQuestions: number;
  categories: string[];
}

interface ExamState {
  currentQuestion: number;
  answers: (number | null)[];
  bookmarks: boolean[];
  timeRemaining: number;
  startTime: number;
  isFinished: boolean;
}

interface ExamResult {
  id: string;
  date: string;
  config: ExamConfig;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeUsed: number;
  answers: (number | null)[];
  questions: Question[];
}

// ============== MAIN PAGE ==============
export default function Home() {
  const [currentPage, setCurrentPage] = useState<'login' | 'register' | 'dashboard' | 'config' | 'exam' | 'results' | 'history' | 'admin' | 'profile'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [currentResult, setCurrentResult] = useState<ExamResult | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const { isInstallable, install, hasUpdate, applyUpdate } = usePWA();

  // Check for existing session and seed admin
  useEffect(() => {
    seedDefaultAdmin().catch(() => {});
    migrateDeviceFields().catch(() => {});
    const savedUser = localStorage.getItem('simulador_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setCurrentPage('dashboard');
    }
  }, []);

  const handleLogin = (userData: User) => {
    // Check membership
    if (userData.membershipExpiry && new Date(userData.membershipExpiry) < new Date()) {
      // Allow login but mark as expired - dashboard will show warning
      userData.status = 'expired';
    }
    if (userData.status === 'blocked') {
      return;
    }
    setUser(userData);
    localStorage.setItem('simulador_user', JSON.stringify(userData));
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('simulador_user');
    setCurrentPage('login');
  };

  const startExam = (config: ExamConfig) => {
    setExamConfig(config);
    setCurrentPage('config');
  };

  const startReinforcement = () => {
    const failedIds: number[] = JSON.parse(localStorage.getItem('simulador_failed_ids') || '[]');
    if (failedIds.length === 0) return false;
    const failedQuestions = questions.filter(q => failedIds.includes(q.id));
    if (failedQuestions.length === 0) return false;
    const timeLimit = Math.ceil(failedQuestions.length * 1.5) * 60;
    beginExam(failedQuestions, timeLimit);
    return true;
  };

  const beginExam = (questions: Question[], timeLimit: number) => {
    setExamQuestions(questions);
    setExamState({
      currentQuestion: 0,
      answers: new Array(questions.length).fill(null),
      bookmarks: new Array(questions.length).fill(false),
      timeRemaining: timeLimit,
      startTime: Date.now(),
      isFinished: false,
    });
    setCurrentPage('exam');
  };

  const finishExam = (result: ExamResult) => {
    setCurrentResult(result);
    // Save to history
    const history = JSON.parse(localStorage.getItem('simulador_history') || '[]');
    history.push(result);
    localStorage.setItem('simulador_history', JSON.stringify(history));
    // Save failed question IDs for reinforcement (localStorage)
    const failedIds: number[] = result.questions
      .filter((q, i) => result.answers[i] !== q.correctAnswer)
      .map(q => q.id);
    const existingFailed: number[] = JSON.parse(localStorage.getItem('simulador_failed_ids') || '[]');
    const mergedFailed = Array.from(new Set([...existingFailed, ...failedIds]));
    localStorage.setItem('simulador_failed_ids', JSON.stringify(mergedFailed));
    // Save to Firestore for admin stats (fire-and-forget, lightweight)
    if (user) {
      saveExamStat({
        userId: user.id,
        username: user.username,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        failedQuestionIds: failedIds,
      }).catch(() => {});
    }
    setCurrentPage('results');
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <AnimatePresence mode="wait">
        {currentPage === 'login' && (
          <LoginPage 
            key="login"
            onLogin={handleLogin} 
          />
        )}
        {currentPage === 'register' && (
          <RegisterPage 
            key="register"
            onRegister={handleLogin} 
            onBack={() => setCurrentPage('login')} 
          />
        )}
        {currentPage === 'dashboard' && user && (
          <DashboardPage 
            key="dashboard"
            user={user} 
            onStartExam={startExam}
            onStartReinforcement={startReinforcement}
            onViewHistory={() => setCurrentPage('history')}
            onLogout={handleLogout}
            onGoAdmin={() => setCurrentPage('admin')}
            onGoProfile={() => setCurrentPage('profile')}
            isInstallable={isInstallable}
            onInstall={install}
            hasUpdate={hasUpdate}
            onApplyUpdate={applyUpdate}
          />
        )}
        {currentPage === 'config' && examConfig && (
          <ConfigPage 
            key="config"
            config={examConfig}
            onStart={beginExam}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'exam' && examState && (
          <ExamPage 
            key="exam"
            questions={examQuestions}
            state={examState}
            setState={setExamState as React.Dispatch<React.SetStateAction<ExamState>>}
            onFinish={finishExam}
          />
        )}
        {currentPage === 'results' && currentResult && (
          <ResultsPage 
            key="results"
            result={currentResult}
            onBack={() => setCurrentPage('dashboard')}
            onStartReinforcement={startReinforcement}
          />
        )}
        {currentPage === 'history' && (
          <HistoryPage 
            key="history"
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'admin' && user && user.role === 'admin' && (
          <AdminPage 
            key="admin"
            currentUser={user}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
        {currentPage === 'profile' && user && (
          <ProfilePage 
            key="profile"
            user={user}
            onUpdate={(updated) => { setUser(updated); localStorage.setItem('simulador_user', JSON.stringify(updated)); }}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============== LOGIN PAGE ==============
function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const cleanUsername = sanitizeUserInput({ username }).username;
      const found = await getUserByUsername(cleanUsername);
      
      if (found && found.password === password) {
        if (found.status === 'blocked') {
          setError('Tu cuenta ha sido bloqueada. Contacta al administrador.');
          setLoading(false);
          return;
        }

        const currentDeviceId = await getDeviceId();
        const { platform, browser } = getDeviceInfo();
        const isAdmin = found.role === 'admin';

        if (!isAdmin && found.deviceLocked && found.deviceId && found.deviceId !== currentDeviceId) {
          await logAccessAttempt({
            userId: found.id,
            username: found.username,
            deviceId: currentDeviceId,
            platform,
            browser,
            status: 'blocked',
            reason: 'Dispositivo no coincide',
          });
          setError('Esta cuenta ya esta registrada en otro dispositivo. Si cambio de equipo, comuniquese con el administrador.');
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
        } else if (!found.deviceLocked || !found.deviceId) {
          const updatedUser = { ...found, deviceId: currentDeviceId, deviceLocked: true };
          await updateUser(updatedUser);
          await logAccessAttempt({
            userId: found.id,
            username: found.username,
            deviceId: currentDeviceId,
            platform,
            browser,
            status: 'allowed',
            reason: 'Primer login o dispositivo liberado',
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
        setError('Credenciales incorrectas');
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
        {/* Logo/Header */}
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

        {/* Login Form */}
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
              <AlertTriangle className="w-5 h-5 text-danger" />
              <span className="text-sm text-danger">{error}</span>
            </motion.div>
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

// ============== REGISTER PAGE ==============
function RegisterPage({ onRegister, onBack }: { onRegister: (user: User) => void; onBack: () => void }) {
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
    const newUser: User = {
      id: Date.now().toString(),
      username: clean.username,
      password: formData.password,
      nombre: clean.nombre,
      apellido: clean.apellido,
      email: clean.email,
      role: 'user',
      membershipExpiry: null,
      createdAt: new Date().toISOString(),
      status: 'active',
      deviceId: currentDeviceId,
      deviceLocked: true,
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

// ============== DASHBOARD PAGE ==============
function DashboardPage({ user, onStartExam, onStartReinforcement, onViewHistory, onLogout, onGoAdmin, onGoProfile, isInstallable, onInstall, hasUpdate, onApplyUpdate }: {
  user: User;
  onStartExam: (config: ExamConfig) => void;
  onStartReinforcement: () => boolean;
  onViewHistory: () => void;
  onLogout: () => void;
  onGoAdmin: () => void;
  onGoProfile: () => void;
  isInstallable: boolean;
  onInstall: () => void;
  hasUpdate: boolean;
  onApplyUpdate: () => void;
}) {
  const [selectedQuestions, setSelectedQuestions] = useState(50);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const failedIds: number[] = JSON.parse(localStorage.getItem('simulador_failed_ids') || '[]');
    setFailedCount(failedIds.length);
  }, []);

  const history = JSON.parse(localStorage.getItem('simulador_history') || '[]');
  const totalExams = history.length;
  const avgScore = totalExams > 0 
    ? Math.round(history.reduce((sum: number, r: ExamResult) => sum + (r.score / r.totalQuestions * 100), 0) / totalExams)
    : 0;
  const bestScore = totalExams > 0
    ? Math.max(...history.map((r: ExamResult) => Math.round(r.score / r.totalQuestions * 100)))
    : 0;
  const studyHours = totalExams > 0
    ? Math.round(history.reduce((sum: number, r: ExamResult) => sum + r.timeUsed, 0) / 3600 * 10) / 10
    : 0;

  // Get unique categories that have questions
  const availableCategories = Array.from(new Set(questions.map(q => q.category)));

  const toggleCategory = (cat: string) => {
    if (cat === 'all') {
      setSelectedCategories(['all']);
    } else {
      const newCats = selectedCategories.filter(c => c !== 'all');
      if (newCats.includes(cat)) {
        const filtered = newCats.filter(c => c !== cat);
        setSelectedCategories(filtered.length === 0 ? ['all'] : filtered);
      } else {
        setSelectedCategories([...newCats, cat]);
      }
    }
  };

  const handleStart = () => {
    onStartExam({
      numQuestions: selectedQuestions,
      categories: selectedCategories.includes('all') ? availableCategories : selectedCategories,
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      {/* Header */}
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-tactical-blue-light" />
            </div>
            <div>
              <h1 className="font-bold text-white">SIMULADOR <span className="text-gold">PNP</span></h1>
              <p className="text-xs text-slate-400">Examen de Ascenso</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user.nombre} {user.apellido}</p>
              <p className="text-xs text-slate-400">{user.email || user.username}</p>
            </div>
            {user.role === 'admin' && (
              <button
                onClick={onGoAdmin}
                className="p-2 text-slate-400 hover:text-gold transition-colors"
                title="Panel de Administración"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onGoProfile}
              className="p-2 text-slate-400 hover:text-tactical-blue-light transition-colors"
              title="Mi Perfil"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-danger transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-2">
            Bienvenido, <span className="text-gold">{user.apellido}</span>
          </h2>
          <p className="text-slate-400">Prepárate para tu examen de ascenso con nuestra plataforma de simulación</p>
          
          {/* Membership Warning */}
          {user.membershipExpiry && (() => {
            const remainingMs = new Date(user.membershipExpiry).getTime() - Date.now();
            const remainingDays = Math.ceil(remainingMs / 86400000);
            const expired = remainingMs <= 0;
            if (expired) {
              return (
                <div className="mt-4 p-4 bg-danger/20 border border-danger/50 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0" />
                  <div>
                    <p className="text-danger font-semibold">Membresia expirada</p>
                    <p className="text-sm text-slate-400">Tu acceso ha expirado. Contacta al administrador para renovar.</p>
                  </div>
                </div>
              );
            } else if (remainingDays <= 1) {
              const remainingH = Math.max(1, Math.ceil(remainingMs / 3600000));
              return (
                <div className="mt-4 p-4 bg-warning/20 border border-warning/50 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
                  <div>
                    <p className="text-warning font-semibold">Membresia por vencer</p>
                    <p className="text-sm text-slate-400">Tu membresia vence en {remainingH}h. Contacta al administrador.</p>
                  </div>
                </div>
              );
            } else if (remainingDays <= 7) {
              return (
                <div className="mt-4 p-4 bg-warning/20 border border-warning/50 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
                  <div>
                    <p className="text-warning font-semibold">Membresia por vencer</p>
                    <p className="text-sm text-slate-400">Tu membresia vence en {remainingDays} dia{remainingDays !== 1 ? 's' : ''} ({new Date(user.membershipExpiry).toLocaleDateString('es-PE')})</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {hasUpdate && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-gold/20 border border-gold/50 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/30 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-gold font-semibold text-sm">Actualizacion disponible</p>
                  <p className="text-xs text-slate-400">Nueva version del simulador lista</p>
                </div>
              </div>
              <button
                onClick={onApplyUpdate}
                className="px-4 py-2 bg-gold hover:bg-gold/80 text-navy-900 text-sm font-medium rounded-lg transition-colors flex-shrink-0"
              >
                Actualizar
              </button>
            </motion.div>
          )}

          {isInstallable && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-tactical-blue/20 border border-tactical-blue/50 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-tactical-blue/30 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-tactical-blue-light" />
                </div>
                <div>
                  <p className="text-tactical-blue-light font-semibold text-sm">Instalar App</p>
                  <p className="text-xs text-slate-400">Descarga el simulador en tu celular</p>
                </div>
              </div>
              <button
                onClick={onInstall}
                className="px-4 py-2 bg-tactical-blue hover:bg-tactical-blue-dark text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
              >
                Instalar
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-tactical-blue-light" />
              </div>
              <span className="text-sm text-slate-400">Exámenes</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalExams}</p>
            <p className="text-xs text-slate-500 mt-1">Realizados</p>
          </div>

          <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-gold" />
              </div>
              <span className="text-sm text-slate-400">Promedio</span>
            </div>
            <p className="text-3xl font-bold text-white">{avgScore}%</p>
            <p className="text-xs text-slate-500 mt-1">Aciertos</p>
          </div>

          <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-success" />
              </div>
              <span className="text-sm text-slate-400">Mejor</span>
            </div>
            <p className="text-3xl font-bold text-white">{bestScore}%</p>
            <p className="text-xs text-slate-500 mt-1">Puntuación</p>
          </div>

          <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-danger" />
              </div>
              <span className="text-sm text-slate-400">Estudio</span>
            </div>
            <p className="text-3xl font-bold text-white">{studyHours}h</p>
            <p className="text-xs text-slate-500 mt-1">Tiempo total</p>
          </div>
        </motion.div>

        {/* Exam Configuration */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid lg:grid-cols-2 gap-6 mb-8"
        >
          {/* Question Count */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-gold" />
              Cantidad de Preguntas
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 10, label: 'Quiz Rápido', time: '15 min', icon: Zap },
                { value: 50, label: 'Práctica', time: '75 min', icon: BookOpen },
                { value: 100, label: 'Examen Oficial', time: '150 min', icon: Award }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedQuestions(opt.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    selectedQuestions === opt.value
                      ? 'border-tactical-blue bg-tactical-blue/20'
                      : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                  }`}
                >
                  <opt.icon className={`w-6 h-6 mb-2 mx-auto ${
                    selectedQuestions === opt.value ? 'text-tactical-blue-light' : 'text-slate-400'
                  }`} />
                  <p className="text-sm font-medium text-white">{opt.value}</p>
                  <p className="text-xs text-slate-400">{opt.label}</p>
                  <p className="text-xs text-gold mt-1">{opt.time}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-gold" />
              Temas del Examen
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <button
                onClick={() => toggleCategory('all')}
                className={`w-full p-3 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                  selectedCategories.includes('all')
                    ? 'border-tactical-blue bg-tactical-blue/20'
                    : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                }`}
              >
                <span className="text-sm font-medium text-white">Todos los Temas</span>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  selectedCategories.includes('all')
                    ? 'border-tactical-blue bg-tactical-blue'
                    : 'border-slate-500'
                }`}>
                  {selectedCategories.includes('all') && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
              {availableCategories.map((cat) => {
                const questionCount = questions.filter(q => q.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`w-full p-3 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                      selectedCategories.includes(cat)
                        ? 'border-tactical-blue bg-tactical-blue/20'
                        : 'border-navy-700 bg-navy-800/50 hover:border-navy-600'
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <span className="text-sm text-white block">{getCategoryDisplayName(getCategoryKey(cat))}</span>
                      <span className="text-xs text-slate-500">{questionCount} preguntas</span>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedCategories.includes(cat)
                        ? 'border-tactical-blue bg-tactical-blue'
                        : 'border-slate-500'
                    }`}>
                      {selectedCategories.includes(cat) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Start Button */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <button
            onClick={handleStart}
            className="flex-1 py-4 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-bold text-lg rounded-xl transition-all duration-300 btn-glow flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6" />
            INICIAR SIMULADOR
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onViewHistory}
            className="px-8 py-4 bg-navy-800 hover:bg-navy-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            Ver Historial
          </button>
        </motion.div>

        {/* Reforzamiento Tactico */}
        {failedCount > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.32 }}
            className="mb-8"
          >
            <button
              onClick={() => {
                if (!onStartReinforcement()) {
                  localStorage.removeItem('simulador_failed_ids');
                  setFailedCount(0);
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-warning/20 to-gold/20 hover:from-warning/30 hover:to-gold/30 border border-warning/50 text-white font-bold text-lg rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
            >
              <Brain className="w-6 h-6 text-gold" />
              REFORZAMIENTO TACTICO 💪🧠
              <span className="px-3 py-1 bg-danger/30 text-danger text-sm font-bold rounded-full">{failedCount}</span>
            </button>
            <p className="text-xs text-slate-500 text-center mt-2">
              Repasa las {failedCount} pregunta{failedCount !== 1 ? 's' : ''} que fallaste en examenes anteriores
            </p>
          </motion.div>
        )}

        {/* Simulacro Completo por Tema */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Target className="w-5 h-5 text-gold" />
              Simulacro Completo por Tema
            </h3>
            <p className="text-xs text-slate-500 mb-4">Todas las preguntas de un solo tema. Tiempo: 1.5 min por pregunta</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableCategories.map((cat) => {
                const count = questions.filter(q => q.category === cat).length;
                const timeMin = Math.ceil(count * 1.5);
                return (
                  <button
                    key={cat}
                    onClick={() => onStartExam({ numQuestions: count, categories: [cat] })}
                    className="p-3 rounded-xl border border-navy-700 bg-navy-800/50 hover:border-gold hover:bg-gold/5 transition-all duration-300 text-left group"
                  >
                    <span className="text-sm font-medium text-white group-hover:text-gold block">{getCategoryDisplayName(getCategoryKey(cat))}</span>
                    <span className="text-xs text-slate-500">{count} preguntas</span>
                    <span className="text-xs text-gold/70 ml-2">{timeMin >= 60 ? `${Math.floor(timeMin/60)}h ${timeMin%60}m` : `${timeMin}m`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============== CONFIG PAGE ==============
function ConfigPage({ config, onStart, onBack }: {
  config: ExamConfig;
  onStart: (questions: Question[], timeLimit: number) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const filteredQuestions = questions.filter(q => 
    config.categories.includes(q.category)
  );

  const timeLimits: Record<number, number> = {
    10: 15 * 60,
    50: 75 * 60,
    100: 150 * 60,
  };

  const getTimeLimit = (count: number) => {
    if (timeLimits[count]) return timeLimits[count];
    return Math.ceil(count * 1.5) * 60;
  };

  // Calculate questions per category for display
  const categoryStats = config.categories.map(cat => ({
    name: getCategoryDisplayName(getCategoryKey(cat)),
    count: filteredQuestions.filter(q => q.category === cat).length
  }));

  const handleStart = () => {
    setLoading(true);
    
    // Shuffle and select questions
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, config.numQuestions);
    
    setTimeout(() => {
      onStart(selected, getTimeLimit(config.numQuestions));
    }, 500);
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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-2xl p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-6">
            <Timer className="w-10 h-10 text-gold animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Preparado para comenzar</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-3 bg-navy-800/50 rounded-lg">
              <span className="text-slate-400">Preguntas:</span>
              <span className="text-white font-semibold">{config.numQuestions}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-navy-800/50 rounded-lg">
              <span className="text-slate-400">Tiempo:</span>
              <span className="text-white font-semibold">
                {(() => {
                  const totalMin = Math.ceil(getTimeLimit(config.numQuestions) / 60);
                  return totalMin >= 60 ? `${Math.floor(totalMin/60)}h ${totalMin%60}min` : `${totalMin} min`;
                })()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-navy-800/50 rounded-lg">
              <span className="text-slate-400">Temas:</span>
              <span className="text-white font-semibold text-sm">
                {config.categories.length === categories.length ? 'Todos' : `${config.categories.length} temas`}
              </span>
            </div>
            {filteredQuestions.length > config.numQuestions && (
              <div className="flex justify-between items-center p-3 bg-navy-800/50 rounded-lg">
                <span className="text-slate-400">Disponibles:</span>
                <span className="text-white font-semibold text-sm">{filteredQuestions.length} preguntas</span>
              </div>
            )}
          </div>

          {/* Category summary */}
          {config.categories.length < categories.length && (
            <div className="mb-6 p-3 bg-navy-800/30 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Temas seleccionados:</p>
              <div className="flex flex-wrap gap-1">
                {categoryStats.map(stat => (
                  <span key={stat.name} className="px-2 py-0.5 bg-navy-700 text-xs text-slate-300 rounded">
                    {stat.name} ({stat.count})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3 bg-navy-700 hover:bg-navy-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 py-3 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-semibold rounded-lg transition-colors btn-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  COMENZAR
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============== EXAM PAGE ==============
function ExamPage({ questions: examQuestions, state, setState, onFinish }: {
  questions: Question[];
  state: ExamState;
  setState: React.Dispatch<React.SetStateAction<ExamState>>;
  onFinish: (result: ExamResult) => void;
}) {
  const [showNav, setShowNav] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBookmark, setShowBookmark] = useState<number | null>(null);

  const currentQ = examQuestions[state.currentQuestion];
  const progress = ((state.currentQuestion + 1) / examQuestions.length) * 100;
  const answeredCount = state.answers.filter(a => a !== null).length;
  const bookmarkedCount = state.bookmarks.filter(b => b).length;

  // Timer
  useEffect(() => {
    if (state.isFinished) return;

    const timer = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 0) {
          clearInterval(timer);
          return prev;
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isFinished, setState]);

  // Auto-finish when time runs out
  useEffect(() => {
    if (state.timeRemaining <= 0 && !state.isFinished) {
      handleFinish();
    }
  }, [state.timeRemaining]);

  const handleAnswer = (answerIndex: number) => {
    if (state.isFinished) return;
    
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestion] = answerIndex;
    setState({ ...state, answers: newAnswers });
  };

  const handleBookmark = () => {
    const newBookmarks = [...state.bookmarks];
    newBookmarks[state.currentQuestion] = !newBookmarks[state.currentQuestion];
    setState({ ...state, bookmarks: newBookmarks });
  };

  const handleFinish = () => {
    const timeUsed = Math.floor((Date.now() - state.startTime) / 1000);
    let correctAnswers = 0;
    
    examQuestions.forEach((q, i) => {
      if (state.answers[i] === q.correctAnswer) {
        correctAnswers++;
      }
    });

    const result: ExamResult = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      config: { numQuestions: examQuestions.length, categories: ['mixed'] },
      score: correctAnswers,
      totalQuestions: examQuestions.length,
      correctAnswers,
      timeUsed,
      answers: state.answers,
      questions: examQuestions,
    };

    onFinish(result);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = state.timeRemaining + (state.answers.filter(a => a !== null).length > 0 ? 0 : 0);
  const totalExamTime = examQuestions.length <= 10 ? 900 : examQuestions.length <= 50 ? 4500 : examQuestions.length <= 100 ? 9000 : Math.ceil(examQuestions.length * 1.5) * 60;
  const timePercentage = (state.timeRemaining / totalExamTime) * 100;
  const isTimeLow = state.timeRemaining < 300;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col"
    >
      {/* Header Bar */}
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                isTimeLow ? 'bg-danger/20' : 'bg-navy-800'
              }`}>
                <Clock className={`w-4 h-4 ${isTimeLow ? 'text-danger animate-pulse' : 'text-slate-400'}`} />
                <span className={`font-mono font-bold ${isTimeLow ? 'text-danger' : 'text-white'}`}>
                  {formatTime(state.timeRemaining)}
                </span>
              </div>
              <span className="text-sm text-slate-400">
                {state.currentQuestion + 1} / {examQuestions.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNav(!showNav)}
                className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 rounded-lg text-sm text-white flex items-center gap-2 transition-colors"
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="hidden sm:inline">Navegación</span>
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="px-3 py-1.5 bg-danger hover:bg-red-600 rounded-lg text-sm text-white font-medium transition-colors"
              >
                Finalizar
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-tactical-blue to-tactical-blue-light progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>{answeredCount} respondidas</span>
            <span>{bookmarkedCount} marcadas</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentQuestion}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Category Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-gold/20 text-gold text-xs font-medium rounded-full">
                {getCategoryDisplayName(getCategoryKey(currentQ.category))}
              </span>
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  state.bookmarks[state.currentQuestion]
                    ? 'bg-gold/20 text-gold'
                    : 'bg-navy-800 text-slate-400 hover:text-gold'
                }`}
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* Question Card */}
            <div className="glass rounded-xl p-6 mb-6">
              <h2 className="text-lg font-medium text-white leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((option, index) => {
                const isSelected = state.answers[state.currentQuestion] === index;
                const isCorrect = index === currentQ.correctAnswer;
                
                let optionClass = 'border-navy-700 bg-navy-800/50';
                if (isSelected) {
                  optionClass = 'border-tactical-blue bg-tactical-blue/20';
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 option-hover ${optionClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${
                        isSelected
                          ? 'border-tactical-blue bg-tactical-blue text-white'
                          : 'border-slate-500 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-white">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <footer className="glass border-t border-navy-700 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setState({ ...state, currentQuestion: Math.max(0, state.currentQuestion - 1) })}
            disabled={state.currentQuestion === 0}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            onClick={() => setState({ ...state, currentQuestion: Math.min(examQuestions.length - 1, state.currentQuestion + 1) })}
            disabled={state.currentQuestion === examQuestions.length - 1}
            className="px-4 py-2 bg-tactical-blue hover:bg-tactical-blue-dark text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Question Navigation Modal */}
      <AnimatePresence>
        {showNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNav(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-gold" />
                Navegación de Preguntas
              </h3>
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                {examQuestions.map((_, index) => {
                  const isAnswered = state.answers[index] !== null;
                  const isBookmarked = state.bookmarks[index];
                  const isCurrent = index === state.currentQuestion;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setState({ ...state, currentQuestion: index });
                        setShowNav(false);
                      }}
                      className={`w-full aspect-square rounded-lg text-sm font-medium transition-all ${
                        isCurrent
                          ? 'bg-tactical-blue text-white ring-2 ring-tactical-blue-light'
                          : isAnswered
                            ? 'bg-success/20 text-success border border-success/30'
                            : isBookmarked
                              ? 'bg-gold/20 text-gold border border-gold/30'
                              : 'bg-navy-800 text-slate-400 border border-navy-700 hover:border-navy-600'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-success/20 border border-success/30"></div>
                  Respondida
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-gold/20 border border-gold/30"></div>
                  Marcada
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-navy-800 border border-navy-700"></div>
                  Sin responder
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Finish Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md text-center"
            >
              <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¿Finalizar Examen?</h3>
              <p className="text-slate-400 mb-6">
                {answeredCount} de {examQuestions.length} preguntas respondidas.
                {examQuestions.length - answeredCount > 0 && (
                  <span className="text-warning">
                    {' '}Hay {examQuestions.length - answeredCount} sin responder.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-lg transition-colors"
                >
                  Continuar
                </button>
                <button
                  onClick={handleFinish}
                  className="flex-1 py-3 bg-danger hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Finalizar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============== RESULTS PAGE ==============
function ResultsPage({ result, onBack, onStartReinforcement }: { result: ExamResult; onBack: () => void; onStartReinforcement: () => boolean }) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  
  const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
  const passed = percentage >= 60;
  const timeMinutes = Math.floor(result.timeUsed / 60);
  const timeSeconds = result.timeUsed % 60;

  const passedMessages = [
    '¡Excelente resultado! 🏆 Mantén el ritmo de estudio y no te confíes. ¡El ascenso te espera! 👮‍♂️⭐🎖️',
    '¡Aprobado con nota! 🎯 Tu disciplina da frutos. ¡Sigue así y alcanzarás la meta! 💪🔥',
    '¡Así se hace, soldado! 🛡️ Tu preparación es impecable. ¡El camino al ascenso está abierto! 🏅✨',
    '¡Dominio total! 🧠📚 No hay quien te detenga. ¡Mantén esa consistencia! 🚀👮‍♂️',
    '¡Gran desempeño! 🌟 Cada hora de estudio cuenta. ¡El mérito es tuyo! 🎖️💪',
  ];

  const failedMessages = [
    '¡Este solo es el comienzo! 🚀 Cada error corregido es un paso más hacia tu ascenso. 🔥 ¡A ajustar la táctica y volver a intentar! 🛡️⚡',
    '¡No te rindas, guerrero! 💪 Los retos forjan el carácter. Analiza tus errores y vuelve más fuerte. 🔥👮‍♂️',
    '¡Ánimo, que el camino al ascenso es de perseverantes! 📚 Refuerza tus puntos débiles y lo lograrás. 🛡️✨',
    '¡El fracaso es temporal, la deserción es permanente! ⚡ Estudia, repite y conquista. 🏅💪',
    '¡Los mejores policias caen y se levantan! 🥋 Refuerza lo que fallaste y vuelve por tu ascenso. 🚀⭐',
  ];

  const motivationalMessage = passed
    ? passedMessages[Math.floor(Math.random() * passedMessages.length)]
    : failedMessages[Math.floor(Math.random() * failedMessages.length)];

  const filteredQuestions = result.questions.filter((q, i) => {
    const isCorrect = result.answers[i] === q.correctAnswer;
    if (filter === 'correct') return isCorrect;
    if (filter === 'incorrect') return !isCorrect;
    return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      {/* Header */}
      <header className="glass border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-tactical-blue-light" />
            </div>
            <h1 className="font-bold text-white">RESULTADOS</h1>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Inicio
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`rounded-2xl p-6 mb-6 ${
            passed 
              ? 'bg-gradient-to-br from-success/20 to-success/5 border border-success/30'
              : 'bg-gradient-to-br from-danger/20 to-danger/5 border border-danger/30'
          }`}
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
              passed ? 'bg-success/20' : 'bg-danger/20'
            }`}>
              <div className="text-center">
                <p className={`text-4xl font-bold ${passed ? 'text-success' : 'text-danger'}`}>
                  {percentage}%
                </p>
                <p className={`text-sm ${passed ? 'text-success' : 'text-danger'}`}>
                  {result.correctAnswers}/{result.totalQuestions}
                </p>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3 ${
                passed ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
              }`}>
                {passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-bold text-lg">{passed ? 'APROBADO' : 'DESAPROBADO'}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{result.correctAnswers}</p>
                  <p className="text-xs text-slate-400">Correctas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{result.totalQuestions - result.correctAnswers}</p>
                  <p className="text-xs text-slate-400">Incorrectas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{timeMinutes}:{timeSeconds.toString().padStart(2, '0')}</p>
                  <p className="text-xs text-slate-400">Tiempo</p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={`mt-4 p-3 rounded-xl text-sm text-center md:text-left ${
                  passed ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}
              >
                {motivationalMessage}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['all', 'correct', 'incorrect'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? f === 'correct' ? 'bg-success/20 text-success' : f === 'incorrect' ? 'bg-danger/20 text-danger' : 'bg-tactical-blue/20 text-tactical-blue-light'
                  : 'bg-navy-800 text-slate-400 hover:bg-navy-700'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'correct' ? 'Correctas' : 'Incorrectas'}
            </button>
          ))}
        </div>

        {/* Questions Review */}
        <div className="space-y-4">
          {filteredQuestions.map((q, filterIdx) => {
            const originalIndex = result.questions.indexOf(q);
            const userAnswer = result.answers[originalIndex];
            const isCorrect = userAnswer === q.correctAnswer;
            
            return (
              <motion.div
                key={q.id}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: filterIdx * 0.05 }}
                className={`glass rounded-xl p-4 border-l-4 ${
                  isCorrect ? 'border-l-success' : 'border-l-danger'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCorrect ? 'bg-success/20' : 'bg-danger/20'
                  }`}>
                    {isCorrect ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-danger" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-500">Pregunta {originalIndex + 1}</span>
                      <span className="px-2 py-0.5 bg-navy-800 text-xs text-slate-400 rounded">{getCategoryDisplayName(getCategoryKey(q.category))}</span>
                    </div>
                    <p className="text-white font-medium mb-3">{q.question}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt, optIdx) => {
                        const isUserAnswer = userAnswer === optIdx;
                        const isCorrectAnswer = optIdx === q.correctAnswer;
                        
                        let bgClass = 'bg-navy-800/50';
                        if (isCorrectAnswer) bgClass = 'bg-success/10 border border-success/30';
                        if (isUserAnswer && !isCorrect) bgClass = 'bg-danger/10 border border-danger/30';
                        
                        return (
                          <div key={optIdx} className={`p-2 rounded-lg text-sm ${bgClass}`}>
                            <span className="font-medium text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>{' '}
                            <span className={isCorrectAnswer ? 'text-success' : isUserAnswer ? 'text-danger' : 'text-slate-300'}>
                              {opt}
                            </span>
                            {isCorrectAnswer && <Check className="w-3 h-3 text-success inline ml-1" />}
                            {isUserAnswer && !isCorrect && <X className="w-3 h-3 text-danger inline ml-1" />}
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-navy-800/30 rounded-lg">
                      <p className="text-xs text-gold font-medium mb-1">💡 Explicación:</p>
                      <p className="text-sm text-slate-300">{q.explanation}</p>
                      {q.legalBasis && (
                        <p className="text-xs text-slate-500 mt-1">📋 {q.legalBasis}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          {!passed && result.totalQuestions - result.correctAnswers > 0 && (
            <button
              onClick={onStartReinforcement}
              className="flex-1 py-3 bg-gradient-to-r from-warning/20 to-gold/20 hover:from-warning/30 hover:to-gold/30 border border-warning/50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Brain className="w-5 h-5 text-gold" />
              REFORZAMIENTO TACTICO 💪🧠
            </button>
          )}
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-navy-800 hover:bg-navy-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <HomeIcon className="w-5 h-5" />
            Volver al Inicio
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============== HISTORY PAGE ==============
function HistoryPage({ onBack }: { onBack: () => void }) {
  const history: ExamResult[] = JSON.parse(localStorage.getItem('simulador_history') || '[]');
  
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen"
    >
      {/* Header */}
      <header className="glass border-b border-navy-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tactical-blue/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-tactical-blue-light" />
            </div>
            <div>
              <h1 className="font-bold text-white">HISTORIAL</h1>
              <p className="text-xs text-slate-400">{history.length} exámenes realizados</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Volver
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {history.length === 0 ? (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sin exámenes aún</h2>
            <p className="text-slate-400 mb-6">Realiza tu primer examen para ver tu historial aquí</p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-semibold rounded-lg transition-colors"
            >
              Comenzar Ahora
            </button>
          </motion.div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-slate-400">Total Exámenes</p>
                <p className="text-2xl font-bold text-white">{history.length}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-slate-400">Promedio General</p>
                <p className="text-2xl font-bold text-white">
                  {Math.round(history.reduce((sum, r) => sum + (r.score / r.totalQuestions * 100), 0) / history.length)}%
                </p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-slate-400">Mejor Puntuación</p>
                <p className="text-2xl font-bold text-success">
                  {Math.max(...history.map(r => Math.round(r.score / r.totalQuestions * 100)))}%
                </p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-slate-400">Aprobados</p>
                <p className="text-2xl font-bold text-gold">
                  {history.filter(r => (r.score / r.totalQuestions * 100) >= 60).length}
                </p>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-3">
              {history.reverse().map((result, index) => {
                const percentage = Math.round((result.score / result.totalQuestions) * 100);
                const passed = percentage >= 60;
                
                return (
                  <motion.div
                    key={result.id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl p-4 card-hover"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        passed ? 'bg-success/20' : 'bg-danger/20'
                      }`}>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${passed ? 'text-success' : 'text-danger'}`}>
                            {percentage}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            passed ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                          }`}>
                            {passed ? 'APROBADO' : 'DESAPROBADO'}
                          </span>
                          <span className="px-2 py-0.5 bg-navy-800 text-xs text-slate-400 rounded">
                            {result.totalQuestions} preguntas
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{formatDate(result.date)}</p>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-white">{result.score}/{result.totalQuestions}</p>
                        <p className="text-xs text-slate-500">{formatTime(result.timeUsed)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ============== ADMIN PAGE ==============
function AdminPage({ currentUser, onBack }: { currentUser: User; onBack: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'users' | 'logs' | 'stats'>('users');
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [stats, setStats] = useState<ExamStatEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      await seedDefaultAdmin();
      const all = await getAllUsers();
      setUsers(all);
    } catch {
      console.error('Error loading users');
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const entries = await getAccessLogs(200);
      setLogs(entries);
    } catch {
      console.error('Error loading logs');
    }
    setLogsLoading(false);
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const entries = await getExamStats(500);
      setStats(entries);
    } catch {
      console.error('Error loading stats');
    }
    setStatsLoading(false);
  };

  const handleAddUser = async (u: User) => {
    try {
      await createUser(u);
      setUsers([...users, u]);
      setShowAdd(false);
      setMsg('Usuario creado exitosamente');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Error al crear usuario');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      setMsg('Usuario eliminado');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Error al eliminar');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleUpdateUser = async (updated: User) => {
    try {
      await updateUser(updated);
      setUsers(users.map(u => u.id === updated.id ? updated : u));
      setEditUser(null);
      setMsg('Usuario actualizado');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Error al actualizar');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleSetMembership = async (id: string, hours: number | null) => {
    const updated = users.map(u => {
      if (u.id === id) {
        const expiry = hours !== null
          ? new Date(Date.now() + hours * 3600000).toISOString()
          : null;
        return { ...u, membershipExpiry: expiry, status: 'active' as const };
      }
      return u;
    });
    try {
      const target = updated.find(u => u.id === id);
      if (target) await updateUser(target);
      setUsers(updated);
      const label = hours !== null ? (hours < 24 ? `${hours}h` : `${hours / 24} dias`) : 'removida';
      setMsg(`Membresia ${label}`);
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Error al actualizar membresia');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const updated = users.map(u => {
      if (u.id === id) {
        const newStatus = u.status === 'blocked' ? 'active' : 'blocked';
        return { ...u, status: newStatus as 'active' | 'blocked' };
      }
      return u;
    });
    try {
      const target = updated.find(u => u.id === id);
      if (target) await updateUser(target);
      setUsers(updated);
    } catch {
      console.error('Error toggling status');
    }
  };

  const handleUnlockDevice = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const updated = { ...target, deviceId: null, deviceLocked: false };
    try {
      await updateUser(updated);
      setUsers(users.map(u => u.id === id ? updated : u));
      setMsg(`Dispositivo liberado para ${target.username}. Podra ingresar desde cualquier equipo.`);
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setMsg('Error al liberar dispositivo');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.apellido.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const isExpired = (u: User) => {
    if (!u.membershipExpiry) return false;
    return new Date(u.membershipExpiry) < new Date();
  };

  const daysLeft = (u: User) => {
    if (!u.membershipExpiry) return null;
    const diff = new Date(u.membershipExpiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      <header className="glass border-b border-navy-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
              <Settings className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="font-bold text-white">ADMINISTRACION</h1>
              <p className="text-xs text-slate-400">{users.length} usuarios registrados</p>
            </div>
          </div>
          <button onClick={onBack} className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-lg flex items-center gap-2 transition-colors">
            <HomeIcon className="w-4 h-4" /> Volver
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {msg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-success/20 border border-success/50 rounded-lg p-3 mb-4 text-success text-sm">
            {msg}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'users' ? 'bg-tactical-blue/20 text-tactical-blue-light' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
            <Users className="w-4 h-4 inline mr-1" /> Usuarios
          </button>
          <button onClick={() => { setTab('logs'); loadLogs(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'logs' ? 'bg-tactical-blue/20 text-tactical-blue-light' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
            <FileText className="w-4 h-4 inline mr-1" /> Registro de Accesos
          </button>
          <button onClick={() => { setTab('stats'); loadStats(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'stats' ? 'bg-tactical-blue/20 text-tactical-blue-light' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
            <Target className="w-4 h-4 inline mr-1" /> Estadisticas
          </button>
        </div>

        {tab === 'users' && (<>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-tactical-blue"
              placeholder="Buscar por nombre, usuario o email..." />
          </div>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
            <User className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>

        <div className="space-y-3">
          {filtered.map(u => {
            const expired = isExpired(u);
            const remaining = daysLeft(u);
            return (
              <motion.div key={u.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className={`glass rounded-xl p-4 border-l-4 ${
                  u.status === 'blocked' ? 'border-l-danger' : expired ? 'border-l-warning' : 'border-l-success'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-white">{u.nombre} {u.apellido}</span>
                      {u.role === 'admin' && <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded">ADMIN</span>}
                      {u.status === 'blocked' && <span className="px-2 py-0.5 bg-danger/20 text-danger text-xs rounded">BLOQUEADO</span>}
                      {expired && <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded">EXPIRADO</span>}
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap gap-3">
                      <span>Usuario: <span className="text-slate-300">{u.username}</span></span>
                      <span>Email: <span className="text-slate-300">{u.email || '-'}</span></span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Membresia: {u.membershipExpiry ? (
                        expired ? (
                          <span className="text-danger">Expirada ({new Date(u.membershipExpiry).toLocaleDateString('es-PE')})</span>
                        ) : (
                          <span className="text-success">Activa - {remaining} dias restantes (hasta {new Date(u.membershipExpiry).toLocaleDateString('es-PE')})</span>
                        )
                      ) : (
                        <span className="text-slate-400">Sin fecha (acceso ilimitado)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Dispositivo: {u.deviceLocked ? (
                        <span className="text-gold">Vinculado <span className="text-slate-600">({u.deviceId?.slice(0, 12)}...)</span></span>
                      ) : (
                        <span className="text-slate-400">Sin vincular</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-shrink-0">
                    <button onClick={() => setEditUser(u)} className="px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-xs text-white rounded-lg transition-colors">Editar</button>
                    <button onClick={() => handleUnlockDevice(u.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        u.deviceLocked ? 'bg-gold/20 text-gold hover:bg-gold/40' : 'bg-navy-700 text-slate-500'
                      }`}
                      title={u.deviceLocked ? 'Liberar dispositivo para que pueda ingresar desde otro equipo' : 'Sin dispositivo vinculado'}
                    >
                      {u.deviceLocked ? 'Liberar' : 'Sin vinc.'}
                    </button>
                    <div className="relative group">
                      <button className="px-3 py-1.5 bg-tactical-blue/20 hover:bg-tactical-blue/40 text-xs text-tactical-blue-light rounded-lg transition-colors">Membresia</button>
                      <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10">
                        <div className="bg-navy-800 border border-navy-700 rounded-lg p-2 shadow-xl min-w-[140px]">
                          {[{ h: 12, label: '12h' }, { h: 168, label: '7d' }, { h: 360, label: '15d' }, { h: 720, label: '30d' }, { h: 1440, label: '60d' }, { h: 2160, label: '90d' }, { h: 4320, label: '180d' }, { h: 8760, label: '365d' }].map(o => (
                            <button key={o.h} onClick={() => handleSetMembership(u.id, o.h)}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-navy-700 rounded transition-colors">
                              {o.label}
                            </button>
                          ))}
                          <hr className="border-navy-700 my-1" />
                          <button onClick={() => handleSetMembership(u.id, null)}
                            className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-navy-700 rounded transition-colors">
                            Sin limite
                          </button>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleToggleStatus(u.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        u.status === 'blocked' ? 'bg-success/20 text-success hover:bg-success/40' : 'bg-warning/20 text-warning hover:bg-warning/40'
                      }`}>
                      {u.status === 'blocked' ? 'Activar' : 'Bloquear'}
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)}
                      className="px-3 py-1.5 bg-danger/20 hover:bg-danger/40 text-xs text-danger rounded-lg transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-slate-400">No se encontraron usuarios</p>
            </div>
          )}
        </div>
        </>)}

        {tab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Ultimos 200 intentos de acceso</h3>
              <button onClick={loadLogs} className="px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-xs text-white rounded-lg transition-colors">
                Actualizar
              </button>
            </div>
            {logsLoading ? (
              <div className="glass rounded-xl p-8 text-center">
                <Loader2 className="w-6 h-6 text-tactical-blue-light animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Cargando registros...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-slate-400">Sin registros de acceso</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className={`glass rounded-lg p-3 border-l-4 ${log.status === 'allowed' ? 'border-l-success' : 'border-l-danger'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{log.username}</span>
                          <span className={`px-2 py-0.5 text-xs rounded ${log.status === 'allowed' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                            {log.status === 'allowed' ? ' Permitido' : ' Bloqueado'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{log.reason} | {log.platform} / {log.browser} | ID: {log.deviceId.slice(0, 16)}...</p>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString('es-PE')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Estadisticas de examenes</h3>
              <button onClick={loadStats} className="px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-xs text-white rounded-lg transition-colors">
                Actualizar
              </button>
            </div>
            {statsLoading ? (
              <div className="glass rounded-xl p-8 text-center">
                <Loader2 className="w-6 h-6 text-tactical-blue-light animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Cargando estadisticas...</p>
              </div>
            ) : stats.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Target className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400">Sin examenes registrados aun</p>
                <p className="text-xs text-slate-600 mt-1">Los examenes aparecen aqui cuando los usuarios rindan</p>
              </div>
            ) : (
              <>
                {/* Global Stats Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs text-slate-400">Total Examenes</p>
                    <p className="text-2xl font-bold text-white">{stats.length}</p>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs text-slate-400">Promedio General</p>
                    <p className="text-2xl font-bold text-white">
                      {Math.round(stats.reduce((s, e) => s + (e.correctAnswers / e.totalQuestions * 100), 0) / stats.length)}%
                    </p>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs text-slate-400">Usuarios Activos</p>
                    <p className="text-2xl font-bold text-white">
                      {new Set(stats.map(s => s.userId)).size}
                    </p>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs text-slate-400">Total Preguntas Falladas</p>
                    <p className="text-2xl font-bold text-danger">
                      {stats.reduce((s, e) => s + e.failedQuestionIds.length, 0)}
                    </p>
                  </div>
                </div>

                {/* Most Failed Questions */}
                {(() => {
                  const failCount: Record<number, number> = {};
                  stats.forEach(e => e.failedQuestionIds.forEach(id => { failCount[id] = (failCount[id] || 0) + 1; }));
                  const sorted = Object.entries(failCount)
                    .map(([id, count]) => ({ id: Number(id), count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 20);
                  if (sorted.length === 0) return null;
                  const maxCount = sorted[0].count;
                  return (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-danger" />
                        Preguntas Mas Falladas (Top 20)
                      </h4>
                      <div className="space-y-2">
                        {sorted.map((item, idx) => {
                          const q = questions.find(qq => qq.id === item.id);
                          return (
                            <div key={item.id} className="glass rounded-lg p-3 border-l-4 border-l-danger">
                              <div className="flex items-start gap-3">
                                <span className="text-xs font-bold text-danger mt-0.5">#{idx + 1}</span>
                                <div className="flex-1">
                                  <p className="text-sm text-white line-clamp-2">{q ? q.question : `Pregunta ID ${item.id}`}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="flex-1 bg-navy-800 rounded-full h-2 overflow-hidden">
                                      <div className="bg-danger h-full rounded-full" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                                    </div>
                                    <span className="text-xs text-danger font-medium">{item.count} vez{item.count !== 1 ? 'es' : ''}</span>
                                    {q && <span className="text-xs text-slate-500">{getCategoryDisplayName(getCategoryKey(q.category))}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Per User Stats */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-tactical-blue-light" />
                    Rendimiento por Usuario
                  </h4>
                  <div className="space-y-2">
                    {(() => {
                      const userStats: Record<string, { username: string; exams: number; totalCorrect: number; totalQ: number; totalFailed: number[] }> = {};
                      stats.forEach(e => {
                        if (!userStats[e.userId]) userStats[e.userId] = { username: e.username, exams: 0, totalCorrect: 0, totalQ: 0, totalFailed: [] };
                        userStats[e.userId].exams++;
                        userStats[e.userId].totalCorrect += e.correctAnswers;
                        userStats[e.userId].totalQ += e.totalQuestions;
                        userStats[e.userId].totalFailed.push(...e.failedQuestionIds);
                      });
                      return Object.entries(userStats)
                        .map(([userId, s]) => ({
                          userId,
                          ...s,
                          avg: Math.round((s.totalCorrect / s.totalQ) * 100),
                          uniqueFailed: new Set(s.totalFailed).size,
                        }))
                        .sort((a, b) => b.exams - a.exams);
                    })().map(us => (
                      <div key={us.userId} className="glass rounded-lg p-3 border-l-4 border-l-tactical-blue">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-white">{us.username}</span>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              <span>{us.exams} examen{us.exams !== 1 ? 'es' : ''}</span>
                              <span>Promedio: <span className={`font-medium ${us.avg >= 60 ? 'text-success' : 'text-danger'}`}>{us.avg}%</span></span>
                              <span>Preguntas unicas falladas: <span className="text-danger font-medium">{us.uniqueFailed}</span></span>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${us.avg >= 60 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                            {us.avg >= 60 ? 'APROBADO' : 'DESAPROBADO'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onAdd={handleAddUser} />}
      </AnimatePresence>
      <AnimatePresence>
        {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={handleUpdateUser} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ============== ADD USER MODAL ==============
function AddUserModal({ onClose, onAdd }: { onClose: () => void; onAdd: (u: User) => void }) {
  const [form, setForm] = useState({
    username: '', password: '', nombre: '', apellido: '', email: '',
    membershipHours: '' as string | number
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.nombre || !form.apellido) {
      setError('Complete usuario, contrasena, nombre y apellido');
      return;
    }
    if (form.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    const expiry = form.membershipHours ? new Date(Date.now() + Number(form.membershipHours) * 3600000).toISOString() : null;
    onAdd({
      id: Date.now().toString(),
      username: form.username,
      password: form.password,
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      role: 'user',
      membershipExpiry: expiry,
      createdAt: new Date().toISOString(),
      status: 'active',
      deviceId: null,
      deviceLocked: false,
    });
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
            </div>
            <p className="text-xs text-slate-600 mt-1">12h = prueba. Sin seleccion = ilimitado</p>
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

// ============== EDIT USER MODAL ==============
function EditUserModal({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) {
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

// ============== PROFILE PAGE ==============
function ProfilePage({ user, onUpdate, onBack }: { user: User; onUpdate: (u: User) => void; onBack: () => void }) {
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

  const handleSaveProfile = () => {
    onUpdate({ ...user, ...form });
    setMsg('Perfil actualizado');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleChangePassword = () => {
    if (passwordForm.current !== user.password) { setMsg('Contrasena actual incorrecta'); return; }
    if (passwordForm.newPass.length < 6) { setMsg('Minimo 6 caracteres'); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { setMsg('Las contrasenas no coinciden'); return; }
    onUpdate({ ...user, password: passwordForm.newPass });
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
