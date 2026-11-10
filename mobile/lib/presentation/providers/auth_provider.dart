import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants.dart';
import '../../core/services/local_store.dart';
import '../../data/models/app_user.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/user_repository.dart';
import 'exam_flow_provider.dart';

/// Notifica a go_router cuando cambia la autenticacion.
class RouterRefreshNotifier extends ChangeNotifier {
  void refresh() => notifyListeners();
}

final routerRefreshProvider = Provider<RouterRefreshNotifier>((ref) {
  return RouterRefreshNotifier();
});

enum AuthStatus { restoring, authenticated, unauthenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.submitting = false,
    this.error,
    this.attemptsLeft,
    this.sessionExpired = false,
  });

  final AuthStatus status;
  final AppUser? user;
  final bool submitting;
  final String? error;
  final int? attemptsLeft;
  final bool sessionExpired;

  bool get isAuthenticated => status == AuthStatus.authenticated && user != null;

  AuthState copyWith({
    AuthStatus? status,
    AppUser? user,
    bool? submitting,
    String? error,
    bool clearError = false,
    int? attemptsLeft,
    bool? sessionExpired,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      submitting: submitting ?? this.submitting,
      error: clearError ? null : (error ?? this.error),
      attemptsLeft: attemptsLeft ?? this.attemptsLeft,
      sessionExpired: sessionExpired ?? this.sessionExpired,
    );
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthNotifier extends Notifier<AuthState> {
  final AuthRepository _auth = const AuthRepository();
  final UserRepository _users = const UserRepository();

  Timer? _timeoutTimer;
  Timer? _heartbeatTimer;

  @override
  AuthState build() {
    ref.onDispose(() {
      _timeoutTimer?.cancel();
      _heartbeatTimer?.cancel();
    });
    Future.microtask(_restoreSession);
    return const AuthState(status: AuthStatus.restoring);
  }

  void _emit(AuthState next) {
    state = next;
    ref.read(routerRefreshProvider).refresh();
  }

  Future<void> _restoreSession() async {
    try {
      final raw = await LocalStore.readJson(AppConstants.keySessionUser);
      final user = raw == null ? null : AppUser.fromSessionJson(raw);

      if (user == null) {
        _emit(const AuthState(status: AuthStatus.unauthenticated));
        return;
      }

      final lastActivity =
          await LocalStore.readInt(AppConstants.keyLastActivity);
      final timeoutMs = AppConstants.sessionTimeout.inMilliseconds;
      if (lastActivity != null &&
          DateTime.now().millisecondsSinceEpoch - lastActivity >= timeoutMs) {
        await _clearSession();
        _emit(const AuthState(
          status: AuthStatus.unauthenticated,
          sessionExpired: true,
          error: 'Tu sesion caduco por inactividad. Vuelve a iniciar sesion.',
        ));
        return;
      }

      _emit(AuthState(status: AuthStatus.authenticated, user: user));
      _startTimers();
      unawaited(refreshUser());
    } catch (_) {
      _emit(const AuthState(status: AuthStatus.unauthenticated));
    }
  }

  /// Inicia sesion. Devuelve `null` si fue exitoso o el mensaje de error.
  Future<String?> login(String username, String password) async {
    _emit(AuthState(
      status: AuthStatus.unauthenticated,
      submitting: true,
      error: state.error,
      attemptsLeft: state.attemptsLeft,
    ));

    final outcome = await _auth.login(username, password);
    if (!outcome.isSuccess) {
      _emit(AuthState(
        status: AuthStatus.unauthenticated,
        submitting: false,
        error: outcome.error,
        attemptsLeft: outcome.attemptsLeft,
      ));
      return outcome.error;
    }

    final user = outcome.user!;
    await _saveSession(user);
    _emit(AuthState(status: AuthStatus.authenticated, user: user));
    _startTimers();
    unawaited(_users.setOnline(user.id, true));
    return null;
  }

  Future<void> logout({bool expired = false, String? message}) async {
    final user = state.user;
    _timeoutTimer?.cancel();
    _heartbeatTimer?.cancel();
    await _clearSession();
    if (user != null) {
      unawaited(_users.setOnline(user.id, false));
    }
    _emit(AuthState(
      status: AuthStatus.unauthenticated,
      sessionExpired: expired,
      error: message,
    ));
  }

  Future<void> _clearSession() async {
    await LocalStore.remove(AppConstants.keySessionUser);
    await LocalStore.remove(AppConstants.keyLastActivity);
  }

  Future<void> _saveSession(AppUser user) async {
    await LocalStore.writeJson(
      AppConstants.keySessionUser,
      user.toSessionJson(),
    );
    await LocalStore.writeInt(
      AppConstants.keyLastActivity,
      DateTime.now().millisecondsSinceEpoch,
    );
  }

  void _startTimers() {
    _resetTimeout();
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      final current = state.user;
      if (current == null) return;
      unawaited(_users.setOnline(current.id, true));
      unawaited(refreshUser());
    });
  }

  void _resetTimeout() {
    _timeoutTimer?.cancel();
    if (!state.isAuthenticated) return;
    unawaited(LocalStore.writeInt(
      AppConstants.keyLastActivity,
      DateTime.now().millisecondsSinceEpoch,
    ));
    _timeoutTimer = Timer(AppConstants.sessionTimeout, _handleTimeout);
  }

  /// Reinicia el temporizador de inactividad (se llama en cada interaccion).
  void noteActivity() {
    if (!state.isAuthenticated) return;
    _resetTimeout();
  }

  void _handleTimeout() {
    if (!state.isAuthenticated) return;
    // Mientras un examen esta en pausa la sesion se mantiene viva, igual
    // que hace `useSessionTimeout` en la PWA.
    if (ref.read(examFlowProvider).isPaused) {
      _timeoutTimer?.cancel();
      _timeoutTimer = Timer(AppConstants.sessionTimeout, _handleTimeout);
      return;
    }
    unawaited(logout(
      expired: true,
      message: 'Tu sesion caduco por inactividad. Vuelve a iniciar sesion.',
    ));
  }

  /// Relee el usuario desde Firestore para reflejar cambios del administrador
  /// (bloqueos, membresia, permisos de audio).
  Future<void> refreshUser() async {
    final current = state.user;
    if (current == null) return;
    try {
      final fresh = await _users.getByUsername(current.username);
      if (fresh == null) return;

      if (fresh.isBlocked) {
        await logout(
          message: 'Tu cuenta fue bloqueada. Contacta al administrador.',
        );
        return;
      }

      final safe = fresh.withoutPassword();
      await _saveSession(safe);
      _emit(AuthState(status: AuthStatus.authenticated, user: safe));
    } catch (_) {
      // Sin conexion: se conserva la sesion en cache.
    }
  }

  Future<void> updateLocalUser(AppUser user) async {
    await _saveSession(user);
    _emit(AuthState(status: AuthStatus.authenticated, user: user));
  }
}
