import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/services/speech_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/category_utils.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/question.dart';
import '../../presentation/providers/auth_provider.dart';
import '../../presentation/providers/exam_flow_provider.dart';
import '../widgets/common.dart';

class ExamScreen extends ConsumerStatefulWidget {
  const ExamScreen({super.key});

  @override
  ConsumerState<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends ConsumerState<ExamScreen>
    with WidgetsBindingObserver {
  final SpeechService _speech = SpeechService();
  bool _finishing = false;
  bool _navigated = false;
  bool _isSpeaking = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_speech.dispose());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      ref.read(examFlowProvider.notifier).pause();
      unawaited(_speech.stop());
    }
  }

  Future<void> _finish() async {
    if (_finishing) return;
    setState(() => _finishing = true);
    final result = await ref.read(examFlowProvider.notifier).finish();
    if (!mounted) return;
    if (result != null && !_navigated) {
      _navigated = true;
      context.go('/results');
    } else {
      setState(() => _finishing = false);
    }
  }

  Future<void> _saveAndExit() async {
    await ref.read(examFlowProvider.notifier).saveAndExit();
    if (!mounted) return;
    context.go('/dashboard');
  }

  Future<void> _confirmFinish() async {
    final flow = ref.read(examFlowProvider);
    final session = flow.session;
    if (session == null) return;
    final unanswered = session.questions.length - session.state.answeredCount;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('¿Finalizar examen?'),
        content: Text(
          '${session.state.answeredCount} de ${session.questions.length} '
          'preguntas respondidas.'
          '${unanswered > 0 ? '\n\nHay $unanswered sin responder.' : ''}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Continuar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger,
              minimumSize: const Size(104, 42),
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Finalizar'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _finish();
  }

  Future<void> _confirmExit() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('¿Guardar y salir?'),
        content: const Text(
          'Tu examen quedará pendiente y podrás retomarlo desde el inicio '
          'cuando vuelvas.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: const Color(0xFF1A1A00),
              minimumSize: const Size(120, 42),
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Guardar y salir'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _saveAndExit();
  }

  Future<void> _openNavigation() async {
    final session = ref.read(examFlowProvider).session;
    if (session == null) return;

    final selected = await showModalBottomSheet<int>(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.62,
          minChildSize: 0.35,
          maxChildSize: 0.9,
          builder: (context, controller) {
            final currentSession = ref.read(examFlowProvider).session;
            if (currentSession == null) {
              return const SizedBox.shrink();
            }
            final state = currentSession.state;
            return ListView(
              controller: controller,
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
              children: [
                Row(
                  children: [
                    const Icon(Icons.grid_view_rounded,
                        size: 19, color: AppColors.gold),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Navegación de preguntas',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded, size: 20),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 6,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 1,
                  ),
                  itemCount: currentSession.questions.length,
                  itemBuilder: (context, index) {
                    final isCurrent = index == state.currentQuestion;
                    final isAnswered = state.answers.length > index &&
                        state.answers[index] != null;
                    final isBookmarked = state.bookmarks.length > index &&
                        state.bookmarks[index];

                    Color background = AppColors.surfaceAlt;
                    Color border = AppColors.border;
                    Color text = AppColors.textSecondary;
                    if (isAnswered) {
                      background = AppColors.success.withValues(alpha: 0.15);
                      border = AppColors.success.withValues(alpha: 0.4);
                      text = AppColors.success;
                    } else if (isBookmarked) {
                      background = AppColors.gold.withValues(alpha: 0.15);
                      border = AppColors.gold.withValues(alpha: 0.4);
                      text = AppColors.gold;
                    }
                    if (isCurrent) {
                      background = AppColors.blue;
                      border = AppColors.blueLight;
                      text = Colors.white;
                    }

                    return InkWell(
                      onTap: () => Navigator.of(context).pop(index),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: background,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: border),
                        ),
                        child: Text(
                          '${index + 1}',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: text,
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),
                const Wrap(
                  spacing: 14,
                  runSpacing: 6,
                  children: [
                    _Legend(color: AppColors.success, label: 'Respondida'),
                    _Legend(color: AppColors.gold, label: 'Marcada'),
                    _Legend(color: AppColors.surfaceHigh, label: 'Sin responder'),
                  ],
                ),
              ],
            );
          },
        );
      },
    );

    if (selected != null) {
      ref.read(examFlowProvider.notifier).goTo(selected);
    }
  }

  Future<void> _toggleSpeak(Question question) async {
    if (_isSpeaking) {
      await _speech.stop();
      if (mounted) setState(() => _isSpeaking = false);
      return;
    }
    setState(() => _isSpeaking = true);
    final buffer = StringBuffer(question.question);
    buffer.write('. Opciones: ');
    for (var i = 0; i < question.options.length; i++) {
      buffer.write(
        '${String.fromCharCode(65 + i)}. ${question.options[i]}. ',
      );
    }
    await _speech.speak(buffer.toString());
    if (mounted) setState(() => _isSpeaking = false);
  }

  @override
  Widget build(BuildContext context) {
    final flow = ref.watch(examFlowProvider);
    final session = flow.session;

    ref.listen<ExamFlowState>(examFlowProvider, (previous, next) {
      final remaining = next.session?.state.timeRemaining;
      if (remaining != null &&
          remaining <= 0 &&
          next.session?.state.isFinished == false &&
          !_finishing) {
        scheduleMicrotask(_finish);
      }
    });

    if (session == null) {
      return PageScaffold(
        child: EmptyState(
          icon: Icons.assignment_late_outlined,
          title: 'Sin examen activo',
          message: 'Inicia un simulacro desde el inicio.',
          action: FilledButton(
            onPressed: () => context.go('/dashboard'),
            child: const Text('Volver al inicio'),
          ),
        ),
      );
    }

    final state = session.state;
    final question = session.questions[state.currentQuestion];
    final user = ref.watch(authProvider).user;
    final isLowTime = state.timeRemaining < 300;
    final progress = session.questions.isEmpty
        ? 0.0
        : (state.currentQuestion + 1) / session.questions.length;

    final exam = PageScaffold(
      bottomNavigationBar: _ExamFooter(
        canGoBack: state.currentQuestion > 0,
        canGoNext: state.currentQuestion < session.questions.length - 1,
        onPrevious: () => ref.read(examFlowProvider.notifier).previous(),
        onNext: () => ref.read(examFlowProvider.notifier).next(),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            decoration: const BoxDecoration(
              color: AppColors.background,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: isLowTime
                            ? AppColors.danger.withValues(alpha: 0.16)
                            : AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isLowTime
                              ? AppColors.danger.withValues(alpha: 0.5)
                              : AppColors.border,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.timer_outlined,
                            size: 16,
                            color:
                                isLowTime ? AppColors.danger : AppColors.gold,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            Formatters.duration(state.timeRemaining),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              fontFeatures: const [
                                FontFeature.tabularFigures()
                              ],
                              color: isLowTime
                                  ? AppColors.danger
                                  : AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      '${state.currentQuestion + 1} / ${session.questions.length}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    _HeaderIcon(
                      icon: state.isPaused
                          ? Icons.play_arrow_rounded
                          : Icons.pause_rounded,
                      color: AppColors.gold,
                      tooltip: state.isPaused ? 'Continuar' : 'Pausar',
                      onTap: () {
                        final notifier = ref.read(examFlowProvider.notifier);
                        state.isPaused ? notifier.resume() : notifier.pause();
                      },
                    ),
                    _HeaderIcon(
                      icon: Icons.grid_view_rounded,
                      tooltip: 'Navegación',
                      onTap: _openNavigation,
                    ),
                    _HeaderIcon(
                      icon: Icons.logout_rounded,
                      tooltip: 'Guardar y salir',
                      onTap: _confirmExit,
                    ),
                  ],
                ),
                const SizedBox(height: 9),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 5,
                    backgroundColor: AppColors.surfaceAlt,
                    valueColor: const AlwaysStoppedAnimation(AppColors.blue),
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(
                      '${state.answeredCount} respondidas',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '${state.bookmarkedCount} marcadas',
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
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Container(
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
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppColors.gold,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const Spacer(),
                      if (user != null && user.hasAudioAccess)
                        IconButton(
                          onPressed: () => _toggleSpeak(question),
                          tooltip: 'Escuchar pregunta',
                          visualDensity: VisualDensity.compact,
                          icon: Icon(
                            _isSpeaking
                                ? Icons.stop_circle_outlined
                                : Icons.volume_up_rounded,
                            color: _isSpeaking
                                ? AppColors.danger
                                : AppColors.blueLight,
                            size: 21,
                          ),
                        ),
                      IconButton(
                        onPressed: () =>
                            ref.read(examFlowProvider.notifier).toggleBookmark(),
                        tooltip: 'Marcar pregunta',
                        visualDensity: VisualDensity.compact,
                        icon: Icon(
                          state.bookmarks.length > state.currentQuestion &&
                                  state.bookmarks[state.currentQuestion]
                              ? Icons.flag_rounded
                              : Icons.flag_outlined,
                          color: state.bookmarks.length > state.currentQuestion &&
                                  state.bookmarks[state.currentQuestion]
                              ? AppColors.gold
                              : AppColors.textMuted,
                          size: 21,
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
                  const SizedBox(height: 16),
                  ...List.generate(question.options.length, (index) {
                    final selected =
                        state.answers.length > state.currentQuestion &&
                            state.answers[state.currentQuestion] == index;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 9),
                      child: InkWell(
                        onTap: () =>
                            ref.read(examFlowProvider.notifier).answer(index),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(13),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.blue.withValues(alpha: 0.16)
                                : AppColors.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: selected
                                  ? AppColors.blue
                                  : AppColors.border,
                              width: selected ? 1.6 : 1,
                            ),
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
                                  color: selected
                                      ? AppColors.blue
                                      : Colors.transparent,
                                  border: Border.all(
                                    color: selected
                                        ? AppColors.blue
                                        : AppColors.textMuted,
                                  ),
                                ),
                                child: Text(
                                  String.fromCharCode(65 + index),
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: selected
                                        ? Colors.white
                                        : AppColors.textSecondary,
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
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.danger,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: _finishing ? null : _confirmFinish,
                    icon: _finishing
                        ? const SizedBox(
                            width: 17,
                            height: 17,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.check_circle_outline_rounded,
                            size: 19),
                    label: Text(
                      _finishing ? 'GUARDANDO...' : 'FINALIZAR EXAMEN',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _confirmExit();
      },
      child: Stack(
        children: [
          exam,
          if (state.isPaused)
            Positioned.fill(
              child: _PauseOverlay(
                onResume: () => ref.read(examFlowProvider.notifier).resume(),
              ),
            ),
        ],
      ),
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.color = AppColors.textSecondary,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onTap,
      tooltip: tooltip,
      visualDensity: VisualDensity.compact,
      icon: Icon(icon, size: 20, color: color),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(3),
            border: Border.all(color: color),
          ),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
        ),
      ],
    );
  }
}

class _ExamFooter extends StatelessWidget {
  const _ExamFooter({
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

class _PauseOverlay extends StatelessWidget {
  const _PauseOverlay({required this.onResume});

  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.background.withValues(alpha: 0.97),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 78,
                height: 78,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.gold.withValues(alpha: 0.16),
                  border: Border.all(
                    color: AppColors.gold.withValues(alpha: 0.5),
                  ),
                ),
                child: const Icon(Icons.pause_rounded,
                    size: 38, color: AppColors.gold),
              ),
              const SizedBox(height: 20),
              const Text(
                'Examen en pausa',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              const Text(
                'El examen se pausó automáticamente al salir de la aplicación. '
                'Tu progreso y tiempo están guardados.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  color: AppColors.textSecondary,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(230, 50),
                ),
                onPressed: onResume,
                icon: const Icon(Icons.play_arrow_rounded),
                label: const Text('CONTINUAR EXAMEN'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
