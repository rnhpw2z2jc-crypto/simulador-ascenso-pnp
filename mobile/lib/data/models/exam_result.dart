import 'exam_config.dart';
import 'question.dart';

/// Resultado completo de un examen (se usa en memoria para la pantalla de
/// resultados). Para el historial local se guarda una version compacta sin
/// preguntas para no saturar el almacenamiento del dispositivo.
class ExamResult {
  const ExamResult({
    required this.id,
    required this.date,
    required this.config,
    required this.score,
    required this.totalQuestions,
    required this.correctAnswers,
    required this.timeUsed,
    required this.answers,
    required this.questions,
  });

  final String id;
  final DateTime date;
  final ExamConfig config;
  final int score;
  final int totalQuestions;
  final int correctAnswers;
  final int timeUsed;
  final List<int?> answers;
  final List<Question> questions;

  int get incorrectAnswers => (totalQuestions - correctAnswers).clamp(0, 9999);

  int get percentage =>
      totalQuestions == 0 ? 0 : ((correctAnswers / totalQuestions) * 100).round();

  bool get passed => percentage >= 60;

  bool isCorrectAt(int index) {
    if (index < 0 || index >= questions.length) return false;
    return answers.length > index && answers[index] == questions[index].correctAnswer;
  }

  List<int> get failedQuestionIds => [
        for (var i = 0; i < questions.length; i++)
          if (!isCorrectAt(i)) questions[i].id,
      ];

  Map<String, dynamic> toJson({bool compact = false}) => {
        'id': id,
        'date': date.toIso8601String(),
        'config': config.toJson(),
        'score': score,
        'totalQuestions': totalQuestions,
        'correctAnswers': correctAnswers,
        'timeUsed': timeUsed,
        if (!compact) 'answers': answers,
        if (!compact) 'questions': questions.map((q) => q.toJson()).toList(),
      };

  factory ExamResult.fromJson(Map<String, dynamic> json) {
    final rawQuestions = json['questions'];
    final questions = rawQuestions is List
        ? rawQuestions
            .whereType<Map>()
            .map((q) => Question.fromJson(Map<String, dynamic>.from(q)))
            .toList(growable: false)
        : <Question>[];

    return ExamResult(
      id: (json['id'] ?? '').toString(),
      date: DateTime.tryParse((json['date'] ?? '').toString()) ??
          DateTime.now(),
      config: json['config'] is Map
          ? ExamConfig.fromJson(Map<String, dynamic>.from(json['config'] as Map))
          : const ExamConfig(numQuestions: 0, categories: []),
      score: (json['score'] as num?)?.toInt() ?? 0,
      totalQuestions: (json['totalQuestions'] as num?)?.toInt() ?? 0,
      correctAnswers: (json['correctAnswers'] as num?)?.toInt() ?? 0,
      timeUsed: (json['timeUsed'] as num?)?.toInt() ?? 0,
      answers: json['answers'] is List
          ? (json['answers'] as List)
              .map((e) => e is num ? e.toInt() : null)
              .toList(growable: false)
          : const [],
      questions: questions,
    );
  }
}
