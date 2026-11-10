import 'package:flutter_test/flutter_test.dart';
import 'package:simulador_ascenso_pnp/core/constants.dart';
import 'package:simulador_ascenso_pnp/core/utils/category_utils.dart';
import 'package:simulador_ascenso_pnp/data/models/admin_entries.dart';
import 'package:simulador_ascenso_pnp/data/models/app_user.dart';
import 'package:simulador_ascenso_pnp/data/models/exam_config.dart';
import 'package:simulador_ascenso_pnp/data/models/exam_result.dart';
import 'package:simulador_ascenso_pnp/data/models/question.dart';
import 'package:simulador_ascenso_pnp/presentation/providers/admin_provider.dart';

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

  group('AdminState', () {
    AppUser user({
      required String id,
      required String nombre,
      required String apellido,
      required String username,
      DateTime? expiry,
      String status = 'active',
      String email = '',
      bool online = false,
      int? lastSeen,
    }) {
      return AppUser(
        id: id,
        username: username,
        nombre: nombre,
        apellido: apellido,
        email: email,
        role: 'user',
        status: status,
        createdAt: '2026-01-01T00:00:00.000Z',
        devices: const [],
        maxDevices: 1,
        audioEnabled: false,
        membershipExpiry: expiry,
        online: online,
        lastSeen: lastSeen,
      );
    }

    final now = DateTime.now();
    final users = [
      user(
        id: '1',
        nombre: 'Carlos',
        apellido: 'Zegarra',
        username: 'czegarra',
        expiry: now.add(const Duration(days: 10)),
        email: 'carlos@pnp.gob.pe',
      ),
      user(
        id: '2',
        nombre: 'Ana',
        apellido: 'Quispe',
        username: 'aquispe',
        expiry: now.subtract(const Duration(days: 2)),
      ),
      user(
        id: '3',
        nombre: 'Bruno',
        apellido: 'Mendoza',
        username: 'bmendoza',
      ),
    ];

    test('busca por nombre, apellido, usuario y email', () {
      final state = AdminState(users: users, search: 'quispe');
      expect(state.filteredUsers.map((u) => u.id), ['2']);

      expect(
        AdminState(users: users, search: 'pnp.gob').filteredUsers.single.id,
        '1',
      );
      expect(
        AdminState(users: users, search: 'BMEN').filteredUsers.single.id,
        '3',
      );
      expect(
        AdminState(users: users, search: 'carlos').filteredUsers.single.id,
        '1',
      );
    });

    test('filtra membresias activas, vencidas y sin fecha', () {
      expect(
        AdminState(users: users, filter: MembershipFilter.active)
            .filteredUsers
            .map((u) => u.id),
        ['1'],
      );
      expect(
        AdminState(users: users, filter: MembershipFilter.expired)
            .filteredUsers
            .map((u) => u.id),
        ['2'],
      );
      expect(
        AdminState(users: users, filter: MembershipFilter.none)
            .filteredUsers
            .map((u) => u.id),
        ['3'],
      );
      expect(
        AdminState(users: users, filter: MembershipFilter.all).filteredUsers,
        hasLength(3),
      );
    });

    test('ordena por nombre y por usuario en ambos sentidos', () {
      List<String> ids(UserSortOption sort) => AdminState(
            users: users,
            sort: sort,
          ).filteredUsers.map((u) => u.id).toList();

      expect(ids(UserSortOption.nameAsc), ['2', '3', '1']);
      expect(ids(UserSortOption.nameDesc), ['1', '3', '2']);
      expect(ids(UserSortOption.usernameAsc), ['2', '3', '1']);
      expect(ids(UserSortOption.usernameDesc), ['1', '3', '2']);
    });

    test('cuenta solo usuarios en linea con actividad reciente', () {
      final state = AdminState(
        users: [
          user(
            id: 'a',
            nombre: 'A',
            apellido: 'A',
            username: 'a',
            online: true,
            lastSeen: DateTime.now().millisecondsSinceEpoch,
          ),
          user(
            id: 'b',
            nombre: 'B',
            apellido: 'B',
            username: 'b',
            online: true,
            lastSeen: DateTime.now()
                .subtract(const Duration(minutes: 5))
                .millisecondsSinceEpoch,
          ),
          user(id: 'c', nombre: 'C', apellido: 'C', username: 'c'),
        ],
      );
      expect(state.onlineCount, 1);
      expect(state.isOnline(state.users.first), isTrue);
      expect(state.isOnline(state.users[1]), isFalse);
    });
  });

  group('ExamStatEntry', () {
    test('calcula el porcentaje y tolera datos incompletos', () {
      final entry = ExamStatEntry.fromMap('e1', {
        'userId': 'u1',
        'username': 'demo',
        'totalQuestions': 40,
        'correctAnswers': 30,
        'failedQuestionIds': [1, 2, 'x', 3],
        'date': '2026-02-01T10:00:00.000Z',
      });
      expect(entry.scorePercent, 75);
      expect(entry.failedQuestionIds, [1, 2, 3]);
      expect(entry.date, DateTime.utc(2026, 2, 1, 10));

      final empty = ExamStatEntry.fromMap('e2', const {});
      expect(empty.scorePercent, 0);
      expect(empty.failedQuestionIds, isEmpty);
      expect(empty.date, isNull);
    });
  });
}
