import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/theme/app_theme.dart';
import 'presentation/providers/auth_provider.dart';
import 'presentation/providers/exam_flow_provider.dart';
import 'presentation/screens/admin_screen.dart';
import 'presentation/screens/audio_tactico_screen.dart';
import 'presentation/screens/config_screen.dart';
import 'presentation/screens/dashboard_screen.dart';
import 'presentation/screens/exam_screen.dart';
import 'presentation/screens/history_screen.dart';
import 'presentation/screens/login_screen.dart';
import 'presentation/screens/profile_screen.dart';
import 'presentation/screens/recognition_screen.dart';
import 'presentation/screens/results_screen.dart';
import 'presentation/screens/splash_screen.dart';
import 'presentation/screens/theme_select_screen.dart';
import 'presentation/widgets/common.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(routerRefreshProvider);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final location = state.matchedLocation;

      if (auth.status == AuthStatus.restoring) {
        return location == '/splash' ? null : '/splash';
      }

      if (!auth.isAuthenticated) {
        return location == '/login' ? null : '/login';
      }

      if (location == '/login' || location == '/splash') {
        return '/dashboard';
      }

      final flow = ref.read(examFlowProvider);
      if (location == '/exam' && flow.session == null) {
        return '/dashboard';
      }
      if (location == '/results' && flow.lastResult == null) {
        return '/dashboard';
      }
      if (location == '/config' && flow.pendingConfig == null) {
        return '/dashboard';
      }
      if (location == '/audio') {
        final user = auth.user;
        if (user == null || !user.hasAudioAccess) return '/dashboard';
      }
      if (location == '/admin') {
        final user = auth.user;
        if (user == null || !user.isAdmin) return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/themes',
        builder: (context, state) => ThemeSelectScreen(
          rawMode: state.uri.queryParameters['mode'],
        ),
      ),
      GoRoute(
        path: '/config',
        builder: (context, state) => const ConfigScreen(),
      ),
      GoRoute(
        path: '/exam',
        builder: (context, state) => const ExamScreen(),
      ),
      GoRoute(
        path: '/recognition',
        builder: (context, state) => RecognitionScreen(
          category: _nullableCategory(state.uri.queryParameters['category']),
        ),
      ),
      GoRoute(
        path: '/audio',
        builder: (context, state) => AudioTacticoScreen(
          category: _nullableCategory(state.uri.queryParameters['category']),
        ),
      ),
      GoRoute(
        path: '/results',
        builder: (context, state) => const ResultsScreen(),
      ),
      GoRoute(
        path: '/history',
        builder: (context, state) => const HistoryScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminScreen(),
      ),
    ],
    errorBuilder: (context, state) => PageScaffold(
      child: EmptyState(
        icon: Icons.explore_off_rounded,
        title: 'Pantalla no encontrada',
        message: 'La ruta solicitada no existe.',
        action: FilledButton(
          onPressed: () => context.go('/dashboard'),
          child: const Text('Volver al inicio'),
        ),
      ),
    ),
  );
});

String? _nullableCategory(String? value) {
  if (value == null || value.trim().isEmpty) return null;
  return value;
}

class SimuladorApp extends ConsumerWidget {
  const SimuladorApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => ref.read(authProvider.notifier).noteActivity(),
      child: MaterialApp.router(
        title: 'Simulador PNP',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.dark,
        routerConfig: router,
      ),
    );
  }
}
