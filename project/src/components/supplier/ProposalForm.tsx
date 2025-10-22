import { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, X, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../shared/Input';
import TextArea from '../shared/TextArea';
import Button from '../shared/Button';
import Card from '../shared/Card';
import type { Database } from '../../lib/database.types';

type Request = Database['public']['Tables']['requests']['Row'];

interface ProposalItem {
  id: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface AttachmentFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface PreviousProposal {
  id: string;
  round_number: number;
  contextual_info: string | null;
  items: Array<{
    id: string;
    item_name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface ProposalFormProps {
  requestId?: string;
  previousProposal?: PreviousProposal | null;
  onSubmitted?: () => void;
}

export default function ProposalForm({ requestId, previousProposal, onSubmitted }: ProposalFormProps) {
  const { profile } = useAuth();
  const [request, setRequest] = useState<Request | null>(null);
  const [supplier, setSupplier] = useState<any>(null);
  const [items, setItems] = useState<ProposalItem[]>([
    {
      id: '1',
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    },
  ]);
  const [contextualInfo, setContextualInfo] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    if (profile?.email && requestId) {
      loadData();
    }
  }, [profile, requestId]);

  const loadData = async () => {
    if (!profile?.email || !requestId) return;

    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('contact_email', profile.email)
      .maybeSingle();

    if (supplierData) {
      setSupplier(supplierData);
    }

    const { data: requestData } = await supabase
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (requestData) {
      setRequest(requestData);
    }

    if (previousProposal && previousProposal.items && previousProposal.items.length > 0) {
      const loadedItems = previousProposal.items.map((item, index) => ({
        id: `prev-${index}`,
        item_name: item.item_name,
        description: item.description || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
      setItems(loadedItems);

      if (previousProposal.contextual_info) {
        setContextualInfo(previousProposal.contextual_info);
      }
    }

    setLoading(false);
  };

  const addItem = () => {
    const newItem: ProposalItem = {
      id: Date.now().toString(),
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ProposalItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unit_price') {
            updated.total_price = updated.quantity * updated.unit_price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const feeAmount = subtotal * ((supplier?.contract_fee_percentage || 0) / 100);
  const total = subtotal + feeAmount;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type !== 'application/pdf') {
        alert(`${file.name} no es un archivo PDF. Solo se permiten archivos PDF.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} es demasiado grande. El tamaño máximo es 10MB.`);
        continue;
      }

      newAttachments.push({
        id: Date.now().toString() + i,
        file,
        name: file.name,
        size: file.size,
      });
    }

    setAttachments([...attachments, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((att) => att.id !== id));
  };

  const uploadAttachments = async (proposalId: string) => {
    if (attachments.length === 0) return;

    setUploadingFiles(true);
    try {
      for (const attachment of attachments) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${proposalId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `proposal-attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('proposals')
          .upload(filePath, attachment.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          console.warn('Storage bucket may not be configured. Skipping file upload.');
          continue;
        }

        await supabase.from('proposal_attachments').insert({
          proposal_id: proposalId,
          file_name: attachment.name,
          file_path: filePath,
          file_size: attachment.size,
          mime_type: 'application/pdf',
        });
      }
    } catch (error) {
      console.error('Error uploading attachments:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!supplier?.id || !request?.id) {
      alert('Error: Información del proveedor o solicitud no disponible');
      return;
    }

    setSubmitting(true);

    try {
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          request_id: request.id,
          supplier_id: supplier.id,
          round_number: request.current_round,
          subtotal,
          fee_amount: feeAmount,
          total_amount: total,
          contextual_info: contextualInfo || null,
          status: 'draft',
        })
        .select()
        .single();

      if (proposalError || !proposal) {
        throw proposalError;
      }

      const proposalItems = items
        .filter((item) => item.item_name.trim())
        .map((item) => ({
          proposal_id: proposal.id,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));

      if (proposalItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('proposal_items')
          .insert(proposalItems);

        if (itemsError) {
          throw itemsError;
        }
      }

      if (attachments.length > 0) {
        await uploadAttachments(proposal.id);
      }

      alert('Propuesta guardada como borrador exitosamente');
      setAttachments([]);
    } catch (error: any) {
      console.error('Error saving draft:', error);
      const errorMessage = error?.message || JSON.stringify(error) || 'Error desconocido';
      alert(`Error al guardar el borrador: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!supplier?.id || !request?.id) {
      alert('Error: Información del proveedor o solicitud no disponible');
      return;
    }

    const hasValidItems = items.some((item) => item.item_name.trim() && item.unit_price > 0);
    if (!hasValidItems) {
      alert('Por favor agrega al menos un ítem válido con precio');
      return;
    }

    setSubmitting(true);

    try {
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          request_id: request.id,
          supplier_id: supplier.id,
          round_number: request.current_round,
          subtotal,
          fee_amount: feeAmount,
          total_amount: total,
          contextual_info: contextualInfo || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (proposalError || !proposal) {
        throw proposalError;
      }

      const proposalItems = items
        .filter((item) => item.item_name.trim())
        .map((item) => ({
          proposal_id: proposal.id,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        }));

      if (proposalItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('proposal_items')
          .insert(proposalItems);

        if (itemsError) {
          throw itemsError;
        }
      }

      if (attachments.length > 0) {
        await uploadAttachments(proposal.id);
      }

      const { data: requestCreator } = await supabase
        .from('requests')
        .select('creator_id')
        .eq('id', request.id)
        .single();

      if (requestCreator) {
        await supabase.from('notifications').insert({
          user_id: requestCreator.creator_id,
          title: 'Nueva Propuesta Recibida',
          message: `${supplier.name} ha enviado una propuesta para "${request.title}"`,
          type: 'proposal',
          related_id: proposal.id,
        });
      }

      alert('Propuesta enviada exitosamente!');

      setItems([
        {
          id: '1',
          item_name: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
        },
      ]);
      setContextualInfo('');
      setAttachments([]);

      if (onSubmitted) {
        onSubmitted();
      }
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      const errorMessage = error?.message || JSON.stringify(error) || 'Error desconocido';
      alert(`Error al enviar la propuesta: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="text-center text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Solicitud no encontrada</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {previousProposal ? `Editar Propuesta - Ronda ${request.current_round}` : 'Enviar Propuesta'}
        </h1>
        <p className="text-gray-600">
          {previousProposal
            ? 'Ajusta los ítems de tu propuesta anterior, modifica precios, elimina lo que no necesites o agrega nuevos ítems'
            : 'Completa tu propuesta ítem por ítem'}
        </p>
      </div>

      {previousProposal && (
        <Card className="p-6 mb-6 bg-yellow-50 border-2 border-yellow-300">
          <div className="flex items-start space-x-3">
            <div className="bg-yellow-100 rounded-full p-2">
              <FileText className="w-5 h-5 text-yellow-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Editando desde Ronda Anterior
              </h3>
              <p className="text-sm text-yellow-800 mb-2">
                Hemos pre-cargado los ítems de tu propuesta anterior (Ronda {previousProposal.round_number}).
                Puedes:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                <li><strong>Modificar precios</strong> a la baja para ser más competitivo</li>
                <li><strong>Mantener precios</strong> si consideras que son justos</li>
                <li><strong>Editar cantidades</strong> y descripciones según el feedback</li>
                <li><strong>Eliminar ítems</strong> usando el botón de basura</li>
                <li><strong>Agregar nuevos ítems</strong> con el botón "Agregar Ítem"</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Detalles de la Solicitud</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">{request.title}</h3>
            <span className="text-sm text-gray-500">{request.request_number}</span>
          </div>
          <p className="text-sm text-gray-600">{request.description}</p>
          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
            <span>Tipo: {request.event_type.replace('_', ' ')}</span>
            <span>Ronda: {request.current_round}/{request.max_rounds}</span>
            {request.round_deadline && (
              <span>
                Fecha límite: {new Date(request.round_deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Ítems de la Propuesta</h2>
          <Button size="sm" onClick={addItem} disabled={submitting}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Ítem
          </Button>
        </div>

        <div className="space-y-6">
          {items.map((item, index) => {
            const isFromPreviousRound = previousProposal && item.id.startsWith('prev-');
            return (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${
                  isFromPreviousRound
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900">Ítem {index + 1}</h3>
                    {isFromPreviousRound && (
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                        De ronda anterior
                      </span>
                    )}
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      disabled={submitting}
                      title={isFromPreviousRound ? 'Eliminar este ítem de tu propuesta' : 'Eliminar ítem'}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Nombre del Ítem"
                  value={item.item_name}
                  onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                  placeholder="ej. Montaje de Escenario"
                  required
                  disabled={submitting}
                />
                <Input
                  label="Cantidad"
                  type="number"
                  value={item.quantity.toString()}
                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                  disabled={submitting}
                />
              </div>

              <TextArea
                label="Descripción"
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                placeholder="Descripción detallada de este ítem..."
                rows={3}
                disabled={submitting}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Precio Unitario (USD)"
                  type="number"
                  value={item.unit_price.toString()}
                  onChange={(e) =>
                    updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="0.01"
                  required
                  disabled={submitting}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Total
                  </label>
                  <div className="text-2xl font-bold text-gray-900">
                    ${item.total_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Adicional</h2>
        <TextArea
          label="Información Contextual"
          value={contextualInfo}
          onChange={(e) => setContextualInfo(e.target.value)}
          placeholder="Agrega cualquier contexto adicional, cronograma de entrega, términos o consideraciones especiales..."
          rows={5}
          helperText="Esta información ayudará al equipo de compras a entender mejor tu propuesta"
          disabled={submitting}
        />
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Documentos Adjuntos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Adjunta archivos PDF como cotizaciones detalladas, especificaciones técnicas, catálogos, etc.
        </p>

        <div className="mb-4">
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer"
          >
            <div className="text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Click para seleccionar archivos PDF
              </p>
              <p className="text-xs text-gray-500 mt-1">Máximo 10MB por archivo</p>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileSelect}
              disabled={submitting || uploadingFiles}
            />
          </label>
        </div>

        {attachments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Archivos seleccionados ({attachments.length})
            </h3>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                    <p className="text-xs text-gray-500">
                      {(attachment.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-gray-400 hover:text-red-600 transition"
                  disabled={submitting || uploadingFiles}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadingFiles && (
          <div className="mt-4 text-center">
            <p className="text-sm text-blue-600">Subiendo archivos...</p>
          </div>
        )}
      </Card>

      <Card className="p-6 mb-6 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen de la Propuesta</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-base">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-semibold text-gray-900">
              ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-gray-600">
              Honorarios de Contrato ({supplier?.contract_fee_percentage || 0}%):
            </span>
            <span className="font-semibold text-gray-900">
              ${feeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="border-t border-gray-300 pt-3">
            <div className="flex justify-between text-xl">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-blue-600">
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleSaveDraft} disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar como Borrador'}
        </Button>
        <Button onClick={handleSubmitProposal} disabled={submitting}>
          {submitting
            ? 'Enviando...'
            : previousProposal
            ? `Enviar Propuesta Actualizada - Ronda ${request.current_round}`
            : 'Enviar Propuesta'
          }
        </Button>
      </div>
    </div>
  );
}
