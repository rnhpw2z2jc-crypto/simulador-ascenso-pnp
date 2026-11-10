import 'package:cloud_firestore/cloud_firestore.dart';

/// Entrada de la coleccion `accessLogs` (mismo contrato que `lib/accessLog.ts`).
class AccessLogEntry {
  const AccessLogEntry({
    required this.id,
    required this.userId,
    required this.username,
    required this.deviceId,
    required this.platform,
    required this.browser,
    required this.status,
    required this.reason,
    this.timestamp,
  });

  final String id;
  final String userId;
  final String username;
  final String deviceId;
  final String platform;
  final String browser;

  /// `allowed` o `blocked`.
  final String status;
  final String reason;
  final DateTime? timestamp;

  bool get isAllowed => status == 'allowed';

  factory AccessLogEntry.fromMap(String id, Map<String, dynamic> data) {
    String asString(String key) => (data[key] ?? '').toString();
    return AccessLogEntry(
      id: id,
      userId: asString('userId'),
      username: asString('username'),
      deviceId: asString('deviceId'),
      platform: asString('platform'),
      browser: asString('browser'),
      status: asString('status').isEmpty ? 'blocked' : asString('status'),
      reason: asString('reason'),
      timestamp: parseDate(data['timestamp']),
    );
  }
}

/// Entrada de la coleccion `examStats` (mismo contrato que `lib/examStats.ts`).
class ExamStatEntry {
  const ExamStatEntry({
    required this.id,
    required this.userId,
    required this.username,
    required this.totalQuestions,
    required this.correctAnswers,
    required this.failedQuestionIds,
    this.date,
  });

  final String id;
  final String userId;
  final String username;
  final int totalQuestions;
  final int correctAnswers;
  final List<int> failedQuestionIds;
  final DateTime? date;

  int get scorePercent {
    if (totalQuestions <= 0) return 0;
    return ((correctAnswers / totalQuestions) * 100).round();
  }

  factory ExamStatEntry.fromMap(String id, Map<String, dynamic> data) {
    final rawFailed = data['failedQuestionIds'];
    final failed = <int>[];
    if (rawFailed is List) {
      for (final item in rawFailed) {
        if (item is num) failed.add(item.toInt());
      }
    }
    return ExamStatEntry(
      id: id,
      userId: (data['userId'] ?? '').toString(),
      username: (data['username'] ?? '').toString(),
      totalQuestions: (data['totalQuestions'] as num?)?.toInt() ?? 0,
      correctAnswers: (data['correctAnswers'] as num?)?.toInt() ?? 0,
      failedQuestionIds: failed,
      date: parseDate(data['date']),
    );
  }
}

/// Interpreta fechas guardadas por la PWA (ISO string) o por Firestore
/// (Timestamp) indistintamente.
DateTime? parseDate(dynamic value) {
  if (value == null) return null;
  if (value is Timestamp) return value.toDate();
  if (value is DateTime) return value;
  if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
  if (value is String) return DateTime.tryParse(value);
  return null;
}
