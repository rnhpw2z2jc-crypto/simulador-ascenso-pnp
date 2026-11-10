import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/category_utils.dart';
import '../../data/models/exam_config.dart';
import '../providers/auth_provider.dart';
import '../providers/exam_flow_provider.dart';
import '../providers/questions_provider.dart';
import '../widgets/common.dart';

enum ThemeMode { simulacro, repaso, recognition, audio }

ThemeMode _parseMode(String? value) {
  switch (value) {
    case 'repaso':
      return ThemeMode.repaso;
    case 'recognition':
      return ThemeMode.recognition;
    case 'audio':
      return ThemeMode.audio;
    default:
      return ThemeMode.simulacro;
  }
}

class ThemeSelectScreen extends ConsumerStatefulWidget {
  const ThemeSelectScreen({super.key, this.rawMode});

  final String? rawMode;

  @override
  ConsumerState<ThemeSelectScreen> createState() => _ThemeSelectScreenState();
}

class _ThemeSelectScreenState extends ConsumerState<ThemeSelectScreen> {
  late final ThemeMode _mode = _parseMode(widget.rawMode);

  final Set<String> _selected = {'all'};
  String? _single;
  int _numQuestions = 10;

  bool get _isMultiple => _mode == ThemeMode.simulacro;
  bool get _isRepaso => _mode == ThemeMode.repaso;

