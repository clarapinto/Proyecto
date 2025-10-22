import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Edit, PlusCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Button from '../shared/Button';
import TextArea from '../shared/TextArea';
import Input from '../shared/Input';

interface ProposalItem {
  id: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Proposal {
  id: string;
  supplier_id: string;
  round_number: number;
  total_amount: number;
  supplier: {
    name: string;
  };
  items: ProposalItem[];
}

interface ItemFeedback {
  itemId: string;
  action: 'modify' | 'delete' | 'accept';
  feedback: string;
  suggestedPrice?: string;
}

interface NewItemSuggestion {
  itemName: string;
  description: string;
  quantity: string;
  notes: string;
}

interface RoundFeedbackFormProps {
  requestId: string;
  currentRound: number;
  onComplete: () => void;
  onCancel: () => void;
}

export default function RoundFeedbackForm({
  requestId,
  currentRound,
  onComplete,
  onCancel,
}: RoundFeedbackFormProps) {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [feedbackByItem, setFeedbackByItem] = useState<Record<string, ItemFeedback>>({});
  const [newItemSuggestions, setNewItemSuggestions] = useState<NewItemSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProposals();
  }, [requestId, currentRound]);

  const loadProposals = async () => {
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        supplier:suppliers(name),
        items:proposal_items(*)
      `)
      .eq('request_id', requestId)
      .eq('round_number', currentRound)
      .eq('status', 'submitted');

    if (error) {
      console.error('Error loading proposals:', error);
      return;
    }

    setProposals(data as any);
    setLoading(false);
  };

  const setItemFeedback = (itemId: string, action: 'modify' | 'delete' | 'accept', feedback?: string) => {
    setFeedbackByItem(prev => ({
      ...prev,
      [itemId]: {
        itemId,
        action,
        feedback: feedback || prev[itemId]?.feedback || '',
        suggestedPrice: prev[itemId]?.suggestedPrice,
      },
    }));
  };

  const updateItemFeedbackText = (itemId: string, feedback: string) => {
    setFeedbackByItem(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        itemId,
        action: prev[itemId]?.action || 'modify',
        feedback,
      },
    }));
  };

  const updateItemSuggestedPrice = (itemId: string, price: string) => {
    setFeedbackByItem(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        itemId,
        action: prev[itemId]?.action || 'modify',
        feedback: prev[itemId]?.feedback || '',
        suggestedPrice: price,
      },
    }));
  };

  const addNewItemSuggestion = () => {
    setNewItemSuggestions(prev => [
      ...prev,
      { itemName: '', description: '', quantity: '1', notes: '' },
    ]);
  };

  const updateNewItemSuggestion = (index: number, field: keyof NewItemSuggestion, value: string) => {
    setNewItemSuggestions(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeNewItemSuggestion = (index: number) => {
    setNewItemSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!profile?.id) return;

    setSubmitting(true);

    try {
      const feedbackRecords = Object.values(feedbackByItem)
        .filter(fb => fb.action !== 'accept')
        .map(fb => {
          const proposal = proposals.find(p => p.items.some(i => i.id === fb.itemId));
          return {
            proposal_id: proposal?.id,
            proposal_item_id: fb.itemId,
            round_number: currentRound,
            action: fb.action,
            feedback_text: fb.feedback,
            suggested_price: fb.suggestedPrice ? parseFloat(fb.suggestedPrice) : null,
            created_by: profile.id,
          };
        });

      if (feedbackRecords.length > 0) {
        const { error: feedbackError } = await supabase
          .from('round_item_feedback')
          .insert(feedbackRecords);

        if (feedbackError) throw feedbackError;
      }

      const suggestionRecords = newItemSuggestions
        .filter(s => s.itemName && s.description)
        .map(s => ({
          request_id: requestId,
          round_number: currentRound + 1,
          item_name: s.itemName,
          description: s.description,
          suggested_quantity: parseFloat(s.quantity) || 1,
          notes: s.notes,
          created_by: profile.id,
        }));

      if (suggestionRecords.length > 0) {
        const { error: suggestionsError } = await supabase
          .from('round_suggestions')
          .insert(suggestionRecords);

        if (suggestionsError) throw suggestionsError;
      }

      const { error: updateError } = await supabase
        .from('requests')
        .update({
          current_round: currentRound + 1,
          round_status: 'accepting_proposals',
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      alert('¡Feedback enviado! Se ha abierto la ronda ' + (currentRound + 1));
      onComplete();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error al enviar el feedback');
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Feedback para Ronda {currentRound + 1}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Marca los ítems que requieren modificaciones o eliminación
            </p>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>

        {proposals.length === 0 ? (
          <p className="text-center text-gray-500">No hay propuestas para revisar</p>
        ) : (
          <div className="space-y-6">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {proposal.supplier.name} - ${proposal.total_amount.toLocaleString()}
                </h3>

                <div className="space-y-3">
                  {proposal.items.map((item) => {
                    const feedback = feedbackByItem[item.id];
                    const isModify = feedback?.action === 'modify';
                    const isDelete = feedback?.action === 'delete';
                    const isAccept = feedback?.action === 'accept';

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border-2 ${
                          isDelete
                            ? 'border-red-300 bg-red-50'
                            : isModify
                            ? 'border-yellow-300 bg-yellow-50'
                            : isAccept
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.item_name}</p>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {item.quantity} x ${item.unit_price.toLocaleString()} = $
                              {item.total_price.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setItemFeedback(item.id, 'accept')}
                              className={`p-2 rounded ${
                                isAccept ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                              title="Aceptar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setItemFeedback(item.id, 'modify')}
                              className={`p-2 rounded ${
                                isModify ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                              title="Modificar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setItemFeedback(item.id, 'delete')}
                              className={`p-2 rounded ${
                                isDelete ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                              title="Eliminar"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {(isModify || isDelete) && (
                          <div className="mt-3 space-y-2">
                            <TextArea
                              value={feedback?.feedback || ''}
                              onChange={(e) => updateItemFeedbackText(item.id, e.target.value)}
                              placeholder="Explica qué necesitas modificar o por qué eliminar este ítem..."
                              rows={2}
                            />
                            {isModify && (
                              <Input
                                type="number"
                                value={feedback?.suggestedPrice || ''}
                                onChange={(e) => updateItemSuggestedPrice(item.id, e.target.value)}
                                placeholder="Precio sugerido (opcional)"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sugerir Nuevos Ítems</h3>
          <Button size="sm" variant="outline" onClick={addNewItemSuggestion}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Agregar Ítem
          </Button>
        </div>

        {newItemSuggestions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay ítems sugeridos. Puedes agregar ítems que quieras que los proveedores coticen.
          </p>
        ) : (
          <div className="space-y-4">
            {newItemSuggestions.map((suggestion, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <Input
                    value={suggestion.itemName}
                    onChange={(e) => updateNewItemSuggestion(index, 'itemName', e.target.value)}
                    placeholder="Nombre del ítem"
                  />
                  <Input
                    type="number"
                    value={suggestion.quantity}
                    onChange={(e) => updateNewItemSuggestion(index, 'quantity', e.target.value)}
                    placeholder="Cantidad"
                  />
                </div>
                <TextArea
                  value={suggestion.description}
                  onChange={(e) => updateNewItemSuggestion(index, 'description', e.target.value)}
                  placeholder="Descripción del ítem"
                  rows={2}
                  className="mb-3"
                />
                <div className="flex items-center justify-between">
                  <Input
                    value={suggestion.notes}
                    onChange={(e) => updateNewItemSuggestion(index, 'notes', e.target.value)}
                    placeholder="Notas adicionales (opcional)"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeNewItemSuggestion(index)}
                    className="ml-2"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Enviando...' : `Abrir Ronda ${currentRound + 1}`}
        </Button>
      </div>
    </div>
  );
}
