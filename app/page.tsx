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

// ============== TYPES ==============
interface User {
  id: string;
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  grado: string;
  cip: string;
  dni: string;
  email: string;
  role: 'admin' | 'user';
  membershipExpiry: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'blocked';
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
  const { isInstallable, install } = usePWA();

  // Check for existing session
  useEffect(() => {
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
            onViewHistory={() => setCurrentPage('history')}
            onLogout={handleLogout}
            onGoAdmin={() => setCurrentPage('admin')}
            onGoProfile={() => setCurrentPage('profile')}
            isInstallable={isInstallable}
            onInstall={install}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('simulador_users') || '[]');
      const found = users.find((u: User) => u.username === username && u.password === password);
      
      if (found) {
        if (found.status === 'blocked') {
          setError('Tu cuenta ha sido bloqueada. Contacta al administrador.');
          setLoading(false);
          return;
        }
        onLogin(found);
      } else {
        // Demo login
        if (username === 'admin' && password === '123456') {
          const demoUser: User = {
            id: '1',
            username: 'admin',
            password: '123456',
            nombre: 'Administrador',
            apellido: 'Demo',
            grado: 'SIP',
            cip: '00000000',
            dni: '00000000',
            email: 'admin@pnp.gob.pe',
            role: 'admin',
            membershipExpiry: null,
            createdAt: new Date().toISOString(),
            status: 'active'
          };
          // Save to users list if not already there
          const users = JSON.parse(localStorage.getItem('simulador_users') || '[]');
          if (!users.find((u: User) => u.username === 'admin')) {
            users.push(demoUser);
            localStorage.setItem('simulador_users', JSON.stringify(users));
          }
          onLogin(demoUser);
        } else {
          setError('Credenciales incorrectas');
        }
      }
      setLoading(false);
    }, 800);
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
    grado: 'SIP',
    cip: '',
    dni: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const grados = [
    'GP', 'TC', 'TD', 'TE', 'TF', 'TG',
    'SI', 'SII', 'SIII', 'SIV', 'SV',
    'CIP', 'CII', 'CIII', 'CIV', 'CV',
    'SIP', 'SII', 'SIII', 'SIV', 'SV'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('simulador_users') || '[]');
      
      if (users.find((u: User) => u.username === formData.username)) {
        setError('El usuario ya existe');
        setLoading(false);
        return;
      }

      const newUser: User = {
        id: Date.now().toString(),
        username: formData.username,
        password: formData.password,
        nombre: formData.nombre,
        apellido: formData.apellido,
        grado: formData.grado,
        cip: formData.cip,
        dni: formData.dni,
        email: formData.email,
        role: 'user',
        membershipExpiry: null,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      users.push(newUser);
      localStorage.setItem('simulador_users', JSON.stringify(users));
      onRegister(newUser);
    }, 800);
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Grado</label>
                <select
                  value={formData.grado}
                  onChange={(e) => setFormData({...formData, grado: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                >
                  {grados.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">CIP</label>
                <input
                  type="text"
                  value={formData.cip}
                  onChange={(e) => setFormData({...formData, cip: e.target.value})}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                  placeholder="Ej: 31444673"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">DNI</label>
              <input
                type="text"
                value={formData.dni}
                onChange={(e) => setFormData({...formData, dni: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                placeholder="8 dígitos"
                maxLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue"
                placeholder="correo@pnp.gob.pe"
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
function DashboardPage({ user, onStartExam, onViewHistory, onLogout, onGoAdmin, onGoProfile, isInstallable, onInstall }: {
  user: User;
  onStartExam: (config: ExamConfig) => void;
  onViewHistory: () => void;
  onLogout: () => void;
  onGoAdmin: () => void;
  onGoProfile: () => void;
  isInstallable: boolean;
  onInstall: () => void;
}) {
  const [selectedQuestions, setSelectedQuestions] = useState(50);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);

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
              <p className="text-sm font-medium text-white">{user.grado} {user.nombre} {user.apellido}</p>
              <p className="text-xs text-slate-400">CIP: {user.cip}</p>
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
            Bienvenido, <span className="text-gold">{user.grado} {user.apellido}</span>
          </h2>
          <p className="text-slate-400">Prepárate para tu examen de ascenso con nuestra plataforma de simulación</p>
          
          {/* Membership Warning */}
          {user.membershipExpiry && (() => {
            const remaining = Math.ceil((new Date(user.membershipExpiry).getTime() - Date.now()) / 86400000);
            const expired = remaining <= 0;
            if (expired) {
              return (
                <div className="mt-4 p-4 bg-danger/20 border border-danger/50 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-danger flex-shrink-0" />
                  <div>
                    <p className="text-danger font-semibold">Membresía expirada</p>
                    <p className="text-sm text-slate-400">Tu acceso ha expirado. Contacta al administrador para renovar.</p>
                  </div>
                </div>
              );
            } else if (remaining <= 7) {
              return (
                <div className="mt-4 p-4 bg-warning/20 border border-warning/50 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
                  <div>
                    <p className="text-warning font-semibold">Membresía por vencer</p>
                    <p className="text-sm text-slate-400">Tu membresía vence en {remaining} día{remaining !== 1 ? 's' : ''} ({new Date(user.membershipExpiry).toLocaleDateString('es-PE')})</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

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
          className="flex flex-col sm:flex-row gap-4"
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
      onStart(selected, timeLimits[config.numQuestions]);
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
                {config.numQuestions === 10 ? '15 min' : config.numQuestions === 50 ? '1h 15min' : '2h 30min'}
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

  const timePercentage = (state.timeRemaining / (examQuestions.length === 10 ? 900 : examQuestions.length === 50 ? 4500 : 9000)) * 100;
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
function ResultsPage({ result, onBack }: { result: ExamResult; onBack: () => void }) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  
  const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
  const passed = percentage >= 60;
  const timeMinutes = Math.floor(result.timeUsed / 60);
  const timeSeconds = result.timeUsed % 60;

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
            Dashboard
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
        <div className="flex gap-4 mt-6">
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-navy-800 hover:bg-navy-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <HomeIcon className="w-5 h-5" />
            Volver al Dashboard
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

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('simulador_users') || '[]');
    setUsers(saved);
  }, []);

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('simulador_users', JSON.stringify(newUsers));
  };

  const handleAddUser = (u: User) => {
    saveUsers([...users, u]);
    setShowAdd(false);
    setMsg('Usuario creado exitosamente');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDeleteUser = (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    saveUsers(users.filter(u => u.id !== id));
    setMsg('Usuario eliminado');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleUpdateUser = (updated: User) => {
    saveUsers(users.map(u => u.id === updated.id ? updated : u));
    setEditUser(null);
    setMsg('Usuario actualizado');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSetMembership = (id: string, days: number | null) => {
    const updated = users.map(u => {
      if (u.id === id) {
        const expiry = days !== null
          ? new Date(Date.now() + days * 86400000).toISOString()
          : null;
        return { ...u, membershipExpiry: expiry, status: 'active' as const };
      }
      return u;
    });
    saveUsers(updated);
    setMsg(days !== null ? `Membresia: ${days} dias` : 'Membresia removida');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleToggleStatus = (id: string) => {
    const updated = users.map(u => {
      if (u.id === id) {
        const newStatus = u.status === 'blocked' ? 'active' : 'blocked';
        return { ...u, status: newStatus as 'active' | 'blocked' };
      }
      return u;
    });
    saveUsers(updated);
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.apellido.toLowerCase().includes(search.toLowerCase()) ||
    u.cip.includes(search) ||
    u.dni.includes(search)
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

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-tactical-blue"
              placeholder="Buscar por nombre, usuario, CIP o DNI..." />
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
                      <span className="font-medium text-white">{u.grado} {u.nombre} {u.apellido}</span>
                      {u.role === 'admin' && <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded">ADMIN</span>}
                      {u.status === 'blocked' && <span className="px-2 py-0.5 bg-danger/20 text-danger text-xs rounded">BLOQUEADO</span>}
                      {expired && <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded">EXPIRADO</span>}
                    </div>
                    <div className="text-xs text-slate-400 flex flex-wrap gap-3">
                      <span>Usuario: <span className="text-slate-300">{u.username}</span></span>
                      <span>CIP: <span className="text-slate-300">{u.cip}</span></span>
                      <span>DNI: <span className="text-slate-300">{u.dni}</span></span>
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
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-shrink-0">
                    <button onClick={() => setEditUser(u)} className="px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-xs text-white rounded-lg transition-colors">Editar</button>
                    <div className="relative group">
                      <button className="px-3 py-1.5 bg-tactical-blue/20 hover:bg-tactical-blue/40 text-xs text-tactical-blue-light rounded-lg transition-colors">Membresia</button>
                      <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10">
                        <div className="bg-navy-800 border border-navy-700 rounded-lg p-2 shadow-xl min-w-[140px]">
                          {[7, 15, 30, 60, 90, 180, 365].map(d => (
                            <button key={d} onClick={() => handleSetMembership(u.id, d)}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-navy-700 rounded transition-colors">
                              {d} dias
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
    username: '', password: '', nombre: '', apellido: '', grado: 'SIP',
    cip: '', dni: '', email: '', role: 'user' as 'admin' | 'user',
    membershipDays: '' as string | number
  });
  const [error, setError] = useState('');

  const grados = ['GP', 'TC', 'TD', 'TE', 'TF', 'TG', 'SI', 'SII', 'SIII', 'SIV', 'SV', 'CIP', 'CII', 'CIII', 'CIV', 'CV', 'SIP'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.nombre || !form.apellido) {
      setError('Complete los campos obligatorios');
      return;
    }
    const expiry = form.membershipDays ? new Date(Date.now() + Number(form.membershipDays) * 86400000).toISOString() : null;
    onAdd({
      id: Date.now().toString(),
      ...form,
      membershipExpiry: expiry,
      createdAt: new Date().toISOString(),
      status: 'active'
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Grado</label>
              <select value={form.grado} onChange={e => setForm({...form, grado: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue">
                {grados.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rol</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value as 'admin' | 'user'})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">CIP</label>
              <input type="text" value={form.cip} onChange={e => setForm({...form, cip: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">DNI</label>
              <input type="text" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" maxLength={8} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Membresia (dias)</label>
            <div className="grid grid-cols-4 gap-2">
              {[7, 30, 90, 365].map(d => (
                <button key={d} type="button" onClick={() => setForm({...form, membershipDays: d})}
                  className={`py-1.5 text-xs rounded-lg border transition-colors ${
                    form.membershipDays === d ? 'border-tactical-blue bg-tactical-blue/20 text-tactical-blue-light' : 'border-navy-700 bg-navy-800/50 text-slate-400 hover:border-navy-600'
                  }`}>
                  {d} dias
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-1">Sin seleccion = acceso ilimitado</p>
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
    nombre: user.nombre, apellido: user.apellido, grado: user.grado,
    cip: user.cip, dni: user.dni, email: user.email, role: user.role,
    password: ''
  });

  const grados = ['GP', 'TC', 'TD', 'TE', 'TF', 'TG', 'SI', 'SII', 'SIII', 'SIV', 'SV', 'CIP', 'CII', 'CIII', 'CIV', 'CV', 'SIP'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...user,
      ...form,
      password: form.password || user.password
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Editar Usuario: {user.username}</h3>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Grado</label>
              <select value={form.grado} onChange={e => setForm({...form, grado: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue">
                {grados.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rol</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value as 'admin' | 'user'})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue">
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">CIP</label>
              <input type="text" value={form.cip} onChange={e => setForm({...form, cip: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">DNI</label>
              <input type="text" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" maxLength={8} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nueva contrasena (dejar vacio para no cambiar)</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
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
    nombre: user.nombre, apellido: user.apellido, email: user.email, cip: user.cip, dni: user.dni
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
                  <label className="block text-xs text-slate-400 mb-1">Grado</label>
                  <p className="px-3 py-2 bg-navy-800/50 rounded-lg text-white text-sm">{user.grado}</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CIP</label>
                  <input type="text" value={form.cip} onChange={e => setForm({...form, cip: e.target.value})}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">DNI</label>
                  <input type="text" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}
                    className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-tactical-blue" maxLength={8} />
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
