import { useState, useEffect } from 'react';
import { Calendar, DollarSign, User, CheckCircle, X, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import TextArea from '../shared/TextArea';
import type { Database } from '../../lib/database.types';

type Request = Database['public']['Tables']['requests']['Row'] & {
  creator?: { full_name: string };
};

export default function PendingApprovalList() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    const { data } = await supabase
      .from('requests')
      .select(`
        *,
        creator:users_profile!requests_creator_id_fkey(full_name)
      `)
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data as Request[]);
    }
    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);

    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) {
        alert('Solicitud no encontrada');
        setActionLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('requests')
        .update({
          status: 'active',
          approved_by: profile!.id,
          approved_at: new Date().toISOString(),
          approval_comments: comments || null,
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: request.creator_id,
        title: 'Solicitud Aprobada',
        message: `Tu solicitud "${request.title}" ha sido aprobada`,
        type: 'approved',
        related_id: requestId,
      });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      const { data: invitations } = await supabase
        .from('request_invitations')
        .select('supplier_id, supplier:suppliers(contact_email)')
        .eq('request_id', requestId);

      if (invitations && invitations.length > 0) {
        const supplierNotifications = invitations.map((inv: any) => ({
          user_id: inv.supplier_id,
          title: 'Nueva Invitación',
          message: `Has sido invitado a participar en "${request.title}"`,
          type: 'invitation',
          related_id: requestId,
        }));

        const { error: supplierNotifError } = await supabase
          .from('notifications')
          .insert(supplierNotifications);

        if (supplierNotifError) {
          console.error('Error creating supplier notifications:', supplierNotifError);
        }

        const { error: invUpdateError } = await supabase
          .from('request_invitations')
          .update({ notified_at: new Date().toISOString() })
          .eq('request_id', requestId);

        if (invUpdateError) {
          console.error('Error updating invitation timestamps:', invUpdateError);
        }
      }

      alert('Solicitud aprobada exitosamente');
      await loadPendingRequests();
      setSelectedRequest(null);
      setComments('');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error al aprobar la solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!comments.trim()) {
      alert('Por favor proporciona comentarios para el rechazo');
      return;
    }

    setActionLoading(true);

    const { error } = await supabase
      .from('requests')
      .update({
        status: 'draft',
        approval_comments: comments,
      })
      .eq('id', requestId);

    if (!error) {
      await loadPendingRequests();
      setSelectedRequest(null);
      setComments('');
    }

    setActionLoading(false);
  };

  const handleDeleteRequest = async (requestId: string, requestTitle: string) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar la solicitud "${requestTitle}"?\n\nEsta acción eliminará permanentemente la solicitud y no se puede deshacer.`
    );

    if (!confirmed) return;

    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      alert('Solicitud eliminada exitosamente');
      await loadPendingRequests();
      setSelectedRequest(null);
      setComments('');
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Error al eliminar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando solicitudes pendientes...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pendientes de Aprobación</h1>
        <p className="text-gray-600">Revisar y aprobar solicitudes de compras</p>
      </div>

      {requests.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No hay solicitudes pendientes de aprobación</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                    <Badge variant="warning">Pendiente Aprobación</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{request.request_number}</p>
                  <p className="text-sm text-gray-500 mb-3">{request.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{(request.creator as any)?.full_name || 'Desconocido'}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(request.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>
                    {request.internal_budget
                      ? `$${request.internal_budget.toLocaleString()}`
                      : 'N/A'}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <span className="capitalize">{request.event_type.replace('_', ' ')}</span>
                </div>
              </div>

              {selectedRequest?.id === request.id ? (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                  <TextArea
                    label="Comentarios (opcional para aprobar, requerido para rechazar)"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Agrega tus comentarios o retroalimentación aquí..."
                    rows={3}
                  />
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="primary"
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleReject(request.id)}
                      disabled={actionLoading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button variant="ghost" onClick={() => setSelectedRequest(null)}>
                      Cancelar
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteRequest(request.id, request.title)}
                      disabled={actionLoading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar Solicitud
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-4">
                  <Button size="sm" onClick={() => setSelectedRequest(request)}>
                    Revisar y Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteRequest(request.id, request.title)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
