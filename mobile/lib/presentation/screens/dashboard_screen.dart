import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../data/models/app_user.dart';
import '../providers/auth_provider.dart';
import '../providers/exam_flow_provider.dart';
import '../providers/history_provider.dart';
import '../providers/paused_exam_provider.dart';
import '../providers/questions_provider.dart';
import '../widgets/common.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    if (user == null) {
      return const PageScaffold(child: LoadingView());
    }

    final history = ref.watch(historyProvider);
    final failedIds = ref.watch(failedIdsProvider);
    final paused = ref.watch(pausedExamProvider);
    final questionsAsync = ref.watch(questionsProvider);
    final questionCount = questionsAsync.asData?.value.length ?? 0;

    final totalExams = history.length;
    final avgScore = totalExams == 0
        ? 0
        : (history
                    .map((r) => r.totalQuestions == 0
                        ? 0.0
                        : r.score / r.totalQuestions * 100)
                    .reduce((a, b) => a + b) /
                totalExams)
            .round();
    final bestScore = totalExams == 0
        ? 0
        : history
            .map((r) => r.totalQuestions == 0
                ? 0
                : ((r.score / r.totalQuestions) * 100).round())
            .reduce((a, b) => a > b ? a : b);
    final studyHours = totalExams == 0
        ? 0.0
        : history.fold<int>(0, (sum, r) => sum + r.timeUsed) / 3600;

    return PageScaffold(
      child: RefreshIndicator(
        onRefresh: () async {
          await ref.read(authProvider.notifier).refreshUser();
          await ref.read(historyProvider.notifier).reload();
        },
        color: AppColors.blue,
        backgroundColor: AppColors.surface,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
          children: [
            _DashboardHeader(user: user),
            const SizedBox(height: 18),
            Text.rich(
              TextSpan(
                text: 'Bienvenido, ',
                children: [
                  TextSpan(
                    text: user.apellido.isEmpty ? user.nombre : user.apellido,
                    style: const TextStyle(color: AppColors.gold),
                  ),
                ],
              ),
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Elige cómo quieres entrenar hoy',
              style: TextStyle(
                fontSize: 12.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            ..._membershipBanners(user),
            if (paused != null) ...[
              InfoBanner(
                color: AppColors.gold,
                icon: Icons.pause_circle_outline_rounded,
                title: 'Examen en pausa',
                message:
                    'Tienes un examen sin terminar (${paused.questions.length} preguntas).',
                trailing: FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(88, 38),
                    backgroundColor: AppColors.gold,
                    foregroundColor: const Color(0xFF1A1A00),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                  ),
                  onPressed: () {
                    ref
                        .read(examFlowProvider.notifier)
                        .resumeFromPaused(paused);
                    context.go('/exam');
                  },
                  child: const Text('Continuar',
                      style: TextStyle(fontSize: 12)),
                ),
              ),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: StatTile(
                    label: 'Exámenes',
                    value: '$totalExams',
                    icon: Icons.description_outlined,
                    color: AppColors.blueLight,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: 'Promedio',
                    value: '$avgScore%',
                    icon: Icons.gps_fixed_rounded,
                    color: AppColors.gold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: StatTile(
                    label: 'Mejor',
                    value: '$bestScore%',
                    icon: Icons.emoji_events_outlined,
                    color: AppColors.success,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: 'Estudio',
                    value: '${studyHours.toStringAsFixed(1)}h',
                    icon: Icons.schedule_rounded,
                    color: AppColors.danger,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const SectionTitle('¿Qué quieres hacer hoy?',
                icon: Icons.auto_awesome_rounded),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.94,
              children: [
                _ModeTile(
                  title: 'Simulacro',
                  description: 'Examen cronometrado con la cantidad que elijas',
                  icon: Icons.assignment_outlined,
                  color: AppColors.blue,
                  badge: '$questionCount',
                  enabled: questionCount > 0,
                  onTap: () => context.go('/themes?mode=simulacro'),
                ),
                _ModeTile(
                  title: 'Reconocimiento',
                  description: 'Repasa pregunta por pregunta, sin presión de tiempo',
                  icon: Icons.gps_fixed_rounded,
                  color: AppColors.cyan,
                  enabled: questionCount > 0,
                  onTap: () => context.go('/themes?mode=recognition'),
                ),
                _ModeTile(
                  title: 'Audio Táctico',
                  description: user.hasAudioAccess
                      ? 'Escucha pregunta, respuesta y sustento legal'
                      : 'Pide al administrador activar el Modo Audio',
                  icon: Icons.headphones_rounded,
                  color: AppColors.gold,
                  badge: user.hasAudioAccess ? 'Complemento' : 'Bloqueado',
                  enabled: user.hasAudioAccess && questionCount > 0,
                  onTap: () => context.go('/themes?mode=audio'),
                ),
                _ModeTile(
                  title: 'Reforzamiento',
                  description: failedIds.isNotEmpty
                      ? 'Repasa las ${failedIds.length} preguntas que fallaste'
                      : 'Sin preguntas falladas por ahora',
                  icon: Icons.psychology_alt_outlined,
                  color: AppColors.warning,
                  badge: failedIds.isNotEmpty ? '${failedIds.length}' : null,
                  enabled: failedIds.isNotEmpty && questionCount > 0,
                  onTap: () => _startReinforcement(context, ref),
                ),
              ],
            ),
            const SizedBox(height: 14),
            AppCard(
              borderColor: AppColors.gold.withValues(alpha: 0.45),
              onTap: questionCount == 0
                  ? null
                  : () => context.go('/themes?mode=repaso'),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.gold, AppColors.goldDark],
                      ),
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: const Icon(Icons.hourglass_bottom_rounded,
                        color: Color(0xFF1A1A00), size: 26),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Repaso completo por tema',
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'Todas las preguntas del tema, con tiempo de examen',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: AppColors.textSecondary,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios_rounded,
                      size: 15, color: AppColors.textMuted),
                ],
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => context.push('/history'),
              icon: const Icon(Icons.bar_chart_rounded, size: 19),
              label: Text(
                'Historial · $totalExams examen'
                '${totalExams != 1 ? 'es' : ''}',
              ),
            ),
            const SizedBox(height: 18),
            const Center(
              child: Text(
                'Cada repaso te acerca al ascenso',
                style: TextStyle(
                  fontSize: 10.5,
                  color: AppColors.textMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _membershipBanners(AppUser user) {
    final expiry = user.membershipExpiry;
    if (expiry == null) return const [];

    final remaining = expiry.difference(DateTime.now());
    if (remaining.isNegative) {
      return const [
        InfoBanner(
          color: AppColors.danger,
          icon: Icons.block_rounded,
          title: 'Membresía expirada',
          message:
              'Tu acceso ha expirado. Contacta al administrador para renovar.',
        ),
        SizedBox(height: 12),
      ];
    }

    final days = (remaining.inSeconds / 86400).ceil();
    if (days <= 7) {
      final label = days <= 1
          ? '${(remaining.inHours < 1 ? 1 : remaining.inHours)}h'
          : '$days día${days != 1 ? 's' : ''}';
      return [
        InfoBanner(
          color: AppColors.warning,
          icon: Icons.warning_amber_rounded,
          title: 'Membresía por vencer',
          message: 'Tu membresía vence en $label. Contacta al administrador.',
        ),
        const SizedBox(height: 12),
      ];
    }
    return const [];
  }

  Future<void> _startReinforcement(
    BuildContext context,
    WidgetRef ref,
  ) async {
    final failed = ref.read(failedIdsProvider);
    final questions = ref.read(questionsProvider).asData?.value ?? const [];
    if (failed.isEmpty || questions.isEmpty) {
      await ref.read(failedIdsProvider.notifier).clear();
      return;
    }
    final started =
        await ref.read(examFlowProvider.notifier).startReinforcement(
              questions,
              failed,
            );
    if (!context.mounted) return;
    if (started) {
      context.go('/exam');
    } else {
      await ref.read(failedIdsProvider.notifier).clear();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No hay preguntas de reforzamiento.')),
      );
    }
  }
}

class _DashboardHeader extends ConsumerWidget {
  const _DashboardHeader({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppColors.blue.withValues(alpha: 0.16),
            borderRadius: BorderRadius.circular(13),
            border: Border.all(
              color: AppColors.blue.withValues(alpha: 0.45),
            ),
          ),
          child: const Icon(Icons.shield_rounded,
              color: AppColors.blueLight, size: 24),
        ),
        const SizedBox(width: 11),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'SIMULADOR PNP',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                ),
              ),
              Text(
                'Examen de Ascenso',
                style: TextStyle(
                  fontSize: 10.5,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          onPressed: () => context.push('/profile'),
          tooltip: 'Mi perfil',
          icon: const Icon(Icons.person_outline_rounded, size: 22),
        ),
        IconButton(
          onPressed: () => _confirmLogout(context, ref),
          tooltip: 'Cerrar sesión',
          icon: const Icon(Icons.logout_rounded,
              size: 21, color: AppColors.danger),
        ),
      ],
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Cerrar sesión'),
        content: const Text(
          '¿Seguro que deseas salir? Tu avance de exámenes se conserva.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger,
              minimumSize: const Size(100, 42),
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authProvider.notifier).logout();
    }
  }
}

class _ModeTile extends StatelessWidget {
  const _ModeTile({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.enabled,
    required this.onTap,
    this.badge,
  });

  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final bool enabled;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: AppCard(
        padding: const EdgeInsets.all(14),
        borderColor: enabled ? color.withValues(alpha: 0.35) : AppColors.border,
        onTap: enabled ? onTap : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(
                    enabled ? icon : Icons.lock_outline_rounded,
                    color: color,
                    size: 23,
                  ),
                ),
                const Spacer(),
                if (badge != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceHigh,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      badge!,
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
              ],
            ),
            const Spacer(),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 10.5,
                color: AppColors.textSecondary,
                height: 1.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
