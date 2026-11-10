import '../../core/services/attempt_store.dart';
import '../../core/services/device_service.dart';
import '../../core/services/password_service.dart';
import '../models/app_user.dart';
import 'user_repository.dart';

class LoginOutcome {
  const LoginOutcome._({this.user, this.error, this.attemptsLeft});

  factory LoginOutcome.success(AppUser user) => LoginOutcome._(user: user);

  factory LoginOutcome.failure(String error, {int? attemptsLeft}) =>
      LoginOutcome._(error: error, attemptsLeft: attemptsLeft);

  final AppUser? user;
  final String? error;
  final int? attemptsLeft;

  bool get isSuccess => user != null;
}

/// Autenticacion personalizada de la PWA:
/// Firestore `users` + contrasena bcrypt + limite de dispositivos.
class AuthRepository {
  const AuthRepository([this._users = const UserRepository()]);

  final UserRepository _users;

  String _sanitizeUsername(String input) {
    final clean = input.trim().replaceAll(RegExp(r'[<>]'), '');
    return clean.length > 30 ? clean.substring(0, 30) : clean;
  }

  Future<LoginOutcome> login(String usernameInput, String password) async {
    final username = _sanitizeUsername(usernameInput);

    if (username.length < 3) {
      return LoginOutcome.failure(
        'El usuario debe tener al menos 3 caracteres.',
      );
    }
    if (!RegExp(r'^[a-zA-Z0-9._-]+$').hasMatch(username)) {
      return LoginOutcome.failure(
        'El usuario solo puede contener letras, numeros, puntos o guiones.',
      );
    }
    if (password.isEmpty) {
      return LoginOutcome.failure('Ingresa tu contrasena.');
    }

    try {
      // 1) Bloqueo local por intentos fallidos.
      final localLock = await AttemptStore.checkLocalLock(username);
      if (localLock.locked) {
        return LoginOutcome.failure(
          'Cuenta bloqueada por intentos fallidos. Intenta en '
          '${localLock.remainingMinutes} minuto'
          '${localLock.remainingMinutes != 1 ? 's' : ''}.',
        );
      }

      final found = await _users.getByUsername(username);

      if (found == null) {
        final result = await AttemptStore.recordFailure(username);
        return LoginOutcome.failure(
          result.locked
              ? 'Cuenta bloqueada por 3 intentos fallidos. Espera 15 minutos '
                  'o contacta al administrador.'
              : 'Credenciales incorrectas. ${result.attemptsLeft} intento'
                  '${result.attemptsLeft != 1 ? 's' : ''} restante'
                  '${result.attemptsLeft != 1 ? 's' : ''}.',
          attemptsLeft: result.attemptsLeft,
        );
      }

      final hash = found.passwordHash;
      var passwordOk = false;
      if (hash != null && hash.isNotEmpty) {
        if (PasswordService.isBcryptHash(hash)) {
          passwordOk = await PasswordService.verify(password, hash);
        } else {
          // Migracion perezosa: contrasenas antiguas en texto plano.
          passwordOk = hash == password;
          if (passwordOk) {
            try {
              final newHash = await PasswordService.hash(password);
              await _users.patchUser(found.id, {'password': newHash});
            } catch (_) {
              // Si falla la migracion, el login continua igual.
            }
          }
        }
      }

      if (!passwordOk) {
        final result = await AttemptStore.recordFailure(username);
        if (result.locked) {
          await _users.setStatus(found.id, 'blocked');
          return LoginOutcome.failure(
            'Cuenta bloqueada por 3 intentos fallidos. Espera 15 minutos '
            'o contacta al administrador.',
          );
        }
        return LoginOutcome.failure(
          'Credenciales incorrectas. ${result.attemptsLeft} intento'
          '${result.attemptsLeft != 1 ? 's' : ''} restante'
          '${result.attemptsLeft != 1 ? 's' : ''}.',
          attemptsLeft: result.attemptsLeft,
        );
      }

      await AttemptStore.clear(username);

      if (found.status == 'blocked') {
        return LoginOutcome.failure(
          'Tu cuenta ha sido bloqueada. Contacta al administrador.',
        );
      }

      // 3) Control de dispositivos.
      final deviceId = await DeviceService.getDeviceId();
      final platform = DeviceService.platformName;
      final linkedDevices = found.devices.toSet();
      final isAdmin = found.isAdmin;

      if (!isAdmin &&
          !linkedDevices.contains(deviceId) &&
          linkedDevices.length >= found.maxDevices) {
        _safeLog(
          userId: found.id,
          username: found.username,
          deviceId: deviceId,
          platform: platform,
          status: 'blocked',
          reason: 'Limite de ${found.maxDevices} dispositivo'
              '${found.maxDevices != 1 ? 's' : ''} alcanzado',
        );
        return LoginOutcome.failure(
          'Esta cuenta solo puede usarse en ${found.maxDevices} dispositivo'
          '${found.maxDevices != 1 ? 's' : ''}. Si cambiaste de equipo, '
          'comunicate con el administrador.',
        );
      }

      if (isAdmin) {
        _safeLog(
          userId: found.id,
          username: found.username,
          deviceId: deviceId,
          platform: platform,
          status: 'allowed',
          reason: 'Admin - acceso libre',
        );
        return LoginOutcome.success(
          found.copyWith(online: true).withoutPassword(),
        );
      }

      if (!linkedDevices.contains(deviceId)) {
        // Relectura para no pisar cambios de otra sesion/PWA.
        final fresh = await _users.getByUsername(username) ?? found;
        final freshDevices = fresh.devices.toSet();
        var newlyLinked = false;

        if (!freshDevices.contains(deviceId) &&
            freshDevices.length >= fresh.maxDevices) {
          return LoginOutcome.failure(
            'Esta cuenta solo puede usarse en ${fresh.maxDevices} dispositivo'
            '${fresh.maxDevices != 1 ? 's' : ''}. Si cambiaste de equipo, '
            'comunicate con el administrador.',
          );
        }

        if (!freshDevices.contains(deviceId)) {
          freshDevices.add(deviceId);
          newlyLinked = true;
          await _users.patchUser(fresh.id, {
            'devices': freshDevices.toList(growable: false),
          });
        }

        _safeLog(
          userId: fresh.id,
          username: fresh.username,
          deviceId: deviceId,
          platform: platform,
          status: 'allowed',
          reason:
              newlyLinked ? 'Nuevo dispositivo vinculado' : 'Dispositivo ya vinculado',
        );

        return LoginOutcome.success(
          fresh
              .copyWith(
                devices: freshDevices.toList(growable: false),
                online: true,
              )
              .withoutPassword(),
        );
      }

      _safeLog(
        userId: found.id,
        username: found.username,
        deviceId: deviceId,
        platform: platform,
        status: 'allowed',
        reason: 'Dispositivo coincide',
      );
      return LoginOutcome.success(
        found.copyWith(online: true).withoutPassword(),
      );
    } catch (_) {
      return LoginOutcome.failure(
        'Error de conexion. Verifica tu internet e intenta de nuevo.',
      );
    }
  }

  void _safeLog({
    required String userId,
    required String username,
    required String deviceId,
    required String platform,
    required String status,
    required String reason,
  }) {
    _users
        .logAccess(
          userId: userId,
          username: username,
          deviceId: deviceId,
          platform: platform,
          browser: DeviceService.clientName,
          status: status,
          reason: reason,
        )
        .catchError((_) {});
  }
}
