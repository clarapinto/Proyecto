import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import ProposalComparison from '../shared/ProposalComparison';

interface Request {
  id: string;
  request_number: string;
  title: string;
  description: string;
  event_type: string;
  status: string;
  internal_budget: number | null;
  created_at: string;
}

interface RequestProposalsViewProps {
  requestId: string;
  onBack: () => void;
}

export default function RequestProposalsView({ requestId, onBack }: RequestProposalsViewProps) {
  const [request, setRequest] = useState<Request | null>(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      setRequest(requestData);

      const { count, error: countError } = await supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('request_id', requestId)
        .eq('status', 'submitted');

      if (countError) throw countError;

      setProposalCount(count || 0);
    } catch (error) {
      console.error('Error loading request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-center text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Solicitud no encontrada</p>
          <Button onClick={onBack} className="mt-4">
            Volver
          </Button>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'warning' | 'success' | 'error'; label: string }> = {
      draft: { variant: 'default', label: 'Borrador' },
      pending_approval: { variant: 'warning', label: 'Pendiente Aprobación' },
      approved: { variant: 'success', label: 'Aprobada' },
      active: { variant: 'success', label: 'Activa' },
      evaluation: { variant: 'warning', label: 'En Evaluación' },
      awarded: { variant: 'success', label: 'Adjudicada' },
      cancelled: { variant: 'error', label: 'Cancelada' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Mis Solicitudes
        </Button>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{request.title}</h1>
              <p className="text-sm text-gray-500">{request.request_number}</p>
            </div>
            {getStatusBadge(request.status)}
          </div>

          <p className="text-gray-700 mb-4">{request.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tipo de Evento</p>
              <p className="font-medium text-gray-900">
                {request.event_type.replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Fecha de Creación</p>
              <p className="font-medium text-gray-900">
                {new Date(request.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Propuestas Recibidas</p>
              <p className="font-medium text-gray-900">{proposalCount}</p>
            </div>
            {request.internal_budget && (
              <div>
                <p className="text-gray-500">Presupuesto Interno</p>
                <p className="font-medium text-gray-900">
                  ${request.internal_budget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {proposalCount > 0 ? (
        <ProposalComparison requestId={requestId} internalBudget={request.internal_budget} />
      ) : (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-2">
            Aún no se han recibido propuestas para esta solicitud
          </p>
          <p className="text-sm text-gray-400">
            Los proveedores invitados podrán enviar sus propuestas en breve
          </p>
        </Card>
      )}
    </div>
  );
}
