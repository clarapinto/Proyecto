import { AlertCircle } from 'lucide-react';
import Input from '../../shared/Input';
import type { RequestFormData } from '../CreateRequestWizard';

interface Step2Props {
  data: RequestFormData;
  updateData: (data: Partial<RequestFormData>) => void;
}

export default function Step2Budget({ data, updateData }: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Presupuesto Interno</h2>
        <p className="text-sm text-gray-600">
          Establece un presupuesto de referencia para fines de comparación interna
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900 mb-1">Información Confidencial</p>
          <p className="text-sm text-amber-800">
            Este presupuesto solo será visible para usuarios internos y se usará para fines de comparación. Los proveedores nunca verán este monto.
          </p>
        </div>
      </div>

      <Input
        label="Presupuesto Interno (USD)"
        type="number"
        value={data.internalBudget}
        onChange={(e) => updateData({ internalBudget: e.target.value })}
        placeholder="50000"
        min="0"
        step="0.01"
        helperText="Esto es solo para referencia interna para ayudar a evaluar propuestas"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-medium">Consejo:</span> Establecer un presupuesto realista ayuda al equipo de compras a evaluar ofertas de manera más efectiva e identificar ahorros potenciales.
        </p>
      </div>
    </div>
  );
}
