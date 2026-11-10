/// Configuracion elegida para un simulacro.
class ExamConfig {
  const ExamConfig({
    required this.numQuestions,
    required this.categories,
  });

  /// Cantidad solicitada. `0` significa "todas las disponibles".
  final int numQuestions;
  final List<String> categories;

  Map<String, dynamic> toJson() => {
        'numQuestions': numQuestions,
        'categories': categories,
      };

  factory ExamConfig.fromJson(Map<String, dynamic> json) => ExamConfig(
        numQuestions: (json['numQuestions'] as num?)?.toInt() ?? 0,
        categories: (json['categories'] as List?)
                ?.map((e) => e.toString())
                .toList() ??
            const [],
      );
}
