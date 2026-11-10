import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants.dart';
import '../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../widgets/common.dart';

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
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(22, 40, 22, 26),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Center(child: AppLogo(size: 92)),
            const SizedBox(height: 22),
            const Text(
              'SIMULADOR PNP',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 27,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.6,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Examen de Ascenso · Policía Nacional del Perú',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            AppCard(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.lock_rounded,
                            size: 19, color: AppColors.gold),
                        SizedBox(width: 8),
                        Text(
                          'Iniciar sesión',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    if (error != null && error.isNotEmpty) ...[
                      ErrorBanner(error),
                      const SizedBox(height: 14),
                    ],
                    if (auth.attemptsLeft != null &&
                        auth.attemptsLeft! > 0 &&
                        auth.attemptsLeft! < AppConstants.maxLoginAttempts) ...[
                      Row(
                        children: List.generate(
                          AppConstants.maxLoginAttempts,
                          (index) => Expanded(
                            child: Container(
                              height: 5,
                              margin: EdgeInsets.only(
                                right: index == AppConstants.maxLoginAttempts - 1
                                    ? 0
                                    : 5,
                              ),
                              decoration: BoxDecoration(
                                color: index < auth.attemptsLeft!
                                    ? AppColors.warning
                                    : AppColors.danger,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${auth.attemptsLeft} intento'
                        '${auth.attemptsLeft != 1 ? 's' : ''} restante'
                        '${auth.attemptsLeft != 1 ? 's' : ''}',
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: AppColors.warning,
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                    TextFormField(
                      controller: _usernameController,
                      textInputAction: TextInputAction.next,
                      autocorrect: false,
                      enableSuggestions: false,
                      decoration: const InputDecoration(
                        labelText: 'Usuario',
                        hintText: 'Ingrese su usuario',
                        prefixIcon: Icon(Icons.person_outline_rounded),
                      ),
                      validator: (value) {
                        final text = value?.trim() ?? '';
                        if (text.isEmpty) return 'Ingresa tu usuario';
                        if (text.length < 3) {
                          return 'Mínimo 3 caracteres';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: !_showPassword,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: 'Contraseña',
                        hintText: 'Ingrese su contraseña',
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          onPressed: () => setState(
                            () => _showPassword = !_showPassword,
                          ),
                          icon: Icon(
                            _showPassword
                                ? Icons.visibility_off_rounded
                                : Icons.visibility_rounded,
                            size: 20,
                          ),
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
                    FilledButton(
                      onPressed: auth.submitting ? null : _submit,
                      child: auth.submitting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.login_rounded, size: 19),
                                SizedBox(width: 8),
                                Text('INICIAR SESIÓN'),
                              ],
                            ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const _LoginFooter(),
          ],
        ),
      ),
    );
  }
}

class _LoginFooter extends StatelessWidget {
  const _LoginFooter();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.55),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: const Row(
            children: [
              Icon(Icons.phonelink_lock_rounded,
                  size: 17, color: AppColors.textMuted),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Este dispositivo se vincula automáticamente a tu cuenta '
                  'según el límite autorizado por el administrador.',
                  style: TextStyle(
                    fontSize: 10.5,
                    color: AppColors.textMuted,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'v${AppConstants.appVersion} · Firebase ${AppConstants.firebaseProjectId}',
          style: const TextStyle(
            fontSize: 10,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }
}
