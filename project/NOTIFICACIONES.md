# Sistema de Notificaciones - Implementación

## Resumen

Se ha implementado un sistema completo de notificaciones en tiempo real para el flujo de aprobación de solicitudes.

## Funcionalidad Implementada

### 1. Notificaciones Automáticas en Base de Datos

Se crearon **triggers automáticos** que generan notificaciones cuando:

#### a) Creator envía solicitud para aprobación
- **Trigger:** Cuando una solicitud cambia a estado `pending_approval`
- **Destinatarios:** Todos los usuarios con rol `procurement_approver` activos
- **Tipo:** `request_pending_approval`
- **Mensaje:** "La solicitud {número} - {título} creada por {nombre} requiere su aprobación."

#### b) Approver aprueba una solicitud
- **Trigger:** Cuando una solicitud cambia de `pending_approval` a `approved`
- **Destinatarios:**
  1. **Creator de la solicitud** - Notificado de la aprobación
  2. **Suppliers invitados** - Notificados para presentar propuestas
- **Tipos:**
  - `request_approved` (para el creator)
  - `invitation_to_bid` (para los suppliers)
- **Mensajes:**
  - Creator: "Su solicitud {número} - {título} ha sido aprobada por {approver}."
  - Suppliers: "Ha sido invitado a presentar una propuesta para la solicitud {número} - {título}. Fecha límite: {fecha}"

#### c) Approver rechaza una solicitud
- **Trigger:** Cuando una solicitud cambia de `pending_approval` a `cancelled`
- **Destinatarios:** Creator de la solicitud
- **Tipo:** `request_rejected`
- **Mensaje:** "Su solicitud {número} - {título} ha sido rechazada. Motivo: {comentarios}"

### 2. Componente de Notificaciones en Frontend

Se creó el componente `NotificationBell` con las siguientes características:

#### Funcionalidades:
- **Badge con contador** de notificaciones no leídas
- **Dropdown** con lista de notificaciones
- **Actualización en tiempo real** usando Supabase Realtime
- **Marcar como leída** al hacer click en una notificación
- **Marcar todas como leídas** con un solo botón
- **Formato de tiempo relativo** (Hace 5m, Hace 2h, etc.)
- **Iconos distintivos** según el tipo de notificación:
  - 📋 Solicitud pendiente de aprobación
  - ✅ Solicitud aprobada
  - ❌ Solicitud rechazada
  - 📨 Invitación para presentar propuesta

#### Integración:
- Integrado en el `Sidebar` de todos los usuarios
- Visible para todos los roles (creator, approver, supplier)
- Carga automática al iniciar sesión
- Suscripción a cambios en tiempo real

### 3. Seguridad y Permisos (RLS)

Se configuraron políticas de seguridad para la tabla `notifications`:

```sql
-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users_profile WHERE user_id = auth.uid()
  ));

-- Los usuarios pueden actualizar sus propias notificaciones
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users_profile WHERE user_id = auth.uid()
  ));

-- El sistema puede insertar notificaciones
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### 4. Optimización de Performance

Se agregaron índices para mejorar el rendimiento:

```sql
-- Índice para consultas de notificaciones no leídas
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- Índice para búsqueda de approvers activos
CREATE INDEX idx_users_profile_role_active
  ON users_profile(role, is_active)
  WHERE is_active = true;
```

## Flujo de Trabajo

### Escenario 1: Creator envía solicitud
1. Creator completa el wizard y envía solicitud (cambia a `pending_approval`)
2. **Trigger automático** crea notificaciones para todos los approvers
3. Approvers ven inmediatamente el badge de notificaciones actualizado
4. Al hacer click, ven la nueva solicitud pendiente

### Escenario 2: Approver aprueba solicitud
1. Approver revisa y aprueba la solicitud (cambia a `approved`)
2. **Trigger automático** crea dos tipos de notificaciones:
   - Notificación para el creator confirmando la aprobación
   - Notificaciones para todos los suppliers invitados
3. Creator y suppliers ven inmediatamente sus nuevas notificaciones
4. Suppliers pueden acceder directamente a crear su propuesta

### Escenario 3: Approver rechaza solicitud
1. Approver rechaza la solicitud con comentarios (cambia a `cancelled`)
2. **Trigger automático** crea notificación para el creator
3. Creator ve la notificación con el motivo del rechazo
4. Creator puede revisar y corregir la solicitud

## Archivos Modificados/Creados

### Nuevos Archivos:
- `/supabase/migrations/20251029000000_create_notification_triggers.sql` - Migration con triggers
- `/src/components/shared/NotificationBell.tsx` - Componente de notificaciones

### Archivos Modificados:
- `/src/components/layout/Sidebar.tsx` - Integración del componente de notificaciones

## Testing

Para probar el sistema:

1. **Como Creator:**
   - Crear una nueva solicitud y enviarla a aprobación
   - Verificar que no aparece ninguna notificación al creator (correcto)

2. **Como Approver:**
   - Verificar que aparece notificación de nueva solicitud pendiente
   - Aprobar o rechazar la solicitud

3. **Verificar notificaciones:**
   - Creator debe recibir notificación de aprobación/rechazo
   - Suppliers deben recibir notificación de invitación (si fue aprobada)

4. **Interacción:**
   - Click en notificación debe marcarla como leída
   - Badge debe actualizarse automáticamente
   - Botón "Marcar todas como leídas" debe funcionar

## Próximas Mejoras Sugeridas

1. **Notificaciones adicionales:**
   - Cuando un supplier envía una propuesta
   - Cuando se solicita ajuste a una propuesta
   - Cuando se adjudica un contrato
   - Cuando se rechaza una propuesta

2. **Funcionalidades avanzadas:**
   - Navegación directa al hacer click en notificación
   - Notificaciones por email
   - Configuración de preferencias de notificaciones
   - Historial completo de notificaciones

3. **UI/UX:**
   - Sonido o vibración al recibir notificación
   - Preview de la solicitud en el hover
   - Filtros por tipo de notificación
   - Búsqueda en notificaciones
