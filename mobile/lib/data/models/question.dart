/// Pregunta del banco (`public/questions.json` de la PWA).
class Question {
  const Question({
    required this.id,
    required this.question,
    required this.options,
    required this.correctAnswer,
    required this.category,
    required this.explanation,
    this.legalBasis,
  });

  final int id;
  final String question;
  final List<String> options;

  /// Indice base 0 de la respuesta correcta.
  final int correctAnswer;
  final String category;
  final String explanation;
  final String? legalBasis;

  factory Question.fromJson(Map<String, dynamic> json) {
    final rawOptions = json['options'];
    return Question(
      id: (json['id'] as num?)?.toInt() ?? 0,
      question: (json['question'] ?? '').toString(),
      options: rawOptions is List
          ? rawOptions.map((e) => e.toString()).toList(growable: false)
          : const [],
      correctAnswer: (json['correctAnswer'] as num?)?.toInt() ?? 0,
      category: (json['category'] ?? '').toString(),
      explanation: (json['explanation'] ?? '').toString(),
      legalBasis: json['legalBasis']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'question': question,
        'options': options,
        'correctAnswer': correctAnswer,
        'category': category,
        'explanation': explanation,
        if (legalBasis != null) 'legalBasis': legalBasis,
      };
}
