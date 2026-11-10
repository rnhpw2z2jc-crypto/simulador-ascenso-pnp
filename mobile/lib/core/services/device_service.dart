import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants.dart';

/// Identificador persistente del dispositivo.
///
/// Replica `lib/device.ts` de la PWA: un identificador aleatorio estable que
/// se envia a Firestore dentro de `users.devices`. Se guarda en
/// almacenamiento seguro y, como respaldo, en SharedPreferences.
class DeviceService {
  const DeviceService._();

  static const FlutterSecureStorage _secure = FlutterSecureStorage();
  static String? _cached;

  static Future<String> getDeviceId() async {
    final cached = _cached;
    if (cached != null) return cached;

    try {
      final stored = await _secure.read(key: AppConstants.keyDeviceId);
      if (_isValid(stored)) {
        _cached = stored;
        return stored!;
      }
    } catch (_) {
      // Sin almacenamiento seguro disponible: se usa el respaldo.
    }

    final prefs = await SharedPreferences.getInstance();
    final fallback = prefs.getString(AppConstants.keyDeviceId);
    if (_isValid(fallback)) {
      _cached = fallback;
      try {
        await _secure.write(key: AppConstants.keyDeviceId, value: fallback);
      } catch (_) {}
      return fallback!;
    }

    final generated = _generateId();
    _cached = generated;
    try {
      await _secure.write(key: AppConstants.keyDeviceId, value: generated);
    } catch (_) {}
    await prefs.setString(AppConstants.keyDeviceId, generated);
    return generated;
  }

  static bool _isValid(String? value) =>
      value != null && value.length >= 16 && value.length <= 64;

  static String _generateId() {
    final random = Random.secure();
    final buffer = StringBuffer('dev_');
    for (var i = 0; i < 16; i++) {
      buffer.write(random.nextInt(256).toRadixString(16).padLeft(2, '0'));
    }
    return buffer.toString();
  }

  static String get platformName {
    if (kIsWeb) return 'Web';
    return defaultTargetPlatform.name;
  }

  static const String clientName = 'Flutter App';
}
