import 'package:bcrypt/bcrypt.dart';
import 'package:flutter/foundation.dart';

/// Hash/verificacion bcrypt compatible con `bcryptjs` de la PWA.
///
/// bcrypt es costoso por diseno; se ejecuta en un isolate para no bloquear
/// el hilo de UI.
class PasswordService {
  const PasswordService._();

  static const int _rounds = 10;
  static const String _prefix = r'$2b';

  static Future<bool> verify(String password, String hash) {
    if (!hash.startsWith(r'$2')) return Future.value(false);
    return compute(_verifySync, <String>[password, hash]);
  }

  static Future<String> hash(String password) {
    return compute(_hashSync, password);
  }

  static bool isBcryptHash(String value) => value.startsWith(r'$2');
}

bool _verifySync(List<String> args) {
  try {
    return BCrypt.checkpw(args[0], args[1]);
  } catch (_) {
    return false;
  }
}

String _hashSync(String password) {
  return BCrypt.hashpw(
    password,
    BCrypt.gensalt(logRounds: PasswordService._rounds, prefix: PasswordService._prefix),
  );
}
