import '../../core/constants.dart';
import '../../core/services/local_store.dart';
import '../models/exam_config.dart';
import '../models/exam_state.dart';
import '../models/question.dart';

/// Examen guardado para continuar despues ("Guardar y salir").
class PausedExamData {
  const PausedExamData({
    required this.state,
    required this.questions,
    required this.config,
    required this.mode,
    required this.timeLimit,
  });

  final ExamState state;
  final List<Question> questions;
  final ExamConfig config;
  final String mode;
  final int timeLimit;

  Map<String, dynamic> toJson() => {
        'state': state.toJson(),
        'questions': questions.map((q) => q.toJson()).toList(),
        'config': config.toJson(),
        'mode': mode,
        'timeLimit': timeLimit,
      };

  factory PausedExamData.fromJson(Map<String, dynamic> json) {
    final rawQuestions = json['questions'];
    final questions = rawQuestions is List
        ? rawQuestions
            .whereType<Map>()
            .map((q) => Question.fromJson(Map<String, dynamic>.from(q)))
            .toList(growable: false)
        : <Question>[];

    return PausedExamData(
      state: json['state'] is Map
          ? ExamState.fromJson(Map<String, dynamic>.from(json['state'] as Map))
          : ExamState(
              currentQuestion: 0,
              answers: const [],
              bookmarks: const [],
              timeRemaining: 0,
              startTime: DateTime.now().millisecondsSinceEpoch,
            ),
      questions: questions,
      config: json['config'] is Map
          ? ExamConfig.fromJson(Map<String, dynamic>.from(json['config'] as Map))
          : const ExamConfig(numQuestions: 0, categories: []),
      mode: (json['mode'] ?? 'simulacro').toString(),
      timeLimit: (json['timeLimit'] as num?)?.toInt() ?? 0,
    );
  }
}

class PausedExamRepository {
  const PausedExamRepository();

  Future<PausedExamData?> load() async {
    final raw = await LocalStore.readJson(AppConstants.keyPausedExam);
    if (raw == null) return null;
    final data = PausedExamData.fromJson(raw);
    if (data.questions.isEmpty || data.state.isFinished) {
      await clear();
      return null;
    }
    return data;
  }

  Future<void> save(PausedExamData data) {
    return LocalStore.writeJson(AppConstants.keyPausedExam, data.toJson());
  }

  Future<void> clear() => LocalStore.remove(AppConstants.keyPausedExam);
}
