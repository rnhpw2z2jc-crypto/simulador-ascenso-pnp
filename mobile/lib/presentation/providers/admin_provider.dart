import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/password_service.dart';
import '../../data/models/admin_entries.dart';
import '../../data/models/app_user.dart';
import '../../data/repositories/user_repository.dart';

enum AdminTab { users, logs, stats }

enum MembershipFilter { all, active, expired, none }

enum UserSortOption { nameAsc, nameDesc, usernameAsc, usernameDesc }

extension MembershipFilterLabel on MembershipFilter {
  String get label => switch (this) {
        MembershipFilter.all => 'Todos',
        MembershipFilter.active => 'Activos',
        MembershipFilter.expired => 'Vencidos',
        MembershipFilter.none => 'Sin fecha',
      };
}

extension UserSortOptionLabel on UserSortOption {
  String get label => switch (this) {
        UserSortOption.nameAsc => 'Nombre A-Z',
        UserSortOption.nameDesc => 'Nombre Z-A',
        UserSortOption.usernameAsc => 'Usuario A-Z',
        UserSortOption.usernameDesc => 'Usuario Z-A',
      };
}

class AdminState {
  const AdminState({
    this.tab = AdminTab.users,
    this.users = const [],
    this.loadingUsers = false,
    this.usersLoaded = false,
    this.message,
    this.messageIsError = false,
    this.search = '',
    this.filter = MembershipFilter.all,
    this.sort = UserSortOption.nameAsc,
    this.page = 1,
    this.logs = const [],
    this.loadingLogs = false,
    this.stats = const [],
    this.loadingStats = false,
  });

  final AdminTab tab;
  final List<AppUser> users;
  final bool loadingUsers;
  final bool usersLoaded;
  final String? message;
  final bool messageIsError;
  final String search;
  final MembershipFilter filter;
  final UserSortOption sort;
  final int page;
  final List<AccessLogEntry> logs;
  final bool loadingLogs;
  final List<ExamStatEntry> stats;
  final bool loadingStats;

  int get onlineCount {
    final now = DateTime.now().millisecondsSinceEpoch;
    return users.where((user) {
      final lastSeen = user.lastSeen;
      return user.online &&
          lastSeen != null &&
          now - lastSeen < 120000;
    }).length;
  }

  int get filteredCount => filteredUsers.length;

  List<AppUser> get filteredUsers {
    final term = search.trim().toLowerCase();
    final filtered = users.where((user) {
      if (term.isNotEmpty) {
        final matches = user.username.toLowerCase().contains(term) ||
            user.nombre.toLowerCase().contains(term) ||
            user.apellido.toLowerCase().contains(term) ||
            user.email.toLowerCase().contains(term);
        if (!matches) return false;
      }
      switch (filter) {
        case MembershipFilter.all:
          return true;
        case MembershipFilter.none:
          return user.membershipExpiry == null;
        case MembershipFilter.active:
          return user.membershipExpiry != null && !user.isExpired;
        case MembershipFilter.expired:
          return user.membershipExpiry != null && user.isExpired;
      }
    }).toList();

    filtered.sort((a, b) {
      switch (sort) {
        case UserSortOption.nameAsc:
          return '${a.nombre} ${a.apellido}'
              .toLowerCase()
              .compareTo('${b.nombre} ${b.apellido}'.toLowerCase());
        case UserSortOption.nameDesc:
          return '${b.nombre} ${b.apellido}'
              .toLowerCase()
              .compareTo('${a.nombre} ${a.apellido}'.toLowerCase());
        case UserSortOption.usernameAsc:
          return a.username.toLowerCase().compareTo(b.username.toLowerCase());
        case UserSortOption.usernameDesc:
          return b.username.toLowerCase().compareTo(a.username.toLowerCase());
      }
    });
    return filtered;
  }

  bool isOnline(AppUser user) {
    final lastSeen = user.lastSeen;
    return user.online &&
        lastSeen != null &&
        DateTime.now().millisecondsSinceEpoch - lastSeen < 120000;
  }

  AdminState copyWith({
    AdminTab? tab,
    List<AppUser>? users,
    bool? loadingUsers,
    bool? usersLoaded,
    String? message,
    bool clearMessage = false,
    bool? messageIsError,
    String? search,
    MembershipFilter? filter,
    UserSortOption? sort,
    int? page,
    List<AccessLogEntry>? logs,
    bool? loadingLogs,
    List<ExamStatEntry>? stats,
    bool? loadingStats,
  }) {
    return AdminState(
      tab: tab ?? this.tab,
      users: users ?? this.users,
      loadingUsers: loadingUsers ?? this.loadingUsers,
      usersLoaded: usersLoaded ?? this.usersLoaded,
      message: clearMessage ? null : (message ?? this.message),
      messageIsError: messageIsError ?? this.messageIsError,
      search: search ?? this.search,
      filter: filter ?? this.filter,
      sort: sort ?? this.sort,
      page: page ?? this.page,
      logs: logs ?? this.logs,
      loadingLogs: loadingLogs ?? this.loadingLogs,
      stats: stats ?? this.stats,
      loadingStats: loadingStats ?? this.loadingStats,
    );
  }
}

