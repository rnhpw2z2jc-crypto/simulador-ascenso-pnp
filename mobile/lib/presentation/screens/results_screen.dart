import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/category_utils.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/exam_result.dart';
import '../providers/exam_flow_provider.dart';
import '../widgets/common.dart';

enum _ResultFilter { all, correct, incorrect }

class ResultsScreen extends ConsumerStatefulWidget {
  const ResultsScreen({super.key});

  @override
  ConsumerState<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends ConsumerState<ResultsScreen> {
  _ResultFilter _filter = _ResultFilter.all;

  static const _passedMessages = [
    '¡Excelente resultado! Mantén el ritmo de estudio y no te confíes. '
        '¡El ascenso te espera!',
    '¡Aprobado con nota! Tu disciplina da frutos. ¡Sigue así y alcanzarás '
        'la meta!',
    '¡Así se hace! Tu preparación es impecable. ¡El camino al ascenso está '
        'abierto!',
    '¡Dominio total! No hay quien te detenga. ¡Mantén esa consistencia!',
    '¡Gran desempeño! Cada hora de estudio cuenta. ¡El mérito es tuyo!',
  ];

  static const _failedMessages = [
    '¡Este solo es el comienzo! Cada error corregido es un paso más hacia tu '
        'ascenso. ¡Ajusta la táctica y vuelve a intentar!',
    '¡No te rindas! Los retos forjan el carácter. Analiza tus errores y '
        'vuelve más fuerte.',
    '¡Ánimo, que el camino al ascenso es de perseverantes! Refuerza tus '
        'puntos débiles y lo lograrás.',
    '¡El fracaso es temporal, la deserción es permanente! Estudia, repite '
        'y conquista.',
    '¡Los mejores policías caen y se levantan! Refuerza lo que fallaste y '
        'vuelve por tu ascenso.',
  ];

  @override
  Widget build(BuildContext context) {
    final result = ref.watch(examFlowProvider).lastResult;
    if (result == null) {
      return PageScaffold(
        child: EmptyState(
          icon: Icons.insights_outlined,
          title: 'Sin resultados',
          message: 'Completa un simulacro para ver tu resultado.',
          action: FilledButton(
            onPressed: () => context.go('/dashboard'),
            child: const Text('Volver al inicio'),
          ),
        ),
      );
    }

    final passed = result.passed;
    final message = passed ? _passedMessages[0] : _failedMessages[0];

    final filtered = <int>[
      for (var i = 0; i < result.questions.length; i++)
        if (_filter == _ResultFilter.all ||
            (_filter == _ResultFilter.correct && result.isCorrectAt(i)) ||
            (_filter == _ResultFilter.incorrect && !result.isCorrectAt(i)))
          i,
    ];

    return PageScaffold(
      appBar: ScreenHeader(
        title: 'RESULTADOS',
        subtitle: '${result.correctAnswers}/${result.totalQuestions} correctas',
        icon: Icons.insights_rounded,
        iconColor: passed ? AppColors.success : AppColors.danger,
        onBack: () => context.go('/dashboard'),
        actions: [
          IconButton(
            onPressed: () => context.go('/dashboard'),
            tooltip: 'Inicio',
            icon: const Icon(Icons.home_outlined, size: 21),
          ),
        ],
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          _ScoreCard(result: result, message: message),
          const SizedBox(height: 18),
          Row(
            children: [
              const Icon(Icons.filter_list_rounded,
                  size: 17, color: AppColors.textMuted),
              const SizedBox(width: 8),
              for (final filter in _ResultFilter.values) ...[
                _FilterChip(
                  label: switch (filter) {
                    _ResultFilter.all => 'Todas',
                    _ResultFilter.correct => 'Correctas',
                    _ResultFilter.incorrect => 'Incorrectas',
                  },
                  color: switch (filter) {
                    _ResultFilter.all => AppColors.blue,
                    _ResultFilter.correct => AppColors.success,
                    _ResultFilter.incorrect => AppColors.danger,
                  },
                  selected: _filter == filter,
                  onTap: () => setState(() => _filter = filter),
                ),
                const SizedBox(width: 7),
              ],
            ],
          ),
          const SizedBox(height: 14),
          for (final index in filtered)
            _QuestionReview(
              result: result,
              index: index,
              number: index + 1,
            ),
          const SizedBox(height: 10),
          if (!passed && result.incorrectAnswers > 0)
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.gold,
                foregroundColor: const Color(0xFF1A1A00),
              ),
              onPressed: () async {
                final started =
                    await ref.read(examFlowProvider.notifier).startReinforcement(
                          result.questions,
                          result.failedQuestionIds,
                        );
                if (!context.mounted) return;
                if (started) {
                  context.go('/exam');
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('No hay preguntas para reforzar.'),
                    ),
                  );
                }
              },
              icon: const Icon(Icons.psychology_alt_outlined),
              label: const Text('REFORZAMIENTO TÁCTICO'),
            ),
          if (!passed && result.incorrectAnswers > 0)
            const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () => context.go('/dashboard'),
            icon: const Icon(Icons.home_outlined),
            label: const Text('Volver al inicio'),
          ),
        ],
      ),
    );
  }
}

