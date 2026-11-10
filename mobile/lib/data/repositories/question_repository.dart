import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../../data/models/question.dart';

/// Carga el banco de preguntas incluido como asset.
///
/// Se usa el mismo `questions.json` de la PWA (`public/questions.json`).
/// El parseo corre en un isolate para no congelar la UI.
class QuestionRepository {
  const QuestionRepository();

  static const String _assetPath = 'assets/questions.json';

  Future<List<Question>> load() async {
    final raw = await rootBundle.loadString(_assetPath);
    return compute(parseQuestions, raw);
  }
}

/// Funcion top-level requerida por `compute`.
List<Question> parseQuestions(String rawJson) {
  final decoded = jsonDecode(rawJson);
  if (decoded is! List) return [];
  final questions = <Question>[];
  for (final item in decoded) {
    if (item is Map) {
      questions.add(Question.fromJson(Map<String, dynamic>.from(item)));
    }
  }
  return questions;
}
