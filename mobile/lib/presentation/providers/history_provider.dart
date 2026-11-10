import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants.dart';
import '../../core/services/local_store.dart';
import '../../data/models/exam_result.dart';
import '../../data/repositories/history_repository.dart';

final historyProvider =
    NotifierProvider<HistoryNotifier, List<ExamResult>>(HistoryNotifier.new);

class HistoryNotifier extends Notifier<List<ExamResult>> {
  final HistoryRepository _repository = const HistoryRepository();

  @override
  List<ExamResult> build() {
    Future.microtask(_load);
    return const [];
  }

  Future<void> _load() async {
    try {
      state = await _repository.load();
    } catch (_) {
      state = const [];
    }
  }

  Future<void> reload() => _load();

  Future<void> add(ExamResult result) async {
    final updated = await _repository.add(result);
    state = updated;
  }

  Future<void> clear() async {
    await _repository.clear();
    state = const [];
  }
}

/// ID de preguntas falladas (para el modulo de reforzamiento).
final failedIdsProvider =
    NotifierProvider<FailedIdsNotifier, List<int>>(FailedIdsNotifier.new);

class FailedIdsNotifier extends Notifier<List<int>> {
  @override
  List<int> build() {
    Future.microtask(_load);
    return const [];
  }

  Future<void> _load() async {
    final raw = await LocalStore.readJsonList(AppConstants.keyFailedIds);
    state = raw.whereType<num>().map((e) => e.toInt()).toList();
  }

  Future<void> setIds(List<int> ids) async {
    state = List<int>.unmodifiable(ids);
    await LocalStore.writeJson(AppConstants.keyFailedIds, ids);
  }

  Future<void> clear() async {
    state = const [];
    await LocalStore.remove(AppConstants.keyFailedIds);
  }
}