class _ScoreCard extends StatelessWidget {
  const _ScoreCard({required this.result, required this.message});

  final ExamResult result;
  final String message;

  @override
  Widget build(BuildContext context) {
    final passed = result.passed;
    final color = passed ? AppColors.success : AppColors.danger;

    return AppCard(
      borderColor: color.withValues(alpha: 0.55),
      backgroundColor: color.withValues(alpha: 0.07),
      padding: const EdgeInsets.all(18),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 92,
                height: 92,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withValues(alpha: 0.14),
                  border: Border.all(
                    color: color.withValues(alpha: 0.6),
                    width: 2,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '${result.percentage}%',
                      style: TextStyle(
                        fontSize: 25,
                        fontWeight: FontWeight.w800,
                        color: color,
                      ),
                    ),
                    Text(
                      '${result.correctAnswers}/${result.totalQuestions}',
                      style: TextStyle(
                        fontSize: 10.5,
                        color: color,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            passed
                                ? Icons.check_circle_rounded
                                : Icons.cancel_rounded,
                            size: 15,
                            color: color,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            passed ? 'APROBADO' : 'DESAPROBADO',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: color,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _ScoreMetric(
                          value: '${result.correctAnswers}',
                          label: 'Correctas',
                          color: AppColors.success,
                        ),
                        const SizedBox(width: 18),
                        _ScoreMetric(
                          value: '${result.incorrectAnswers}',
                          label: 'Incorrectas',
                          color: AppColors.danger,
                        ),
                        const SizedBox(width: 18),
                        _ScoreMetric(
                          value: Formatters.duration(result.timeUsed),
                          label: 'Tiempo',
                          color: AppColors.textSecondary,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11.5,
                color: color,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScoreMetric extends StatelessWidget {
  const _ScoreMetric({
    required this.value,
    required this.label,
    required this.color,
  });

  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 9.5,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected
                ? color.withValues(alpha: 0.16)
                : AppColors.surfaceAlt,
            borderRadius: BorderRadius.circular(9),
            border: Border.all(
              color: selected ? color.withValues(alpha: 0.6) : AppColors.border,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: selected ? color : AppColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _QuestionReview extends StatelessWidget {
  const _QuestionReview({
    required this.result,
    required this.index,
    required this.number,
  });

  final ExamResult result;
  final int index;
  final int number;

  @override
  Widget build(BuildContext context) {
    final question = result.questions[index];
    final userAnswer =
        index < result.answers.length ? result.answers[index] : null;
    final isCorrect = result.isCorrectAt(index);
    final color = isCorrect ? AppColors.success : AppColors.danger;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withValues(alpha: 0.16),
                  ),
                  child: Icon(
                    isCorrect ? Icons.check_rounded : Icons.close_rounded,
                    size: 15,
                    color: color,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Pregunta $number',
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceAlt,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      categoryDisplayName(question.category),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 9,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              question.question,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 10),
            for (var i = 0; i < question.options.length; i++)
              _ReviewOption(
                letter: String.fromCharCode(65 + i),
                text: question.options[i],
                isCorrect: i == question.correctAnswer,
                isUserAnswer: userAnswer == i,
                isCorrectQuestion: isCorrect,
              ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Explicación',
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.gold,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    question.explanation,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Divider(height: 1),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.balance_rounded,
                          size: 14, color: AppColors.gold),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              categoryDisplayName(question.category),
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (question.legalBasis != null &&
                                question.legalBasis!.isNotEmpty)
                              Text(
                                question.legalBasis!,
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  color: AppColors.textMuted,
                                  height: 1.3,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReviewOption extends StatelessWidget {
  const _ReviewOption({
    required this.letter,
    required this.text,
    required this.isCorrect,
    required this.isUserAnswer,
    required this.isCorrectQuestion,
  });

  final String letter;
  final String text;
  final bool isCorrect;
  final bool isUserAnswer;
  final bool isCorrectQuestion;

  @override
  Widget build(BuildContext context) {
    Color background = Colors.transparent;
    Color border = AppColors.border;
    Color textColor = AppColors.textSecondary;

    if (isCorrect) {
      background = AppColors.success.withValues(alpha: 0.10);
      border = AppColors.success.withValues(alpha: 0.45);
      textColor = AppColors.success;
    } else if (isUserAnswer && !isCorrectQuestion) {
      background = AppColors.danger.withValues(alpha: 0.10);
      border = AppColors.danger.withValues(alpha: 0.45);
      textColor = AppColors.danger;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 5),
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$letter.',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: textColor,
            ),
          ),
          const SizedBox(width: 5),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 11,
                color: textColor,
                height: 1.3,
              ),
            ),
          ),
          if (isCorrect)
            const Icon(Icons.check_rounded,
                size: 13, color: AppColors.success),
          if (isUserAnswer && !isCorrectQuestion)
            const Icon(Icons.close_rounded, size: 13, color: AppColors.danger),
        ],
      ),
    );
  }
}
