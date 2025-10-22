import { Calendar, DollarSign, FileText, Users, Settings } from 'lucide-react';
import type { RequestFormData } from '../CreateRequestWizard';

interface Step6Props {
  data: RequestFormData;
}

export default function Step6Review({ data }: Step6Props) {
  const eventTypeLabels: Record<string, string> = {
    conference: 'Conferencia',
    product_launch: 'Lanzamiento de Producto',
    corporate_event: 'Evento Corporativo',
    trade_show: 'Feria Comercial',
    btl_activation: 'Activación BTL',
    sponsorship: 'Patrocinio',
    other: 'Otro',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Revisar y Confirmar</h2>
        <p className="text-sm text-gray-600">
          Por favor revisa toda la información antes de enviar para aprobación
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-2">Detalles del Evento</h3>
              <dl className="space-y-2">
                <div className="flex">
                  <dt className="text-sm text-gray-600 w-32">Tipo:</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {eventTypeLabels[data.eventType] || data.eventType}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="text-sm text-gray-600 w-32">Título:</dt>
                  <dd className="text-sm font-medium text-gray-900">{data.title}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600 mb-1">Descripción:</dt>
                  <dd className="text-sm text-gray-900">{data.description}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-2">Presupuesto Interno</h3>
              <p className="text-sm text-gray-900">
                {data.internalBudget ? (
                  <span className="font-semibold">
                    ${parseFloat(data.internalBudget).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : (
                  <span className="text-gray-500">No especificado</span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">Confidencial - Solo para uso interno</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-2">Adjuntos</h3>
              <p className="text-sm text-gray-900">
                {data.attachments.length > 0 ? (
                  <span>{data.attachments.length} archivo(s) adjunto(s)</span>
                ) : (
                  <span className="text-gray-500">Sin adjuntos</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-2">Proveedores Seleccionados</h3>
              <p className="text-sm text-gray-900">
                {data.selectedSuppliers.length > 0 ? (
                  <span className="font-semibold">{data.selectedSuppliers.length} proveedor(es)</span>
                ) : (
                  <span className="text-red-600">No se seleccionaron proveedores</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Settings className="w-5 h-5 text-gray-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-2">Configuración</h3>
              <dl className="space-y-2">
                <div className="flex">
                  <dt className="text-sm text-gray-600 w-32">Máx. Rondas:</dt>
                  <dd className="text-sm font-medium text-gray-900">{data.maxRounds}</dd>
                </div>
                <div className="flex">
                  <dt className="text-sm text-gray-600 w-32">Fecha Límite:</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {data.roundDeadline ? (
                      new Date(data.roundDeadline).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    ) : (
                      <span className="text-red-600">No establecida</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-medium">Próximos pasos:</span> Después del envío, tu solicitud será enviada al equipo de compras para su aprobación. Una vez aprobada, los proveedores seleccionados serán notificados y podrán comenzar a enviar sus propuestas.
        </p>
      </div>
    </div>
  );
}
