import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants.dart';
import '../../data/models/exam_config.dart';
import '../../data/models/exam_result.dart';
import '../../data/models/exam_session.dart';
import '../../data/models/exam_state.dart';
import '../../data/models/question.dart';
import '../../data/repositories/paused_exam_repository.dart';
import '../../data/repositories/user_repository.dart';
import 'auth_provider.dart';
import 'history_provider.dart';
import 'paused_exam_provider.dart';

class ExamFlowState {
  const ExamFlowState({
    this.session,
    this.lastResult,
    this.pendingConfig,
    this.isStarting = false,
  });

  final ExamSession? session;
  final ExamResult? lastResult;
  final ExamConfig? pendingConfig;
  final bool isStarting;

  bool get isPaused => session?.state.isPaused ?? false;

  bool get hasActiveSession => session != null;

  ExamFlowState copyWith({
    ExamSession? session,
    bool clearSession = false,
    ExamResult? lastResult,
    bool clearResult = false,
    ExamConfig? pendingConfig,
    bool clearPending = false,
    bool? isStarting,
  }) {
    return ExamFlowState(
      session: clearSession ? null : (session ?? this.session),
      lastResult: clearResult ? null : (lastResult ?? this.lastResult),
      pendingConfig: clearPending ? null : (pendingConfig ?? this.pendingConfig),
      isStarting: isStarting ?? this.isStarting,
    );
  }
}

final examFlowProvider =
    NotifierProvider<ExamFlowNotifier, ExamFlowState>(ExamFlowNotifier.new);

class ExamFlowNotifier extends Notifier<ExamFlowState> {
  final UserRepository _users = const UserRepository();
  final Random _random = Random();
  Timer? _timer;

  @override
  ExamFlowState build() {
    ref.onDispose(() {
      _timer?.cancel();
    });
    return const ExamFlowState();
  }

  // ---------------------------------------------------------------------------
  // Preparacion
  // ---------------------------------------------------------------------------

  void setPendingConfig(ExamConfig config) {
    state = state.copyWith(pendingConfig: config, isStarting: false);
  }

  /// Crea el examen a partir de la configuracion pendiente.
  Future<bool> startPendingExam(List<Question> allQuestions) async {
    final config = state.pendingConfig;
    if (config == null) return false;

    state = state.copyWith(isStarting: true);
    try {
      var pool = allQuestions
          .where((q) =>
              config.categories.isEmpty ||
              config.categories.contains(q.category))
          .toList();
      if (pool.isEmpty) {
        state = state.copyWith(isStarting: false);
        return false;
      }

      pool.shuffle(_random);
      final requested =
          config.numQuestions <= 0 ? pool.length : config.numQuestions;
      final selected = pool.take(min(requested, pool.length)).toList();

      final timeLimit = AppConstants.examTimeLimitFor(selected.length);
      await _begin(
        questions: selected,
        config: config,
        timeLimit: timeLimit,
        mode: 'simulacro',
      );
      return true;
    } finally {
      state = state.copyWith(isStarting: false);
    }
  }

  /// Reforzamiento con las preguntas falladas.
  Future<bool> startReinforcement(
    List<Question> allQuestions,
    List<int> failedIds,
  ) async {
    if (failedIds.isEmpty) return false;
    final ids = failedIds.toSet();
    final questions = allQuestions.where((q) => ids.contains(q.id)).toList();
    if (questions.isEmpty) return false;

    questions.shuffle(_random);
    final timeLimit = (questions.length * 1.5).ceil() * 60;
    await _begin(
      questions: questions,
      config: ExamConfig(
        numQuestions: questions.length,
        categories: const [],
      ),
      timeLimit: timeLimit,
      mode: 'refuerzo',
    );
    return true;
  }

  Future<void> _begin({
    required List<Question> questions,
    required ExamConfig config,
    required int timeLimit,
    required String mode,
  }) async {
    _timer?.cancel();
    await ref.read(pausedExamProvider.notifier).clear();

    final examState = ExamState(
      currentQuestion: 0,
      answers: List<int?>.filled(questions.length, null),
      bookmarks: List<bool>.filled(questions.length, false),
      timeRemaining: timeLimit,
      startTime: DateTime.now().millisecondsSinceEpoch,
    );

    state = ExamFlowState(
      session: ExamSession(
        questions: questions,
        state: examState,
        config: config,
        mode: mode,
        timeLimit: timeLimit,
      ),
    );
    _startTimer();
  }

  // ---------------------------------------------------------------------------
  // Interaccion durante el examen
  // ---------------------------------------------------------------------------

