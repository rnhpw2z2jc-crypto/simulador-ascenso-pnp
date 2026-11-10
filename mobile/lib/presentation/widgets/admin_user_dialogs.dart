import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/app_user.dart';
import '../widgets/common.dart';

/// Datos capturados por el modal "Nuevo Usuario".
class NewUserDraft {
  const NewUserDraft({
    required this.username,
    required this.nombre,
    required this.apellido,
    required this.email,
    required this.password,
    required this.vip,
    required this.audio,
  });

  final String username;
  final String nombre;
  final String apellido;
  final String email;
  final String password;
  final bool vip;
  final bool audio;
}

/// Datos capturados por el modal "Editar".
class EditUserResult {
  const EditUserResult({
    required this.nombre,
    required this.apellido,
    required this.email,
    required this.password,
    required this.membership,
    required this.maxDevices,
    required this.audio,
  });

  final String nombre;
  final String apellido;
  final String email;
  final String password;

  /// `free`, `vip` o `null` (mantener la membresia actual).
  final String? membership;
  final int maxDevices;
  final bool audio;
}

Future<NewUserDraft?> showAddUserDialog(
  BuildContext context, {
  required bool Function(String username) isUsernameTaken,
}) {
  return showGeneralDialog<NewUserDraft>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Cerrar',
    barrierColor: Colors.black.withValues(alpha: 0.7),
    transitionDuration: AppMotion.normal,
    pageBuilder: (dialogContext, animation, secondaryAnimation) {
      return _AddUserDialog(isUsernameTaken: isUsernameTaken);
    },
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: AppMotion.ease);
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.9, end: 1).animate(curved),
          child: child,
        ),
      );
    },
  );
}

Future<EditUserResult?> showEditUserDialog(
  BuildContext context, {
  required AppUser user,
}) {
  return showGeneralDialog<EditUserResult>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Cerrar',
    barrierColor: Colors.black.withValues(alpha: 0.7),
    transitionDuration: AppMotion.normal,
    pageBuilder: (dialogContext, animation, secondaryAnimation) {
      return _EditUserDialog(user: user);
    },
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: AppMotion.ease);
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.9, end: 1).animate(curved),
          child: child,
        ),
      );
    },
  );
}

// ---------------------------------------------------------------------------
// Modal: Nuevo Usuario (replica components/AddUserModal.tsx)
// ---------------------------------------------------------------------------

class _AddUserDialog extends StatefulWidget {
  const _AddUserDialog({required this.isUsernameTaken});

  final bool Function(String username) isUsernameTaken;

  @override
  State<_AddUserDialog> createState() => _AddUserDialogState();
}

class _AddUserDialogState extends State<_AddUserDialog> {
  final _nombre = TextEditingController();
  final _apellido = TextEditingController();
  final _username = TextEditingController();
  final _password = TextEditingController();
  final _email = TextEditingController();

  bool _vip = false;
  bool _audio = false;
  String _error = '';
  int _usernameState = 0; // 0 = idle, 1 = ok, 2 = taken

  @override
  void dispose() {
    _nombre.dispose();
    _apellido.dispose();
    _username.dispose();
    _password.dispose();
    _email.dispose();
    super.dispose();
  }

  void _onUsernameChanged(String value) {
    final normalized = value.trim().toLowerCase();
    setState(() {
      _usernameState = value.trim().isEmpty
          ? 0
          : widget.isUsernameTaken(normalized)
              ? 2
              : 1;
      if (_error.isNotEmpty) _error = '';
    });
  }

  String _sanitize(String value, int maxLength) {
    final clean = value.trim().replaceAll(RegExp(r'[<>]'), '');
    return clean.length > maxLength ? clean.substring(0, maxLength) : clean;
  }

