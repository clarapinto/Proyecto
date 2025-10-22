import Input from '../../shared/Input';
import Select from '../../shared/Select';
import type { RequestFormData } from '../CreateRequestWizard';

interface Step5Props {
  data: RequestFormData;
  updateData: (data: Partial<RequestFormData>) => void;
}

const roundOptions = [
  { value: '1', label: '1 Ronda (Solo oferta inicial)' },
  { value: '2', label: '2 Rondas (1 ajuste)' },
  { value: '3', label: '3 Rondas (2 ajustes)' },
];

export default function Step5Configuration({ data, updateData }: Step5Props) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Configuración</h2>
        <p className="text-sm text-gray-600">Establece plazos y número de rondas de ajuste</p>
      </div>

      <Select
        label="Número Máximo de Rondas"
        value={data.maxRounds.toString()}
        onChange={(e) => updateData({ maxRounds: parseInt(e.target.value) })}
        options={roundOptions}
        required
        helperText="El número de rondas incluye la propuesta inicial más las rondas de ajuste"
      />

      <Input
        label="Fecha Límite para Primera Ronda"
        type="date"
        value={data.roundDeadline}
        onChange={(e) => updateData({ roundDeadline: e.target.value })}
        min={today}
        required
        helperText="Los proveedores deben enviar sus propuestas iniciales antes de esta fecha"
      />

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Cronograma del Proceso</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="font-medium text-gray-900 mr-2">1.</span>
            Los proveedores reciben la invitación y envían propuestas iniciales antes de la fecha límite
          </li>
          <li className="flex items-start">
            <span className="font-medium text-gray-900 mr-2">2.</span>
            El equipo de compras revisa todas las propuestas y proporciona retroalimentación
          </li>
          {data.maxRounds > 1 && (
            <li className="flex items-start">
              <span className="font-medium text-gray-900 mr-2">3.</span>
              Los proveedores envían propuestas ajustadas basadas en la retroalimentación (solo pueden reducir precios)
            </li>
          )}
          <li className="flex items-start">
            <span className="font-medium text-gray-900 mr-2">{data.maxRounds > 1 ? '4' : '3'}.</span>
            El equipo de compras selecciona al proveedor ganador y adjudica el contrato
          </li>
        </ul>
      </div>
    </div>
  );
}
