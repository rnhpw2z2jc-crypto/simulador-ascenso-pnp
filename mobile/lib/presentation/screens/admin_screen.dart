import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/category_utils.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/admin_entries.dart';
import '../../data/models/app_user.dart';
import '../../data/models/question.dart';
import '../providers/admin_provider.dart';
import '../providers/questions_provider.dart';
import '../widgets/admin_user_dialogs.dart';
import '../widgets/common.dart';

/// Panel de administracion replicado de `components/AdminPage.tsx`.
class AdminScreen extends ConsumerStatefulWidget {
  const AdminScreen({super.key});

  @override
  ConsumerState<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends ConsumerState<AdminScreen> {
  final _searchController = TextEditingController();
  int _logsPage = 1;
  int _statsPage = 1;

  static const int _logsPageSize = 20;
  static const int _statsPageSize = 15;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(adminProvider.notifier).init());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminProvider);
    final notifier = ref.read(adminProvider.notifier);
    final width = MediaQuery.sizeOf(context).width;
    final usersPageSize = width >= 640 ? 20 : 10;

    return PageScaffold(
      appBar: ScreenHeader(
        title: 'ADMINISTRACION',
        subtitle:
            '${state.users.length} usuarios · ${state.onlineCount} en linea',
        icon: Icons.settings_rounded,
        iconColor: AppColors.gold,
        onBack: () => context.canPop() ? context.pop() : context.go('/dashboard'),
        actions: [
          CompactButton(
            label: 'Volver',
            icon: Icons.home_rounded,
            background: AppColors.navy800,
            borderColor: AppColors.navy700,
            onPressed: () => context.canPop()
                ? context.pop()
                : context.go('/dashboard'),
          ),
        ],
      ),
      child: RefreshIndicator(
        color: AppColors.tacticalBlueLight,
        backgroundColor: AppColors.navy800,
        onRefresh: () async {
          if (state.tab == AdminTab.users) {
            await notifier.refreshUsers();
          } else if (state.tab == AdminTab.logs) {
            await notifier.loadLogs();
          } else {
            await notifier.loadStats();
          }
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
          children: [
            _MessageBanner(
              message: state.message,
              isError: state.messageIsError,
            ),
            _TabSelector(
              current: state.tab,
              onSelect: (tab) {
                notifier.setTab(tab);
                if (tab == AdminTab.logs) {
                  setState(() => _logsPage = 1);
                } else if (tab == AdminTab.stats) {
                  setState(() => _statsPage = 1);
                }
              },
            ),
            const SizedBox(height: 16),
            switch (state.tab) {
              AdminTab.users => _buildUsersTab(
                  state,
                  notifier,
                  usersPageSize,
                ),
              AdminTab.logs => _buildLogsTab(state, notifier),
              AdminTab.stats => _buildStatsTab(state, notifier),
            },
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Usuarios
  // -------------------------------------------------------------------------

  Widget _buildUsersTab(
    AdminState state,
    AdminNotifier notifier,
    int pageSize,
  ) {
    final filtered = state.filteredUsers;
    final totalPages = math.max(1, (filtered.length / pageSize).ceil());
    final page = state.page.clamp(1, totalPages).toInt();
    final start = (page - 1) * pageSize;
    final paginated = filtered.skip(start).take(pageSize).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _searchController,
                onChanged: notifier.setSearch,
                style: const TextStyle(fontSize: 13.5),
                decoration: const InputDecoration(
                  hintText: 'Buscar por nombre, usuario o email...',
                  prefixIcon: Icon(
                    Icons.search_rounded,
                    size: 19,
                    color: AppColors.textSecondary,
                  ),
                  prefixIconConstraints:
                      BoxConstraints(minWidth: 40, minHeight: 20),
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 10),
            FilledButton.icon(
              onPressed: _openAddUser,
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 44),
                padding: const EdgeInsets.symmetric(horizontal: 15),
              ),
              icon: const Icon(Icons.person_add_alt_1_rounded, size: 17),
              label: const Text('Nuevo'),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: Text(
                filtered.length == state.users.length
                    ? '${state.users.length} usuarios'
                    : '${filtered.length} de ${state.users.length} usuarios',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textMuted,
                ),
              ),
            ),
            if (totalPages > 1)
              Text(
                'Pagina $page de $totalPages',
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textMuted,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            for (final filter in MembershipFilter.values)
              _FilterChip(
                label: filter.label,
                selected: state.filter == filter,
                onTap: () => notifier.setFilter(filter),
              ),
            _SortMenu(
              value: state.sort,
              onChanged: notifier.setSort,
            ),
          ],
        ),
        const SizedBox(height: 14),
        const _AdminNote(),
        const SizedBox(height: 14),
        if (state.loadingUsers && !state.usersLoaded)
          const _LoadingCard(message: 'Cargando usuarios...')
        else if (paginated.isEmpty)
          const _EmptyCard(message: 'No se encontraron usuarios')
        else
          for (var index = 0; index < paginated.length; index++)
            FadeSlideIn(
              offsetY: 10,
              duration: AppMotion.normal,
              delay: Duration(milliseconds: math.min(index, 8) * 35),
              child: Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _UserCard(
                  user: paginated[index],
                  isOnline: state.isOnline(paginated[index]),
                  onEdit: () => _openEditUser(paginated[index]),
                  onToggleAudio: () =>
                      notifier.toggleAudio(paginated[index]),
                  onUnlockAll: () => notifier.unlockAll(paginated[index]),
                  onToggleDevices: () =>
                      notifier.toggleMaxDevices(paginated[index]),
                  onMembership: () =>
                      _openMembershipSheet(paginated[index]),
                  onToggleStatus: () =>
                      notifier.toggleStatus(paginated[index]),
                  onDelete: () => _confirmDelete(paginated[index]),
                  onUnlockDevice: (device) =>
                      notifier.unlockDevice(paginated[index], device),
                ),
              ),
            ),
        if (totalPages > 1)
          _NumberedPagination(
            current: page,
            total: totalPages,
            onSelect: notifier.setPage,
          ),
      ],
    );
  }

  Future<void> _openAddUser() async {
    final notifier = ref.read(adminProvider.notifier);
    final draft = await showAddUserDialog(
      context,
      isUsernameTaken: notifier.isUsernameTaken,
    );
    if (draft == null) return;
    await notifier.addUser(
      username: draft.username,
      nombre: draft.nombre,
      apellido: draft.apellido,
      email: draft.email,
      password: draft.password,
      vip: draft.vip,
      audio: draft.audio,
    );
  }

  Future<void> _openEditUser(AppUser user) async {
    final result = await showEditUserDialog(context, user: user);
    if (result == null) return;
    await ref.read(adminProvider.notifier).updateUser(
          user,
          nombre: result.nombre,
          apellido: result.apellido,
          email: result.email,
          newPassword: result.password,
          membership: result.membership,
          maxDevices: result.maxDevices,
          audio: result.audio,
        );
  }

  Future<void> _openMembershipSheet(AppUser user) async {
    final notifier = ref.read(adminProvider.notifier);
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.navy800,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.navy700,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'Membresia de ${user.username}',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                _SheetOption(
                  label: 'FREE - 12h (prueba)',
                  icon: Icons.timer_outlined,
                  color: AppColors.tacticalBlueLight,
                  background: AppColors.tacticalBlue.withValues(alpha: 0.1),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    notifier.setMembership(user, 12);
                  },
                ),
                const SizedBox(height: 8),
                _SheetOption(
                  label: 'VIP - hasta 31 dic 2026',
                  icon: Icons.workspace_premium_outlined,
                  color: AppColors.gold,
                  background: AppColors.gold.withValues(alpha: 0.1),
                  onTap: () {
                    Navigator.of(sheetContext).pop();
                    notifier.setVip(user);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _confirmDelete(AppUser user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Eliminar usuario'),
        content: Text(
          '¿Eliminar a ${user.nombre} ${user.apellido} (${user.username})? '
          'Tambien se borraran sus examenes y registros de acceso.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger,
              minimumSize: const Size(96, 42),
            ),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(adminProvider.notifier).deleteUser(user);
    }
  }

  // -------------------------------------------------------------------------
  // Registro de accesos
  // -------------------------------------------------------------------------

  Widget _buildLogsTab(AdminState state, AdminNotifier notifier) {
    final totalPages = math.max(
      1,
      (state.logs.length / _logsPageSize).ceil(),
    );
    final page = _logsPage.clamp(1, totalPages).toInt();
    final start = (page - 1) * _logsPageSize;
    final paginated = state.logs.skip(start).take(_logsPageSize).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Ultimos 200 intentos de acceso',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            CompactButton(
              label: 'Actualizar',
              icon: Icons.refresh_rounded,
              background: AppColors.navy700,
              onPressed: () {
                setState(() => _logsPage = 1);
                notifier.loadLogs();
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.warning.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: AppColors.warning.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline_rounded,
                  size: 19, color: AppColors.warning),
              const SizedBox(width: 9),
              Expanded(
                child: Text.rich(
                  TextSpan(
                    style: const TextStyle(
                      fontSize: 11,
                      height: 1.45,
                      color: AppColors.textSecondary,
                    ),
                    children: [
                      const TextSpan(text: 'Este registro incluye '),
                      const TextSpan(
                        text: 'todos los intentos',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.warning,
                        ),
                      ),
                      const TextSpan(
                        text: ', exitosos ("allowed") y bloqueados '
                            '("blocked"). Un intento bloqueado NO vincula '
                            'dispositivo. Consulta la pestana ',
                      ),
                      const TextSpan(
                        text: 'Usuarios',
                        style: TextStyle(color: AppColors.tacticalBlueLight),
                      ),
                      const TextSpan(
                        text: ' para ver los dispositivos realmente '
                            'vinculados.',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (state.loadingLogs)
          const _LoadingCard(message: 'Cargando registros...')
        else if (state.logs.isEmpty)
          const _EmptyCard(message: 'Sin registros de acceso')
        else ...[
          for (final log in paginated)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _LogCard(log: log),
            ),
          if (totalPages > 1)
            _SimplePagination(
              current: page,
              total: totalPages,
              onPrevious: () => setState(
                () => _logsPage = math.max(1, page - 1),
              ),
              onNext: () => setState(
                () => _logsPage = math.min(totalPages, page + 1),
              ),
            ),
        ],
      ],
    );
  }

  // -------------------------------------------------------------------------
  // Estadisticas
  // -------------------------------------------------------------------------

  Widget _buildStatsTab(AdminState state, AdminNotifier notifier) {
    final questions =
        ref.watch(questionsProvider).asData?.value ?? const <Question>[];
    final questionMap = {for (final q in questions) q.id: q};

    if (state.loadingStats && state.stats.isEmpty) {
      return const _LoadingCard(message: 'Cargando estadisticas...');
    }

    if (state.stats.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Estadisticas de examenes',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              CompactButton(
                label: 'Actualizar',
                icon: Icons.refresh_rounded,
                background: AppColors.navy700,
                onPressed: () {
                  setState(() => _statsPage = 1);
                  notifier.loadStats();
                },
              ),
            ],
          ),
          const SizedBox(height: 14),
          const _EmptyStatsCard(),
        ],
      );
    }

    final totalExams = state.stats.length;
    final avgGeneral = (state.stats
                .map((e) => e.scorePercent)
                .reduce((a, b) => a + b) /
            totalExams)
        .round();
    final activeUsers = state.stats.map((e) => e.userId).toSet().length;
    final totalFailed = state.stats.fold<int>(
      0,
      (sum, entry) => sum + entry.failedQuestionIds.length,
    );

    final failCount = <int, int>{};
    for (final entry in state.stats) {
      for (final id in entry.failedQuestionIds) {
        failCount[id] = (failCount[id] ?? 0) + 1;
      }
    }
    final topFailed = failCount.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final top20 = topFailed.take(20).toList();
    final maxFail = top20.isEmpty ? 1 : top20.first.value;

    final perUser = <String, _UserAggregate>{};
    for (final entry in state.stats) {
      final aggregate = perUser.putIfAbsent(
        entry.userId,
        () => _UserAggregate(username: entry.username),
      );
      aggregate.exams++;
      aggregate.totalCorrect += entry.correctAnswers;
      aggregate.totalQuestions += entry.totalQuestions;
      aggregate.failed.addAll(entry.failedQuestionIds);
    }
    final userRows = perUser.entries.toList()
      ..sort((a, b) => b.value.exams.compareTo(a.value.exams));
    final statsTotalPages = math.max(
      1,
      (userRows.length / _statsPageSize).ceil(),
    );
    final statsPage = _statsPage.clamp(1, statsTotalPages).toInt();
    final statsStart = (statsPage - 1) * _statsPageSize;
    final paginatedRows =
        userRows.skip(statsStart).take(_statsPageSize).toList();

    final columns = MediaQuery.sizeOf(context).width >= 720 ? 4 : 2;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Estadisticas de examenes',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            CompactButton(
              label: 'Actualizar',
              icon: Icons.refresh_rounded,
              background: AppColors.navy700,
              onPressed: () {
                setState(() => _statsPage = 1);
                notifier.loadStats();
              },
            ),
          ],
        ),
        const SizedBox(height: 14),
        GridView.count(
          crossAxisCount: columns,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.65,
          children: [
            _SummaryCard(label: 'Total Examenes', value: '$totalExams'),
            _SummaryCard(label: 'Promedio General', value: '$avgGeneral%'),
            _SummaryCard(label: 'Usuarios Activos', value: '$activeUsers'),
            _SummaryCard(
              label: 'Total Preguntas Falladas',
              value: '$totalFailed',
              valueColor: AppColors.danger,
            ),
          ],
        ),
        if (top20.isNotEmpty) ...[
          const SizedBox(height: 20),
          const Row(
            children: [
              Icon(Icons.gps_fixed_rounded,
                  size: 16, color: AppColors.danger),
              SizedBox(width: 8),
              Text(
                'Preguntas Mas Falladas (Top 20)',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (var index = 0; index < top20.length; index++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _FailedQuestionCard(
                index: index + 1,
                count: top20[index].value,
                maxCount: maxFail,
                questionId: top20[index].key,
                question: questionMap[top20[index].key],
              ),
            ),
        ],
        const SizedBox(height: 20),
        const Row(
          children: [
            Icon(Icons.people_alt_rounded,
                size: 16, color: AppColors.tacticalBlueLight),
            SizedBox(width: 8),
            Text(
              'Rendimiento por Usuario',
              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 10),
        for (final row in paginatedRows)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _UserPerformanceCard(aggregate: row.value),
          ),
        if (statsTotalPages > 1)
          _SimplePagination(
            current: statsPage,
            total: statsTotalPages,
            onPrevious: () => setState(
              () => _statsPage = math.max(1, statsPage - 1),
            ),
            onNext: () => setState(
              () => _statsPage = math.min(statsTotalPages, statsPage + 1),
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Usuarios: tarjeta y acciones
// ---------------------------------------------------------------------------

/// Tarjeta `glass` con franja de acento a la izquierda
/// (equivalente a `border-l-4` de la PWA, sin bordes no uniformes que
/// Flutter no admite junto con `borderRadius`).
class _AccentCard extends StatelessWidget {
  const _AccentCard({
    required this.accent,
    required this.child,
    this.padding = const EdgeInsets.all(11),
    this.radius = 9,
  });

  final Color accent;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.navy800.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Stack(
          children: [
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              child: ColoredBox(color: accent),
            ),
            Padding(padding: padding, child: child),
          ],
        ),
      ),
    );
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({
    required this.user,
    required this.isOnline,
    required this.onEdit,
    required this.onToggleAudio,
    required this.onUnlockAll,
    required this.onToggleDevices,
    required this.onMembership,
    required this.onToggleStatus,
    required this.onDelete,
    required this.onUnlockDevice,
  });

  final AppUser user;
  final bool isOnline;
  final VoidCallback onEdit;
  final VoidCallback onToggleAudio;
  final VoidCallback onUnlockAll;
  final VoidCallback onToggleDevices;
  final VoidCallback onMembership;
  final VoidCallback onToggleStatus;
  final VoidCallback onDelete;
  final ValueChanged<String> onUnlockDevice;

  @override
  Widget build(BuildContext context) {
    final expired = user.isExpired;
    final statusColor = user.status == 'blocked'
        ? AppColors.danger
        : expired
            ? AppColors.warning
            : AppColors.success;

    return _AccentCard(
      accent: statusColor,
      radius: 12,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 5,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                '${user.nombre} ${user.apellido}'.trim(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              _OnlineTag(isOnline: isOnline, user: user),
              if (user.isAdmin)
                const TagChip(label: 'ADMIN', color: AppColors.gold),
              if (user.audioEnabled)
                const TagChip(
                  label: 'AUDIO',
                  color: AppColors.gold,
                  icon: Icons.headphones_rounded,
                ),
              if (user.status == 'blocked')
                const TagChip(label: 'BLOQUEADO', color: AppColors.danger),
              if (expired)
                const TagChip(label: 'EXPIRADO', color: AppColors.warning),
            ],
          ),
          const SizedBox(height: 7),
          Wrap(
            spacing: 14,
            runSpacing: 3,
            children: [
              _MetaText(label: 'Usuario', value: user.username),
              _MetaText(
                label: 'Email',
                value: user.email.isEmpty ? '-' : user.email,
              ),
            ],
          ),
          const SizedBox(height: 4),
          _MembershipLine(user: user),
          const SizedBox(height: 4),
          _DevicesLine(user: user, onUnlockDevice: onUnlockDevice),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              CompactButton(
                label: 'Editar',
                background: AppColors.navy700,
                onPressed: onEdit,
              ),
              CompactButton(
                label: 'Audio',
                icon: Icons.headphones_rounded,
                color: user.audioEnabled
                    ? AppColors.gold
                    : AppColors.textSecondary,
                background: user.audioEnabled
                    ? AppColors.gold.withValues(alpha: 0.2)
                    : AppColors.navy700,
                onPressed: onToggleAudio,
              ),
              CompactButton(
                label: user.devices.isEmpty
                    ? 'Sin vinc.'
                    : 'Liberar (${user.devices.length})',
                color: user.devices.isEmpty
                    ? AppColors.textMuted
                    : AppColors.gold,
                background: user.devices.isEmpty
                    ? AppColors.navy700
                    : AppColors.gold.withValues(alpha: 0.2),
                onPressed: user.devices.isEmpty ? null : onUnlockAll,
              ),
              CompactButton(
                label: user.maxDevices == 2
                    ? 'Poner 1 disp.'
                    : 'Activar 2 disp.',
                color: user.maxDevices == 2
                    ? AppColors.success
                    : AppColors.tacticalBlueLight,
                background: user.maxDevices == 2
                    ? AppColors.success.withValues(alpha: 0.2)
                    : AppColors.tacticalBlue.withValues(alpha: 0.1),
                onPressed: onToggleDevices,
              ),
              CompactButton(
                label: 'Membresia',
                color: AppColors.tacticalBlueLight,
                background: AppColors.tacticalBlue.withValues(alpha: 0.2),
                onPressed: onMembership,
              ),
              CompactButton(
                label: user.status == 'blocked' ? 'Activar' : 'Bloquear',
                color: user.status == 'blocked'
                    ? AppColors.success
                    : AppColors.warning,
                background: user.status == 'blocked'
                    ? AppColors.success.withValues(alpha: 0.2)
                    : AppColors.warning.withValues(alpha: 0.2),
                onPressed: onToggleStatus,
              ),
              CompactButton(
                label: 'Eliminar',
                color: AppColors.danger,
                background: AppColors.danger.withValues(alpha: 0.2),
                onPressed: onDelete,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OnlineTag extends StatelessWidget {
  const _OnlineTag({required this.isOnline, required this.user});

  final bool isOnline;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final color = isOnline ? AppColors.success : AppColors.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: isOnline
            ? AppColors.success.withValues(alpha: 0.2)
            : AppColors.navy700,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isOnline ? AppColors.success : AppColors.textMuted,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            isOnline ? 'En linea' : _lastSeenLabel(user),
            style: TextStyle(fontSize: 10.5, color: color),
          ),
        ],
      ),
    );
  }

  static String _lastSeenLabel(AppUser user) {
    final lastSeen = user.lastSeen;
    if (lastSeen == null) return 'sin actividad';
    final diff = DateTime.now().millisecondsSinceEpoch - lastSeen;
    if (diff < 60000) return 'hace menos de un min';
    final mins = diff ~/ 60000;
    if (mins < 60) return 'visto hace $mins min';
    return 'visto hace ${mins ~/ 60} h';
  }
}

class _MetaText extends StatelessWidget {
  const _MetaText({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
        children: [
          TextSpan(text: '$label: '),
          TextSpan(
            text: value,
            style: const TextStyle(color: Color(0xFFCBD5E1)),
          ),
        ],
      ),
    );
  }
}

