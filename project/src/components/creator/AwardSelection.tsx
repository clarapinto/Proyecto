import { useState, useEffect } from 'react';
import { Award, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Button from '../shared/Button';
import TextArea from '../shared/TextArea';
import Badge from '../shared/Badge';

interface Proposal {
  id: string;
  supplier_id: string;
  total_amount: number;
  round_number: number;
  supplier: {
    id: string;
    name: string;
  };
  items: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface AwardSelectionProps {
  requestId: string;
  onComplete: () => void;
}

export default function AwardSelection({ requestId, onComplete }: AwardSelectionProps) {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProposals();
  }, [requestId]);

  const loadProposals = async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        supplier:suppliers(id, name),
        items:proposal_items(item_name, quantity, unit_price, total_price)
      `)
      .eq('request_id', requestId)
      .eq('status', 'submitted')
      .order('total_amount', { ascending: true });

    if (error) {
      console.error('Error loading proposals:', error);
      return;
    }

    setProposals(data as any);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedProposalId || !profile?.id) return;

    const selectedProposal = proposals.find(p => p.id === selectedProposalId);
    if (!selectedProposal) return;

    const lowestProposal = proposals[0];
    const isLowestPrice = selectedProposal.id === lowestProposal.id;

    if (!isLowestPrice && !justification.trim()) {
      alert('Debes proporcionar una justificación si no seleccionas la propuesta más baja');
      return;
    }

    setSubmitting(true);

    try {
      const { error: selectionError } = await supabase
        .from('award_selections')
        .upsert({
          request_id: requestId,
          selected_proposal_id: selectedProposal.id,
          selected_supplier_id: selectedProposal.supplier_id,
          selected_amount: selectedProposal.total_amount,
          is_lowest_price: isLowestPrice,
          creator_justification: justification || null,
          selected_by: profile.id,
          status: 'pending_approval',
        });

      if (selectionError) throw selectionError;

      const { error: requestError } = await supabase
        .from('requests')
        .update({ status: 'evaluation', round_status: 'award_pending' })
        .eq('id', requestId);

      if (requestError) throw requestError;

      alert('Selección enviada para aprobación final');
      onComplete();
    } catch (error) {
      console.error('Error submitting award selection:', error);
      alert('Error al enviar la selección');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8">
        <p className="text-center text-gray-500">Cargando propuestas...</p>
      </Card>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No hay propuestas para adjudicar</p>
      </Card>
    );
  }

  const lowestProposal = proposals[0];
  const selectedProposal = proposals.find(p => p.id === selectedProposalId);
  const isLowestPrice = selectedProposal?.id === lowestProposal.id;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Award className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Seleccionar Adjudicación</h2>
            <p className="text-sm text-gray-600">
              Elige la propuesta ganadora para enviar a aprobación final
            </p>
          </div>
        </div>

        {!isLowestPrice && selectedProposalId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 mb-2">
                  Justificación Requerida
                </p>
                <p className="text-sm text-yellow-800 mb-3">
                  Has seleccionado una propuesta que NO es la más baja. Debes proporcionar una
                  justificación detallada.
                </p>
                <TextArea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explica por qué esta propuesta ofrece mejor valor a pesar de no ser la más baja..."
                  rows={4}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((proposal, index) => {
            const isSelected = selectedProposalId === proposal.id;
            const isLowest = index === 0;

            return (
              <button
                key={proposal.id}
                onClick={() => setSelectedProposalId(proposal.id)}
                className={`p-6 rounded-lg border-2 text-left transition ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {proposal.supplier.name}
                    </h3>
                    <p className="text-sm text-gray-600">Ronda {proposal.round_number}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {isLowest && <Badge variant="success">Más Baja</Badge>}
                    {isSelected && (
                      <div className="bg-blue-600 rounded-full p-1">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-2xl font-bold text-gray-900">
                    ${proposal.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Monto Total</p>
                </div>

                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">{proposal.items.length} ítems incluidos</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {proposal.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-gray-600">{item.item_name}</span>
                        <span className="font-medium">${item.total_price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {!isLowest && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      +${(proposal.total_amount - lowestProposal.total_amount).toLocaleString()} vs
                      más baja
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => onComplete()}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={!selectedProposalId || submitting}>
          {submitting ? 'Enviando...' : 'Enviar para Aprobación Final'}
        </Button>
      </div>
    </div>
  );
}
