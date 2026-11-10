import 'package:cloud_firestore/cloud_firestore.dart';

import '../../core/constants.dart';
import '../../core/services/password_service.dart';
import '../models/admin_entries.dart';
import '../models/app_user.dart';

/// Acceso a las colecciones `users`, `accessLogs` y `examStats`.
///
/// Las reglas de Firestore del proyecto permiten lectura publica de usuarios
/// (la PWA ya funciona asi) y escritura con validacion de estructura.
class UserRepository {
  const UserRepository();

  FirebaseFirestore get _db => FirebaseFirestore.instance;

  Future<AppUser?> getByUsername(String username) async {
    final snapshot = await _db
        .collection(AppConstants.usersCollection)
        .where('username', isEqualTo: username)
        .limit(1)
        .get();
    if (snapshot.docs.isEmpty) return null;
    final doc = snapshot.docs.first;
    return AppUser.fromMap(doc.id, doc.data());
  }

  /// Listado completo usado por el panel de administracion
  /// (`getAllUsersPublic` en la PWA).
  Future<List<AppUser>> getAllUsers() async {
    final snapshot =
        await _db.collection(AppConstants.usersCollection).get();
    return snapshot.docs
        .map((doc) => AppUser.fromMap(doc.id, doc.data()))
        .toList(growable: false);
  }

  /// Crea una cuenta con el mismo contrato que `createUser` de la PWA.
  Future<void> createUser({
    required String id,
    required String username,
    required String passwordHash,
    required String nombre,
    required String apellido,
    required String email,
    required String role,
    required String status,
    required DateTime? membershipExpiry,
    required String createdAt,
    required List<String> devices,
    required int maxDevices,
    required bool audioEnabled,
  }) async {
    await _db.collection(AppConstants.usersCollection).doc(id).set({
      'id': id,
      'username': username,
      'password': passwordHash,
      'nombre': nombre,
      'apellido': apellido,
      'email': email,
      'role': role,
      'membershipExpiry': membershipExpiry?.toUtc().toIso8601String(),
      'createdAt': createdAt,
      'status': status,
      'devices': devices.take(2).toList(growable: false),
      'maxDevices': maxDevices.clamp(1, 2).toInt(),
      'features': {'audio': audioEnabled},
    });
  }

  /// Elimina el usuario y todos sus registros asociados, igual que
  /// `deleteUser` en `lib/users.ts`.
  Future<void> deleteUserCascade(String id) async {
    for (final collection in const [
      AppConstants.examStatsCollection,
      AppConstants.accessLogsCollection,
    ]) {
      final snapshot = await _db
          .collection(collection)
          .where('userId', isEqualTo: id)
          .get();
      for (final doc in snapshot.docs) {
        await doc.reference.delete();
      }
    }
    await _db.collection(AppConstants.usersCollection).doc(id).delete();
  }

  /// Crea/migra la cuenta administradora por defecto.
  ///
  /// Replica `seedDefaultAdmin`: solo actua si la cuenta no existe o si su
  /// contrasena aun no esta hasheada. No pisa el interruptor de audio manual.
  Future<void> seedDefaultAdmin() async {
    final existing = await getByUsername('admin');
    if (existing == null) {
      const password = 'AdminPNP2026!';
      final hash = await PasswordService.hash(password);
      await createUser(
        id: 'admin-default',
        username: 'admin',
        passwordHash: hash,
        nombre: 'Administrador',
        apellido: 'General',
        email: '',
        role: 'admin',
        status: 'active',
        membershipExpiry: null,
        createdAt: DateTime.now().toUtc().toIso8601String(),
        devices: const [],
        maxDevices: 1,
        audioEnabled: true,
      );
      return;
    }

    final hash = existing.passwordHash;
    if (hash == null || hash.isEmpty || !PasswordService.isBcryptHash(hash)) {
      final newHash = await PasswordService.hash(hash ?? '');
      if (newHash.isNotEmpty) {
        await patchUser(existing.id, {'password': newHash});
      }
    }

    if (existing.role == 'admin') {
      final snapshot = await _db
          .collection(AppConstants.usersCollection)
          .doc(existing.id)
          .get();
      final raw = snapshot.data();
      if (raw != null && !raw.containsKey('features')) {
        await updateFields(existing.id, {
          'features': {'audio': true},
        });
      }
    }
  }

