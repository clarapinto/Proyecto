import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ChevronRight, TrendingDown, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import ProposalForm from './ProposalForm';
import ProposalHistory from './ProposalHistory';
import RoundFeedbackDisplay from './RoundFeedbackDisplay';
import type { Database } from '../../lib/database.types';

type Request = Database['public']['Tables']['requests']['Row'];

interface ProposalViewProps {
  requestId: string;
  onBack: () => void;
}

export default function ProposalView({ requestId, onBack }: ProposalViewProps) {
  const { profile } = useAuth();
  const [request, setRequest] = useState<Request | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [currentRoundProposal, setCurrentRoundProposal] = useState<any>(null);
  const [previousRoundProposal, setPreviousRoundProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'round-feedback'>('overview');

  useEffect(() => {
    if (profile?.email && requestId) {
      loadData();
    }
  }, [profile, requestId]);

  const loadData = async () => {
    if (!profile?.email || !requestId) return;

    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('id')
      .eq('contact_email', profile.email)
      .maybeSingle();

    if (!supplierData) {
      setLoading(false);
      return;
    }

    setSupplierId(supplierData.id);

    const { data: requestData } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (requestData) {
      setRequest(requestData);
    }

    const { data: currentProposalData } = await supabase
      .from('proposals')
      .select(`
        *,
        items:proposal_items(*)
      `)
      .eq('request_id', requestId)
      .eq('supplier_id', supplierData.id)
      .eq('round_number', requestData?.current_round || 1)
      .maybeSingle();

    setCurrentRoundProposal(currentProposalData);

    if (requestData && requestData.current_round > 1) {
      const { data: prevProposalData } = await supabase
        .from('proposals')
        .select(`
          *,
          items:proposal_items(*)
        `)
        .eq('request_id', requestId)
        .eq('supplier_id', supplierData.id)
        .eq('round_number', requestData.current_round - 1)
        .eq('status', 'submitted')
        .maybeSingle();

      setPreviousRoundProposal(prevProposalData);
    }

    setLoading(false);
  };

  const handleProposalSubmitted = () => {
    setShowForm(false);
    setViewMode('overview');
    loadData();
  };

  const isRound1 = request?.current_round === 1;
  const isRound2Plus = request && request.current_round > 1;
  const hasSubmittedCurrentRound = currentRoundProposal?.status === 'submitted';
  const canSubmitProposal = !hasSubmittedCurrentRound;

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!request || !supplierId) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Solicitud no encontrada</p>
        </Card>
      </div>
    );
  }

  if (showForm) {
    return (
      <div>
        <div className="p-8 pb-4">
          <Button
            variant="ghost"
            onClick={() => {
              setShowForm(false);
              setViewMode('overview');
            }}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
        <ProposalForm
          requestId={requestId}
          previousProposal={previousRoundProposal}
          onSubmitted={handleProposalSubmitted}
        />
      </div>
    );
  }

  if (viewMode === 'round-feedback' && isRound2Plus && previousRoundProposal) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setViewMode('overview')}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Resumen
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Análisis Comparativo - Ronda {request.current_round}
          </h1>
          <p className="text-gray-600">
            Revisa cómo te comparas con otras productoras antes de enviar tu nueva propuesta
          </p>
        </div>

        <RoundFeedbackDisplay
          requestId={requestId}
          supplierId={supplierId}
          currentRound={request.current_round}
          proposalId={previousRoundProposal?.id}
        />

        <div className="mt-6 flex items-center space-x-4">
          <Button onClick={() => setShowForm(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            {previousRoundProposal
              ? `Editar y Enviar Propuesta para Ronda ${request.current_round}`
              : `Enviar Nueva Propuesta para Ronda ${request.current_round}`
            }
          </Button>
          <Button variant="outline" onClick={() => setViewMode('overview')}>
            Volver al Resumen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Invitaciones
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{request.title}</h1>
        <p className="text-gray-600">{request.description}</p>
        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
          <span>Número: {request.request_number}</span>
          <span>•</span>
          <span>Ronda actual: {request.current_round}/{request.max_rounds}</span>
          {request.round_deadline && (
            <>
              <span>•</span>
              <span>
                Fecha límite: {new Date(request.round_deadline).toLocaleDateString('es-ES')}
              </span>
            </>
          )}
        </div>
      </div>

      {isRound2Plus && previousRoundProposal && canSubmitProposal && (
        <div className="mb-6">
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-blue-900">
                    Nueva Ronda Disponible - Ronda {request.current_round}
                  </h3>
                </div>
                <p className="text-sm text-blue-800 mb-4">
                  Tu propuesta de la ronda anterior ha sido evaluada. Ahora puedes ver cómo te comparas con otras productoras y enviar una propuesta mejorada y más competitiva.
                </p>
                <Button
                  onClick={() => setViewMode('round-feedback')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Ver Análisis Comparativo y Estadísticas
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isRound2Plus && previousRoundProposal && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Tu Propuesta Anterior - Ronda {previousRoundProposal.round_number}
          </h2>
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Propuesta Ronda {previousRoundProposal.round_number}
                  </h3>
                  <Badge variant="info">Enviada</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Enviada el {new Date(previousRoundProposal.submitted_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Total</div>
                <div className="text-2xl font-bold text-blue-600">
                  ${previousRoundProposal.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Subtotal</div>
                <div className="font-semibold text-gray-900">
                  ${previousRoundProposal.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Honorarios</div>
                <div className="font-semibold text-gray-900">
                  ${previousRoundProposal.fee_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total</div>
                <div className="font-semibold text-blue-600">
                  ${previousRoundProposal.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {previousRoundProposal.items && previousRoundProposal.items.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Ítems de la Propuesta ({previousRoundProposal.items.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {previousRoundProposal.items.map((item: any, idx: number) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg p-3 bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm mb-1">
                            {idx + 1}. {item.item_name}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-600">{item.description}</p>
                          )}
                          <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                            <span>Cantidad: {item.quantity}</span>
                            <span>•</span>
                            <span>Precio unitario: ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-semibold text-gray-900">
                            ${item.total_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {hasSubmittedCurrentRound && (
        <Card className="p-6 mb-6 bg-green-50 border-green-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">
                Propuesta Enviada para Ronda {request.current_round}
              </h3>
              <p className="text-sm text-green-700">
                Tu propuesta ha sido enviada y está siendo evaluada.
                {request.current_round < request.max_rounds &&
                  ' Podrás enviar una nueva propuesta cuando se abra la siguiente ronda.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {canSubmitProposal && !isRound2Plus && (
        <div className="mb-6">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Ronda {request.current_round} - Envía tu Propuesta
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              Esta es la primera ronda. Prepara tu mejor oferta especificando cada ítem con su precio.
            </p>
            <Button onClick={() => setShowForm(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Crear y Enviar Propuesta
            </Button>
          </Card>
        </div>
      )}

      {isRound2Plus && (
        <div className="mb-6">
          <RoundFeedbackDisplay
            requestId={requestId}
            supplierId={supplierId}
            currentRound={request.current_round}
            proposalId={previousRoundProposal?.id}
          />
        </div>
      )}

      <ProposalHistory requestId={requestId} supplierId={supplierId} />
    </div>
  );
}
