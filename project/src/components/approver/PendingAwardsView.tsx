import { useState, useEffect } from 'react';
import { Award, Check, X, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import TextArea from '../shared/TextArea';

interface AwardSelection {
  id: string;
  request_id: string;
  selected_amount: number;
  is_lowest_price: boolean;
  creator_justification: string | null;
  selected_at: string;
  status: string;
  request: {
    request_number: string;
    title: string;
    description: string;
    internal_budget: number | null;
  };
  selected_proposal: {
    id: string;
    total_amount: number;
    round_number: number;
    items: Array<{
      item_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  };
  selected_supplier: {
    id: string;
    name: string;
    contact_email: string;
  };
  selected_by_user: {
    full_name: string;
  };
}

export default function PendingAwardsView() {
  const { profile } = useAuth();
  const [selections, setSelections] = useState<AwardSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSelections();
  }, []);

  const loadSelections = async () => {
    const { data, error } = await supabase
      .from('award_selections')
      .select(`
        *,
        request:requests!award_selections_request_id_fkey(request_number, title, description, internal_budget),
        selected_proposal:proposals!award_selections_selected_proposal_id_fkey(
          id,
          total_amount,
          round_number,
          items:proposal_items(item_name, quantity, unit_price, total_price)
        ),
        selected_supplier:suppliers!award_selections_selected_supplier_id_fkey(id, name, contact_email),
        selected_by_user:users_profile!award_selections_selected_by_fkey(full_name)
      `)
      .eq('status', 'pending_approval')
      .order('selected_at', { ascending: false });

    if (error) {
      console.error('Error loading selections:', error);
      return;
    }

    setSelections(data as any);
    setLoading(false);
  };

  const handleApprove = async (selectionId: string) => {
    if (!profile?.id) return;

    setProcessing(true);

    try {
      const selection = selections.find(s => s.id === selectionId);
      if (!selection) return;

      const { error: updateSelectionError } = await supabase
        .from('award_selections')
        .update({
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes || null,
        })
        .eq('id', selectionId);

      if (updateSelectionError) throw updateSelectionError;

      const { error: createAwardError } = await supabase
        .from('awards')
        .insert({
          request_id: selection.request_id,
          winning_proposal_id: selection.selected_proposal.id,
          winning_supplier_id: selection.selected_supplier.id,
          awarded_amount: selection.selected_amount,
          is_lowest_price: selection.is_lowest_price,
          justification: selection.creator_justification || approvalNotes || null,
          awarded_by: profile.id,
        });

      if (createAwardError) throw createAwardError;

      const { error: updateRequestError } = await supabase
        .from('requests')
        .update({ status: 'awarded' })
        .eq('id', selection.request_id);

      if (updateRequestError) throw updateRequestError;

      alert('Adjudicación aprobada exitosamente');
      setApprovalNotes('');
      setSelectedId(null);
      await loadSelections();

      window.dispatchEvent(new Event('awards-updated'));
    } catch (error) {
      console.error('Error approving award:', error);
      alert('Error al aprobar la adjudicación');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (selectionId: string) => {
    if (!profile?.id || !approvalNotes.trim()) {
      alert('Debes proporcionar notas explicando por qué rechazas esta adjudicación');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from('award_selections')
        .update({
          status: 'rejected',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes,
        })
        .eq('id', selectionId);

      if (error) throw error;

      alert('Adjudicación rechazada');
      setApprovalNotes('');
      setSelectedId(null);
      await loadSelections();

      window.dispatchEvent(new Event('awards-updated'));
    } catch (error) {
      console.error('Error rejecting award:', error);
      alert('Error al rechazar la adjudicación');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-center text-gray-500">Cargando adjudicaciones pendientes...</p>
      </div>
    );
  }

  if (selections.length === 0) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay adjudicaciones pendientes de aprobación</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Adjudicaciones Pendientes de Aprobación
        </h1>
        <p className="text-gray-600">Revisa y aprueba las adjudicaciones seleccionadas</p>
      </div>

      <div className="space-y-6">
        {selections.map((selection) => {
          const isSelected = selectedId === selection.id;
          const budgetDiff = selection.request.internal_budget
            ? selection.selected_amount - selection.request.internal_budget
            : null;

          return (
            <Card key={selection.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selection.request.title}
                  </h2>
                  <p className="text-sm text-gray-500">{selection.request.request_number}</p>
                </div>
                <Badge variant="warning">Pendiente Aprobación</Badge>
              </div>

              <p className="text-gray-700 mb-4">{selection.request.description}</p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">Proveedor Seleccionado</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-blue-700">Proveedor</p>
                    <p className="font-medium text-blue-900">{selection.selected_supplier.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Monto Total</p>
                    <p className="font-medium text-blue-900">
                      ${selection.selected_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Ronda</p>
                    <p className="font-medium text-blue-900">
                      {selection.selected_proposal.round_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Seleccionado por</p>
                    <p className="font-medium text-blue-900">
                      {selection.selected_by_user.full_name}
                    </p>
                  </div>
                </div>
              </div>

              {!selection.is_lowest_price && selection.creator_justification && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Justificación (No es la Propuesta Más Baja)
                  </h3>
                  <p className="text-sm text-yellow-800">{selection.creator_justification}</p>
                </div>
              )}

              {budgetDiff !== null && (
                <div
                  className={`${
                    budgetDiff > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  } border rounded-lg p-4 mb-4`}
                >
                  <h3
                    className={`font-semibold ${
                      budgetDiff > 0 ? 'text-red-900' : 'text-green-900'
                    } mb-2`}
                  >
                    Comparación con Presupuesto Interno
                  </h3>
                  <p
                    className={`text-sm ${budgetDiff > 0 ? 'text-red-800' : 'text-green-800'}`}
                  >
                    Presupuesto: ${selection.request.internal_budget?.toLocaleString()} -{' '}
                    Diferencia: {budgetDiff > 0 ? '+' : ''}${budgetDiff.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Ítems ({selection.selected_proposal.items.length})
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {selection.selected_proposal.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm border-b pb-2">
                        <div>
                          <p className="font-medium text-gray-900">{item.item_name}</p>
                          <p className="text-xs text-gray-600">
                            {item.quantity} × ${item.unit_price.toLocaleString()}
                          </p>
                        </div>
                        <span className="font-medium">${item.total_price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedId(isSelected ? null : selection.id)}
                  className="w-full"
                >
                  {isSelected ? 'Ocultar Opciones' : 'Revisar y Decidir'}
                </Button>

                {isSelected && (
                  <div className="border-t pt-4">
                    <TextArea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Notas de aprobación o rechazo (opcional para aprobación, requerido para rechazo)"
                      rows={3}
                      className="mb-3"
                    />
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleApprove(selection.id)}
                        disabled={processing}
                        className="flex-1"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Aprobar Adjudicación
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(selection.id)}
                        disabled={processing}
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
