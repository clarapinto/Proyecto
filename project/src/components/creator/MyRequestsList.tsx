import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import RequestProposalsView from './RequestProposalsView';
import type { Database } from '../../lib/database.types';

type Request = Database['public']['Tables']['requests']['Row'] & {
  proposal_count?: number;
};

export default function MyRequestsList() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadRequests();
    }
  }, [profile]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('creator_id', profile!.id)
      .order('created_at', { ascending: false });

    if (data) {
      const requestsWithCounts = await Promise.all(
        data.map(async (request) => {
          const { count } = await supabase
            .from('proposals')
            .select('id', { count: 'exact', head: true })
            .eq('request_id', request.id)
            .eq('status', 'submitted');

          return { ...request, proposal_count: count || 0 };
        })
      );

      setRequests(requestsWithCounts);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
      draft: { variant: 'default', label: 'Borrador' },
      pending_approval: { variant: 'warning', label: 'Pendiente Aprobación' },
      approved: { variant: 'info', label: 'Aprobada' },
      active: { variant: 'info', label: 'Activa' },
      evaluation: { variant: 'warning', label: 'En Evaluación' },
      awarded: { variant: 'success', label: 'Adjudicada' },
      cancelled: { variant: 'danger', label: 'Cancelada' },
    };

    const config = statusMap[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando solicitudes...</div>;
  }

  if (selectedRequestId) {
    return (
      <RequestProposalsView
        requestId={selectedRequestId}
        onBack={() => setSelectedRequestId(null)}
      />
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Solicitudes</h1>
        <p className="text-gray-600">Ver y gestionar tus solicitudes de compras</p>
      </div>

      {requests.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Aún no hay solicitudes. Crea tu primera solicitud para comenzar.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                    {getStatusBadge(request.status)}
                    {request.proposal_count !== undefined && request.proposal_count > 0 && (
                      <Badge variant="info">{request.proposal_count} Propuestas</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{request.request_number}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
                </div>
                {request.proposal_count !== undefined && request.proposal_count > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setSelectedRequestId(request.id)}
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Propuestas
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(request.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>Ronda {request.current_round}/{request.max_rounds}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="capitalize">{request.event_type.replace('_', ' ')}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
