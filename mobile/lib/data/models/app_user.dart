import 'package:cloud_firestore/cloud_firestore.dart';

/// Usuario del sistema, con el mismo contrato que la coleccion `users`
/// de la PWA (incluye la contrasena bcrypt para poder verificar/actualizar).
class AppUser {
  const AppUser({
    required this.id,
    required this.username,
    required this.nombre,
    required this.apellido,
    required this.email,
    required this.role,
    required this.status,
    required this.createdAt,
    required this.devices,
    required this.maxDevices,
    required this.audioEnabled,
    this.passwordHash,
    this.membershipExpiry,
    this.online = false,
    this.lastSeen,
  });

  final String id;
  final String username;
  final String nombre;
  final String apellido;
  final String email;

  /// `admin` o `user`.
  final String role;

  /// `active`, `expired` o `blocked`.
  final String status;
  final String createdAt;
  final List<String> devices;
  final int maxDevices;

  /// Permiso de audio tactico (`features.audio`).
  final bool audioEnabled;

  /// Hash bcrypt. No se persiste en la sesion local por seguridad.
  final String? passwordHash;

  final DateTime? membershipExpiry;
  final bool online;
  final int? lastSeen;

  bool get isAdmin => role == 'admin';

  bool get hasAudioAccess => isAdmin || audioEnabled;

  bool get isBlocked => status == 'blocked';

  bool get isExpired {
    if (status == 'expired') return true;
    final expiry = membershipExpiry;
    return expiry != null && expiry.isBefore(DateTime.now());
  }

  String get fullName => '$nombre $apellido'.trim();

  /// Dias restantes de membresia (null = ilimitada).
  int? get remainingDays {
    final expiry = membershipExpiry;
    if (expiry == null) return null;
    return (expiry.difference(DateTime.now()).inSeconds / 86400).ceil();
  }

  factory AppUser.fromMap(String id, Map<String, dynamic> data) {
    String asString(String key) => (data[key] ?? '').toString();

    final rawDevices = <String>{};
    final devicesValue = data['devices'];
    if (devicesValue is List) {
      for (final item in devicesValue) {
        if (item is String && item.isNotEmpty) rawDevices.add(item);
      }
    }

    // Compatibilidad con cuentas antiguas que guardaban `deviceId` +
    // `deviceLocked` en lugar del arreglo `devices` (misma migracion
    // perezosa que aplica `normalizeUser` en la PWA).
    final legacyDeviceId = data['deviceId'];
    if (rawDevices.isEmpty &&
        legacyDeviceId is String &&
        legacyDeviceId.isNotEmpty &&
        data['deviceLocked'] == true) {
      rawDevices.add(legacyDeviceId);
    }

    final maxDevicesRaw = data['maxDevices'];
    final maxDevices = maxDevicesRaw is num
        ? maxDevicesRaw.round().clamp(1, 2).toInt()
        : 1;

    final features = data['features'];
    final audioEnabled =
        features is Map && features['audio'] == true;

    return AppUser(
      id: id,
      username: asString('username'),
      nombre: asString('nombre'),
      apellido: asString('apellido'),
      email: asString('email'),
      role: asString('role').isEmpty ? 'user' : asString('role'),
      status: asString('status').isEmpty ? 'active' : asString('status'),
      createdAt: asString('createdAt'),
      devices: rawDevices.take(2).toList(growable: false),
      maxDevices: maxDevices,
      audioEnabled: audioEnabled,
      passwordHash: data['password'] is String ? data['password'] as String : null,
      membershipExpiry: _parseDate(data['membershipExpiry']),
      online: data['online'] == true,
      lastSeen: data['lastSeen'] is num
          ? (data['lastSeen'] as num).toInt()
          : null,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    if (value is int) {
      return DateTime.fromMillisecondsSinceEpoch(value);
    }
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  AppUser copyWith({
    String? nombre,
    String? apellido,
    String? email,
    String? role,
    String? status,
    List<String>? devices,
    int? maxDevices,
    bool? audioEnabled,
    DateTime? membershipExpiry,
    bool? online,
    int? lastSeen,
  }) {
    return AppUser(
      id: id,
      username: username,
      nombre: nombre ?? this.nombre,
      apellido: apellido ?? this.apellido,
      email: email ?? this.email,
      role: role ?? this.role,
      status: status ?? this.status,
      createdAt: createdAt,
      devices: devices ?? this.devices,
      maxDevices: maxDevices ?? this.maxDevices,
      audioEnabled: audioEnabled ?? this.audioEnabled,
      passwordHash: passwordHash,
      membershipExpiry: membershipExpiry ?? this.membershipExpiry,
      online: online ?? this.online,
      lastSeen: lastSeen ?? this.lastSeen,
    );
  }

  /// Copia publica de la sesion, sin el hash de contrasena.
  AppUser withoutPassword() {
    return AppUser(
      id: id,
      username: username,
      nombre: nombre,
      apellido: apellido,
      email: email,
      role: role,
      status: status,
      createdAt: createdAt,
      devices: devices,
      maxDevices: maxDevices,
      audioEnabled: audioEnabled,
      passwordHash: null,
      membershipExpiry: membershipExpiry,
      online: online,
      lastSeen: lastSeen,
    );
  }

  /// Datos que se guardan en la sesion local (nunca la contrasena).
  Map<String, dynamic> toSessionJson() => {
        'id': id,
        'username': username,
        'nombre': nombre,
        'apellido': apellido,
        'email': email,
        'role': role,
        'status': status,
        'createdAt': createdAt,
        'devices': devices,
        'maxDevices': maxDevices,
        'features': {'audio': audioEnabled},
        'membershipExpiry': membershipExpiry?.toIso8601String(),
        'online': online,
        'lastSeen': lastSeen,
      };

  static AppUser? fromSessionJson(Map<String, dynamic> map) {
    final id = map['id'];
    if (id is! String || id.isEmpty) return null;
    return AppUser.fromMap(id, map);
  }
}
