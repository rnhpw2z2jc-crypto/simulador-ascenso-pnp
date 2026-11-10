import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants.dart';
import '../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../widgets/brand_signature.dart';
import '../widgets/common.dart';

/// Login replicado de `components/LoginPage.tsx`:
/// cabecera centrada, tarjeta `glass` y motion de entrada de framer-motion.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showPassword = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    await ref.read(authProvider.notifier).login(
          _usernameController.text,
          _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final error = auth.error;

    return PageScaffold(
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 24, 18, 24),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - 48,
              ),
              child: Center(
                child: SizedBox(
                  width: 448,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FadeSlideIn(
                        offsetY: -20,
                        duration: AppMotion.slow,
                        child: Column(
                          children: [
                            const AppLogo(size: 80),
                            const SizedBox(height: 16),
                            Text.rich(
                              TextSpan(
                                text: 'SIMULADOR ',
                                style: const TextStyle(
                                  fontSize: 30,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                  letterSpacing: 0.2,
                                ),
                                children: const [
                                  TextSpan(
                                    text: 'PNP',
                                    style: TextStyle(color: AppColors.gold),
                                  ),
                                ],
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Examen de Ascenso · Policía Nacional del Perú',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13.5,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 30),
                      FadeSlideIn(
                        offsetY: 20,
                        delay: const Duration(milliseconds: 90),
                        child: GlassCard(
                          radius: 16,
                          padding: const EdgeInsets.fromLTRB(24, 26, 24, 26),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.lock_rounded,
                                        size: 20, color: AppColors.gold),
                                    SizedBox(width: 8),
                                    Text(
                                      'Iniciar Sesión',
                                      style: TextStyle(
                                        fontSize: 19,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 22),
                                if (error != null && error.isNotEmpty) ...[
                                  ErrorBanner(
                                    error,
                                    icon: Icons.error_outline_rounded,
                                  ),
                                  const SizedBox(height: 14),
                                ],
                                if (auth.attemptsLeft != null &&
                                    auth.attemptsLeft! > 0 &&
                                    auth.attemptsLeft! <
                                        AppConstants.maxLoginAttempts) ...[
                                  _AttemptBars(
                                    attemptsLeft: auth.attemptsLeft!,
                                  ),
                                  const SizedBox(height: 14),
                                ],
                                _PwaField(
                                  label: 'Usuario',
                                  hint: 'Ingrese su usuario',
                                  icon: Icons.person_outline_rounded,
                                  controller: _usernameController,
                                  textInputAction: TextInputAction.next,
                                  autocorrect: false,
                                  enableSuggestions: false,
                                  validator: (value) {
                                    final text = value?.trim() ?? '';
                                    if (text.isEmpty) return 'Ingresa tu usuario';
                                    if (text.length < 3) {
                                      return 'Mínimo 3 caracteres';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 16),
                                _PwaField(
                                  label: 'Contraseña',
                                  hint: 'Ingrese su contraseña',
                                  icon: Icons.lock_outline_rounded,
                                  controller: _passwordController,
                                  obscureText: !_showPassword,
                                  textInputAction: TextInputAction.done,
                                  onFieldSubmitted: (_) => _submit(),
                                  trailing: IconButton(
                                    onPressed: () => setState(
                                      () => _showPassword = !_showPassword,
                                    ),
                                    tooltip: _showPassword
                                        ? 'Ocultar contraseña'
                                        : 'Mostrar contraseña',
                                    icon: Icon(
                                      _showPassword
                                          ? Icons.visibility_off_rounded
                                          : Icons.visibility_rounded,
                                      size: 20,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Ingresa tu contraseña';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 22),
                                _LoginButton(
                                  loading: auth.submitting,
                                  onPressed: _submit,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      FadeSlideIn(
                        offsetY: 8,
                        delay: const Duration(milliseconds: 160),
                        child: Column(
                          children: [
                            const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.phonelink_lock_rounded,
                                    size: 13, color: AppColors.textMuted),
                                SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    'El dispositivo se vincula a tu cuenta '
                                    'según el límite autorizado.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: AppColors.textMuted,
                                      height: 1.35,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const ZenakuSignature(compact: true),
                            const SizedBox(height: 4),
                            Text(
                              'v${AppConstants.appVersion}',
                              style: const TextStyle(
                                fontSize: 9.5,
                                color: AppColors.slate600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Campo con etiqueta sobre el input, igual que la PWA
/// (`label block text-sm text-slate-300` + `input bg-navy-800`).
class _PwaField extends StatelessWidget {
  const _PwaField({
    required this.label,
    required this.hint,
    required this.icon,
    required this.controller,
    this.obscureText = false,
    this.textInputAction,
    this.autocorrect = true,
    this.enableSuggestions = true,
    this.onFieldSubmitted,
    this.trailing,
    this.validator,
  });

  final String label;
  final String hint;
  final IconData icon;
  final TextEditingController controller;
  final bool obscureText;
  final TextInputAction? textInputAction;
  final bool autocorrect;
  final bool enableSuggestions;
  final ValueChanged<String>? onFieldSubmitted;
  final Widget? trailing;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: Color(0xFFCBD5E1),
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          obscureText: obscureText,
          textInputAction: textInputAction,
          autocorrect: autocorrect,
          enableSuggestions: enableSuggestions,
          onFieldSubmitted: onFieldSubmitted,
          validator: validator,
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.textPrimary,
          ),
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, size: 19, color: AppColors.textSecondary),
            prefixIconConstraints: const BoxConstraints(
              minWidth: 42,
              minHeight: 20,
            ),
            suffixIcon: trailing,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 15),
          ),
        ),
      ],
    );
  }
}

/// Tres barras de intentos restantes (`bg-warning` / `bg-danger`).
class _AttemptBars extends StatelessWidget {
  const _AttemptBars({required this.attemptsLeft});

  final int attemptsLeft;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(
        AppConstants.maxLoginAttempts,
        (index) => Expanded(
          child: AnimatedContainer(
            duration: AppMotion.fast,
            height: 6,
            margin: EdgeInsets.only(
              right: index == AppConstants.maxLoginAttempts - 1 ? 0 : 8,
            ),
            decoration: BoxDecoration(
              color: index < attemptsLeft
                  ? AppColors.warning
                  : AppColors.danger,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoginButton extends StatelessWidget {
  const _LoginButton({required this.loading, required this.onPressed});

  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: AppMotion.normal,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        boxShadow: loading
            ? null
            : [
                BoxShadow(
                  color: AppColors.tacticalBlue.withValues(alpha: 0.4),
                  blurRadius: 20,
                  spreadRadius: 0,
                ),
              ],
      ),
      child: FilledButton(
        onPressed: loading ? null : onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          backgroundColor: AppColors.tacticalBlue,
        ),
        child: AnimatedSwitcher(
          duration: AppMotion.fast,
          child: loading
              ? const Row(
                  key: ValueKey('loading'),
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(width: 10),
                    Text('Ingresando...'),
                  ],
                )
              : const Row(
                  key: ValueKey('idle'),
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    RotatedBox(
                      quarterTurns: 2,
                      child: Icon(Icons.logout_rounded, size: 19),
                    ),
                    SizedBox(width: 8),
                    Text('Iniciar Sesión'),
                  ],
                ),
        ),
      ),
    );
  }
}
