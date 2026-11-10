/// Constantes globales de la aplicacion.
///
/// Se mantienen alineadas con el contrato de datos de la PWA
/// (`D:\PROYECTOS\PNP\SIMULADOR_ASCENSO_PNP`) para que ambos clientes
/// consuman exactamente el mismo backend de Firestore.
class AppConstants {
  const AppConstants._();

  static const String appName = 'SIMULADOR PNP';
  static const String appSubtitle = 'Examen de Ascenso';
  static const String appVersion = '1.0.0';

  // Proyecto Firebase existente (mismo que usa la PWA).
  static const String firebaseProjectId = 'simulador-pnp-b57f0';
  static const String firebaseApiKey = 'AIzaSyAOboGde-tOx9ah4uw-HLNoN0usZjJSHm4';
  static const String firebaseMessagingSenderId = '505579661436';
  static const String firebaseStorageBucket =
      'simulador-pnp-b57f0.firebasestorage.app';
  static const String firebaseAppId =
      '1:505579661436:web:5bc6559f7de902e20e41f9';

  // Colecciones
  static const String usersCollection = 'users';
  static const String examStatsCollection = 'examStats';
  static const String accessLogsCollection = 'accessLogs';

  // Claves locales (mismas que la PWA cuando aplica)
  static const String keyDeviceId = 'simulador_device_id';
  static const String keySessionUser = 'simulador_user';
  static const String keyHistory = 'simulador_history';
  static const String keyFailedIds = 'simulador_failed_ids';
  static const String keyPausedExam = 'simulador_paused_exam';
  static const String keyLastActivity = 'simulador_last_activity';
  static const String keyLoginAttempts = 'simulador_login_attempts';
  static const String keyAudioSpeed = 'simulador_audio_speed';

  // Reglas de negocio replicadas de la PWA
  static const int maxLoginAttempts = 3;
  static const Duration lockoutDuration = Duration(minutes: 15);
  static const Duration sessionTimeout = Duration(minutes: 30);
  static const int maxHistoryEntries = 40;
  static const int passPercentage = 60;

  /// Limite de tiempo de examen. Replica `ConfigPage.getTimeLimit` de la PWA.
  static int examTimeLimitFor(int questionCount) {
    switch (questionCount) {
      case 10:
        return 15 * 60;
      case 50:
        return 75 * 60;
      case 100:
        return 150 * 60;
      default:
        return (questionCount * 1.5).ceil() * 60;
    }
  }

  /// Etiqueta legible del tiempo estimado (1.5 min por pregunta).
  static String estimatedTimeLabel(int questionCount) {
    final totalMinutes = (questionCount * 1.5).ceil();
    if (totalMinutes >= 60) {
      final hours = totalMinutes ~/ 60;
      final minutes = totalMinutes % 60;
      return minutes == 0 ? '${hours}h' : '${hours}h ${minutes}m';
    }
    return '$totalMinutes min';
  }
}
