import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/services/password_service.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/app_user.dart';
import '../../data/repositories/user_repository.dart';
import '../providers/auth_provider.dart';
import '../providers/history_provider.dart';
import '../widgets/common.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _users = const UserRepository();

  final _nombreController = TextEditingController();
  final _apellidoController = TextEditingController();
  final _emailController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  final _profileFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();

  int _tab = 0;
  bool _savingProfile = false;
  bool _savingPassword = false;
  String? _feedback;
  bool _feedbackIsError = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider).user;
    _nombreController.text = user?.nombre ?? '';
    _apellidoController.text = user?.apellido ?? '';
    _emailController.text = user?.email ?? '';
  }

  @override
  void dispose() {
    _nombreController.dispose();
    _apellidoController.dispose();
    _emailController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showFeedback(String message, {bool isError = false}) {
    setState(() {
      _feedback = message;
      _feedbackIsError = isError;
    });
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) setState(() => _feedback = null);
    });
  }

  Future<void> _saveProfile() async {
    if (!(_profileFormKey.currentState?.validate() ?? false)) return;
    final user = ref.read(authProvider).user;
    if (user == null) return;

    setState(() => _savingProfile = true);
    try {
      final nombre = _nombreController.text.trim();
      final apellido = _apellidoController.text.trim();
      final email = _emailController.text.trim();

      await _users.patchUser(user.id, {
        'nombre': nombre,
        'apellido': apellido,
        'email': email,
      });

      await ref.read(authProvider.notifier).updateLocalUser(
            user.copyWith(nombre: nombre, apellido: apellido, email: email),
          );
      if (!mounted) return;
      _showFeedback('Perfil actualizado correctamente.');
    } catch (_) {
      if (!mounted) return;
      _showFeedback(
        'No se pudo actualizar el perfil. Revisa tu conexión.',
        isError: true,
      );
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _changePassword() async {
    if (!(_passwordFormKey.currentState?.validate() ?? false)) return;
    final user = ref.read(authProvider).user;
    if (user == null) return;

    setState(() => _savingPassword = true);
    try {
      final fresh = await _users.getByUsername(user.username);
      final hash = fresh?.passwordHash;
      if (hash == null) {
        _showFeedback('No se pudo obtener la cuenta.', isError: true);
        return;
      }

      final currentOk = await PasswordService.verify(
        _currentPasswordController.text,
        hash,
      );
      if (!currentOk) {
        _showFeedback('La contraseña actual es incorrecta.', isError: true);
        return;
      }

      final newHash = await PasswordService.hash(
        _newPasswordController.text,
      );
      await _users.patchUser(user.id, {'password': newHash});

      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      if (!mounted) return;
      _showFeedback('Contraseña cambiada correctamente.');
    } catch (_) {
      if (!mounted) return;
      _showFeedback(
        'No se pudo cambiar la contraseña. Revisa tu conexión.',
        isError: true,
      );
    } finally {
      if (mounted) setState(() => _savingPassword = false);
    }
  }

  Future<void> _logout() async {
    await ref.read(authProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    if (user == null) {
      return const PageScaffold(child: LoadingView());
    }

    final history = ref.watch(historyProvider);
    final total = history.length;
    final average = total == 0
        ? 0
        : (history
                    .map((r) => r.totalQuestions == 0
                        ? 0.0
                        : r.score / r.totalQuestions * 100)
                    .reduce((a, b) => a + b) /
                total)
            .round();
    final best = total == 0
        ? 0
        : history
            .map((r) => r.totalQuestions == 0
                ? 0
                : ((r.score / r.totalQuestions) * 100).round())
            .reduce((a, b) => a > b ? a : b);

    final remainingDays = user.remainingDays;

    return PageScaffold(
      appBar: ScreenHeader(
        title: 'MI PERFIL',
        subtitle: user.username,
        icon: Icons.person_outline_rounded,
        iconColor: AppColors.blueLight,
        onBack: () => context.canPop() ? context.pop() : context.go('/dashboard'),
      ),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          Row(
            children: [
              Expanded(
                child: StatTile(
                  label: 'Exámenes',
                  value: '$total',
                  icon: Icons.description_outlined,
                  color: AppColors.blueLight,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatTile(
                  label: 'Promedio',
                  value: '$average%',
                  icon: Icons.gps_fixed_rounded,
                  color: AppColors.gold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: StatTile(
                  label: 'Mejor',
                  value: '$best%',
                  icon: Icons.emoji_events_outlined,
                  color: AppColors.success,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatTile(
                  label: 'Membresía',
                  value: user.membershipExpiry == null
                      ? 'Ilimitada'
                      : user.isExpired
                          ? 'Expirada'
                          : '${remainingDays ?? 0}d',
                  icon: Icons.workspace_premium_outlined,
                  color: user.isExpired ? AppColors.danger : AppColors.gold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (_feedback != null) ...[
            _feedbackIsError
                ? ErrorBanner(_feedback!)
                : Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.success.withValues(alpha: 0.45),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_outline_rounded,
                            size: 18, color: AppColors.success),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _feedback!,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: AppColors.success,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
            const SizedBox(height: 14),
          ],
          Row(
            children: [
              Expanded(
                child: _TabButton(
                  label: 'Datos personales',
                  selected: _tab == 0,
                  onTap: () => setState(() => _tab = 0),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _TabButton(
                  label: 'Contraseña',
                  selected: _tab == 1,
                  onTap: () => setState(() => _tab = 1),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (_tab == 0) _buildProfileForm(user) else _buildPasswordForm(),
          const SizedBox(height: 18),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionTitle('Dispositivos vinculados'),
                Row(
                  children: [
                    const Icon(Icons.devices_rounded,
                        size: 19, color: AppColors.textSecondary),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        '${user.devices.length} de ${user.maxDevices} '
                        'dispositivo${user.maxDevices != 1 ? 's' : ''} '
                        'autorizado${user.maxDevices != 1 ? 's' : ''}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: Text(
                        user.isAdmin ? 'Admin' : 'Limitado',
                        style: const TextStyle(
                          fontSize: 9.5,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Si cambias de equipo, solicita al administrador que libere '
                  'un dispositivo desde el panel web.',
                  style: TextStyle(
                    fontSize: 10.5,
                    color: AppColors.textMuted,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.danger,
              side: BorderSide(
                color: AppColors.danger.withValues(alpha: 0.5),
              ),
            ),
            onPressed: _logout,
            icon: const Icon(Icons.logout_rounded, size: 19),
            label: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileForm(AppUser user) {
    return AppCard(
      child: Form(
        key: _profileFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: _ReadOnlyField(
                    label: 'Usuario',
                    value: user.username,
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: _ReadOnlyField(
                    label: 'Rol',
                    value: user.role == 'admin' ? 'Administrador' : 'Usuario',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _nombreController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Nombre'),
                    validator: (value) => (value?.trim().isEmpty ?? true)
                        ? 'Requerido'
                        : null,
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: TextFormField(
                    controller: _apellidoController,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Apellido'),
                    validator: (value) => (value?.trim().isEmpty ?? true)
                        ? 'Requerido'
                        : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              decoration: const InputDecoration(labelText: 'Correo electrónico'),
              validator: (value) {
                final text = value?.trim() ?? '';
                if (text.isEmpty) return null;
                if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(text)) {
                  return 'Correo no válido';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _savingProfile ? null : _saveProfile,
              child: _savingProfile
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('GUARDAR CAMBIOS'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPasswordForm() {
    return AppCard(
      child: Form(
        key: _passwordFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _currentPasswordController,
              obscureText: true,
              decoration:
                  const InputDecoration(labelText: 'Contraseña actual'),
              validator: (value) => (value?.isEmpty ?? true)
                  ? 'Ingresa tu contraseña actual'
                  : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _newPasswordController,
              obscureText: true,
              decoration:
                  const InputDecoration(labelText: 'Nueva contraseña'),
              validator: (value) {
                if (value == null || value.length < 6) {
                  return 'Mínimo 6 caracteres';
                }
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _confirmPasswordController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirmar nueva contraseña',
              ),
              validator: (value) => value != _newPasswordController.text
                  ? 'Las contraseñas no coinciden'
                  : null,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _savingPassword ? null : _changePassword,
              child: _savingPassword
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('CAMBIAR CONTRASEÑA'),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected
              ? AppColors.blue.withValues(alpha: 0.16)
              : AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.blue : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: selected ? AppColors.blueLight : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  const _ReadOnlyField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 10.5,
            color: AppColors.textMuted,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceAlt,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 13),
          ),
        ),
      ],
    );
  }
}
