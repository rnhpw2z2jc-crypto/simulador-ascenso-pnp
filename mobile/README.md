# Simulador de Ascenso PNP — App móvil (Flutter)

Aplicación Android/iOS que replica la PWA del **Simulador de Ascenso PNP**
usando el mismo backend de Firebase/Firestore (`simulador-pnp-b57f0`).

- UI oscura institucional (`#121212`, azul `#2F6FED`, dorado `#EAB308`).
- Login con Firestore + bcrypt (`users.password`), bloqueo por 3 intentos y
  límite de dispositivos (`devices` / `maxDevices`).
- Simulacro cronometrado, repaso por tema, reconocimiento y audio táctico.
- Resultados con revisión, historial local (40 exámenes) y reforzamiento.
- Perfil: edición de datos, cambio de contraseña y estado de dispositivos.
- Guardado automático del examen en pausa y caducidad de sesión a los 30 min.

## Requisitos

- Flutter 3.47+ / Dart 3.13+
- Android SDK 36 y JDK 17
- (iOS) Xcode 15+ y CocoaPods

## Ejecutar

```powershell
cd mobile
flutter pub get
flutter run
```

## Compilar

```powershell
# APK de release (usa firma debug si no existe android/key.properties)
flutter build apk --release

# Bundle para Play Store (requiere keystore de produccion)
flutter build appbundle --release
```

Salida: `mobile/build/app/outputs/flutter-apk/app-release.apk`

## Firma de producción

1. Genera el keystore:
   ```powershell
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Copia `android/key.properties.example` a `android/key.properties` y
   completa las credenciales.
3. Coloca `upload-keystore.jks` en `mobile/android/`.
4. Ejecuta `flutter build appbundle --release`.

`key.properties` y los keystores están excluidos por `.gitignore`.

## Firebase

La app se inicializa con `FirebaseOptions` explícitas
(`lib/core/services/firebase_config.dart`), por lo que **no requiere**
`google-services.json` para leer/escribir Firestore.

Para publicar en Play Store se recomienda:

1. Registrar una app Android en Firebase Console con el SHA-1 de firma.
2. Descargar `google-services.json` (opcional para Firestore, necesario para
   Analytics/Crashlytics).
3. Verificar que las reglas de `firestore.rules` permitan las operaciones que
   usa el cliente (`users`, `accessLogs`, `examStats`).

## Arquitectura

```
lib/
  core/
    constants.dart          Reglas de negocio compartidas con la PWA
    theme/                  Tema y paleta
    utils/                  Categorías legales y formateadores
    services/               Firebase, almacenamiento, bcrypt, TTS, dispositivo
  data/
    models/                 AppUser, Question, ExamConfig/State/Result/Session
    repositories/           Auth, usuarios, preguntas, historial, examen pausado
  presentation/
    providers/              Riverpod: auth, preguntas, examen, historial
    screens/                Login, dashboard, temas, examen, resultados, etc.
    widgets/                Componentes comunes
```

Estado manejado con **Riverpod 3** (`NotifierProvider`), navegación con
**go_router**, persistencia con `shared_preferences` y `flutter_secure_storage`,
voz con `flutter_tts`.

## Contrato con la PWA

- Usuarios: `users` (`username`, `password` bcrypt, `devices`, `maxDevices`,
  `features.audio`, `membershipExpiry`, `status`, etc.).
- Estadísticas: `examStats` (`userId`, `username`, `totalQuestions`,
  `correctAnswers`, `failedQuestionIds`, `date`).
- Bitácora: `accessLogs` (`userId`, `username`, `deviceId`, `platform`,
  `browser`, `status`, `reason`, `timestamp`).
- Banco de preguntas: `assets/questions.json` (copia de `public/questions.json`).

## Limitaciones conocidas

- El panel de administración y las analíticas avanzadas siguen en la web.
- El hash bcrypt se lee desde Firestore porque las reglas actuales permiten
  lectura pública de `users` (igual que la PWA). Endurecer esto requiere mover
  la autenticación a un backend/Cloud Function.
- El icono de la app es el predeterminado de Flutter hasta que se apruebe el
  arte institucional definitivo.
- La caducidad de membresía muestra avisos, pero no bloquea el acceso (misma
  política que la PWA).