class _MembershipLine extends StatelessWidget {
  const _MembershipLine({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final expiry = user.membershipExpiry;
    const baseStyle = TextStyle(fontSize: 11, color: AppColors.textMuted);

    if (expiry == null) {
      return Text.rich(
        const TextSpan(
          style: baseStyle,
          children: [
            TextSpan(text: 'Membresia: '),
            TextSpan(
              text: 'Sin fecha (acceso ilimitado)',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    if (user.isExpired) {
      return Text.rich(
        TextSpan(
          style: baseStyle,
          children: [
            const TextSpan(text: 'Membresia: '),
            TextSpan(
              text: 'Expirada (${Formatters.dateOnly(expiry)})',
              style: const TextStyle(color: AppColors.danger),
            ),
          ],
        ),
      );
    }

    return Text.rich(
      TextSpan(
        style: baseStyle,
        children: [
          const TextSpan(text: 'Membresia: '),
          TextSpan(
            text: 'Activa - ${user.remainingDays ?? 0} dias restantes '
                '(hasta ${Formatters.dateOnly(expiry)})',
            style: const TextStyle(color: AppColors.success),
          ),
        ],
      ),
    );
  }
}

class _DevicesLine extends StatelessWidget {
  const _DevicesLine({required this.user, required this.onUnlockDevice});

  final AppUser user;
  final ValueChanged<String> onUnlockDevice;

  @override
  Widget build(BuildContext context) {
    if (user.devices.isEmpty) {
      return Text.rich(
        TextSpan(
          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
          children: [
            TextSpan(
              text: 'Dispositivos (0/${user.maxDevices}): ',
            ),
            const TextSpan(
              text: 'Sin vincular',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Dispositivos (${user.devices.length}/${user.maxDevices}):',
          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
        ),
        const SizedBox(height: 3),
        Wrap(
          spacing: 10,
          runSpacing: 4,
          children: [
            for (var index = 0; index < user.devices.length; index++)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Vinculado ${index + 1}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.gold,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '(${user.devices[index].length > 12 ? '${user.devices[index].substring(0, 12)}...' : user.devices[index]})',
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(width: 4),
                  InkWell(
                    onTap: () => onUnlockDevice(user.devices[index]),
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 1,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.gold.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'X',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w600,
                          color: AppColors.gold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Logs / estadisticas: tarjetas
// ---------------------------------------------------------------------------

class _LogCard extends StatelessWidget {
  const _LogCard({required this.log});

  final AccessLogEntry log;

  @override
  Widget build(BuildContext context) {
    final allowed = log.isAllowed;
    final color = allowed ? AppColors.success : AppColors.danger;
    final device = log.deviceId.length > 16
        ? '${log.deviceId.substring(0, 16)}...'
        : log.deviceId;

    return _AccentCard(
      accent: color,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        log.username,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    TagChip(
                      label: allowed ? 'Permitido' : 'Bloqueado',
                      color: color,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${log.reason} | ${log.platform} / ${log.browser} | '
                  'ID: $device',
                  style: const TextStyle(
                    fontSize: 10,
                    color: AppColors.textMuted,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            log.timestamp == null
                ? '-'
                : Formatters.dateTime(log.timestamp!),
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
    this.valueColor = Colors.white,
  });

  final String label;
  final String value;
  final Color valueColor;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 12,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            label,
            maxLines: 2,
            style: const TextStyle(
              fontSize: 10.5,
              color: AppColors.textSecondary,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 23,
                fontWeight: FontWeight.w700,
                color: valueColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FailedQuestionCard extends StatelessWidget {
  const _FailedQuestionCard({
    required this.index,
    required this.count,
    required this.maxCount,
    required this.questionId,
    required this.question,
  });

  final int index;
  final int count;
  final int maxCount;
  final int questionId;
  final Question? question;

  @override
  Widget build(BuildContext context) {
    final category = question == null
        ? null
        : categoryDisplayName(question!.category);

    return _AccentCard(
      accent: AppColors.danger,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 26,
            child: Text(
              '#$index',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.danger,
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  question?.question ?? 'Pregunta ID $questionId',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, height: 1.35),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: ThinProgressBar(
                        value: maxCount == 0 ? 0 : count / maxCount,
                        color: AppColors.danger,
                        height: 7,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$count vez${count != 1 ? 'es' : ''}',
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w500,
                        color: AppColors.danger,
                      ),
                    ),
                    if (category != null) ...[
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          category,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UserAggregate {
  _UserAggregate({required this.username});

  final String username;
  int exams = 0;
  int totalCorrect = 0;
  int totalQuestions = 0;
  final List<int> failed = [];

  int get average =>
      totalQuestions == 0 ? 0 : ((totalCorrect / totalQuestions) * 100).round();

  int get uniqueFailed => failed.toSet().length;
}

class _UserPerformanceCard extends StatelessWidget {
  const _UserPerformanceCard({required this.aggregate});

  final _UserAggregate aggregate;

  @override
  Widget build(BuildContext context) {
    final approved = aggregate.average >= 60;
    final color = approved ? AppColors.success : AppColors.danger;

    return _AccentCard(
      accent: AppColors.tacticalBlue,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  aggregate.username,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 12,
                  runSpacing: 2,
                  children: [
                    Text(
                      '${aggregate.exams} examen'
                      '${aggregate.exams != 1 ? 'es' : ''}',
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text.rich(
                      TextSpan(
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: AppColors.textSecondary,
                        ),
                        children: [
                          const TextSpan(text: 'Promedio: '),
                          TextSpan(
                            text: '${aggregate.average}%',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: color,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text.rich(
                      TextSpan(
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: AppColors.textSecondary,
                        ),
                        children: [
                          const TextSpan(
                              text: 'Preguntas unicas falladas: '),
                          TextSpan(
                            text: '${aggregate.uniqueFailed}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppColors.danger,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              approved ? 'APROBADO' : 'DESAPROBADO',
              style: TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Controles y estados
// ---------------------------------------------------------------------------

class _TabSelector extends StatelessWidget {
  const _TabSelector({required this.current, required this.onSelect});

  final AdminTab current;
  final ValueChanged<AdminTab> onSelect;

  @override
  Widget build(BuildContext context) {
    const tabs = [
      (AdminTab.users, Icons.people_alt_rounded, 'Usuarios'),
      (AdminTab.logs, Icons.description_outlined, 'Registro de Accesos'),
      (AdminTab.stats, Icons.gps_fixed_rounded, 'Estadisticas'),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final (tab, icon, label) in tabs) ...[
            _TabButton(
              icon: icon,
              label: label,
              selected: current == tab,
              onTap: () => onSelect(tab),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color =
        selected ? AppColors.tacticalBlueLight : AppColors.textSecondary;
    return Material(
      color: selected
          ? AppColors.tacticalBlue.withValues(alpha: 0.2)
          : AppColors.navy800,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 15, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.tacticalBlue.withValues(alpha: 0.3)
          : AppColors.navy800,
      borderRadius: BorderRadius.circular(6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              color: selected
                  ? AppColors.tacticalBlueLight
                  : AppColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _SortMenu extends StatelessWidget {
  const _SortMenu({required this.value, required this.onChanged});

  final UserSortOption value;
  final ValueChanged<UserSortOption> onChanged;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<UserSortOption>(
      tooltip: 'Ordenar usuarios',
      color: AppColors.navy800,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: const BorderSide(color: AppColors.navy700),
      ),
      onSelected: onChanged,
      itemBuilder: (context) => [
        for (final option in UserSortOption.values)
          PopupMenuItem<UserSortOption>(
            value: option,
            height: 42,
            child: Text(
              option.label,
              style: TextStyle(
                fontSize: 12,
                color: option == value
                    ? AppColors.tacticalBlueLight
                    : AppColors.textPrimary,
              ),
            ),
          ),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.navy800,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.navy700),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value.label,
              style: const TextStyle(
                fontSize: 10.5,
                color: Color(0xFFCBD5E1),
              ),
            ),
            const SizedBox(width: 4),
            const Icon(
              Icons.expand_more_rounded,
              size: 14,
              color: AppColors.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}

class _NumberedPagination extends StatelessWidget {
  const _NumberedPagination({
    required this.current,
    required this.total,
    required this.onSelect,
  });

  final int current;
  final int total;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 8),
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 6,
        runSpacing: 6,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          CompactButton(
            label: 'Anterior',
            background: AppColors.navy800,
            color: current == 1 ? AppColors.textMuted : Colors.white,
            onPressed: current == 1 ? null : () => onSelect(current - 1),
          ),
          for (var page = 1; page <= total; page++)
            Material(
              color: page == current
                  ? AppColors.tacticalBlue
                  : AppColors.navy800,
              borderRadius: BorderRadius.circular(8),
              child: InkWell(
                onTap: () => onSelect(page),
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 32,
                  height: 32,
                  child: Center(
                    child: Text(
                      '$page',
                      style: TextStyle(
                        fontSize: 11,
                        color: page == current
                            ? Colors.white
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          CompactButton(
            label: 'Siguiente',
            background: AppColors.navy800,
            color: current == total ? AppColors.textMuted : Colors.white,
            onPressed:
                current == total ? null : () => onSelect(current + 1),
          ),
        ],
      ),
    );
  }
}

class _SimplePagination extends StatelessWidget {
  const _SimplePagination({
    required this.current,
    required this.total,
    required this.onPrevious,
    required this.onNext,
  });

  final int current;
  final int total;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CompactButton(
            label: 'Anterior',
            background: AppColors.navy800,
            color: current == 1 ? AppColors.textMuted : Colors.white,
            onPressed: current == 1 ? null : onPrevious,
          ),
          const SizedBox(width: 10),
          Text(
            '$current / $total',
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(width: 10),
          CompactButton(
            label: 'Siguiente',
            background: AppColors.navy800,
            color: current == total ? AppColors.textMuted : Colors.white,
            onPressed: current == total ? null : onNext,
          ),
        ],
      ),
    );
  }
}

class _AdminNote extends StatelessWidget {
  const _AdminNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: AppColors.tacticalBlue.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(9),
        border: Border.all(
          color: AppColors.tacticalBlue.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.info_outline_rounded,
            size: 18,
            color: AppColors.tacticalBlueLight,
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Text.rich(
              TextSpan(
                style: const TextStyle(
                  fontSize: 10.5,
                  height: 1.45,
                  color: AppColors.textSecondary,
                ),
                children: [
                  const TextSpan(
                    text: 'Nota: ',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  const TextSpan(
                    text: 'un usuario puede figurar en el "Registro de '
                        'Accesos" como logueado aunque aqui aparezca "Sin '
                        'vincular". El registro cuenta todos los intentos, '
                        'incluso los bloqueados. Solo se ',
                  ),
                  const TextSpan(
                    text: 'vincula un dispositivo',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: AppColors.gold,
                    ),
                  ),
                  const TextSpan(
                    text: ' cuando el login es exitoso desde un equipo '
                        'nuevo. Si superan el limite, libera los dispositivos '
                        '(boton "Liberar") para que puedan re-vincular.',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBanner extends StatelessWidget {
  const _MessageBanner({required this.message, required this.isError});

  final String? message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: AppMotion.normal,
      alignment: Alignment.topCenter,
      child: message == null
          ? const SizedBox(width: double.infinity)
          : Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: (isError ? AppColors.danger : AppColors.success)
                      .withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: (isError ? AppColors.danger : AppColors.success)
                        .withValues(alpha: 0.5),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      isError
                          ? Icons.error_outline_rounded
                          : Icons.check_circle_outline_rounded,
                      size: 17,
                      color:
                          isError ? AppColors.danger : AppColors.success,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        message!,
                        style: TextStyle(
                          fontSize: 11.5,
                          color:
                              isError ? AppColors.danger : AppColors.success,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _SheetOption extends StatelessWidget {
  const _SheetOption({
    required this.label,
    required this.icon,
    required this.color,
    required this.background,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final Color background;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: background,
      borderRadius: BorderRadius.circular(9),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(9),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 13),
          child: Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 10),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 12,
      padding: const EdgeInsets.all(28),
      child: Column(
        children: [
          const SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
          const SizedBox(height: 10),
          Text(
            message,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 12,
      padding: const EdgeInsets.all(30),
      child: Center(
        child: Text(
          message,
          style: const TextStyle(
            fontSize: 12.5,
            color: AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _EmptyStatsCard extends StatelessWidget {
  const _EmptyStatsCard();

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      radius: 12,
      padding: const EdgeInsets.all(30),
      child: Column(
        children: [
          const Icon(Icons.gps_fixed_rounded,
              size: 32, color: AppColors.textMuted),
          const SizedBox(height: 8),
          const Text(
            'Sin examenes registrados aun',
            style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 4),
          const Text(
            'Los examenes aparecen aqui cuando los usuarios rindan',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10.5, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
