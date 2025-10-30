/*
  # Sistema de Notificaciones Automáticas
  
  ## Descripción
  Este migration crea triggers automáticos para generar notificaciones en tiempo real
  cuando ocurren eventos importantes en el flujo de solicitudes.
  
  ## Triggers Implementados
  
  1. **Notificación a Approvers cuando se envía solicitud**
     - Se activa cuando una solicitud cambia a estado 'pending_approval'
     - Notifica a todos los usuarios con rol 'procurement_approver'
     - Tipo de notificación: 'request_pending_approval'
  
  2. **Notificación a Creator cuando se aprueba/rechaza solicitud**
     - Se activa cuando una solicitud cambia de 'pending_approval' a 'approved' o 'cancelled'
     - Notifica al creator de la solicitud
     - Tipo de notificación: 'request_approved' o 'request_rejected'
  
  3. **Notificación a Suppliers cuando se aprueba solicitud**
     - Se activa cuando una solicitud cambia a estado 'approved'
     - Notifica a todos los suppliers invitados en request_invitations
     - Tipo de notificación: 'invitation_to_bid'
  
  ## Seguridad
  - Las funciones se ejecutan con privilegios de SECURITY DEFINER
  - Esto permite insertar notificaciones sin problemas de RLS
*/

-- =====================================================
-- FUNCIÓN: Notificar a Approvers sobre nueva solicitud
-- =====================================================
CREATE OR REPLACE FUNCTION notify_approvers_new_request()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  approver_record RECORD;
  request_info RECORD;
BEGIN
  -- Solo ejecutar si el estado cambió a 'pending_approval'
  IF NEW.status = 'pending_approval' AND (OLD.status IS NULL OR OLD.status != 'pending_approval') THEN
    
    -- Obtener información de la solicitud
    SELECT 
      r.request_number,
      r.title,
      up.full_name as creator_name
    INTO request_info
    FROM requests r
    JOIN users_profile up ON up.id = r.creator_id
    WHERE r.id = NEW.id;
    
    -- Crear notificación para cada approver
    FOR approver_record IN 
      SELECT id, full_name 
      FROM users_profile 
      WHERE role = 'procurement_approver' 
      AND is_active = true
    LOOP
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_id,
        is_read
      ) VALUES (
        approver_record.id,
        'Nueva solicitud pendiente de aprobación',
        format('La solicitud %s - "%s" creada por %s requiere su aprobación.', 
          request_info.request_number,
          request_info.title,
          request_info.creator_name
        ),
        'request_pending_approval',
        NEW.id,
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- FUNCIÓN: Notificar a Creator sobre aprobación/rechazo
-- =====================================================
CREATE OR REPLACE FUNCTION notify_creator_request_decision()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  request_info RECORD;
  approver_name TEXT;
BEGIN
  -- Solo ejecutar si el estado cambió desde 'pending_approval'
  IF OLD.status = 'pending_approval' AND (NEW.status = 'approved' OR NEW.status = 'cancelled') THEN
    
    -- Obtener información de la solicitud y el approver
    SELECT 
      r.request_number,
      r.title,
      r.creator_id,
      up.full_name as approver_name
    INTO request_info
    FROM requests r
    LEFT JOIN users_profile up ON up.id = NEW.approved_by
    WHERE r.id = NEW.id;
    
    -- Crear notificación para el creator
    IF NEW.status = 'approved' THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_id,
        is_read
      ) VALUES (
        request_info.creator_id,
        'Solicitud aprobada',
        format('Su solicitud %s - "%s" ha sido aprobada por %s.', 
          request_info.request_number,
          request_info.title,
          COALESCE(request_info.approver_name, 'un aprobador')
        ),
        'request_approved',
        NEW.id,
        false
      );
    ELSIF NEW.status = 'cancelled' THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_id,
        is_read
      ) VALUES (
        request_info.creator_id,
        'Solicitud rechazada',
        format('Su solicitud %s - "%s" ha sido rechazada.%s', 
          request_info.request_number,
          request_info.title,
          CASE 
            WHEN NEW.approval_comments IS NOT NULL 
            THEN format(' Motivo: %s', NEW.approval_comments)
            ELSE ''
          END
        ),
        'request_rejected',
        NEW.id,
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- FUNCIÓN: Notificar a Suppliers sobre solicitud aprobada
-- =====================================================
CREATE OR REPLACE FUNCTION notify_suppliers_request_approved()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supplier_record RECORD;
  request_info RECORD;
BEGIN
  -- Solo ejecutar si el estado cambió a 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Obtener información de la solicitud
    SELECT 
      r.request_number,
      r.title,
      r.round_deadline
    INTO request_info
    FROM requests r
    WHERE r.id = NEW.id;
    
    -- Crear notificación para cada supplier invitado
    FOR supplier_record IN 
      SELECT 
        s.id,
        s.name,
        up.id as user_profile_id
      FROM request_invitations ri
      JOIN suppliers s ON s.id = ri.supplier_id
      LEFT JOIN users_profile up ON up.email = s.contact_email AND up.role = 'supplier'
      WHERE ri.request_id = NEW.id
      AND s.is_active = true
    LOOP
      -- Solo crear notificación si existe un perfil de usuario para el supplier
      IF supplier_record.user_profile_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          related_id,
          is_read
        ) VALUES (
          supplier_record.user_profile_id,
          'Nueva invitación para presentar propuesta',
          format('Ha sido invitado a presentar una propuesta para la solicitud %s - "%s".%s', 
            request_info.request_number,
            request_info.title,
            CASE 
              WHEN request_info.round_deadline IS NOT NULL 
              THEN format(' Fecha límite: %s', to_char(request_info.round_deadline, 'DD/MM/YYYY'))
              ELSE ''
            END
          ),
          'invitation_to_bid',
          NEW.id,
          false
        );
        
        -- Actualizar notified_at en request_invitations
        UPDATE request_invitations
        SET notified_at = NOW()
        WHERE request_id = NEW.id 
        AND supplier_id = supplier_record.id;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- CREAR TRIGGERS
-- =====================================================

-- Trigger para notificar a approvers
DROP TRIGGER IF EXISTS trigger_notify_approvers ON requests;
CREATE TRIGGER trigger_notify_approvers
  AFTER INSERT OR UPDATE OF status ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_approvers_new_request();

-- Trigger para notificar a creator
DROP TRIGGER IF EXISTS trigger_notify_creator ON requests;
CREATE TRIGGER trigger_notify_creator
  AFTER UPDATE OF status ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_request_decision();

-- Trigger para notificar a suppliers
DROP TRIGGER IF EXISTS trigger_notify_suppliers ON requests;
CREATE TRIGGER trigger_notify_suppliers
  AFTER UPDATE OF status ON requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_suppliers_request_approved();

-- =====================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- =====================================================

-- Índice para búsqueda de notificaciones no leídas por usuario
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- Índice para búsqueda de approvers activos
CREATE INDEX IF NOT EXISTS idx_users_profile_role_active 
  ON users_profile(role, is_active)
  WHERE is_active = true;