  void _submit() {
    if (_username.text.trim().isEmpty ||
        _password.text.isEmpty ||
        _nombre.text.trim().isEmpty ||
        _apellido.text.trim().isEmpty) {
      setState(() => _error = 'Complete usuario, contrasena, nombre y apellido');
      return;
    }
    final username = _username.text.trim();
    if (username.length < 3) {
      setState(() => _error = 'El usuario debe tener al menos 3 caracteres');
      return;
    }
    if (!RegExp(r'^[a-zA-Z0-9._-]+$').hasMatch(username)) {
      setState(
        () => _error = 'El usuario solo puede contener letras, numeros, '
            'puntos o guiones',
      );
      return;
    }
    if (widget.isUsernameTaken(username)) {
      setState(
        () => _error = 'Ese usuario ya esta en uso. Elija otro nombre',
      );
      return;
    }
    final email = _email.text.trim();
    if (email.isNotEmpty &&
        !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      setState(() => _error = 'Formato de correo invalido');
      return;
    }
    if (_password.text.length < 6) {
      setState(
        () => _error = 'La contrasena debe tener al menos 6 caracteres',
      );
      return;
    }

    Navigator.of(context).pop(
      NewUserDraft(
        username: _sanitize(username, 30),
        nombre: _sanitize(_nombre.text, 60),
        apellido: _sanitize(_apellido.text, 60),
        email: _sanitize(email, 100),
        password: _password.text,
        vip: _vip,
        audio: _audio,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _DialogShell(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Nuevo Usuario',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          if (_error.isNotEmpty) ...[
            ErrorBanner(_error),
            const SizedBox(height: 12),
          ],
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _LabeledInput(
                          label: 'Nombre *',
                          controller: _nombre,
                          textCapitalization: TextCapitalization.words,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _LabeledInput(
                          label: 'Apellido *',
                          controller: _apellido,
                          textCapitalization: TextCapitalization.words,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _LabeledInput(
                    label: 'Usuario *',
                    controller: _username,
                    autocorrect: false,
                    enableSuggestions: false,
                    onChanged: _onUsernameChanged,
                    borderColor: _usernameState == 2
                        ? AppColors.danger
                        : _usernameState == 1
                            ? AppColors.success
                            : null,
                    helper: _usernameState == 2
                        ? 'Ese nombre ya esta en uso'
                        : _usernameState == 1
                            ? 'Nombre disponible'
                            : null,
                    helperColor: _usernameState == 2
                        ? AppColors.danger
                        : AppColors.success,
                  ),
                  const SizedBox(height: 12),
                  _LabeledInput(
                    label: 'Contrasena *',
                    controller: _password,
                    obscureText: true,
                  ),
                  const SizedBox(height: 12),
                  _LabeledInput(
                    label: 'Email',
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                  ),
                  const SizedBox(height: 14),
                  const _FieldLabel('Membresia'),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: _ChoiceButton(
                          label: 'FREE - 12h (prueba)',
                          selected: !_vip,
                          color: AppColors.tacticalBlueLight,
                          onTap: () => setState(() => _vip = false),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ChoiceButton(
                          label: 'VIP - hasta 31 dic 2026',
                          selected: _vip,
                          color: AppColors.gold,
                          onTap: () => setState(() => _vip = true),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'FREE = 12 horas de prueba. VIP = acceso hasta el 31/12/2026.',
                    style: TextStyle(
                      fontSize: 10.5,
                      color: AppColors.textMuted,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 14),
                  const _FieldLabel('Funcionalidades adicionales'),
                  const SizedBox(height: 6),
                  _AudioToggle(
                    value: _audio,
                    onChanged: (value) => setState(() => _audio = value),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: CompactButton(
                  label: 'Cancelar',
                  expand: true,
                  background: AppColors.navy700,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CompactButton(
                  label: 'Crear',
                  expand: true,
                  background: AppColors.tacticalBlue,
                  onPressed: _submit,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Modal: Editar Usuario (replica components/EditUserModal.tsx)
// ---------------------------------------------------------------------------

class _EditUserDialog extends StatefulWidget {
  const _EditUserDialog({required this.user});

  final AppUser user;

  @override
  State<_EditUserDialog> createState() => _EditUserDialogState();
}

class _EditUserDialogState extends State<_EditUserDialog> {
  late final TextEditingController _nombre;
  late final TextEditingController _apellido;
  late final TextEditingController _email;
  final _password = TextEditingController();

  String? _membership;
  late int _maxDevices;
  late bool _audio;

  @override
  void initState() {
    super.initState();
    _nombre = TextEditingController(text: widget.user.nombre);
    _apellido = TextEditingController(text: widget.user.apellido);
    _email = TextEditingController(text: widget.user.email);
    _maxDevices = widget.user.maxDevices;
    _audio = widget.user.audioEnabled;
  }

  @override
  void dispose() {
    _nombre.dispose();
    _apellido.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    if (_nombre.text.trim().isEmpty || _apellido.text.trim().isEmpty) return;
    Navigator.of(context).pop(
      EditUserResult(
        nombre: _nombre.text.trim(),
        apellido: _apellido.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        membership: _membership,
        maxDevices: _maxDevices,
        audio: _audio,
      ),
    );
  }

  bool get _currentIsVip {
    final expiry = widget.user.membershipExpiry;
    if (expiry == null) return false;
    return expiry.year == 2026 && expiry.month == 12 && expiry.day == 31;
  }

  @override
  Widget build(BuildContext context) {
    final expiry = widget.user.membershipExpiry;
    final expired = widget.user.isExpired;
    final remaining = widget.user.remainingDays;

    return _DialogShell(
      maxHeightFactor: 0.9,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Editar: ${widget.user.username}',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _LabeledInput(
                          label: 'Nombre',
                          controller: _nombre,
                          textCapitalization: TextCapitalization.words,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _LabeledInput(
                          label: 'Apellido',
                          controller: _apellido,
                          textCapitalization: TextCapitalization.words,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _LabeledInput(
                    label: 'Email',
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                  ),
                  const SizedBox(height: 12),
                  _LabeledInput(
                    label: 'Nueva contrasena (vacio = no cambiar)',
                    controller: _password,
                    obscureText: true,
                  ),
                  const SizedBox(height: 14),
                  const _FieldLabel('Membresia'),
                  const SizedBox(height: 4),
                  if (expiry != null)
                    Text(
                      expired
                          ? 'Actual: Expirada (${Formatters.dateOnly(expiry)})'
                          : 'Actual: ${remaining ?? 0}d restantes '
                              '(${Formatters.dateOnly(expiry)})',
                      style: TextStyle(
                        fontSize: 11,
                        color: expired
                            ? AppColors.danger
                            : AppColors.success,
                      ),
                    )
                  else
                    const Text(
                      'Sin membresia (acceso ilimitado)',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _ChoiceButton(
                          label: 'FREE - 12h (prueba)',
                          selected: _membership == 'free',
                          color: AppColors.tacticalBlueLight,
                          onTap: () => setState(() {
                            _membership =
                                _membership == 'free' ? null : 'free';
                          }),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ChoiceButton(
                          label: 'VIP - hasta 31 dic 2026',
                          selected: _membership == 'vip' ||
                              (_membership == null && _currentIsVip),
                          color: AppColors.gold,
                          onTap: () => setState(() {
                            _membership =
                                _membership == 'vip' ? null : 'vip';
                          }),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'FREE = 12 horas de prueba. VIP = acceso hasta el 31/12/2026. '
                    'Sin seleccion = mantener la membresia actual',
                    style: TextStyle(
                      fontSize: 10.5,
                      color: AppColors.textMuted,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 14),
                  const _FieldLabel('Dispositivos permitidos'),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: _ChoiceButton(
                          label: '1 dispositivo',
                          selected: _maxDevices == 1,
                          color: AppColors.tacticalBlueLight,
                          onTap: () => setState(() => _maxDevices = 1),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _ChoiceButton(
                          label: '2 dispositivos',
                          selected: _maxDevices == 2,
                          color: AppColors.tacticalBlueLight,
                          onTap: () => setState(() => _maxDevices = 2),
                        ),
                      ),
                    ],
                  ),
                  if (_maxDevices == 1 && widget.user.devices.length > 1) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Se liberara el dispositivo sobrante '
                      '(quedan ${widget.user.devices.length - 1} vinculado).',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: AppColors.warning,
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  const _FieldLabel('Funcionalidades adicionales'),
                  const SizedBox(height: 6),
                  _AudioToggle(
                    value: _audio,
                    onChanged: (value) => setState(() => _audio = value),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: CompactButton(
                  label: 'Cancelar',
                  expand: true,
                  background: AppColors.navy700,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CompactButton(
                  label: 'Guardar',
                  expand: true,
                  background: AppColors.tacticalBlue,
                  onPressed: _submit,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Widgets compartidos por los modales
// ---------------------------------------------------------------------------

class _DialogShell extends StatelessWidget {
  const _DialogShell({required this.child, this.maxHeightFactor = 0.9});

  final Widget child;
  final double maxHeightFactor;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: AnimatedPadding(
        duration: AppMotion.fast,
        curve: AppMotion.ease,
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: 448,
                maxHeight: MediaQuery.sizeOf(context).height * maxHeightFactor,
              ),
              child: Material(
                color: Colors.transparent,
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.navy800.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.glassBorder),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x66000000),
                        blurRadius: 30,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: child,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LabeledInput extends StatelessWidget {
  const _LabeledInput({
    required this.label,
    required this.controller,
    this.obscureText = false,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.autocorrect = true,
    this.enableSuggestions = true,
    this.onChanged,
    this.borderColor,
    this.helper,
    this.helperColor = AppColors.textMuted,
  });

  final String label;
  final TextEditingController controller;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final bool autocorrect;
  final bool enableSuggestions;
  final ValueChanged<String>? onChanged;
  final Color? borderColor;
  final String? helper;
  final Color helperColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FieldLabel(label),
        const SizedBox(height: 5),
        TextField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          autocorrect: autocorrect,
          enableSuggestions: enableSuggestions,
          onChanged: onChanged,
          style: const TextStyle(fontSize: 13.5),
          decoration: InputDecoration(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide:
                  BorderSide(color: borderColor ?? AppColors.navy700),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide:
                  BorderSide(color: borderColor ?? AppColors.navy700),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(
                color: borderColor ?? AppColors.tacticalBlue,
                width: 1.4,
              ),
            ),
          ),
        ),
        if (helper != null) ...[
          const SizedBox(height: 3),
          Text(
            helper!,
            style: TextStyle(fontSize: 10.5, color: helperColor),
          ),
        ],
      ],
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 11.5,
        color: AppColors.textSecondary,
      ),
    );
  }
}

class _ChoiceButton extends StatelessWidget {
  const _ChoiceButton({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? color.withValues(alpha: 0.2) : AppColors.navy800
          .withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected ? color : AppColors.navy700,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w500,
              color: selected ? color : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

/// Interruptor "Modo Audio" con el mismo diseno de la PWA.
class _AudioToggle extends StatelessWidget {
  const _AudioToggle({required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final color = value ? AppColors.gold : AppColors.textSecondary;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => onChanged(!value),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: value
                ? AppColors.gold.withValues(alpha: 0.1)
                : AppColors.navy800.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: value ? AppColors.gold : AppColors.navy700,
            ),
          ),
          child: Row(
            children: [
              Icon(Icons.headphones_rounded, size: 18, color: color),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Modo Audio 🎧',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: value ? AppColors.gold : Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Audio Tactico: preguntas por tema en voz alta',
                      style: TextStyle(
                        fontSize: 10.5,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  color: value ? AppColors.gold : Colors.transparent,
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: value ? AppColors.gold : AppColors.textMuted,
                    width: 2,
                  ),
                ),
                child: value
                    ? const Icon(Icons.check_rounded,
                        size: 14, color: AppColors.navy900)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
