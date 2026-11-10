import 'package:flutter_tts/flutter_tts.dart';

/// Servicio de voz (equivalente a `lib/useSpeech.ts` de la PWA).
///
/// Usa la voz es-MX del sistema, con velocidad ajustable 0.5x / 0.8x / 1x.
class SpeechService {
  SpeechService() : _tts = FlutterTts();

  final FlutterTts _tts;
  bool _initialized = false;
  double _speed = 1.0;

  static final Map<double, double> _rateBySpeed = {
    0.5: 0.25,
    0.8: 0.40,
    1.0: 0.50,
  };

  Future<void> _ensureInitialized() async {
    if (_initialized) return;
    try {
      await _tts.setLanguage('es-MX');
    } catch (_) {
      try {
        await _tts.setLanguage('es-ES');
      } catch (_) {}
    }
    try {
      await _tts.awaitSpeakCompletion(true);
    } catch (_) {}
    try {
      await _tts.setPitch(1.0);
    } catch (_) {}
    try {
      await _tts.setSpeechRate(_rateBySpeed[_speed] ?? 0.5);
    } catch (_) {}
    _selectBestVoice();
    _initialized = true;
  }

  Future<void> _selectBestVoice() async {
    try {
      final voices = await _tts.getVoices;
      if (voices is! List) return;
      Map<String, String>? best;
      var bestScore = -1;
      for (final raw in voices) {
        if (raw is! Map) continue;
        final locale = (raw['locale'] ?? '').toString().toLowerCase();
        if (!locale.startsWith('es')) continue;
        final name = (raw['name'] ?? '').toString().toLowerCase();
        var score = locale.startsWith('es-mx') ? 10 : 0;
        if (name.contains('female') ||
            name.contains('mujer') ||
            name.contains('helena') ||
            name.contains('sabina') ||
            name.contains('paulina') ||
            name.contains('esperanza')) {
          score += 4;
        }
        if (score > bestScore) {
          bestScore = score;
          best = {
            'name': (raw['name'] ?? '').toString(),
            'locale': (raw['locale'] ?? '').toString(),
          };
        }
      }
      if (best != null && best['name']!.isNotEmpty) {
        await _tts.setVoice(best);
      }
    } catch (_) {
      // Sin catalogo de voces: se usa la voz por defecto del sistema.
    }
  }

  Future<void> setSpeed(double speed) async {
    _speed = speed;
    await _ensureInitialized();
    try {
      await _tts.setSpeechRate(_rateBySpeed[speed] ?? 0.5);
    } catch (_) {}
  }

  Future<void> speak(String text) async {
    await _ensureInitialized();
    final clean = _cleanText(text);
    if (clean.isEmpty) return;
    try {
      await _tts.stop();
      await _tts.speak(clean);
    } catch (_) {}
  }

  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (_) {}
  }

  Future<void> pause() async {
    try {
      await _tts.pause();
    } catch (_) {}
  }

  String _cleanText(String text) {
    return text
        .replaceAll(RegExp(r'<[^>]*>'), ' ')
        .replaceAll(RegExp(r'[#*_`]'), '')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  Future<void> dispose() async {
    await stop();
  }
}
