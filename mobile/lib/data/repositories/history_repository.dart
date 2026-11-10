import '../../core/constants.dart';
import '../../core/services/local_store.dart';
import '../models/exam_result.dart';

/// Historial local de examenes (maximo 40, igual que la PWA).
///
/// Se guarda una version compacta (sin preguntas ni respuestas) porque la
/// pantalla de historial solo necesita el resumen. El detalle completo vive
/// en memoria en la pantalla de resultados.
class HistoryRepository {
  const HistoryRepository();

  Future<List<ExamResult>> load() async {
    final raw = await LocalStore.readJsonList(AppConstants.keyHistory);
    final results = <ExamResult>[];
    for (final item in raw) {
      if (item is Map) {
        results.add(ExamResult.fromJson(Map<String, dynamic>.from(item)));
      }
    }
    results.sort((a, b) => a.date.compareTo(b.date));
    return results;
  }

  Future<List<ExamResult>> add(ExamResult result) async {
    final results = await load();
    results.add(result);

    final kept = results.length > AppConstants.maxHistoryEntries
        ? results.sublist(results.length - AppConstants.maxHistoryEntries)
        : results;

    await LocalStore.writeJson(
      AppConstants.keyHistory,
      kept.map((r) => r.toJson(compact: true)).toList(),
    );
    return kept;
  }

  Future<void> clear() => LocalStore.remove(AppConstants.keyHistory);
}
