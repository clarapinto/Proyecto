import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Step1BasicInfo from './wizard/Step1BasicInfo';
import Step2Budget from './wizard/Step2Budget';
import Step3Attachments from './wizard/Step3Attachments';
import Step4SelectSuppliers from './wizard/Step4SelectSuppliers';
import Step5Configuration from './wizard/Step5Configuration';
import Step6Review from './wizard/Step6Review';

const steps = [
  { id: 1, title: 'Detalles del Evento', description: 'Información básica' },
  { id: 2, title: 'Presupuesto', description: 'Referencia interna' },
  { id: 3, title: 'Adjuntos', description: 'Brief y documentos' },
  { id: 4, title: 'Proveedores', description: 'Seleccionar vendors' },
  { id: 5, title: 'Configuración', description: 'Rondas y plazos' },
  { id: 6, title: 'Revisión', description: 'Confirmación final' },
];

export interface RequestFormData {
  eventType: string;
  title: string;
  description: string;
  internalBudget: string;
  attachments: File[];
  selectedSuppliers: string[];
  maxRounds: number;
  roundDeadline: string;
}

const initialFormData: RequestFormData = {
  eventType: '',
  title: '',
  description: '',
  internalBudget: '',
  attachments: [],
  selectedSuppliers: [],
  maxRounds: 2,
  roundDeadline: '',
};

