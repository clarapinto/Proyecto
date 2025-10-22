import { useState, useEffect } from 'react';
import { AlertCircle, Edit, Trash2, PlusCircle, TrendingUp, TrendingDown, Eye, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import Button from '../shared/Button';

interface ItemFeedback {
  id: string;
  proposal_item_id: string;
  round_number: number;
  action: string;
  feedback_text: string;
  suggested_price: number | null;
  created_at: string;
}

interface RoundSuggestion {
  id: string;
  item_name: string;
  description: string;
  suggested_quantity: number;
  notes: string | null;
  round_number: number;
}

interface ProposalStats {
  myTotal: number;
  avgTotal: number;
  lowestTotal: number;
  highestTotal: number;
  myPosition: string;
  percentAboveAverage: number | null;
  percentAboveLowest: number | null;
}

interface RoundFeedbackDisplayProps {
  requestId: string;
  supplierId: string;
  currentRound: number;
  proposalId?: string;
}

interface RoundSubmissionState {
  round: number;
  submitted: boolean;
  proposalId: string | null;
}

export default function RoundFeedbackDisplay({
  requestId,
  supplierId,
  currentRound,
  proposalId,
}: RoundFeedbackDisplayProps) {
  const [feedback, setFeedback] = useState<ItemFeedback[]>([]);
  const [suggestions, setSuggestions] = useState<RoundSuggestion[]>([]);
  const [stats, setStats] = useState<ProposalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionStates, setSubmissionStates] = useState<RoundSubmissionState[]>([]);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadFeedbackAndStats();
  }, [requestId, supplierId, currentRound]);

  const loadFeedbackAndStats = async () => {
    if (currentRound > 1 && proposalId) {
      const { data: feedbackData } = await supabase
        .from('round_item_feedback')
        .select(`
          *,
          proposal_item:proposal_items(item_name, unit_price, total_price)
        `)
        .eq('proposal_id', proposalId)
        .eq('round_number', currentRound - 1);

      if (feedbackData) {
        setFeedback(feedbackData as any);
      }
    }

    const { data: suggestionsData } = await supabase
      .from('round_suggestions')
      .select('*')
      .eq('request_id', requestId)
      .eq('round_number', currentRound);

    if (suggestionsData) {
      setSuggestions(suggestionsData);
    }

    if (currentRound > 1) {
      await loadComparisonStats();
    }

    await loadSubmissionStates();

    setLoading(false);
  };

  const loadSubmissionStates = async () => {
    const { data: allProposals } = await supabase
      .from('proposals')
      .select('round_number, status, id')
      .eq('request_id', requestId)
      .eq('supplier_id', supplierId)
      .order('round_number', { ascending: true });

    if (allProposals) {
      const states: RoundSubmissionState[] = [];
      for (let round = 1; round <= currentRound; round++) {
        const proposal = allProposals.find(
          (p) => p.round_number === round && p.status === 'submitted'
        );
        states.push({
          round,
          submitted: !!proposal,
          proposalId: proposal?.id || null,
        });
      }
      setSubmissionStates(states);
    }
  };

  const loadComparisonStats = async () => {
    const { data: allProposals } = await supabase
      .from('proposals')
      .select('total_amount, supplier_id')
      .eq('request_id', requestId)
      .eq('round_number', currentRound - 1)
      .eq('status', 'submitted');

    if (!allProposals || allProposals.length < 2) return;

    const myProposal = allProposals.find((p) => p.supplier_id === supplierId);
    if (!myProposal) return;

    const amounts = allProposals.map((p) => p.total_amount).sort((a, b) => a - b);
    const lowest = amounts[0];
    const highest = amounts[amounts.length - 1];
    const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const myTotal = myProposal.total_amount;

    const sortedByAmount = allProposals.sort((a, b) => a.total_amount - b.total_amount);
    const myIndex = sortedByAmount.findIndex((p) => p.supplier_id === supplierId);
    const position =
      myIndex === 0
        ? 'Más baja'
        : myIndex === sortedByAmount.length - 1
        ? 'Más alta'
        : `${myIndex + 1}° de ${sortedByAmount.length}`;

    setStats({
      myTotal,
      avgTotal: avg,
      lowestTotal: lowest,
      highestTotal: highest,
      myPosition: position,
      percentAboveAverage: myTotal > avg ? ((myTotal - avg) / avg) * 100 : null,
      percentAboveLowest: myTotal > lowest ? ((myTotal - lowest) / lowest) * 100 : null,
    });
  };

  const toggleRoundExpansion = (round: number) => {
    const newExpanded = new Set(expandedRounds);
    if (newExpanded.has(round)) {
      newExpanded.delete(round);
    } else {
      newExpanded.add(round);
    }
    setExpandedRounds(newExpanded);
  };

  const isRoundSubmitted = (round: number): boolean => {
    return submissionStates.some((s) => s.round === round && s.submitted);
  };

  const shouldShowComparisonButton = (round: number): boolean => {
    if (!stats) return false;
    return stats.myPosition === 'Más alta';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">Cargando información...</p>
      </Card>
    );
  }

  const hasFeedback = feedback.length > 0;
  const hasSuggestions = suggestions.length > 0;
  const hasStats = stats !== null && currentRound > 1;

  if (!hasFeedback && !hasSuggestions && !hasStats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {hasStats && stats && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Comparativa - Ronda {currentRound - 1}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium mb-1">Tu Propuesta</p>
              <p className="text-2xl font-bold text-blue-700">
                ${stats.myTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-600 mt-1">{stats.myPosition}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 font-medium mb-1">Promedio</p>
              <p className="text-2xl font-bold text-gray-700">
                ${stats.avgTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-600 mt-1">Todas las propuestas</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium mb-1">Más Baja</p>
              <p className="text-2xl font-bold text-green-700">
                ${stats.lowestTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-600 mt-1">Mejor oferta</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-600 font-medium mb-1">Más Alta</p>
              <p className="text-2xl font-bold text-orange-700">
                ${stats.highestTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-orange-600 mt-1">Mayor precio</p>
            </div>
          </div>

          {(stats.percentAboveAverage !== null || stats.percentAboveLowest !== null) && shouldShowComparisonButton(currentRound - 1) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    Oportunidad de Mejora
                  </h4>
                  <div className="space-y-1 text-sm text-yellow-800">
                    {stats.percentAboveLowest !== null && (
                      <p>
                        Tu propuesta está{' '}
                        <span className="font-bold">
                          {stats.percentAboveLowest.toFixed(1)}% más alta
                        </span>{' '}
                        que la propuesta más baja
                      </p>
                    )}
                    {stats.percentAboveAverage !== null && (
                      <p>
                        Tu propuesta está{' '}
                        <span className="font-bold">
                          {stats.percentAboveAverage.toFixed(1)}% por encima del promedio
                        </span>
                      </p>
                    )}
                    <p className="text-xs mt-2 text-yellow-700">
                      💡 Considera ajustar tus precios para ser más competitivo en esta ronda
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {submissionStates
                      .filter((state) => state.round < currentRound)
                      .map((state) => {
                        const submitted = isRoundSubmitted(currentRound);
                        const isExpanded = expandedRounds.has(state.round);

                        return (
                          <div key={state.round}>
                            <Button
                              variant={submitted ? 'ghost' : 'primary'}
                              size="sm"
                              onClick={() => toggleRoundExpansion(state.round)}
                              disabled={submitted}
                              className="w-full justify-between"
                            >
                              <span className="flex items-center">
                                {submitted ? (
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                ) : (
                                  <Eye className="w-4 h-4 mr-2" />
                                )}
                                {submitted
                                  ? `Propuesta enviada - Ronda ${currentRound}`
                                  : `Ver detalles comparativos - Ronda ${state.round}`}
                              </span>
                              {submitted && <Lock className="w-4 h-4 ml-2" />}
                            </Button>

                            {isExpanded && !submitted && (
                              <div className="mt-3 p-4 bg-white border border-yellow-300 rounded-lg">
                                <h5 className="font-semibold text-gray-900 mb-3">
                                  Análisis Detallado - Ronda {state.round}
                                </h5>
                                <div className="space-y-3 text-sm">
                                  <div className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                                    <span className="text-gray-700">Tu propuesta total:</span>
                                    <span className="font-bold text-red-700">
                                      ${stats.myTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                                    <span className="text-gray-700">Propuesta más baja:</span>
                                    <span className="font-bold text-green-700">
                                      ${stats.lowestTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-200">
                                    <span className="text-gray-700">Diferencia:</span>
                                    <span className="font-bold text-orange-700">
                                      ${(stats.myTotal - stats.lowestTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                    <p className="text-blue-900 font-medium mb-1">Recomendación:</p>
                                    <p className="text-blue-800">
                                      Para ser competitivo, considera reducir tu propuesta al menos{' '}
                                      <span className="font-bold">
                                        ${((stats.myTotal - stats.lowestTotal) * 0.5).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                      </span>{' '}
                                      para acercarte más a la oferta más baja.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {stats.myTotal === stats.lowestTotal && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 mb-1">
                    ¡Excelente Posición!
                  </h4>
                  <p className="text-sm text-green-800">
                    Tu propuesta es la más competitiva en precio. Mantén esta ventaja en la
                    siguiente ronda.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {hasFeedback && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
            Feedback del Cliente - Ronda {currentRound - 1}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            El cliente ha proporcionado comentarios sobre tu propuesta anterior. Revisa estos
            puntos para tu nueva propuesta.
          </p>

          <div className="space-y-3">
            {feedback.map((fb) => {
              const item = (fb as any).proposal_item;
              const isModify = fb.action === 'modify';
              const isDelete = fb.action === 'delete';

              return (
                <div
                  key={fb.id}
                  className={`p-4 rounded-lg border-2 ${
                    isDelete
                      ? 'border-red-300 bg-red-50'
                      : isModify
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {isDelete ? (
                          <Trash2 className="w-4 h-4 text-red-600" />
                        ) : isModify ? (
                          <Edit className="w-4 h-4 text-yellow-600" />
                        ) : null}
                        <p className="font-semibold text-gray-900">{item?.item_name}</p>
                      </div>
                      {item && (
                        <p className="text-sm text-gray-600">
                          Precio anterior: ${item.unit_price.toLocaleString()} × {item.quantity} = $
                          {item.total_price.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={isDelete ? 'error' : isModify ? 'warning' : 'default'}>
                      {isDelete ? 'Eliminar' : isModify ? 'Modificar' : 'Revisar'}
                    </Badge>
                  </div>

                  <div
                    className={`p-3 rounded ${
                      isDelete
                        ? 'bg-red-100'
                        : isModify
                        ? 'bg-yellow-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <p className="text-sm text-gray-900 font-medium mb-1">
                      Comentario del cliente:
                    </p>
                    <p className="text-sm text-gray-700">{fb.feedback_text}</p>

                    {fb.suggested_price && (
                      <p className="text-sm text-gray-900 font-medium mt-2">
                        Precio sugerido: ${fb.suggested_price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {hasSuggestions && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2 text-green-600" />
            Nuevos Ítems Solicitados - Ronda {currentRound}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            El cliente solicita que incluyas los siguientes ítems en tu nueva propuesta.
          </p>

          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 rounded-lg border-2 border-green-300 bg-green-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{suggestion.item_name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Cantidad sugerida: {suggestion.suggested_quantity}
                    </p>
                  </div>
                  <Badge variant="success">Nuevo</Badge>
                </div>

                <div className="bg-green-100 p-3 rounded mt-2">
                  <p className="text-sm text-gray-900 font-medium mb-1">Descripción:</p>
                  <p className="text-sm text-gray-700">{suggestion.description}</p>

                  {suggestion.notes && (
                    <>
                      <p className="text-sm text-gray-900 font-medium mt-2 mb-1">
                        Notas adicionales:
                      </p>
                      <p className="text-sm text-gray-700">{suggestion.notes}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
