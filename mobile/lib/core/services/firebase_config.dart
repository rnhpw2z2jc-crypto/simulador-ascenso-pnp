import 'package:firebase_core/firebase_core.dart';

import '../constants.dart';

/// Configuracion Firebase del proyecto `simulador-pnp-b57f0`.
///
/// La PWA usa Firebase Web; la app movil se inicializa con las mismas
/// credenciales publicas. Firestore solo necesita `projectId` + `apiKey`,
/// por lo que no se requiere `google-services.json` para operar.
///
/// Nota de despliegue: para publicar en Play Store conviene registrar una
/// app Android en Firebase Console (con el SHA-1 de firma) y descargar
/// `google-services.json`; la inicializacion seguiria funcionando igual.
class FirebaseConfig {
  const FirebaseConfig._();

  static FirebaseOptions get currentPlatform => const FirebaseOptions(
        apiKey: AppConstants.firebaseApiKey,
        appId: AppConstants.firebaseAppId,
        messagingSenderId: AppConstants.firebaseMessagingSenderId,
        projectId: AppConstants.firebaseProjectId,
        storageBucket: AppConstants.firebaseStorageBucket,
      );

  static Future<void> initialize() async {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(options: currentPlatform);
    }
  }
}
