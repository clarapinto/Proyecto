import { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import RequestProposalsView from './RequestProposalsView';
import type { Database } from '../../lib/database.types';

type Request = Database['public']['Tables']['requests']['Row'] & {
  proposal_count?: number;
};

export default function ActiveRequestsList() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  useEffect(() => {
    loadActiveRequests();
  }, []);

  const loadActiveRequests = async () => {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .in('status', ['approved', 'active', 'evaluation'])
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

  const handleDeleteRequest = async (requestId: string, requestTitle: string) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar la solicitud "${requestTitle}"?\n\nEsta acción eliminará:\n- La solicitud\n- Todas las propuestas asociadas\n- Todas las invitaciones\n- Todo el feedback y datos relacionados\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      alert('Solicitud eliminada exitosamente');
      await loadActiveRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Error al eliminar la solicitud. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading active requests...</div>;
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Requests</h1>
        <p className="text-gray-600">Monitor ongoing procurement processes</p>
      </div>

      {requests.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No active requests at the moment</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                    <Badge variant={request.status === 'evaluation' ? 'warning' : 'info'}>
                      {request.status === 'approved' ? 'Awaiting Proposals' : request.status === 'active' ? 'Collecting Proposals' : 'In Evaluation'}
                    </Badge>
                    {request.proposal_count !== undefined && request.proposal_count > 0 && (
                      <Badge variant="success">{request.proposal_count} Propuestas</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{request.request_number}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{request.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {request.proposal_count !== undefined && request.proposal_count > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setSelectedRequestId(request.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Propuestas
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteRequest(request.id, request.title)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Deadline:{' '}
                    {request.round_deadline
                      ? new Date(request.round_deadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Round {request.current_round}/{request.max_rounds}
                  </span>
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
