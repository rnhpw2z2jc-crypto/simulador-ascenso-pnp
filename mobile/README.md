# Simulador de Ascenso PNP — App móvil (Flutter)

Aplicación Android/iOS que replica la PWA del **Simulador de Ascenso PNP**
usando el mismo backend de Firebase/Firestore (`simulador-pnp-b57f0`).

- UI idéntica a la PWA: navy `#0F172A`/`#1E293B`/`#334155`, azul táctico
  `#1E40AF`/`#3B82F6`, dorado `#EAB308`, tarjetas `glass` y tipografía Inter.
- Login con Firestore + bcrypt (`users.password`), bloqueo por 3 intentos y
  límite de dispositivos (`devices` / `maxDevices`).
- Simulacro cronometrado, repaso por tema, reconocimiento y audio táctico.
- Resultados con revisión, historial local (40 exámenes) y reforzamiento.
- Perfil: edición de datos, cambio de contraseña y estado de dispositivos.
- Panel de administración completo para cuentas con `role == 'admin'`.
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
3. Coloca `upload-keystore.jks` en `mobile/android/app/`.
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

## Panel de administración

Disponible sólo para `users.role == 'admin'` (icono de engranaje en la cabecera
del dashboard o ruta `/admin`). Replica `components/AdminPage.tsx`:

- **Usuarios**: búsqueda por nombre/usuario/email, filtros de membresía
  (`Todos` / `Activos` / `Vencidos` / `Sin fecha`), orden por nombre o usuario,
  paginación (10 en móvil, 20 en pantallas anchas), refresco automático cada
  30 s, alta de usuarios (`free` 12 h o `vip` hasta 31/12/2026), edición,
  activar/bloquear, alternar Modo Audio, membresía rápida, límite de
  dispositivos 1/2, liberar un dispositivo o todos y eliminación en cascada
  (`users` + `examStats` + `accessLogs`).
- **Registro de accesos**: últimos 200 intentos (`accessLogs`) con estado
  permitido/bloqueado, plataforma, navegador y fecha.
- **Estadísticas**: total de exámenes, promedio general, usuarios activos,
  preguntas más falladas (Top 20) y rendimiento por usuario, calculados desde
  `examStats`.

Los modales de alta/edición aplican las mismas validaciones que la PWA
(`lib/security.ts`): usuario de 3–30 caracteres `[a-zA-Z0-9._-]`, email válido,
contraseña de 6+ caracteres y disponibilidad de nombre de usuario.

## Arquitectura

```
lib/
  core/
    constants.dart          Reglas de negocio compartidas con la PWA
    theme/                  Paleta, `glass`, transiciones y tipografía Inter
    utils/                  Categorías legales y formateadores
    services/               Firebase, almacenamiento, bcrypt, TTS, dispositivo
  data/
    models/                 AppUser, Question, ExamConfig/State/Result y
                            entradas de administración (accessLogs/examStats)
    repositories/           Auth, usuarios (+ CRUD admin), preguntas, historial
  presentation/
    providers/              Riverpod: auth, preguntas, examen, historial, admin
    screens/                Login, dashboard, temas, examen, resultados,
                            perfil y panel de administración
    widgets/                Componentes comunes y modales de usuarios
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

## Créditos

Desarrollado por **DiverZenaku** para **Zenaku Tech**
(Cybersecurity · Development · AI Solutions).

El emblema de Zenaku Tech se incluye como asset local
(`assets/branding/zenaku_emblem.jpg`) y se muestra de forma discreta en el
splash, el login, el pie del dashboard y la sección "Acerca de" del perfil.

## Limitaciones conocidas

- La analítica avanzada del dashboard web no se replica; el panel móvil cubre
  usuarios, accesos y estadísticas de exámenes.
- El hash bcrypt se lee desde Firestore porque las reglas actuales permiten
  lectura pública de `users` (igual que la PWA). Endurecer esto requiere mover
  la autenticación a un backend/Cloud Function.
- El panel de administración no valida el rol en el servidor: las reglas de
  Firestore permiten escritura con validación de estructura. Restringirlo
  requiere reglas basadas en autenticación o Cloud Functions.
- El icono de lanzador se genera con `flutter_launcher_icons` a partir de
  `assets/icon/app_icon.jpg` (emblema lobo alternativo), incluyendo icono
  adaptativo sobre fondo navy-900.
- La caducidad de membresía muestra avisos, pero no bloquea el acceso (misma
  política que la PWA).
