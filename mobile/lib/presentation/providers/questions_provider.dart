import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/question.dart';
import '../../data/repositories/question_repository.dart';

/// Banco completo de preguntas cargado desde `assets/questions.json`.
final questionsProvider = FutureProvider<List<Question>>((ref) async {
  return const QuestionRepository().load();
});
