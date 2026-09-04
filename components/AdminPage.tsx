'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Users, FileText, Target, Search, Home as HomeIcon, 
  Loader2, User, Info 
} from 'lucide-react';
import { getCategoryKey, getCategoryDisplayName } from '../lib/categoryUtils';
import { seedDefaultAdmin, getAllUsersPublic, createUser, updateUser, deleteUser, getUserByUsername } from '../lib/users';
import { getAccessLogs } from '../lib/accessLog';
import type { AccessLogEntry } from '../lib/accessLog';
import { getExamStats } from '../lib/examStats';
import type { ExamStatEntry } from '../lib/examStats';
import type { User as UserType, Question } from './types';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';

export default function AdminPage({ currentUser, questions, onBack }: { currentUser: UserType; questions: Question[]; onBack: () => void }) {
  const [users, setUsers] = useState<UserType[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<UserType | null>(null);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'users' | 'logs' | 'stats'>('users');
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [stats, setStats] = useState<ExamStatEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openMembershipId, setOpenMembershipId] = useState<string | null>(null);
  const [logsPage, setLogsPage] = useState(1);
  const [statsPage, setStatsPage] = useState(1);
  const [subFilter, setSubFilter] = useState<'all' | 'active' | 'expired' | 'none'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'username-asc' | 'username-desc'>('name-asc');
  const PAGE_SIZE_MOBILE = 10;
  const PAGE_SIZE_DESKTOP = 20;
  const LOGS_PAGE_SIZE = 20;
  const STATS_PAGE_SIZE = 15;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, subFilter, sortBy]);

  useEffect(() => {
    if (tab !== 'users') return;
    const iv = setInterval(loadUsers, 30000);
    return () => clearInterval(iv);
  }, [tab]);

  const loadUsers = async () => {
    try {
      await seedDefaultAdmin();
      const all = await getAllUsersPublic();
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

  const handleAddUser = async (u: UserType, password: string) => {
    try {
      await createUser({ ...u, password } as any);
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

  const handleUpdateUser = async (updated: UserType, newPassword?: string) => {
    try {
      if (newPassword) {
        const { hashPassword } = await import('../lib/password');
        const fullUser = await getUserByUsername(updated.username);
        if (fullUser) {
          const hashed = await hashPassword(newPassword);
          await updateUser({ ...fullUser, ...updated, password: hashed });
        } else {
          await updateUser({ ...updated, password: '' } as any);
        }
      } else {
        const fullUser = await getUserByUsername(updated.username);
        if (fullUser) {
          await updateUser({ ...fullUser, ...updated });
        }
      }
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
      if (target) {
        const fullUser = await getUserByUsername(target.username);
        if (fullUser) await updateUser({ ...fullUser, ...target });
      }
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

  const handleUnlockDevice = async (id: string, deviceIdToRemove: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const updated = { ...target, devices: target.devices.filter(d => d !== deviceIdToRemove) };
    try {
      await updateUser(updated);
      setUsers(users.map(u => u.id === id ? updated : u));
      setMsg(`Dispositivo liberado para ${target.username} (${target.devices.length - 1} vinculado${target.devices.length - 1 !== 1 ? 's' : ''} restante).`);
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setMsg('Error al liberar dispositivo');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleUnlockAll = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const updated = { ...target, devices: [] };
    try {
      await updateUser(updated);
      setUsers(users.map(u => u.id === id ? updated : u));
      setMsg(`Todos los dispositivos de ${target.username} liberados. Podra ingresar desde cualquier equipo.`);
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setMsg('Error al liberar dispositivos');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleToggleMaxDevices = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const newMax = target.maxDevices === 2 ? 1 : 2;
    const updated = { ...target, maxDevices: newMax, devices: target.devices.slice(0, newMax) };
    try {
      await updateUser(updated);
      setUsers(users.map(u => u.id === id ? updated : u));
      setMsg(`${target.username}: limite de ${newMax} dispositivo${newMax !== 1 ? 's' : ''}${newMax === 1 && target.devices.length > 1 ? ' (dispositivos excedentes liberados)' : ''}`);
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setMsg('Error al actualizar limite de dispositivos');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const isExpired = (u: UserType) => {
    if (!u.membershipExpiry) return false;
    return new Date(u.membershipExpiry) < new Date();
  };

  const daysLeft = (u: UserType) => {
    if (!u.membershipExpiry) return null;
    const diff = new Date(u.membershipExpiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  const isOnline = (u: UserType) => !!u.online && typeof u.lastSeen === 'number' && Date.now() - u.lastSeen < 120000;

  const lastSeenLabel = (u: UserType) => {
    if (typeof u.lastSeen !== 'number') return 'sin actividad';
    const diff = Date.now() - u.lastSeen;
    if (diff < 60000) return 'hace menos de un min';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `visto hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `visto hace ${hours} h`;
  };

  const onlineCount = users.filter(isOnline).length;

  const filtered = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.nombre.toLowerCase().includes(search.toLowerCase()) ||
      u.apellido.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (subFilter === 'all') return true;
    if (subFilter === 'none') return !u.membershipExpiry;
    const expired = isExpired(u);
    if (subFilter === 'active') return u.membershipExpiry && !expired;
    if (subFilter === 'expired') return expired;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name-asc': return `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`);
      case 'name-desc': return `${b.nombre} ${b.apellido}`.localeCompare(`${a.nombre} ${a.apellido}`);
      case 'username-asc': return a.username.localeCompare(b.username);
      case 'username-desc': return b.username.localeCompare(a.username);
      default: return 0;
    }
  });

  const getPageSize = () => (typeof window !== 'undefined' && window.innerWidth >= 640 ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE);
  const totalPages = Math.ceil(filtered.length / getPageSize());
  const paginatedUsers = filtered.slice((currentPage - 1) * getPageSize(), currentPage * getPageSize());

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
              <p className="text-xs text-slate-400">{users.length} usuarios · <span className="text-success">{onlineCount} en linea</span></p>
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

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'users' ? 'bg-tactical-blue/20 text-tactical-blue-light' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
            <Users className="w-4 h-4 inline mr-1" /> Usuarios
          </button>
          <button onClick={() => { setTab('logs'); setLogsPage(1); loadLogs(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'logs' ? 'bg-tactical-blue/20 text-tactical-blue-light' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
            <FileText className="w-4 h-4 inline mr-1" /> Registro de Accesos
          </button>
          <button onClick={() => { setTab('stats'); setStatsPage(1); loadStats(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'stats' ? 'bg-tactical-blue/20 text-tactical-blue-light' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
            <Target className="w-4 h-4 inline mr-1" /> Estadisticas
          </button>
        </div>

        {tab === 'users' && (<>
        <div className="sticky top-[61px] z-40 bg-[#0a0f1e] pt-3 pb-3 -mx-4 px-4 border-b border-navy-700/50">
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-tactical-blue"
                placeholder="Buscar por nombre, usuario o email..." />
            </div>
            <button onClick={() => setShowAdd(true)}
              className="px-4 py-2.5 bg-tactical-blue hover:bg-tactical-blue-dark text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
              <User className="w-4 h-4" /> Nuevo
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>{filtered.length === users.length ? `${users.length} usuarios` : `${filtered.length} de ${users.length} usuarios`}</span>
            {totalPages > 1 && <span>Pagina {currentPage} de {totalPages}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              {([['all', 'Todos'], ['active', 'Activos'], ['expired', 'Vencidos'], ['none', 'Sin fecha']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setSubFilter(val)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${subFilter === val ? 'bg-tactical-blue/30 text-tactical-blue-light' : 'bg-navy-800 text-slate-500 hover:bg-navy-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1 text-xs bg-navy-800 border border-navy-700 text-slate-300 rounded-md focus:outline-none focus:border-tactical-blue">
              <option value="name-asc">Nombre A-Z</option>
              <option value="name-desc">Nombre Z-A</option>
              <option value="username-asc">Usuario A-Z</option>
              <option value="username-desc">Usuario Z-A</option>
            </select>
          </div>
        </div>

        <div className="mb-4 p-3 bg-tactical-blue/10 border border-tactical-blue/30 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-tactical-blue-light flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-white">Nota:</span> un usuario puede figurar en el "Registro de Accesos" como logueado aunque aqui aparezca "Sin vincular". El registro cuenta todos los intentos, incluso los bloqueados. Solo se <span className="text-gold font-medium">vincula un dispositivo</span> cuando el login es exitoso desde un equipo nuevo. Si superan el limite, libera los dispositivos (boton "Liberar") para que puedan re-vincular.
          </p>
        </div>

        <div className="space-y-3">
          {paginatedUsers.map(u => {
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
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded ${isOnline(u) ? 'bg-success/20 text-success' : 'bg-navy-700 text-slate-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${isOnline(u) ? 'bg-success animate-pulse' : 'bg-slate-500'}`} />
                        {isOnline(u) ? 'En linea' : lastSeenLabel(u)}
                      </span>
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
                      Dispositivos ({u.devices.length}/{u.maxDevices}): {u.devices.length > 0 ? (
                        u.devices.map((d, i) => (
                          <span key={d} className="inline-flex items-center gap-1 mr-2">
                            <span className="text-gold">Vinculado {i + 1}</span>
                            <span className="text-slate-600">({d.slice(0, 12)}...)</span>
                            <button onClick={() => handleUnlockDevice(u.id, d)} title="Liberar este dispositivo"
                              className="px-1.5 py-0.5 bg-gold/20 hover:bg-gold/40 text-gold text-[10px] rounded transition-colors">X</button>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">Sin vincular</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-shrink-0">
                    <button onClick={() => setEditUser(u)} className="px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-xs text-white rounded-lg transition-colors">Editar</button>
                    <button onClick={() => handleUnlockAll(u.id)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        u.devices.length > 0 ? 'bg-gold/20 text-gold hover:bg-gold/40' : 'bg-navy-700 text-slate-500'
                      }`}
                      title={u.devices.length > 0 ? `Liberar todos los dispositivos (${u.devices.length}/${u.maxDevices}) para que pueda ingresar desde otro equipo` : 'Sin dispositivos vinculados'}
                    >
                      {u.devices.length > 0 ? `Liberar (${u.devices.length})` : 'Sin vinc.'}
                    </button>
                    <button onClick={() => handleToggleMaxDevices(u.id)}
                      className="px-3 py-1.5 bg-tactical-blue/10 hover:bg-tactical-blue/30 text-xs text-tactical-blue-light rounded-lg transition-colors"
                      title={u.maxDevices === 2 ? 'Reducir a 1 dispositivo' : 'Habilitar 2 dispositivos para este usuario'}
                    >
                      {u.maxDevices}/2 disp.
                    </button>
                    <div className="relative">
                      <button onClick={() => setOpenMembershipId(openMembershipId === u.id ? null : u.id)}
                        className="px-3 py-1.5 bg-tactical-blue/20 hover:bg-tactical-blue/40 text-xs text-tactical-blue-light rounded-lg transition-colors">Membresia</button>
                      {openMembershipId === u.id && (
                        <div className="absolute right-0 top-full mt-1 z-10">
                          <div className="bg-navy-800 border border-navy-700 rounded-lg p-2 shadow-xl min-w-[140px]">
                            {[{ h: 12, label: '12h' }, { h: 168, label: '7d' }, { h: 360, label: '15d' }, { h: 720, label: '30d' }, { h: 1440, label: '60d' }, { h: 2160, label: '90d' }, { h: 4320, label: '180d' }, { h: 8760, label: '365d' }].map(o => (
                              <button key={o.h} onClick={() => { handleSetMembership(u.id, o.h); setOpenMembershipId(null); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-navy-700 rounded transition-colors">
                                {o.label}
                              </button>
                            ))}
                            <hr className="border-navy-700 my-1" />
                            <button onClick={() => { handleSetMembership(u.id, null); setOpenMembershipId(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-navy-700 rounded transition-colors">
                              Sin limite
                            </button>
                          </div>
                        </div>
                      )}
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2 pb-4">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 text-xs rounded-lg transition-colors ${currentPage === page ? 'bg-tactical-blue text-white' : 'bg-navy-800 text-slate-400 hover:bg-navy-700'}`}>
                  {page}
                </button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Siguiente
              </button>
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
            <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed">
                Este registro incluye <span className="font-bold text-warning">todos los intentos</span>, exitosos (estado "allowed") y bloqueados (estado "blocked"). Un intento bloqueado NO vincula dispositivo. Consulta la pestaña <span className="text-tactical-blue-light font-medium">Usuarios</span> para ver los dispositivos realmente vinculados.
              </p>
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
              <>
              <div className="space-y-2">
                {logs.slice((logsPage - 1) * LOGS_PAGE_SIZE, logsPage * LOGS_PAGE_SIZE).map(log => (
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
              {Math.ceil(logs.length / LOGS_PAGE_SIZE) > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4 pb-2">
                  <button onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage === 1}
                    className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    Anterior
                  </button>
                  <span className="text-xs text-slate-400">{logsPage} / {Math.ceil(logs.length / LOGS_PAGE_SIZE)}</span>
                  <button onClick={() => setLogsPage(p => p + 1)} disabled={logsPage >= Math.ceil(logs.length / LOGS_PAGE_SIZE)}
                    className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    Siguiente
                  </button>
                </div>
              )}
              </>
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

                <div>
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-tactical-blue-light" />
                    Rendimiento por Usuario
                  </h4>
                  {(() => {
                    const userStats: Record<string, { username: string; exams: number; totalCorrect: number; totalQ: number; totalFailed: number[] }> = {};
                    stats.forEach(e => {
                      if (!userStats[e.userId]) userStats[e.userId] = { username: e.username, exams: 0, totalCorrect: 0, totalQ: 0, totalFailed: [] };
                      userStats[e.userId].exams++;
                      userStats[e.userId].totalCorrect += e.correctAnswers;
                      userStats[e.userId].totalQ += e.totalQuestions;
                      userStats[e.userId].totalFailed.push(...e.failedQuestionIds);
                    });
                    const sorted = Object.entries(userStats)
                      .map(([userId, s]) => ({
                        userId,
                        ...s,
                        avg: Math.round((s.totalCorrect / s.totalQ) * 100),
                        uniqueFailed: new Set(s.totalFailed).size,
                      }))
                      .sort((a, b) => b.exams - a.exams);
                    const statsTotalPages = Math.ceil(sorted.length / STATS_PAGE_SIZE);
                    const paginatedStats = sorted.slice((statsPage - 1) * STATS_PAGE_SIZE, statsPage * STATS_PAGE_SIZE);
                    return (
                      <>
                        <div className="space-y-2">
                          {paginatedStats.map(us => (
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
                        {statsTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-4 pb-2">
                            <button onClick={() => setStatsPage(p => Math.max(1, p - 1))} disabled={statsPage === 1}
                              className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              Anterior
                            </button>
                            <span className="text-xs text-slate-400">{statsPage} / {statsTotalPages}</span>
                            <button onClick={() => setStatsPage(p => p + 1)} disabled={statsPage >= statsTotalPages}
                              className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-xs text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              Siguiente
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
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
