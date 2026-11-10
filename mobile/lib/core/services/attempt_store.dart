import 'dart:convert';

import '../constants.dart';
import 'local_store.dart';

class _Attempt {
  const _Attempt(this.username, this.timestamp);

  final String username;
  final int timestamp;

  Map<String, dynamic> toJson() => {
        'username': username,
        'timestamp': timestamp,
      };
}

class LockStatus {
  const LockStatus({required this.locked, this.unlockTime, this.attemptsLeft = 0});

  final bool locked;
  final DateTime? unlockTime;
  final int attemptsLeft;

  int get remainingMinutes {
    final unlock = unlockTime;
    if (unlock == null) return 15;
    final diff = unlock.difference(DateTime.now()).inMinutes;
    return diff < 1 ? 1 : diff;
  }
}

class FailedAttemptResult {
  const FailedAttemptResult({
    required this.locked,
    required this.attemptsLeft,
  });

  final bool locked;
  final int attemptsLeft;
}

/// Intentos fallidos de login, replicando `lib/loginAttempts.ts` de la PWA
/// (3 fallos en 15 minutos bloquean la cuenta).
class AttemptStore {
  const AttemptStore._();

  static Future<List<_Attempt>> _readAll() async {
    final raw = await LocalStore.readString(AppConstants.keyLoginAttempts);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return [];
      return decoded
          .whereType<Map>()
          .map((e) => _Attempt(
                (e['username'] ?? '').toString(),
                (e['timestamp'] as num?)?.toInt() ?? 0,
              ))
          .where((a) => a.username.isNotEmpty && a.timestamp > 0)
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<List<_Attempt>> _recent(String username) async {
    final key = username.toLowerCase();
    final cutoff =
        DateTime.now().millisecondsSinceEpoch - AppConstants.lockoutDuration.inMilliseconds;
    final all = await _readAll();
    return all
        .where((a) => a.username == key && a.timestamp > cutoff)
        .toList()
      ..sort((a, b) => a.timestamp.compareTo(b.timestamp));
  }

  static Future<int> recentCount(String username) async {
    return (await _recent(username)).length;
  }

  static Future<LockStatus> checkLocalLock(String username) async {
    final recent = await _recent(username);
    if (recent.length < AppConstants.maxLoginAttempts) {
      return LockStatus(
        locked: false,
        attemptsLeft: AppConstants.maxLoginAttempts - recent.length,
      );
    }
    final oldest = recent.first;
    final unlockTime = DateTime.fromMillisecondsSinceEpoch(oldest.timestamp)
        .add(AppConstants.lockoutDuration);
    if (DateTime.now().isAfter(unlockTime)) {
      await clear(username);
      return const LockStatus(
        locked: false,
        attemptsLeft: AppConstants.maxLoginAttempts,
      );
    }
    return LockStatus(
      locked: true,
      unlockTime: unlockTime,
      attemptsLeft: 0,
    );
  }

  static Future<DateTime?> oldestRecentAttempt(String username) async {
    final recent = await _recent(username);
    if (recent.isEmpty) return null;
    return DateTime.fromMillisecondsSinceEpoch(recent.first.timestamp);
  }

  static Future<FailedAttemptResult> recordFailure(String username) async {
    final key = username.toLowerCase();
    final all = await _readAll();
    all.add(_Attempt(key, DateTime.now().millisecondsSinceEpoch));

    // Limpieza de registros vencidos para que el archivo no crezca sin limite.
    final cutoff =
        DateTime.now().millisecondsSinceEpoch - AppConstants.lockoutDuration.inMilliseconds;
    final kept = all.where((a) => a.timestamp > cutoff).toList();
    await LocalStore.writeJson(
      AppConstants.keyLoginAttempts,
      kept.map((a) => a.toJson()).toList(),
    );

    final recent = kept.where((a) => a.username == key).length;
    final left = AppConstants.maxLoginAttempts - recent;
    return FailedAttemptResult(
      locked: recent >= AppConstants.maxLoginAttempts,
      attemptsLeft: left < 0 ? 0 : left,
    );
  }

  static Future<void> clear(String username) async {
    final key = username.toLowerCase();
    final cutoff =
        DateTime.now().millisecondsSinceEpoch - AppConstants.lockoutDuration.inMilliseconds;
    final all = await _readAll();
    final kept = all
        .where((a) => !(a.username == key && a.timestamp > cutoff))
        .toList();
    await LocalStore.writeJson(
      AppConstants.keyLoginAttempts,
      kept.map((a) => a.toJson()).toList(),
    );
  }

  static Future<void> clearAll() async {
    await LocalStore.remove(AppConstants.keyLoginAttempts);
  }
}