  void answer(int optionIndex) {
    final session = state.session;
    if (session == null || session.state.isFinished) return;
    final answers = List<int?>.from(session.state.answers);
    answers[session.state.currentQuestion] = optionIndex;
    _updateState(session.state.copyWith(answers: answers));
  }

  void toggleBookmark() {
    final session = state.session;
    if (session == null || session.state.isFinished) return;
    final bookmarks = List<bool>.from(session.state.bookmarks);
    final index = session.state.currentQuestion;
    bookmarks[index] = !bookmarks[index];
    _updateState(session.state.copyWith(bookmarks: bookmarks));
  }

  void goTo(int index) {
    final session = state.session;
    if (session == null) return;
    final safe = index.clamp(0, session.questions.length - 1);
    _updateState(session.state.copyWith(currentQuestion: safe));
  }

  void next() {
    final session = state.session;
    if (session == null) return;
    goTo(session.state.currentQuestion + 1);
  }

  void previous() {
    final session = state.session;
    if (session == null) return;
    goTo(session.state.currentQuestion - 1);
  }

  void pause() {
    final session = state.session;
    if (session == null || session.state.isFinished) return;
    _updateState(session.state.copyWith(isPaused: true));
  }

  void resume() {
    final session = state.session;
    if (session == null || session.state.isFinished) return;
    _updateState(session.state.copyWith(isPaused: false));
  }

  void _updateState(ExamState nextState) {
    final session = state.session;
    if (session == null) return;
    state = state.copyWith(session: session.copyWith(state: nextState));
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      final session = state.session;
      if (session == null ||
          session.state.isFinished ||
          session.state.isPaused) {
        return;
      }
      final remaining = session.state.timeRemaining - 1;
      if (remaining < 0) return;
      _updateState(session.state.copyWith(timeRemaining: remaining));
    });
  }

  // ---------------------------------------------------------------------------
  // Finalizacion
  // ---------------------------------------------------------------------------

  Future<ExamResult?> finish() async {
    final session = state.session;
    if (session == null) return state.lastResult;
    if (session.state.isFinished && state.lastResult != null) {
      return state.lastResult;
    }

    _timer?.cancel();

    var correct = 0;
    for (var i = 0; i < session.questions.length; i++) {
      if (i < session.state.answers.length &&
          session.state.answers[i] == session.questions[i].correctAnswer) {
        correct++;
      }
    }

    final result = ExamResult(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      date: DateTime.now(),
      config: session.config,
      score: correct,
      totalQuestions: session.questions.length,
      correctAnswers: correct,
      timeUsed: session.state.timeUsedSeconds,
      answers: List<int?>.from(session.state.answers),
      questions: session.questions,
    );

    state = state.copyWith(
      session: session.copyWith(
        state: session.state.copyWith(isFinished: true, isPaused: false),
      ),
      lastResult: result,
      clearPending: true,
    );

    final user = ref.read(authProvider).user;
    if (user != null) {
      unawaited(
        _users
            .saveExamStat(
              userId: user.id,
              username: user.username,
              totalQuestions: result.totalQuestions,
              correctAnswers: result.correctAnswers,
              failedQuestionIds: result.failedQuestionIds,
            )
            .catchError((_) {}),
      );
    }

    try {
      await ref.read(historyProvider.notifier).add(result);
    } catch (_) {}
    try {
      await ref.read(failedIdsProvider.notifier).setIds(
            result.failedQuestionIds,
          );
    } catch (_) {}
    try {
      await ref.read(pausedExamProvider.notifier).clear();
    } catch (_) {}

    return result;
  }

  /// "Guardar y salir": conserva el examen para retomarlo luego.
  Future<void> saveAndExit() async {
    final session = state.session;
    if (session == null) return;
    _timer?.cancel();

    final paused = PausedExamData(
      state: session.state.copyWith(isPaused: true),
      questions: session.questions,
      config: session.config,
      mode: session.mode,
      timeLimit: session.timeLimit,
    );

    await ref.read(pausedExamProvider.notifier).save(paused);
    state = state.copyWith(clearSession: true, clearResult: true);
  }

  void resumeFromPaused(PausedExamData data) {
    _timer?.cancel();
    state = ExamFlowState(
      session: ExamSession(
        questions: data.questions,
        state: data.state.copyWith(isPaused: false),
        config: data.config,
        mode: data.mode,
        timeLimit: data.timeLimit,
      ),
    );
    _startTimer();
    unawaited(ref.read(pausedExamProvider.notifier).clear());
  }

  void clearResult() {
    state = state.copyWith(clearResult: true);
  }
}
