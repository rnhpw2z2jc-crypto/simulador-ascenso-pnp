import 'package:flutter_test/flutter_test.dart';
import 'package:simulador_ascenso_pnp/core/constants.dart';
import 'package:simulador_ascenso_pnp/core/utils/category_utils.dart';
import 'package:simulador_ascenso_pnp/data/models/app_user.dart';
import 'package:simulador_ascenso_pnp/data/models/exam_config.dart';
import 'package:simulador_ascenso_pnp/data/models/exam_result.dart';
import 'package:simulador_ascenso_pnp/data/models/question.dart';

void main() {
  group('AppConstants.examTimeLimitFor', () {
    test('usa los limites fijos de la PWA', () {
      expect(AppConstants.examTimeLimitFor(10), 900);
      expect(AppConstants.examTimeLimitFor(50), 4500);
      expect(AppConstants.examTimeLimitFor(100), 9000);
    });

    test('usa 1.5 minutos por pregunta en otros tamanos', () {
      expect(AppConstants.examTimeLimitFor(20), 1800);
      expect(AppConstants.examTimeLimitFor(7), 660);
    });
  });

  group('ExamResult', () {
    Question question(int id, int correct) => Question(
          id: id,
          question: 'Pregunta $id',
          options: const ['A', 'B', 'C', 'D'],
          correctAnswer: correct,
          category: 'CONSTITUCION',
          explanation: 'Explicacion',
        );

    ExamResult build({required List<int?> answers}) {
      final questions = [
        question(1, 0),
        question(2, 1),
        question(3, 2),
        question(4, 3),
      ];
      var correct = 0;
      for (var i = 0; i < questions.length; i++) {
        if (i < answers.length && answers[i] == questions[i].correctAnswer) {
          correct++;
        }
      }
      return ExamResult(
        id: '1',
        date: DateTime(2026, 1, 1),
        config: const ExamConfig(numQuestions: 4, categories: ['mixed']),
        score: correct,
        totalQuestions: questions.length,
        correctAnswers: correct,
        timeUsed: 120,
        answers: answers,
        questions: questions,
      );
    }

    test('calcula porcentaje y aprobacion al 60%', () {
      final result = build(answers: [0, 1, null, null]);
      expect(result.percentage, 50);
      expect(result.passed, isFalse);
    });

    test('detecta respuestas correctas e ids fallados', () {
      final result = build(answers: [0, 3, 2, null]);
      expect(result.isCorrectAt(0), isTrue);
      expect(result.isCorrectAt(1), isFalse);
      expect(result.failedQuestionIds, [2, 4]);
    });
  });

  group('AppUser.fromMap', () {
    test('normaliza devices y maxDevices', () {
      final user = AppUser.fromMap('u1', {
        'username': 'demo',
        'nombre': 'Ana',
        'apellido': 'Perez',
        'role': 'user',
        'status': 'active',
        'devices': ['dev_a', 'dev_b', 'dev_c'],
        'maxDevices': 5,
      });
      expect(user.devices, ['dev_a', 'dev_b']);
      expect(user.maxDevices, 2);
      expect(user.fullName, 'Ana Perez');
    });

    test('migra cuentas antiguas con deviceId/deviceLocked', () {
      final user = AppUser.fromMap('u2', {
        'username': 'legacy',
        'deviceId': 'dev_old',
        'deviceLocked': true,
        'maxDevices': 1,
      });
      expect(user.devices, ['dev_old']);
      expect(user.maxDevices, 1);
    });
  });

  group('category utils', () {
    test('mapea nombres largos a claves y etiquetas', () {
      expect(categoryKey('DECLARACIÓN UNIVERSAL DE LOS DERECHOS HUMANOS'), 'DDHH');
      expect(categoryDisplayName('DDHH'), 'Derechos Humanos');
    });
  });
}
