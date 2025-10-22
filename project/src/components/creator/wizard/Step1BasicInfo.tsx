import { useState } from 'react';
import { Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Input from '../../shared/Input';
import Select from '../../shared/Select';
import TextArea from '../../shared/TextArea';
import Button from '../../shared/Button';
import { validateEventBrief, type BriefValidationResult } from '../../../lib/groq';
import type { RequestFormData } from '../CreateRequestWizard';

interface Step1Props {
  data: RequestFormData;
  updateData: (data: Partial<RequestFormData>) => void;
}

const eventTypes = [
  { value: 'conference', label: 'Conferencia' },
  { value: 'product_launch', label: 'Lanzamiento de Producto' },
  { value: 'corporate_event', label: 'Evento Corporativo' },
  { value: 'trade_show', label: 'Feria Comercial' },
  { value: 'btl_activation', label: 'Activación BTL' },
  { value: 'sponsorship', label: 'Patrocinio' },
  { value: 'other', label: 'Otro' },
];

export default function Step1BasicInfo({ data, updateData }: Step1Props) {
  const [validationResult, setValidationResult] = useState<BriefValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  const handleValidateBrief = async () => {
    if (!data.description || data.description.trim().length < 50) {
      setValidationResult({
        isComplete: false,
        hasEventDate: false,
        hasParticipantCount: false,
        hasLocation: false,
        hasObjectives: false,
        hasTargetAudience: false,
        hasBudgetInfo: false,
        missingFields: ['La descripción es demasiado corta. Proporciona al menos 50 caracteres.'],
        extractedInfo: {},
        feedback: 'Por favor escribe una descripción más detallada del evento.',
      });
      setHasValidated(true);
      return;
    }

    setIsValidating(true);
    setHasValidated(false);

    try {
      const result = await validateEventBrief(data.description);
      setValidationResult(result);
      setHasValidated(true);
    } catch (error) {
      console.error('Error validating brief:', error);
      setValidationResult({
        isComplete: false,
        hasEventDate: false,
        hasParticipantCount: false,
        hasLocation: false,
        hasObjectives: false,
        hasTargetAudience: false,
        hasBudgetInfo: false,
        missingFields: ['Error al validar el brief'],
        extractedInfo: {},
        feedback: 'Ocurrió un error al validar el brief. Por favor intenta nuevamente.',
      });
      setHasValidated(true);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Detalles del Evento</h2>
        <p className="text-sm text-gray-600">
          Proporciona la información básica sobre el evento o activación BTL
        </p>
      </div>

      <Select
        label="Tipo de Evento"
        value={data.eventType}
        onChange={(e) => updateData({ eventType: e.target.value })}
        options={eventTypes}
        required
      />

      <Input
        label="Título del Evento"
        value={data.title}
        onChange={(e) => updateData({ title: e.target.value })}
        placeholder="ej., Lanzamiento de Producto Verano 2025"
        required
      />

      <div className="space-y-3">
        <TextArea
          label="Descripción"
          value={data.description}
          onChange={(e) => {
            updateData({ description: e.target.value });
            setHasValidated(false);
            setValidationResult(null);
          }}
          placeholder="Proporciona una descripción detallada del evento incluyendo: fecha, número de participantes, ubicación, objetivos, audiencia objetivo y requisitos específicos..."
          rows={8}
          required
          helperText="Este brief será compartido con los proveedores. Incluye toda la información relevante."
        />

        <Button
          onClick={handleValidateBrief}
          disabled={isValidating || !data.description || data.description.trim().length < 50}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validando con IA...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Validar Brief con IA
            </>
          )}
        </Button>
      </div>

      {hasValidated && validationResult && (
        <div
          className={`p-4 rounded-lg border-2 ${
            validationResult.isComplete
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {validationResult.isComplete ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3
                className={`font-semibold mb-2 ${
                  validationResult.isComplete ? 'text-green-900' : 'text-amber-900'
                }`}
              >
                {validationResult.isComplete
                  ? 'Brief Completo'
                  : 'Brief Incompleto'}
              </h3>

              <p
                className={`text-sm mb-3 ${
                  validationResult.isComplete ? 'text-green-800' : 'text-amber-800'
                }`}
              >
                {validationResult.feedback}
              </p>

              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <ValidationItem
                    label="Fecha del evento"
                    isPresent={validationResult.hasEventDate}
                    value={validationResult.extractedInfo.eventDate}
                  />
                  <ValidationItem
                    label="Número de participantes"
                    isPresent={validationResult.hasParticipantCount}
                    value={validationResult.extractedInfo.participantCount}
                  />
                  <ValidationItem
                    label="Ubicación"
                    isPresent={validationResult.hasLocation}
                    value={validationResult.extractedInfo.location}
                  />
                  <ValidationItem
                    label="Objetivos"
                    isPresent={validationResult.hasObjectives}
                    value={validationResult.extractedInfo.objectives}
                  />
                  <ValidationItem
                    label="Audiencia objetivo"
                    isPresent={validationResult.hasTargetAudience}
                    value={validationResult.extractedInfo.targetAudience}
                  />
                  <ValidationItem
                    label="Info. presupuestaria"
                    isPresent={validationResult.hasBudgetInfo}
                    optional
                  />
                </div>

                {!validationResult.isComplete && validationResult.missingFields.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      Información faltante:
                    </p>
                    <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
                      {validationResult.missingFields.map((field, index) => (
                        <li key={index}>{field}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ValidationItemProps {
  label: string;
  isPresent: boolean;
  value?: string;
  optional?: boolean;
}

function ValidationItem({ label, isPresent, value, optional }: ValidationItemProps) {
  return (
    <div className="flex items-start gap-2">
      {isPresent ? (
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${optional ? 'text-gray-400' : 'text-amber-600'}`} />
      )}
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${isPresent ? 'text-green-900' : optional ? 'text-gray-600' : 'text-amber-900'}`}>
          {label} {optional && '(opcional)'}
        </p>
        {value && (
          <p className="text-xs text-gray-600 mt-0.5 truncate" title={value}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