  @override
  Widget build(BuildContext context) {
    final questionsAsync = ref.watch(questionsProvider);
    final questions = questionsAsync.asData?.value;
    final user = ref.watch(authProvider).user;

    if (questions == null) {
      return const PageScaffold(child: LoadingView(message: 'Cargando preguntas...'));
    }
    if (_mode == ThemeMode.audio && (user == null || !user.hasAudioAccess)) {
      return const PageScaffold(
        child: EmptyState(
          icon: Icons.headset_off_rounded,
          title: 'Modo Audio bloqueado',
          message: 'Pide al administrador que active el complemento de audio '
              'para tu cuenta.',
        ),
      );
    }

    final counts = <String, int>{};
    for (final question in questions) {
      counts[question.category] = (counts[question.category] ?? 0) + 1;
    }
    final categories = counts.keys.toList()
      ..sort((a, b) => categoryDisplayName(a)
          .toLowerCase()
          .compareTo(categoryDisplayName(b).toLowerCase()));

    final allSelected = _selected.contains('all');
    final activeCategories = _isMultiple
        ? (allSelected ? categories : _selected.where((c) => c != 'all').toList())
        : (_single == null ? categories : [_single!]);

    final pool = activeCategories.fold<int>(
      0,
      (sum, category) => sum + (counts[category] ?? 0),
    );

    final finalCount = _isMultiple
        ? (_numQuestions == 0 ? pool : (_numQuestions > pool ? pool : _numQuestions))
        : pool;

    final canContinue = _isRepaso ? _single != null && pool > 0 : pool > 0;

    final title = switch (_mode) {
      ThemeMode.simulacro => 'SIMULACRO',
      ThemeMode.repaso => 'REPASO POR TEMA',
      ThemeMode.recognition => 'RECONOCIMIENTO TÁCTICO',
      ThemeMode.audio => 'AUDIO TÁCTICO',
    };
    final subtitle = switch (_mode) {
      ThemeMode.simulacro => 'Elige temas y cantidad de preguntas',
      ThemeMode.repaso => 'Todas las preguntas de un tema, con tiempo',
      ThemeMode.recognition => 'Repasa pregunta por pregunta, sin presión',
      ThemeMode.audio => 'Elige el tema que quieres escuchar',
    };
    final accentColor = switch (_mode) {
      ThemeMode.simulacro => AppColors.blue,
      ThemeMode.repaso => AppColors.gold,
      ThemeMode.recognition => AppColors.cyan,
      ThemeMode.audio => AppColors.gold,
    };
    final icon = switch (_mode) {
      ThemeMode.simulacro => Icons.assignment_outlined,
      ThemeMode.repaso => Icons.hourglass_bottom_rounded,
      ThemeMode.recognition => Icons.gps_fixed_rounded,
      ThemeMode.audio => Icons.headphones_rounded,
    };

    return PageScaffold(
      appBar: ScreenHeader(
        title: title,
        subtitle: subtitle,
        icon: icon,
        iconColor: accentColor,
        onBack: () => context.go('/dashboard'),
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.surfaceAlt,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(
              '${questions.length} preguntas',
              style: const TextStyle(
                fontSize: 10.5,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _BottomBar(
        color: accentColor,
        summary: _summaryText(finalCount),
        detail: _isRepaso || _isMultiple
            ? 'Tiempo estimado: ~${AppConstants.estimatedTimeLabel(finalCount)}'
            : 'Sin límite de tiempo',
        enabled: canContinue,
        label: switch (_mode) {
          ThemeMode.simulacro => 'INICIAR SIMULACRO',
          ThemeMode.repaso => 'INICIAR REPASO',
          ThemeMode.recognition => 'INICIAR RECONOCIMIENTO',
          ThemeMode.audio => 'CONTINUAR',
        },
        onPressed: canContinue
            ? () => _continue(
                  activeCategories: activeCategories,
                  finalCount: finalCount,
                )
            : null,
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
        children: [
          if (_isMultiple) ...[
            _QuantitySelector(
              value: _numQuestions,
              pool: pool,
              onChanged: (value) => setState(() => _numQuestions = value),
            ),
            const SizedBox(height: 16),
          ],
          if (_isRepaso) ...[
            const InfoBanner(
              color: AppColors.gold,
              icon: Icons.timer_outlined,
              title: 'Repaso completo con tiempo',
              message:
                  'Selecciona un tema y repasa todas sus preguntas a ritmo de '
                  'examen: 1.5 min por pregunta.',
            ),
            const SizedBox(height: 16),
          ],
          SectionTitle(
            _isRepaso
                ? 'Elige el tema a repasar'
                : _isMultiple
                    ? 'Temas del examen'
                    : 'Elige el tema',
            icon: Icons.menu_book_rounded,
            trailing: Text(
              _isMultiple
                  ? (allSelected
                      ? 'Todos los temas'
                      : '${activeCategories.length} tema'
                          '${activeCategories.length != 1 ? 's' : ''}')
                  : (_single == null
                      ? 'Todos los temas'
                      : '1 tema'),
              style: const TextStyle(
                fontSize: 10.5,
                color: AppColors.textMuted,
              ),
            ),
          ),
          if (!_isRepaso)
            _CategoryTile(
              title: 'Todos los temas',
              subtitle: '${questions.length} preguntas',
              selected: _isMultiple ? allSelected : _single == null,
              color: accentColor,
              onTap: () => _toggleCategory('all', categories),
            ),
          ...categories.map(
            (category) => _CategoryTile(
              title: categoryDisplayName(category),
              subtitle: '${counts[category] ?? 0} preguntas'
                  '${_isMultiple || _isRepaso ? ' · ~${AppConstants.estimatedTimeLabel(counts[category] ?? 0)}' : ''}',
              selected: _isMultiple
                  ? (!allSelected && _selected.contains(category))
                  : _single == category,
              color: accentColor,
              onTap: () => _toggleCategory(category, categories),
            ),
          ),
          if (_isMultiple && !allSelected && _selected.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Selecciona al menos un tema o usa "Todos los temas".',
                style: TextStyle(fontSize: 11.5, color: AppColors.warning),
              ),
            ),
        ],
      ),
    );
  }

  String _summaryText(int finalCount) {
    if (_isRepaso) {
      return _single == null
          ? 'Elige un tema para continuar'
          : '$finalCount preguntas · repaso con tiempo';
    }
    if (_isMultiple) {
      return '$finalCount preguntas · ~${AppConstants.estimatedTimeLabel(finalCount)}';
    }
    return '$finalCount preguntas'
        '${_single == null ? ' · todos los temas' : ''}';
  }

  void _toggleCategory(String category, List<String> categories) {
    setState(() {
      if (_isMultiple) {
        if (category == 'all') {
          _selected
            ..clear()
            ..add('all');
          return;
        }
        _selected.remove('all');
        if (_selected.contains(category)) {
          _selected.remove(category);
        } else {
          _selected.add(category);
        }
        if (_selected.isEmpty) _selected.add('all');
        return;
      }

      if (_isRepaso) {
        _single = _single == category ? null : category;
        return;
      }

      if (category == 'all') {
        _single = null;
      } else {
        _single = _single == category ? null : category;
      }
    });
  }

  void _continue({
    required List<String> activeCategories,
    required int finalCount,
  }) {
    switch (_mode) {
      case ThemeMode.simulacro:
        ref.read(examFlowProvider.notifier).setPendingConfig(
              ExamConfig(
                numQuestions: finalCount,
                categories: activeCategories,
              ),
            );
        context.go('/config');
        return;
      case ThemeMode.repaso:
        if (_single == null) return;
        ref.read(examFlowProvider.notifier).setPendingConfig(
              ExamConfig(numQuestions: finalCount, categories: [_single!]),
            );
        context.go('/config');
        return;
      case ThemeMode.recognition:
        final category = _single == null
            ? ''
            : Uri.encodeComponent(_single!);
        context.go('/recognition?category=$category');
        return;
      case ThemeMode.audio:
        final category = _single == null
            ? ''
            : Uri.encodeComponent(_single!);
        context.go('/audio?category=$category');
        return;
    }
  }
}

class _QuantitySelector extends StatelessWidget {
  const _QuantitySelector({
    required this.value,
    required this.pool,
    required this.onChanged,
  });

  final int value;
  final int pool;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    const options = [
      (value: 10, label: '10', hint: 'Quiz'),
      (value: 50, label: '50', hint: 'Práctica'),
      (value: 100, label: '100', hint: 'Oficial'),
      (value: 0, label: 'Todas', hint: 'Banco'),
    ];

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.tag_rounded, size: 17, color: AppColors.gold),
              SizedBox(width: 7),
              Text(
                'Cantidad de preguntas',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Se seleccionan al azar del tema o temas elegidos.',
            style: TextStyle(fontSize: 11, color: AppColors.textMuted),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              for (var index = 0; index < options.length; index++) ...[
                if (index > 0) const SizedBox(width: 8),
                Expanded(
                  child: _QuantityChip(
                    label: options[index].label,
                    hint: options[index].value == 0
                        ? '$pool'
                        : options[index].hint,
                    selected: value == options[index].value,
                    enabled: options[index].value == 0 ||
                        options[index].value <= pool,
                    onTap: () => onChanged(options[index].value),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _QuantityChip extends StatelessWidget {
  const _QuantityChip({
    required this.label,
    required this.hint,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final String hint;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.blue.withValues(alpha: 0.16)
                : AppColors.surfaceAlt,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.blue : AppColors.border,
            ),
          ),
          child: Column(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: selected ? Colors.white : AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                hint,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 8.5,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
          decoration: BoxDecoration(
            color: selected
                ? color.withValues(alpha: 0.12)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? color : AppColors.border,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 21,
                height: 21,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: selected ? color : AppColors.textMuted,
                    width: 1.6,
                  ),
                  color: selected
                      ? color.withValues(alpha: 0.25)
                      : Colors.transparent,
                ),
                child: selected
                    ? const Icon(Icons.check_rounded,
                        size: 14, color: Colors.white)
                    : null,
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: selected ? Colors.white : AppColors.textPrimary,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.color,
    required this.summary,
    required this.detail,
    required this.enabled,
    required this.label,
    required this.onPressed,
  });

  final Color color;
  final String summary;
  final String detail;
  final bool enabled;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    summary,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    detail,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: color,
                foregroundColor: color == AppColors.gold
                    ? const Color(0xFF1A1A00)
                    : Colors.white,
                minimumSize: const Size(0, 48),
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onPressed: enabled ? onPressed : null,
              icon: const Icon(Icons.play_arrow_rounded, size: 20),
              label: Text(
                label,
                style: const TextStyle(fontSize: 11.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
