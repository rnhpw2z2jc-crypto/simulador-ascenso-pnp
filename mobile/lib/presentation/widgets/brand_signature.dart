import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../core/theme/app_theme.dart';

/// Emblema oficial de Zenaku Tech (recorte del logo institucional).
///
/// Se muestra como una insignia pequena, con el mismo lenguaje visual
/// oscuro de la app, para no competir con la identidad de la PNP.
class ZenakuMark extends StatelessWidget {
  const ZenakuMark({super.key, this.size = 56, this.radius = 14});

  final double size;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: AppColors.brandCyan.withValues(alpha: 0.35),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.brandCyan.withValues(alpha: 0.15),
            blurRadius: 18,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Image.asset(
        AppConstants.brandingAsset,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.medium,
      ),
    );
  }
}

/// Firma discreta de autoria:
/// "Desarrollado por DiverZenaku · Zenaku Tech".
class ZenakuSignature extends StatelessWidget {
  const ZenakuSignature({
    super.key,
    this.compact = false,
    this.showDeveloper = true,
    this.alignment = MainAxisAlignment.center,
  });

  final bool compact;
  final bool showDeveloper;
  final MainAxisAlignment alignment;

  @override
  Widget build(BuildContext context) {
    final fontSize = compact ? 9.5 : 10.5;
    final labelStyle = TextStyle(
      fontSize: fontSize,
      color: AppColors.textMuted,
      letterSpacing: 0.15,
    );

    return Row(
      mainAxisSize: MainAxisSize.max,
      mainAxisAlignment: alignment,
      children: [
        _ZenakuMonogram(size: compact ? 14 : 16),
        const SizedBox(width: 6),
        Flexible(
          child: Text.rich(
            TextSpan(
              style: labelStyle,
              children: [
                if (showDeveloper) ...[
                  const TextSpan(text: 'Desarrollado por '),
                  TextSpan(
                    text: AppConstants.developerName,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  TextSpan(
                    text: '  ·  ',
                    style: TextStyle(
                      color: AppColors.textMuted.withValues(alpha: 0.7),
                    ),
                  ),
                ],
                TextSpan(
                  text: AppConstants.companyName,
                  style: const TextStyle(
                    color: AppColors.brandCyan,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

/// Monograma "Z" de la marca, dibujado para mantener la firma nitida
/// a tamanos muy pequenos.
class _ZenakuMonogram extends StatelessWidget {
  const _ZenakuMonogram({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.brandCyan, AppColors.tacticalBlue],
        ),
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: [
          BoxShadow(
            color: AppColors.brandCyan.withValues(alpha: 0.35),
            blurRadius: 6,
          ),
        ],
      ),
      child: Text(
        'Z',
        style: TextStyle(
          fontSize: size * 0.68,
          height: 1.05,
          fontWeight: FontWeight.w800,
          color: AppColors.navy900,
        ),
      ),
    );
  }
}

/// Tarjeta "Acerca de" usada en el perfil.
class ZenakuAboutCard extends StatelessWidget {
  const ZenakuAboutCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.navy800.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Row(
            children: [
              Icon(Icons.verified_outlined, size: 15, color: AppColors.brandCyan),
              SizedBox(width: 7),
              Text(
                'ACERCA DE',
                style: TextStyle(
                  fontSize: 11,
                  letterSpacing: 0.9,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const ZenakuMark(size: 52, radius: 12),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      AppConstants.companyName,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      AppConstants.companyTagline,
                      style: const TextStyle(
                        fontSize: 9.5,
                        color: AppColors.textMuted,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(height: 1, color: AppColors.navy700),
          const SizedBox(height: 10),
          ZenakuSignature(
            alignment: MainAxisAlignment.start,
            showDeveloper: true,
          ),
          const SizedBox(height: 4),
          Text(
            '${AppConstants.appName} · v${AppConstants.appVersion}',
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.slate600,
            ),
          ),
        ],
      ),
    );
  }
}
