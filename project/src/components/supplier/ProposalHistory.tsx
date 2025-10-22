import { useState, useEffect } from 'react';
import { Calendar, FileText, DollarSign, Package, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import { generateAwardPDF } from '../../utils/pdfGenerator';
import type { Database } from '../../lib/database.types';

type Proposal = Database['public']['Tables']['proposals']['Row'] & {
  items?: Array<{
    id: string;
    item_name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  request?: {
    request_number: string;
    title: string;
    description: string;
  };
  supplier?: {
    name: string;
    contact_email: string;
    contract_fee_percentage: number;
  };
};

interface ProposalHistoryProps {
  requestId: string;
  supplierId: string;
}

export default function ProposalHistory({ requestId, supplierId }: ProposalHistoryProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, [requestId, supplierId]);

  const loadProposals = async () => {
    const { data } = await supabase
      .from('proposals')
      .select(`
        *,
        items:proposal_items(*),
        request:requests(request_number, title, description),
        supplier:suppliers(name, contact_email, contract_fee_percentage)
      `)
      .eq('request_id', requestId)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (data) {
      setProposals(data as Proposal[]);
    }
    setLoading(false);
  };

  const handleDownloadAwardPDF = async (proposal: Proposal) => {
    if (proposal.status !== 'awarded') return;

    const request = proposal.request as any;
    const supplier = proposal.supplier as any;
    const items = proposal.items || [];

    await generateAwardPDF({
      requestNumber: request?.request_number || 'N/A',
      requestTitle: request?.title || 'N/A',
      requestDescription: request?.description || 'N/A',
      supplierName: supplier?.name || 'N/A',
      supplierContact: supplier?.contact_email || 'N/A',
      awardedDate: proposal.awarded_at || proposal.submitted_at || new Date().toISOString(),
      roundNumber: proposal.round_number,
      subtotal: proposal.subtotal || 0,
      feeAmount: proposal.fee_amount || 0,
      totalAmount: proposal.total_amount || 0,
      contractFeePercentage: supplier?.contract_fee_percentage || 0,
      items: items.map(item => ({
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
      contextualInfo: proposal.contextual_info,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'warning' | 'info' | 'danger', label: string }> = {
      draft: { variant: 'warning', label: 'Borrador' },
      submitted: { variant: 'info', label: 'Enviada' },
      under_review: { variant: 'info', label: 'En Revisión' },
      adjustment_requested: { variant: 'warning', label: 'Ajuste Solicitado' },
      finalist: { variant: 'success', label: 'Finalista' },
      awarded: { variant: 'success', label: 'Adjudicada' },
      not_selected: { variant: 'danger', label: 'No Seleccionada' },
    };
    const config = statusMap[status] || { variant: 'info' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando historial de propuestas...
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No has enviado propuestas para esta solicitud</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Historial de Propuestas ({proposals.length})
      </h2>

      {proposals.map((proposal) => {
        const isExpanded = expandedProposal === proposal.id;
        const items = proposal.items || [];

        return (
          <Card key={proposal.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Propuesta Ronda {proposal.round_number}
                  </h3>
                  {getStatusBadge(proposal.status || 'draft')}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {proposal.submitted_at
                        ? new Date(proposal.submitted_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Borrador'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Package className="w-4 h-4" />
                    <span>{items.length} ítems</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Total</div>
                <div className="text-2xl font-bold text-blue-600">
                  ${(proposal.total_amount || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                </button>

                {proposal.status === 'awarded' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadAwardPDF(proposal)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Certificado de Adjudicación
                  </Button>
                )}
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Subtotal</div>
                      <div className="font-semibold text-gray-900">
                        ${(proposal.subtotal || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Honorarios</div>
                      <div className="font-semibold text-gray-900">
                        ${(proposal.fee_amount || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Total</div>
                      <div className="font-semibold text-blue-600">
                        ${(proposal.total_amount || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>

                  {proposal.contextual_info && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Información Adicional
                      </h4>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        {proposal.contextual_info}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Ítems de la Propuesta
                    </h4>
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-lg p-4 bg-white"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">
                                {idx + 1}. {item.item_name}
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-semibold text-gray-900">
                                ${item.total_price.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                            <span>Cantidad: {item.quantity}</span>
                            <span>•</span>
                            <span>
                              Precio unitario: $
                              {item.unit_price.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
