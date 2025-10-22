import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, FileText, Download, Sparkles, History } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';

interface Proposal {
  id: string;
  supplier_id: string;
  total_amount: number;
  subtotal: number;
  fee_amount: number;
  status: string;
  submitted_at: string;
  contextual_info: string | null;
  supplier: {
    name: string;
    contract_fee_percentage: number;
  };
  items: Array<{
    id: string;
    item_name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  attachments: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
  }>;
}

interface ProposalComparisonProps {
  requestId: string;
  internalBudget?: number | null;
}

interface AIAnalysisHistory {
  id: string;
  analysis_text: string;
  proposal_count: number;
  lowest_amount: number;
  highest_amount: number;
  average_amount: number;
  created_at: string;
}

export default function ProposalComparison({ requestId, internalBudget }: ProposalComparisonProps) {
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AIAnalysisHistory[]>([]);

  useEffect(() => {
    loadProposals();
    loadAnalysisHistory();
  }, [requestId]);

  const loadAnalysisHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_analysis_history')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setAnalysisHistory(data || []);
    } catch (error) {
      console.error('Error loading analysis history:', error);
    }
  };

  const loadProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          supplier:suppliers(name, contract_fee_percentage),
          items:proposal_items(*),
          attachments:proposal_attachments(*)
        `)
        .eq('request_id', requestId)
        .eq('status', 'submitted')
        .order('total_amount', { ascending: true });

      if (error) throw error;

      setProposals(data || []);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzingAI(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-proposals`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          proposals: proposals.map(p => ({
            supplier: p.supplier.name,
            total: p.total_amount,
            items: p.items,
            contextual_info: p.contextual_info,
          })),
          internalBudget,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al analizar propuestas');
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);

      if (profile?.id) {
        const lowestProposal = proposals[0];
        const highestProposal = proposals[proposals.length - 1];
        const avgAmount = proposals.reduce((sum, p) => sum + p.total_amount, 0) / proposals.length;

        await supabase.from('ai_analysis_history').insert({
          request_id: requestId,
          analyzed_by: profile.id,
          analysis_text: data.analysis,
          proposal_count: proposals.length,
          lowest_amount: lowestProposal.total_amount,
          highest_amount: highestProposal.total_amount,
          average_amount: avgAmount,
          internal_budget: internalBudget,
        });

        await loadAnalysisHistory();
      }
    } catch (error) {
      console.error('Error analyzing proposals:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setAiAnalysis(`Error al analizar las propuestas: ${errorMessage}`);
    } finally {
      setAnalyzingAI(false);
    }
  };

  const downloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('proposals')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error al descargar el archivo');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-center text-gray-500">Cargando propuestas...</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No hay propuestas enviadas aún</p>
      </Card>
    );
  }

  const lowestProposal = proposals[0];
  const highestProposal = proposals[proposals.length - 1];
  const avgAmount = proposals.reduce((sum, p) => sum + p.total_amount, 0) / proposals.length;
  const budgetDiff = internalBudget ? lowestProposal.total_amount - internalBudget : null;


  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Comparación de Propuestas ({proposals.length})
          </h2>
          <div className="flex items-center space-x-2">
            {analysisHistory.length > 0 && (
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="ghost"
                size="sm"
              >
                <History className="w-4 h-4 mr-2" />
                Historial ({analysisHistory.length})
              </Button>
            )}
            <Button onClick={handleAIAnalysis} disabled={analyzingAI} variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              {analyzingAI ? 'Analizando...' : 'Análisis con IA'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium mb-1">Propuesta Más Baja</p>
            <p className="text-2xl font-bold text-green-700">
              ${lowestProposal.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-green-600 mt-1">{lowestProposal.supplier.name}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium mb-1">Promedio</p>
            <p className="text-2xl font-bold text-blue-700">
              ${avgAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-blue-600 mt-1">Entre todas las propuestas</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium mb-1">Propuesta Más Alta</p>
            <p className="text-2xl font-bold text-orange-700">
              ${highestProposal.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-orange-600 mt-1">{highestProposal.supplier.name}</p>
          </div>

          {internalBudget && (
            <div className={`${budgetDiff && budgetDiff > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
              <p className={`text-sm ${budgetDiff && budgetDiff > 0 ? 'text-red-600' : 'text-green-600'} font-medium mb-1`}>
                vs. Presupuesto Interno
              </p>
              <p className={`text-2xl font-bold ${budgetDiff && budgetDiff > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {budgetDiff && budgetDiff > 0 ? '+' : ''}${budgetDiff?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-xs ${budgetDiff && budgetDiff > 0 ? 'text-red-600' : 'text-green-600'} mt-1 flex items-center`}>
                {budgetDiff && budgetDiff > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Sobre presupuesto
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Dentro del presupuesto
                  </>
                )}
              </p>
            </div>
          )}
        </div>


        {showHistory && analysisHistory.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Historial de Análisis con IA
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analysisHistory.map((history) => (
                <div
                  key={history.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{new Date(history.created_at).toLocaleString()}</span>
                      <span>{history.proposal_count} propuestas analizadas</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">Más baja:</span>
                      <span className="font-semibold text-green-600 ml-2">
                        ${history.lowest_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Promedio:</span>
                      <span className="font-semibold text-blue-600 ml-2">
                        ${history.average_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Más alta:</span>
                      <span className="font-semibold text-orange-600 ml-2">
                        ${history.highest_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      Ver análisis completo
                    </summary>
                    <div className="mt-3 text-sm text-gray-700 whitespace-pre-line bg-white p-3 rounded border border-gray-200">
                      {history.analysis_text}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}

        {aiAnalysis && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">Análisis con IA</h3>
                <div className="text-sm text-purple-800 whitespace-pre-line">{aiAnalysis}</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {proposals.map((proposal, index) => (
          <Card key={proposal.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{proposal.supplier.name}</h3>
                <p className="text-sm text-gray-500">
                  Enviada el {new Date(proposal.submitted_at).toLocaleDateString()}
                </p>
              </div>
              {index === 0 && (
                <Badge variant="success">Más Baja</Badge>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">
                  ${proposal.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  Honorarios ({proposal.supplier.contract_fee_percentage}%)
                </span>
                <span className="font-medium text-gray-900">
                  ${proposal.fee_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${proposal.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                Ítems ({proposal.items.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {proposal.items.map((item) => (
                  <div key={item.id} className="text-sm border-b border-gray-100 pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.item_name}</p>
                        {item.description && (
                          <p className="text-gray-600 text-xs mt-1">{item.description}</p>
                        )}
                      </div>
                      <span className="text-gray-900 font-medium ml-4">
                        ${item.total_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.quantity} × ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {proposal.contextual_info && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Información Contextual</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                  {proposal.contextual_info}
                </p>
              </div>
            )}

            {proposal.attachments.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Documentos Adjuntos ({proposal.attachments.length})
                </h4>
                <div className="space-y-2">
                  {proposal.attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      onClick={() => downloadAttachment(attachment.file_path, attachment.file_name)}
                      className="flex items-center justify-between w-full p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {attachment.file_name}
                        </span>
                      </div>
                      <Download className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
