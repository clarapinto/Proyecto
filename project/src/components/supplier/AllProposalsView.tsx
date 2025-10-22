import { useState, useEffect } from 'react';
import { Calendar, FileText, DollarSign, Package, Eye, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';
import Badge from '../shared/Badge';
import Button from '../shared/Button';
import { generateAwardPDF } from '../../utils/pdfGenerator';
import type { Database } from '../../lib/database.types';

type Proposal = Database['public']['Tables']['proposals']['Row'] & {
  request?: {
    title: string;
    request_number: string;
    description: string;
  };
  supplier?: {
    name: string;
    contact_email: string;
    contract_fee_percentage: number;
  };
  items?: Array<{
    id: string;
    item_name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
};

export default function AllProposalsView() {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.email) {
      loadProposals();
    }
  }, [profile]);

  const loadProposals = async () => {
    if (!profile?.email) return;

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('contact_email', profile.email)
      .maybeSingle();

    if (!supplier) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('proposals')
      .select(`
        *,
        request:requests(title, request_number, description),
        supplier:suppliers(name, contact_email, contract_fee_percentage),
        items:proposal_items(*)
      `)
      .eq('supplier_id', supplier.id)
      .order('created_at', { ascending: false });

    if (data) {
      setProposals(data as Proposal[]);
    }
    setLoading(false);
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Cargando propuestas...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Propuestas</h1>
        <p className="text-gray-600">Historial completo de todas tus propuestas enviadas</p>
      </div>

      {proposals.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No has enviado propuestas aún</p>
          <p className="text-sm text-gray-400 mt-2">
            Las propuestas que envíes aparecerán aquí
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const isExpanded = expandedProposal === proposal.id;
            const items = proposal.items || [];
            const request = proposal.request as any;

            return (
              <Card key={proposal.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request?.title || 'Solicitud sin título'}
                      </h3>
                      {getStatusBadge(proposal.status || 'draft')}
                      <Badge variant="info">Ronda {proposal.round_number}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {request?.request_number || 'N/A'}
                    </p>
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

                  <div className="text-right ml-6">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                    </Button>

                    {proposal.status === 'awarded' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadAwardPDF(proposal)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Certificado
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
                          Ítems de la Propuesta ({items.length})
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
      )}
    </div>
  );
}
