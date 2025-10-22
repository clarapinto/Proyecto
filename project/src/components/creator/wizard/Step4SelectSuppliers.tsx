import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { RequestFormData } from '../CreateRequestWizard';
import type { Database } from '../../../lib/database.types';

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface Step4Props {
  data: RequestFormData;
  updateData: (data: Partial<RequestFormData>) => void;
}

export default function Step4SelectSuppliers({ data, updateData }: Step4Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    console.log('Loading suppliers...');
    const { data: suppliersData, error: loadError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (loadError) {
      console.error('Error loading suppliers:', loadError);
      console.error('Error details:', JSON.stringify(loadError, null, 2));
      setError(`Error al cargar proveedores: ${loadError.message}`);
    }

    if (suppliersData) {
      console.log('Suppliers loaded:', suppliersData.length);
      setSuppliers(suppliersData);
    } else {
      console.warn('No suppliers data received');
    }
    setLoading(false);
  };

  const toggleSupplier = (supplierId: string) => {
    const isSelected = data.selectedSuppliers.includes(supplierId);
    const newSelection = isSelected
      ? data.selectedSuppliers.filter((id) => id !== supplierId)
      : [...data.selectedSuppliers, supplierId];

    updateData({ selectedSuppliers: newSelection });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando proveedores...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Seleccionar Proveedores</h2>
          <p className="text-sm text-gray-600">
            Elige qué proveedores deben recibir esta solicitud de cotización
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-900">
            {error}
          </p>
          <p className="text-xs text-red-700 mt-2">
            Por favor intenta cerrar sesión y volver a iniciar sesión. Si el problema persiste, contacta al administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Seleccionar Proveedores</h2>
        <p className="text-sm text-gray-600">
          Elige qué proveedores deben recibir esta solicitud de cotización
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-medium">Seleccionados: {data.selectedSuppliers.length}</span> proveedores
          serán invitados a enviar propuestas
        </p>
      </div>

      {suppliers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No se encontraron proveedores activos. Contacta a tu administrador.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((supplier) => {
            const isSelected = data.selectedSuppliers.includes(supplier.id);
            return (
              <button
                key={supplier.id}
                onClick={() => toggleSupplier(supplier.id)}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{supplier.name}</h3>
                    <p className="text-sm text-gray-600 mb-1">{supplier.contact_name}</p>
                    <p className="text-sm text-gray-500">{supplier.contact_email}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Tarifa de Contrato: {supplier.contract_fee_percentage}%
                    </p>
                  </div>
                  {isSelected && (
                    <div className="bg-blue-600 rounded-full p-1">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
