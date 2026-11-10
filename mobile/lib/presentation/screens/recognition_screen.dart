import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/category_utils.dart';
import '../providers/questions_provider.dart';
import '../widgets/common.dart';

class RecognitionScreen extends ConsumerStatefulWidget {
  const RecognitionScreen({super.key, this.category});

  final String? category;

  @override
  ConsumerState<RecognitionScreen> createState() => _RecognitionScreenState();
}

class _RecognitionScreenState extends ConsumerState<RecognitionScreen> {
  int _index = 0;
  int? _selected;
  bool _revealed = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(questionsProvider);
    final all = async.asData?.value;
    if (all == null) {
      return const PageScaffold(
        child: LoadingView(message: 'Cargando preguntas...'),
      );
    }

    final category = widget.category;
    final questions = category == null || category.isEmpty
        ? all
        : all.where((q) => q.category == category).toList();

    if (questions.isEmpty) {
      return PageScaffold(
        appBar: ScreenHeader(
          title: 'RECONOCIMIENTO',
          subtitle: 'Sin preguntas',
          icon: Icons.gps_fixed_rounded,
          iconColor: AppColors.cyan,
          onBack: () => context.go('/dashboard'),
        ),
        child: EmptyState(
          icon: Icons.search_off_rounded,
          title: 'Sin preguntas',
          message: 'No hay preguntas para el tema seleccionado.',
          action: FilledButton(
            onPressed: () => context.go('/themes?mode=recognition'),
            child: const Text('Elegir otro tema'),
          ),
        ),
      );
    }

    final safeIndex = _index.clamp(0, questions.length - 1);
    final question = questions[safeIndex];
    final progress = (safeIndex + 1) / questions.length;

    return PageScaffold(
      appBar: ScreenHeader(
        title: 'RECONOCIMIENTO',
        subtitle: category == null || category.isEmpty
            ? 'Todos los temas'
            : categoryDisplayName(category),
        icon: Icons.gps_fixed_rounded,
        iconColor: AppColors.cyan,
        onBack: () => context.go('/dashboard'),
        actions: [
          IconButton(
            onPressed: () => context.go('/themes?mode=recognition'),
            tooltip: 'Cambiar tema',
            icon: const Icon(Icons.swap_horiz_rounded, size: 21),
          ),
        ],
      ),
      bottomNavigationBar: _RecognitionFooter(
        canGoBack: safeIndex > 0,
        canGoNext: safeIndex < questions.length - 1,
        onPrevious: () {
          setState(() {
            _index = safeIndex - 1;
            _selected = null;
            _revealed = false;
          });
        },
        onNext: () {
          setState(() {
            _index = safeIndex + 1;
            _selected = null;
            _revealed = false;
          });
        },
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            decoration: const BoxDecoration(
              color: AppColors.background,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Text(
                      'Pregunta ${safeIndex + 1} / ${questions.length}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${(progress * 100).round()}%',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.cyan,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 7),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 5,
                    backgroundColor: AppColors.surfaceAlt,
                    valueColor:
                        const AlwaysStoppedAnimation(AppColors.cyan),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.gold.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          categoryDisplayName(question.category),
                          style: const TextStyle(
                            fontSize: 10,
                            color: AppColors.gold,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  AppCard(
                    padding: const EdgeInsets.all(18),
                    child: Text(
                      question.question,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  ...List.generate(question.options.length, (index) {
                    final isCorrect = index == question.correctAnswer;
                    final isSelected = _selected == index;

                    Color background = AppColors.surface;
                    Color border = AppColors.border;
                    Color letterColor = AppColors.textSecondary;

                    if (_revealed && isCorrect) {
                      background = AppColors.success.withValues(alpha: 0.14);
                      border = AppColors.success;
                      letterColor = AppColors.success;
                    } else if (_revealed && isSelected && !isCorrect) {
                      background = AppColors.danger.withValues(alpha: 0.14);
                      border = AppColors.danger;
                      letterColor = AppColors.danger;
                    } else if (isSelected) {
                      background = AppColors.cyan.withValues(alpha: 0.12);
                      border = AppColors.cyan;
                      letterColor = AppColors.cyan;
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 9),
                      child: InkWell(
                        onTap: _revealed
                            ? null
                            : () => setState(() {
                                  _selected = index;
                                  _revealed = true;
                                }),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(13),
                          decoration: BoxDecoration(
                            color: background,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: border, width: 1.4),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 26,
                                height: 26,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: letterColor),
                                ),
                                child: Text(
                                  String.fromCharCode(65 + index),
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: letterColor,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 11),
                              Expanded(
                                child: Text(
                                  question.options[index],
                                  style: const TextStyle(
                                    fontSize: 13,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                              if (_revealed && isCorrect)
                                const Icon(Icons.check_circle_rounded,
                                    size: 18, color: AppColors.success),
                              if (_revealed && isSelected && !isCorrect)
                                const Icon(Icons.cancel_rounded,
                                    size: 18, color: AppColors.danger),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                  if (_revealed) ...[
                    const SizedBox(height: 12),
                    AppCard(
                      backgroundColor: AppColors.surfaceAlt,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                _selected == question.correctAnswer
                                    ? Icons.check_circle_outline_rounded
                                    : Icons.info_outline_rounded,
                                size: 17,
                                color: _selected == question.correctAnswer
                                    ? AppColors.success
                                    : AppColors.gold,
                              ),
                              const SizedBox(width: 7),
                              Text(
                                _selected == question.correctAnswer
                                    ? 'Respuesta correcta'
                                    : 'Respuesta correcta: '
                                        '${String.fromCharCode(65 + question.correctAnswer)}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: _selected == question.correctAnswer
                                      ? AppColors.success
                                      : AppColors.gold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            question.explanation,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: AppColors.textSecondary,
                              height: 1.45,
                            ),
                          ),
                          if (question.legalBasis != null &&
                              question.legalBasis!.isNotEmpty) ...[
                            const SizedBox(height: 9),
                            const Divider(height: 1),
                            const SizedBox(height: 9),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.balance_rounded,
                                    size: 14, color: AppColors.gold),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    question.legalBasis!,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: AppColors.textMuted,
                                      height: 1.35,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RecognitionFooter extends StatelessWidget {
  const _RecognitionFooter({
    required this.canGoBack,
    required this.canGoNext,
    required this.onPrevious,
    required this.onNext,
  });

  final bool canGoBack;
  final bool canGoNext;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: canGoBack ? onPrevious : null,
                icon: const Icon(Icons.chevron_left_rounded),
                label: const Text('Anterior'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: canGoNext ? onNext : null,
                icon: const Icon(Icons.chevron_right_rounded),
                label: const Text('Siguiente'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
