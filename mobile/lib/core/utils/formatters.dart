import 'package:intl/intl.dart';

/// Utilidades de formato usadas en varias pantallas.
class Formatters {
  const Formatters._();

  static final DateFormat _longDate =
      DateFormat("dd 'de' MMMM 'de' yyyy", 'es');
  static final DateFormat _shortDateTime =
      DateFormat("dd MMM yyyy, HH:mm", 'es');

  /// `mm:ss` o `hh:mm:ss` segun corresponda.
  static String duration(int seconds) {
    if (seconds < 0) seconds = 0;
    final h = seconds ~/ 3600;
    final m = (seconds % 3600) ~/ 60;
    final s = seconds % 60;
    final mm = m.toString().padLeft(2, '0');
    final ss = s.toString().padLeft(2, '0');
    if (h > 0) return '${h.toString().padLeft(2, '0')}:$mm:$ss';
    return '$mm:$ss';
  }

  static String shortDateTime(DateTime date) => _shortDateTime.format(date);

  static String longDate(DateTime date) => _longDate.format(date);

  static String percentage(int correct, int total) {
    if (total <= 0) return '0%';
    return '${((correct / total) * 100).round()}%';
  }

  static String score(int correct, int total) => '$correct/$total';
}
