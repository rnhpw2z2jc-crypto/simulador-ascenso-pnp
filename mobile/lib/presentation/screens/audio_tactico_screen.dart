import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/services/local_store.dart';
import '../../core/services/speech_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/category_utils.dart';
import '../../data/models/question.dart';
import '../providers/auth_provider.dart';
import '../providers/questions_provider.dart';
import '../widgets/common.dart';

class AudioTacticoScreen extends ConsumerStatefulWidget {
  const AudioTacticoScreen({super.key, this.category});

  final String? category;

  @override
  ConsumerState<AudioTacticoScreen> createState() =>
      _AudioTacticoScreenState();
}

class _AudioTacticoScreenState extends ConsumerState<AudioTacticoScreen> {
  final SpeechService _speech = SpeechService();
  int _index = 0;
  bool _isPlaying = false;
  double _speed = 1.0;
  int _sessionToken = 0;

  @override
  void initState() {
    super.initState();
    unawaited(_loadSpeed());
  }

  Future<void> _loadSpeed() async {
    final stored = await LocalStore.readDouble(AppConstants.keyAudioSpeed);
    if (stored != null && mounted) {
      setState(() => _speed = stored);
    }
  }

  @override
  void dispose() {
    _sessionToken++;
    unawaited(_speech.dispose());
    super.dispose();
  }

  Future<void> _changeSpeed(double speed) async {
    setState(() => _speed = speed);
    await LocalStore.writeDouble(AppConstants.keyAudioSpeed, speed);
    await _speech.setSpeed(speed);
  }

  Future<void> _stop() async {
    _sessionToken++;
    setState(() => _isPlaying = false);
    await _speech.stop();
  }

  Future<void> _play(List<Question> questions) async {
    if (_isPlaying) {
      await _stop();
      return;
    }
    final token = ++_sessionToken;
    setState(() => _isPlaying = true);
    await _speech.setSpeed(_speed);

    var index = _index;
    while (token == _sessionToken &&
        _isPlaying &&
        index < questions.length &&
        mounted) {
      if (index != _index) {
        setState(() => _index = index);
      }
      final question = questions[index];
      final buffer = StringBuffer();
      buffer.write('Pregunta ${index + 1}. ');
      buffer.write(question.question);
      buffer.write('. Opciones: ');
      for (var i = 0; i < question.options.length; i++) {
        buffer.write(
          '${String.fromCharCode(65 + i)}. ${question.options[i]}. ',
        );
      }
      buffer.write(
        'Respuesta correcta: '
        '${String.fromCharCode(65 + question.correctAnswer)}. ',
      );
      buffer.write('${question.options[question.correctAnswer]}. ');
      buffer.write('Explicación: ${question.explanation}. ');
      if (question.legalBasis != null && question.legalBasis!.isNotEmpty) {
        buffer.write('Sustento legal: ${question.legalBasis}.');
      }

      await _speech.speak(buffer.toString());
      if (token != _sessionToken || !_isPlaying) return;

      if (index >= questions.length - 1) break;
      index++;
      await Future<void>.delayed(const Duration(milliseconds: 500));
    }

    if (token == _sessionToken && mounted) {
      setState(() => _isPlaying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    if (user == null) {
      return const PageScaffold(child: LoadingView());
    }
    if (!user.hasAudioAccess) {
      return PageScaffold(
        appBar: ScreenHeader(
          title: 'AUDIO TÁCTICO',
          subtitle: 'Complemento bloqueado',
          icon: Icons.headphones_rounded,
          iconColor: AppColors.gold,
          onBack: () => context.go('/dashboard'),
        ),
        child: const EmptyState(
          icon: Icons.headset_off_rounded,
          title: 'Modo Audio bloqueado',
          message: 'Pide al administrador que active el complemento de audio '
              'para tu cuenta.',
        ),
      );
    }

    final all = ref.watch(questionsProvider).asData?.value;
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
          title: 'AUDIO TÁCTICO',
          subtitle: 'Sin preguntas',
          icon: Icons.headphones_rounded,
          iconColor: AppColors.gold,
          onBack: () => context.go('/dashboard'),
        ),
        child: const EmptyState(
          icon: Icons.search_off_rounded,
          title: 'Sin preguntas',
          message: 'No hay preguntas para el tema seleccionado.',
        ),
      );
    }

    final safeIndex = _index.clamp(0, questions.length - 1);
    final question = questions[safeIndex];

