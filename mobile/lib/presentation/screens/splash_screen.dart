import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../widgets/common.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PageScaffold(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppLogo(size: 96),
            SizedBox(height: 24),
            Text(
              'SIMULADOR PNP',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.4,
              ),
            ),
            SizedBox(height: 6),
            Text(
              'Examen de Ascenso',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.textSecondary,
                letterSpacing: 0.6,
              ),
            ),
            SizedBox(height: 32),
            SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(strokeWidth: 2.6),
            ),
          ],
        ),
      ),
    );
  }
}