final adminProvider =
    NotifierProvider<AdminNotifier, AdminState>(AdminNotifier.new);

class AdminNotifier extends Notifier<AdminState> {
  final UserRepository _repository = const UserRepository();

  Timer? _refreshTimer;
  Timer? _messageTimer;
  bool _initialized = false;

  @override
  AdminState build() {
    ref.onDispose(() {
      _refreshTimer?.cancel();
      _messageTimer?.cancel();
    });
    return const AdminState();
  }

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    await _loadUsers(seed: true);
    _refreshTimer?.cancel();
    // La PWA refresca la lista de usuarios cada 30 s en la pestana Usuarios.
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (state.tab == AdminTab.users) {
        unawaited(_loadUsers(silent: true));
      }
    });
  }

  Future<void> _loadUsers({bool seed = false, bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(loadingUsers: true);
    }
    try {
      if (seed) {
        await _repository.seedDefaultAdmin();
      }
      final users = await _repository.getAllUsers();
      state = state.copyWith(
        users: users,
        loadingUsers: false,
        usersLoaded: true,
      );
    } catch (_) {
      state = state.copyWith(loadingUsers: false, usersLoaded: true);
      if (!silent) _flash('Error al cargar usuarios', error: true);
    }
  }

  Future<void> refreshUsers() => _loadUsers();

  void setTab(AdminTab tab) {
    if (state.tab == tab) return;
    state = state.copyWith(tab: tab);
    if (tab == AdminTab.logs && state.logs.isEmpty) {
      unawaited(loadLogs());
    }
    if (tab == AdminTab.stats && state.stats.isEmpty) {
      unawaited(loadStats());
    }
  }

  void setSearch(String value) {
    state = state.copyWith(search: value, page: 1);
  }

  void setFilter(MembershipFilter filter) {
    state = state.copyWith(filter: filter, page: 1);
  }

  void setSort(UserSortOption sort) {
    state = state.copyWith(sort: sort, page: 1);
  }

  void setPage(int page) {
    state = state.copyWith(page: page < 1 ? 1 : page);
  }

  void _flash(String message, {bool error = false}) {
    _messageTimer?.cancel();
    state = state.copyWith(message: message, messageIsError: error);
    _messageTimer = Timer(const Duration(seconds: 4), () {
      state = state.copyWith(clearMessage: true);
    });
  }

  bool isUsernameTaken(String username) {
    final normalized = username.trim().toLowerCase();
    return state.users
        .any((user) => user.username.trim().toLowerCase() == normalized);
  }

  // ---------------------------------------------------------------------
  // Usuarios
  // ---------------------------------------------------------------------

  Future<void> addUser({
    required String username,
    required String nombre,
    required String apellido,
    required String email,
    required String password,
    required bool vip,
    required bool audio,
  }) async {
    try {
      final hash = await _hash(password);
      final expiry = vip
          ? AdminNotifier.vipExpiry
          : DateTime.now().add(const Duration(hours: 12));
      await _repository.createUser(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        username: username,
        passwordHash: hash,
        nombre: nombre,
        apellido: apellido,
        email: email,
        role: 'user',
        status: 'active',
        membershipExpiry: expiry,
        createdAt: DateTime.now().toUtc().toIso8601String(),
        devices: const [],
        maxDevices: 1,
        audioEnabled: audio,
      );
      await _loadUsers(silent: true);
      _flash('Usuario creado exitosamente');
    } catch (_) {
      _flash('Error al crear usuario', error: true);
    }
  }

  Future<void> updateUser(
    AppUser user, {
    required String nombre,
    required String apellido,
    required String email,
    String? newPassword,
    String? membership,
    required int maxDevices,
    required bool audio,
  }) async {
    try {
      final changes = <String, dynamic>{
        'nombre': nombre,
        'apellido': apellido,
        'email': email,
        'maxDevices': maxDevices.clamp(1, 2).toInt(),
        'features': {'audio': audio},
      };

      if (membership == 'free') {
        changes['membershipExpiry'] = DateTime.now()
            .add(const Duration(hours: 12))
            .toUtc()
            .toIso8601String();
      } else if (membership == 'vip') {
        changes['membershipExpiry'] =
            AdminNotifier.vipExpiry.toUtc().toIso8601String();
      }

      if (maxDevices <= 1 && user.devices.length > 1) {
        changes['devices'] = user.devices.take(1).toList(growable: false);
      }

      if (newPassword != null && newPassword.isNotEmpty) {
        changes['password'] = await _hash(newPassword);
      }

      await _repository.patchUser(user.id, changes);
      await _loadUsers(silent: true);
      _flash('Usuario actualizado');
    } catch (_) {
      _flash('Error al actualizar', error: true);
    }
  }

  Future<void> deleteUser(AppUser user) async {
    try {
      await _repository.deleteUserCascade(user.id);
      state = state.copyWith(
        users: state.users
            .where((item) => item.id != user.id)
            .toList(growable: false),
      );
      _flash('Usuario eliminado');
    } catch (_) {
      _flash('Error al eliminar', error: true);
    }
  }

  Future<void> toggleStatus(AppUser user) async {
    final newStatus = user.status == 'blocked' ? 'active' : 'blocked';
    try {
      await _repository.setStatus(user.id, newStatus);
      _replaceUser(user.copyWith(status: newStatus));
    } catch (_) {
      _flash('Error al cambiar el estado', error: true);
    }
  }

  Future<void> toggleAudio(AppUser user) async {
    final enabled = !user.audioEnabled;
    try {
      await _repository.patchUser(user.id, {
        'features': {'audio': enabled},
      });
      _replaceUser(user.copyWith(audioEnabled: enabled));
      _flash(
        'Modo Audio ${enabled ? 'activado' : 'desactivado'} '
        'para ${user.username}',
      );
    } catch (_) {
      _flash('Error al actualizar el modo audio', error: true);
    }
  }

  /// `hours == null` quita la fecha (acceso ilimitado), igual que la PWA.
  Future<void> setMembership(AppUser user, int? hours) async {
    final expiry = hours == null
        ? null
        : DateTime.now().add(Duration(hours: hours));
    try {
      await _repository.patchUser(user.id, {
        'membershipExpiry': expiry?.toUtc().toIso8601String(),
        'status': 'active',
      });
      if (hours == null) {
        await _loadUsers(silent: true);
      } else {
        _replaceUser(
          user.copyWith(membershipExpiry: expiry, status: 'active'),
        );
      }
      final label = hours == null
          ? 'removida'
          : hours < 24
              ? '$hours h'
              : '${hours ~/ 24} dias';
      _flash('Membresia $label');
    } catch (_) {
      _flash('Error al actualizar membresia', error: true);
    }
  }

  Future<void> setVip(AppUser user) async {
    try {
      await _repository.patchUser(user.id, {
        'membershipExpiry': AdminNotifier.vipExpiry.toUtc().toIso8601String(),
        'status': 'active',
      });
      _replaceUser(
        user.copyWith(
          membershipExpiry: AdminNotifier.vipExpiry,
          status: 'active',
        ),
      );
      _flash('Membresia VIP asignada hasta el 31/12/2026');
    } catch (_) {
      _flash('Error al asignar membresia', error: true);
    }
  }

  Future<void> unlockDevice(AppUser user, String deviceId) async {
    final devices =
        user.devices.where((device) => device != deviceId).toList();
    try {
      await _repository.patchUser(user.id, {'devices': devices});
      _replaceUser(user.copyWith(devices: devices));
      final remaining = devices.length;
      _flash(
        'Dispositivo liberado para ${user.username} '
        '($remaining vinculado${remaining != 1 ? 's' : ''} restante'
        '${remaining != 1 ? 's' : ''}).',
      );
    } catch (_) {
      _flash('Error al liberar dispositivo', error: true);
    }
  }

  Future<void> unlockAll(AppUser user) async {
    try {
      await _repository.patchUser(user.id, {'devices': <String>[]});
      _replaceUser(user.copyWith(devices: const []));
      _flash(
        'Todos los dispositivos de ${user.username} liberados. '
        'Podra ingresar desde cualquier equipo.',
      );
    } catch (_) {
      _flash('Error al liberar dispositivos', error: true);
    }
  }

  Future<void> toggleMaxDevices(AppUser user) async {
    final newMax = user.maxDevices == 2 ? 1 : 2;
    final devices = user.devices.take(newMax).toList(growable: false);
    try {
      await _repository.patchUser(user.id, {
        'maxDevices': newMax,
        'devices': devices,
      });
      _replaceUser(
        user.copyWith(maxDevices: newMax, devices: devices),
      );
      final released = newMax == 1 && user.devices.length > 1
          ? ' (dispositivos excedentes liberados)'
          : '';
      _flash(
        '${user.username}: limite de $newMax dispositivo'
        '${newMax != 1 ? 's' : ''}$released',
      );
    } catch (_) {
      _flash('Error al actualizar limite de dispositivos', error: true);
    }
  }

  void _replaceUser(AppUser updated) {
    state = state.copyWith(
      users: state.users
          .map((user) => user.id == updated.id ? updated : user)
          .toList(growable: false),
    );
  }

  // ---------------------------------------------------------------------
  // Registros y estadisticas
  // ---------------------------------------------------------------------

  Future<void> loadLogs() async {
    state = state.copyWith(loadingLogs: true);
    try {
      final logs = await _repository.getAccessLogs();
      state = state.copyWith(logs: logs, loadingLogs: false);
    } catch (_) {
      state = state.copyWith(loadingLogs: false);
      _flash('Error al cargar registros', error: true);
    }
  }

  Future<void> loadStats() async {
    state = state.copyWith(loadingStats: true);
    try {
      final stats = await _repository.getExamStats();
      state = state.copyWith(stats: stats, loadingStats: false);
    } catch (_) {
      state = state.copyWith(loadingStats: false);
      _flash('Error al cargar estadisticas', error: true);
    }
  }

  Future<String> _hash(String password) => PasswordService.hash(password);

  static DateTime get vipExpiry =>
      DateTime(2026, 12, 31, 23, 59, 59, 999);
}