    return PageScaffold(
      appBar: ScreenHeader(
        title: 'AUDIO TÁCTICO',
        subtitle: category == null || category.isEmpty
            ? 'Todos los temas'
            : categoryDisplayName(category),
        icon: Icons.headphones_rounded,
        iconColor: AppColors.gold,
        onBack: () {
          unawaited(_stop());
          context.go('/dashboard');
        },
        actions: [
          IconButton(
            onPressed: () {
              unawaited(_stop());
              context.go('/themes?mode=audio');
            },
            tooltip: 'Cambiar tema',
            icon: const Icon(Icons.swap_horiz_rounded, size: 21),
          ),
        ],
      ),
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 9,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.gold.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          categoryDisplayName(question.category),
                          style: const TextStyle(
                            fontSize: 9.5,
                            color: AppColors.gold,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${safeIndex + 1} / ${questions.length}',
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: AppColors.textMuted,
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
                  const SizedBox(height: 10),
                  for (var i = 0; i < question.options.length; i++)
                    Container(
                      margin: const EdgeInsets.only(bottom: 7),
                      padding: const EdgeInsets.all(11),
                      decoration: BoxDecoration(
                        color: i == question.correctAnswer
                            ? AppColors.success.withValues(alpha: 0.11)
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: i == question.correctAnswer
                              ? AppColors.success.withValues(alpha: 0.45)
                              : AppColors.border,
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${String.fromCharCode(65 + i)}.',
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: i == question.correctAnswer
                                  ? AppColors.success
                                  : AppColors.textMuted,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              question.options[i],
                              style: TextStyle(
                                fontSize: 11.5,
                                height: 1.35,
                                color: i == question.correctAnswer
                                    ? AppColors.success
                                    : AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 8),
                  AppCard(
                    backgroundColor: AppColors.surfaceAlt,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Explicación',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.gold,
                          ),
                        ),
                        const SizedBox(height: 4),
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
                          const SizedBox(height: 8),
                          const Divider(height: 1),
                          const SizedBox(height: 8),
                          Text(
                            question.legalBasis!,
                            style: const TextStyle(
                              fontSize: 10,
                              color: AppColors.textMuted,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          _AudioControls(
            isPlaying: _isPlaying,
            speed: _speed,
            canGoBack: safeIndex > 0,
            canGoNext: safeIndex < questions.length - 1,
            onPlay: () => _play(questions),
            onPrevious: () {
              unawaited(_stop());
              setState(() => _index = safeIndex - 1);
            },
            onNext: () {
              unawaited(_stop());
              setState(() => _index = safeIndex + 1);
            },
            onSpeed: _changeSpeed,
          ),
        ],
      ),
    );
  }
}

class _AudioControls extends StatelessWidget {
  const _AudioControls({
    required this.isPlaying,
    required this.speed,
    required this.canGoBack,
    required this.canGoNext,
    required this.onPlay,
    required this.onPrevious,
    required this.onNext,
    required this.onSpeed,
  });

  final bool isPlaying;
  final double speed;
  final bool canGoBack;
  final bool canGoNext;
  final VoidCallback onPlay;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final ValueChanged<double> onSpeed;

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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (final value in const [0.5, 0.8, 1.0]) ...[
                  InkWell(
                    onTap: () => onSpeed(value),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 13,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: speed == value
                            ? AppColors.gold.withValues(alpha: 0.2)
                            : AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: speed == value
                              ? AppColors.gold
                              : AppColors.border,
                        ),
                      ),
                      child: Text(
                        '${value}x',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: speed == value
                              ? AppColors.gold
                              : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 7),
                ],
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                IconButton(
                  onPressed: canGoBack ? onPrevious : null,
                  icon: const Icon(Icons.skip_previous_rounded),
                ),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor:
                          isPlaying ? AppColors.danger : AppColors.gold,
                      foregroundColor: isPlaying
                          ? Colors.white
                          : const Color(0xFF1A1A00),
                    ),
                    onPressed: onPlay,
                    icon: Icon(
                      isPlaying
                          ? Icons.stop_rounded
                          : Icons.play_arrow_rounded,
                    ),
                    label: Text(isPlaying ? 'DETENER' : 'ESCUCHAR'),
                  ),
                ),
                IconButton(
                  onPressed: canGoNext ? onNext : null,
                  icon: const Icon(Icons.skip_next_rounded),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
