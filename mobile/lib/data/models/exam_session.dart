import 'exam_config.dart';
import 'exam_state.dart';
import 'question.dart';

/// Examen activo: preguntas + estado + configuracion.
class ExamSession {
  const ExamSession({
    required this.questions,
    required this.state,
    required this.config,
    required this.mode,
    required this.timeLimit,
  });

  final List<Question> questions;
  final ExamState state;
  final ExamConfig config;

  /// `simulacro`, `repaso` o `refuerzo`.
  final String mode;
  final int timeLimit;

  ExamSession copyWith({ExamState? state}) => ExamSession(
        questions: questions,
        state: state ?? this.state,
        config: config,
        mode: mode,
        timeLimit: timeLimit,
      );
}