  /// Ultimos intentos de acceso (`getAccessLogs` de la PWA).
  Future<List<AccessLogEntry>> getAccessLogs({int limit = 200}) async {
    final snapshot = await _db
        .collection(AppConstants.accessLogsCollection)
        .orderBy('timestamp', descending: true)
        .limit(limit)
        .get();
    return snapshot.docs
        .map((doc) => AccessLogEntry.fromMap(doc.id, doc.data()))
        .toList(growable: false);
  }

  /// Ultimos examenes rendidos (`getExamStats` de la PWA).
  Future<List<ExamStatEntry>> getExamStats({int limit = 500}) async {
    final snapshot = await _db
        .collection(AppConstants.examStatsCollection)
        .orderBy('date', descending: true)
        .limit(limit)
        .get();
    return snapshot.docs
        .map((doc) => ExamStatEntry.fromMap(doc.id, doc.data()))
        .toList(growable: false);
  }

  Future<void> updateFields(String id, Map<String, dynamic> fields) async {
    await _db.collection(AppConstants.usersCollection).doc(id).update(fields);
  }

  /// Actualiza un usuario reconstruyendo el documento completo.
  ///
  /// Las reglas de Firestore validan el documento resultante (no solo los
  /// campos enviados). Las cuentas antiguas pueden no tener todos los campos
  /// obligatorios (`apellido`, `role`, `devices`...), asi que se normaliza el
  /// documento antes de escribirlo para no romper el login ni el perfil.
  Future<void> patchUser(String id, Map<String, dynamic> changes) async {
    final docRef = _db.collection(AppConstants.usersCollection).doc(id);
    final snapshot = await docRef.get();
    final data = snapshot.data() ?? <String, dynamic>{};
    final merged = <String, dynamic>{...data, ...changes};

    final existingId = merged['id'];
    merged['id'] = existingId is String && existingId.isNotEmpty
        ? existingId
        : id;
    merged['username'] = (merged['username'] ?? '').toString();
    merged['password'] = (merged['password'] ?? '').toString();
    merged['nombre'] = (merged['nombre'] ?? '').toString();
    merged['apellido'] = (merged['apellido'] ?? '').toString();
    merged['role'] = const ['admin', 'user'].contains(merged['role'])
        ? merged['role']
        : 'user';
    merged['status'] =
        const ['active', 'expired', 'blocked'].contains(merged['status'])
            ? merged['status']
            : 'active';
    merged['createdAt'] ??= DateTime.now().toUtc().toIso8601String();

    final devices = <String>{};
    final rawDevices = merged['devices'];
    if (rawDevices is List) {
      for (final item in rawDevices) {
        if (item is String && item.isNotEmpty) devices.add(item);
      }
    }
    final legacyDevice = merged['deviceId'];
    if (devices.isEmpty &&
        legacyDevice is String &&
        legacyDevice.isNotEmpty &&
        merged['deviceLocked'] == true) {
      devices.add(legacyDevice);
    }
    merged['devices'] = devices.take(2).toList(growable: false);

    final maxDevices = merged['maxDevices'];
    merged['maxDevices'] = maxDevices is num
        ? maxDevices.round().clamp(1, 2).toInt()
        : 1;

    await docRef.update(merged);
  }

  Future<void> setStatus(String id, String status) {
    return patchUser(id, {'status': status});
  }

  Future<void> setOnline(String id, bool online) async {
    try {
      await updateFields(id, {
        'online': online,
        'lastSeen': DateTime.now().millisecondsSinceEpoch,
      });
    } catch (_) {
      // El latido de presencia no debe interrumpir la sesion.
    }
  }

  Future<void> logAccess({
    required String userId,
    required String username,
    required String deviceId,
    required String platform,
    required String browser,
    required String status,
    required String reason,
  }) async {
    await _db.collection(AppConstants.accessLogsCollection).add({
      'userId': userId,
      'username': username,
      'deviceId': deviceId,
      'platform': platform,
      'browser': browser,
      'status': status,
      'reason': reason,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<void> saveExamStat({
    required String userId,
    required String username,
    required int totalQuestions,
    required int correctAnswers,
    required List<int> failedQuestionIds,
  }) async {
    await _db.collection(AppConstants.examStatsCollection).add({
      'userId': userId,
      'username': username,
      'totalQuestions': totalQuestions,
      'correctAnswers': correctAnswers,
      'failedQuestionIds': failedQuestionIds,
      'date': DateTime.now().toUtc().toIso8601String(),
    });
  }
}
