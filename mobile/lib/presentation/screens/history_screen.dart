import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/exam_result.dart';
import '../providers/history_provider.dart';
import '../widgets/common.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyProvider);

    if (history.isEmpty) {
      return PageScaffold(
        appBar: ScreenHeader(
          title: 'HISTORIAL',
          subtitle: '0 exámenes realizados',
          icon: Icons.bar_chart_rounded,
          iconColor: AppColors.blueLight,
          onBack: () => context.canPop() ? context.pop() : context.go('/dashboard'),
        ),
        child: EmptyState(
          icon: Icons.menu_book_rounded,
          title: 'Sin exámenes aún',
          message: 'Realiza tu primer simulacro para ver tu historial aquí.',
          action: FilledButton(
            onPressed: () => context.go('/dashboard'),
            child: const Text('Comenzar ahora'),
          ),
        ),
      );
    }

    final total = history.length;
    final average = (history
                .map((r) => r.totalQuestions == 0
                    ? 0.0
                    : r.score / r.totalQuestions * 100)
                .reduce((a, b) => a + b) /
            total)
        .round();
    final best = history
        .map((r) => r.totalQuestions == 0
            ? 0
            : ((r.score / r.totalQuestions) * 100).round())
        .reduce((a, b) => a > b ? a : b);
    final passed = history
        .where((r) => r.totalQuestions > 0 && r.score / r.totalQuestions >= 0.6)
        .length;
    final ordered = history.reversed.toList(growable: false);

    return PageScaffold(
      appBar: ScreenHeader(
        title: 'HISTORIAL',
        subtitle: '$total examen${total != 1 ? 'es' : ''} realizados',
        icon: Icons.bar_chart_rounded,
        iconColor: AppColors.blueLight,
        onBack: () => context.pop(),
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          Row(
            children: [
              Expanded(
                child: StatTile(
                  label: 'Exámenes',
                  value: '$total',
                  icon: Icons.description_outlined,
                  color: AppColors.blueLight,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatTile(
                  label: 'Promedio',
                  value: '$average%',
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
                  value: '$best%',
                  icon: Icons.emoji_events_outlined,
                  color: AppColors.success,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatTile(
                  label: 'Aprobados',
                  value: '$passed',
                  icon: Icons.verified_outlined,
                  color: AppColors.gold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const SectionTitle('Exámenes recientes', icon: Icons.history_rounded),
          for (final result in ordered)
            _HistoryTile(result: result),
        ],
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.result});

  final ExamResult result;

  @override
  Widget build(BuildContext context) {
    final percentage = result.totalQuestions == 0
        ? 0
        : ((result.score / result.totalQuestions) * 100).round();
    final passed = percentage >= 60;
    final color = passed ? AppColors.success : AppColors.danger;

    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: AppCard(
        padding: const EdgeInsets.all(13),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.13),
                borderRadius: BorderRadius.circular(13),
                border: Border.all(color: color.withValues(alpha: 0.35)),
              ),
              alignment: Alignment.center,
              child: Text(
                '$percentage%',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 2.5,
                        ),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          passed ? 'APROBADO' : 'DESAPROBADO',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                            color: color,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${result.totalQuestions} preguntas',
                        style: const TextStyle(
                          fontSize: 9.5,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    Formatters.shortDateTime(result.date),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${result.score}/${result.totalQuestions}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  Formatters.duration(result.timeUsed),
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
