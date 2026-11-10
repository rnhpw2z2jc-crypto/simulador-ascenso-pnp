/// Estado mutable de un examen en curso.
class ExamState {
  const ExamState({
    required this.currentQuestion,
    required this.answers,
    required this.bookmarks,
    required this.timeRemaining,
    required this.startTime,
    this.isFinished = false,
    this.isPaused = false,
  });

  final int currentQuestion;
  final List<int?> answers;
  final List<bool> bookmarks;
  final int timeRemaining;

  /// Marca de tiempo (ms) del inicio real del examen.
  final int startTime;
  final bool isFinished;
  final bool isPaused;

  int get answeredCount => answers.where((a) => a != null).length;

  int get bookmarkedCount => bookmarks.where((b) => b).length;

  int get timeUsedSeconds =>
      ((DateTime.now().millisecondsSinceEpoch - startTime) / 1000).floor();

  ExamState copyWith({
    int? currentQuestion,
    List<int?>? answers,
    List<bool>? bookmarks,
    int? timeRemaining,
    int? startTime,
    bool? isFinished,
    bool? isPaused,
  }) {
    return ExamState(
      currentQuestion: currentQuestion ?? this.currentQuestion,
      answers: answers ?? this.answers,
      bookmarks: bookmarks ?? this.bookmarks,
      timeRemaining: timeRemaining ?? this.timeRemaining,
      startTime: startTime ?? this.startTime,
      isFinished: isFinished ?? this.isFinished,
      isPaused: isPaused ?? this.isPaused,
    );
  }

  Map<String, dynamic> toJson() => {
        'currentQuestion': currentQuestion,
        'answers': answers,
        'bookmarks': bookmarks,
        'timeRemaining': timeRemaining,
        'startTime': startTime,
        'isFinished': isFinished,
        'isPaused': isPaused,
      };

  factory ExamState.fromJson(Map<String, dynamic> json) {
    final answers = <int?>[];
    if (json['answers'] is List) {
      for (final value in json['answers'] as List) {
        answers.add(value is num ? value.toInt() : null);
      }
    }
    final bookmarks = <bool>[];
    if (json['bookmarks'] is List) {
      for (final value in json['bookmarks'] as List) {
        bookmarks.add(value == true);
      }
    }
    return ExamState(
      currentQuestion: (json['currentQuestion'] as num?)?.toInt() ?? 0,
      answers: answers,
      bookmarks: bookmarks,
      timeRemaining: (json['timeRemaining'] as num?)?.toInt() ?? 0,
      startTime: (json['startTime'] as num?)?.toInt() ??
          DateTime.now().millisecondsSinceEpoch,
      isFinished: json['isFinished'] == true,
      isPaused: json['isPaused'] == true,
    );
  }
}
