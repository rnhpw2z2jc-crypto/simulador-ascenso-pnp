import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/paused_exam_repository.dart';

final pausedExamProvider =
    NotifierProvider<PausedExamNotifier, PausedExamData?>(
  PausedExamNotifier.new,
);

class PausedExamNotifier extends Notifier<PausedExamData?> {
  final PausedExamRepository _repository = const PausedExamRepository();

  @override
  PausedExamData? build() {
    Future.microtask(_load);
    return null;
  }

  Future<void> _load() async {
    try {
      state = await _repository.load();
    } catch (_) {
      state = null;
    }
  }

  Future<void> save(PausedExamData data) async {
    state = data;
    await _repository.save(data);
  }

  Future<void> clear() async {
    state = null;
    await _repository.clear();
  }
}
