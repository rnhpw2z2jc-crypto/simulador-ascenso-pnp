import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/category_utils.dart';
import '../providers/exam_flow_provider.dart';
import '../providers/questions_provider.dart';
import '../widgets/common.dart';

class ConfigScreen extends ConsumerWidget {
  const ConfigScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final flow = ref.watch(examFlowProvider);
    final questions = ref.watch(questionsProvider).asData?.value;
    final config = flow.pendingConfig;

    if (questions == null) {
      return const PageScaffold(child: LoadingView(message: 'Cargando preguntas...'));
    }
    if (config == null) {
      return PageScaffold(
        child: EmptyState(
          icon: Icons.timer_off_outlined,
          title: 'Sin configuración',
          message: 'Vuelve a elegir el modo de entrenamiento.',
          action: FilledButton(
            onPressed: () => context.go('/dashboard'),
            child: const Text('Volver al inicio'),
          ),
        ),
      );
    }

    final filtered = questions
        .where((q) =>
            config.categories.isEmpty || config.categories.contains(q.category))
        .toList();
    final totalTopics = questions.map((q) => q.category).toSet().length;
    final selectedTopics = config.categories.toSet();
    final count = config.numQuestions <= 0
        ? filtered.length
        : (config.numQuestions > filtered.length
            ? filtered.length
            : config.numQuestions);
    final timeLimit = AppConstants.examTimeLimitFor(count);
    final timeMinutes = (timeLimit / 60).ceil();

    final categoryStats = selectedTopics
        .map(
          (category) => MapEntry(
            category,
            filtered.where((q) => q.category == category).length,
          ),
        )
        .toList()
      ..sort((a, b) => categoryDisplayName(a.key)
          .compareTo(categoryDisplayName(b.key)));

    return PageScaffold(
      appBar: ScreenHeader(
        title: 'Preparado para comenzar',
        subtitle: 'Revisa el resumen antes de iniciar',
        icon: Icons.timer_outlined,
        iconColor: AppColors.gold,
        onBack: () => context.canPop()
            ? context.pop()
            : context.go('/themes?mode=simulacro'),
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 28),
        children: [
          Center(
            child: Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.gold.withValues(alpha: 0.14),
                border: Border.all(
                  color: AppColors.gold.withValues(alpha: 0.45),
                ),
              ),
              child: const Icon(Icons.timer_outlined,
                  size: 40, color: AppColors.gold),
            ),
          ),
          const SizedBox(height: 24),
          AppCard(
            child: Column(
              children: [
                _SummaryRow(
                  label: 'Preguntas',
                  value: '$count',
                  icon: Icons.help_outline_rounded,
                ),
                const Divider(height: 20),
                _SummaryRow(
                  label: 'Tiempo',
                  value: timeMinutes >= 60
                      ? '${timeMinutes ~/ 60}h ${timeMinutes % 60}min'
                      : '$timeMinutes min',
                  icon: Icons.schedule_rounded,
                ),
                const Divider(height: 20),
                _SummaryRow(
                  label: 'Temas',
                  value: selectedTopics.length == totalTopics
                      ? 'Todos'
                      : '${selectedTopics.length} temas',
                  icon: Icons.menu_book_rounded,
                ),
                if (filtered.length > count) ...[
                  const Divider(height: 20),
                  _SummaryRow(
                    label: 'Disponibles',
                    value: '${filtered.length} preguntas',
                    icon: Icons.inventory_2_outlined,
                  ),
                ],
              ],
            ),
          ),
          if (selectedTopics.length < totalTopics) ...[
            const SizedBox(height: 18),
            const SectionTitle('Temas seleccionados'),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: categoryStats
                  .map(
                    (entry) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        '${categoryDisplayName(entry.key)} (${entry.value})',
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: flow.isStarting
                ? null
                : () async {
                    final started = await ref
                        .read(examFlowProvider.notifier)
                        .startPendingExam(questions);
                    if (!context.mounted) return;
                    if (started) {
                      context.go('/exam');
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'No hay preguntas disponibles para esa selección.',
                          ),
                        ),
                      );
                    }
                  },
            icon: flow.isStarting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.play_arrow_rounded),
            label: Text(flow.isStarting ? 'PREPARANDO...' : 'COMENZAR'),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => context.canPop()
                ? context.pop()
                : context.go('/dashboard'),
            child: const Text('Cancelar'),
          ),
          const SizedBox(height: 16),
          const Text(
            'El tiempo corre desde que presionas COMENZAR. Si sales de la '
            'aplicación el examen se pausa automáticamente.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10.5,
              color: AppColors.textMuted,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textMuted),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
