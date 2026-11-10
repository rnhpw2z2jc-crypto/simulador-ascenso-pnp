import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Acceso centralizado a SharedPreferences con helpers JSON.
class LocalStore {
  const LocalStore._();

  static SharedPreferences? _prefs;

  static Future<SharedPreferences> get _instance async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  static Future<String?> readString(String key) async {
    final prefs = await _instance;
    return prefs.getString(key);
  }

  static Future<void> writeString(String key, String value) async {
    final prefs = await _instance;
    await prefs.setString(key, value);
  }

  static Future<void> remove(String key) async {
    final prefs = await _instance;
    await prefs.remove(key);
  }

  static Future<Map<String, dynamic>?> readJson(String key) async {
    final raw = await readString(key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {
      // Dato corrupto: se descarta.
      await remove(key);
    }
    return null;
  }

  static Future<List<dynamic>> readJsonList(String key) async {
    final raw = await readString(key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) return decoded;
    } catch (_) {
      await remove(key);
    }
    return [];
  }

  static Future<void> writeJson(String key, Object value) async {
    await writeString(key, jsonEncode(value));
  }

  static Future<int?> readInt(String key) async {
    final prefs = await _instance;
    return prefs.getInt(key);
  }

  static Future<void> writeInt(String key, int value) async {
    final prefs = await _instance;
    await prefs.setInt(key, value);
  }

  static Future<double?> readDouble(String key) async {
    final prefs = await _instance;
    return prefs.getDouble(key);
  }

  static Future<void> writeDouble(String key, double value) async {
    final prefs = await _instance;
    await prefs.setDouble(key, value);
  }
}