export default function CreateRequestWizard() {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RequestFormData>(initialFormData);
  const [loading, setLoading] = useState(false);

  const updateFormData = (data: Partial<RequestFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    console.group('🚀 Request Submission Started');
    console.log('Timestamp:', new Date().toISOString());

    console.group('📋 Step 1: Validation');

    if (!profile?.id) {
      console.error('❌ VALIDATION FAILED: No profile.id');
      console.log('Profile object:', profile);
      console.groupEnd();
      console.groupEnd();
      alert('Error: Usuario no autenticado. Por favor cierra sesión y vuelve a iniciar sesión.');
      return;
    }

    console.log('✓ Profile ID:', profile.id);
    console.log('✓ Profile Role:', profile.role);
    console.log('✓ Profile User ID:', profile.user_id);
    console.log('✓ Profile Email:', profile.email);

    if (!formData.eventType || !formData.title || !formData.description) {
      console.error('❌ VALIDATION FAILED: Missing required fields');
      console.log('Event Type:', formData.eventType);
      console.log('Title:', formData.title);
      console.log('Description:', formData.description);
      console.groupEnd();
      console.groupEnd();
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    console.log('✓ Event Type:', formData.eventType);
    console.log('✓ Title:', formData.title);
    console.log('✓ Description length:', formData.description.length);

    if (formData.selectedSuppliers.length === 0) {
      console.error('❌ VALIDATION FAILED: No suppliers selected');
      console.groupEnd();
      console.groupEnd();
      alert('Por favor selecciona al menos un proveedor');
      return;
    }

    console.log('✓ Selected Suppliers:', formData.selectedSuppliers);
    console.log('✓ All validations passed');
    console.groupEnd();

    console.group('🔐 Step 2: Authentication Verification');

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      console.groupEnd();
      console.groupEnd();
      alert('Error al verificar la sesión. Por favor cierra sesión y vuelve a iniciar.');
      return;
    }

    const jwtRole = sessionData.session?.user.app_metadata?.role;
    const jwtUserId = sessionData.session?.user.id;

    console.log('JWT User ID:', jwtUserId);
    console.log('JWT Role:', jwtRole);
    console.log('JWT Metadata:', sessionData.session?.user.app_metadata);
    console.log('Profile User ID:', profile.user_id);
    console.log('Profile Role:', profile.role);

    if (jwtRole !== profile.role) {
      console.warn('⚠️ ROLE MISMATCH DETECTED!');
      console.warn('JWT Role:', jwtRole);
      console.warn('Profile Role:', profile.role);
      console.warn('Attempting session refresh...');

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('❌ Session refresh failed:', refreshError);
      } else {
        console.log('✓ Session refreshed successfully');
        console.log('New JWT Role:', refreshData.session?.user.app_metadata?.role);
      }
    } else {
      console.log('✓ Role matches between JWT and profile');
    }

    if (!jwtRole || !['request_creator', 'admin'].includes(jwtRole)) {
      console.error('❌ AUTHORIZATION FAILED: Invalid role');
      console.error('Required roles: request_creator, admin');
      console.error('User role:', jwtRole);
      console.groupEnd();
      console.groupEnd();
      alert('Error: Tu rol no tiene permisos para crear solicitudes.\nRol actual: ' + (jwtRole || 'ninguno'));
      return;
    }

    console.log('✓ User authorized to create requests');
    console.groupEnd();

    setLoading(true);

    try {
      console.group('📦 Step 3: Prepare Request Data');

      const requestData = {
        creator_id: profile.id,
        event_type: formData.eventType,
        title: formData.title,
        description: formData.description,
        internal_budget: formData.internalBudget ? parseFloat(formData.internalBudget) : null,
        status: 'pending_approval' as const,
        max_rounds: formData.maxRounds,
        current_round: 1,
        round_deadline: formData.roundDeadline || null,
      };

      console.log('Request data prepared:');
      console.log(JSON.stringify(requestData, null, 2));
      console.groupEnd();

      console.group('💾 Step 4: Insert Request into Database');
      console.log('Attempting INSERT...');

      const { data: newRequest, error: requestError } = await supabase
        .from('requests')
        .insert(requestData)
        .select()
        .single();

      if (requestError) {
        console.error('❌ REQUEST INSERT FAILED');
        console.error('Error code:', requestError.code);
        console.error('Error message:', requestError.message);
        console.error('Error details:', requestError.details);
        console.error('Error hint:', requestError.hint);
        console.error('Full error object:', requestError);
        console.groupEnd();

        if (requestError.message.includes('row-level security')) {
          throw new Error(
            `Error de permisos de seguridad.\n\n` +
            `Detalles técnicos:\n` +
            `- Tu rol: ${jwtRole}\n` +
            `- Tu perfil ID: ${profile.id}\n` +
            `- Mensaje: ${requestError.message}\n\n` +
            `Por favor, cierra sesión y vuelve a iniciar. Si el problema persiste, contacta al administrador.`
          );
        }

        throw new Error(`Error al crear la solicitud: ${requestError.message}`);
      }

      console.log('✓ Request inserted successfully!');
      console.log('✓ Request ID:', newRequest.id);
      console.log('✓ Request data:', newRequest);
      console.groupEnd();

      if (!newRequest) {
        console.error('❌ No request data returned');
        console.groupEnd();
        throw new Error('No se pudo crear la solicitud - no se recibió respuesta');
      }

      console.group('📨 Step 6: Create Supplier Invitations');

      const invitations = formData.selectedSuppliers.map((supplierId) => ({
        request_id: newRequest.id,
        supplier_id: supplierId,
      }));

      console.log('Invitations to create:', invitations.length);
      console.log('Invitation data:', invitations);
      console.log('Attempting INSERT...');

      const { error: invitationsError } = await supabase
        .from('request_invitations')
        .insert(invitations);

      if (invitationsError) {
        console.error('❌ INVITATIONS INSERT FAILED');
        console.error('Error code:', invitationsError.code);
        console.error('Error message:', invitationsError.message);
        console.error('Error details:', invitationsError.details);
        console.groupEnd();
        console.groupEnd();
        throw new Error(`Error al invitar proveedores: ${invitationsError.message}`);
      }

      console.log('✓ Invitations created successfully');
      console.log('✓ Total invitations:', invitations.length);
      console.groupEnd();

      console.log('');
      console.log('✅ REQUEST CREATION COMPLETED SUCCESSFULLY');
      console.log('Request Number:', newRequest.request_number);
      console.log('Request ID:', newRequest.id);
      console.log('Total Invitations:', invitations.length);
      console.groupEnd();

      alert(`¡Solicitud ${newRequest.request_number} creada exitosamente y enviada para aprobación!`);
      setFormData(initialFormData);
      setCurrentStep(1);
    } catch (error) {
      console.group('❌ ERROR HANDLER');
      console.error('Caught error:', error);
      console.error('Error type:', typeof error);
      console.error('Error instanceof Error:', error instanceof Error);

      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Final error message:', errorMessage);
      console.groupEnd();
      console.groupEnd();

      alert(`${errorMessage}`);
    } finally {
      setLoading(false);
      console.log('🏁 Request submission process finished');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo data={formData} updateData={updateFormData} />;
      case 2:
        return <Step2Budget data={formData} updateData={updateFormData} />;
      case 3:
        return <Step3Attachments data={formData} updateData={updateFormData} />;
      case 4:
        return <Step4SelectSuppliers data={formData} updateData={updateFormData} />;
      case 5:
        return <Step5Configuration data={formData} updateData={updateFormData} />;
      case 6:
        return <Step6Review data={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Nueva Solicitud</h1>
        <p className="text-gray-600">Sigue los pasos para crear una solicitud de compra</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                    currentStep > step.id
                      ? 'bg-green-600 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded transition ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card className="p-8 mb-6">{renderStep()}</Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atrás
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={handleNext}>
            Siguiente
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar para Aprobación'}
          </Button>
        )}
      </div>
    </div>
  );
}
