import { useState, useEffect } from 'react';
import { Award, CheckCircle, FileText, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../shared/Card';
import Badge from '../shared/Badge';

interface DashboardStats {
  pendingAwards: number;
  pendingApprovals: number;
  activeRequests: number;
  totalApproved: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'award' | 'approval' | 'request';
  title: string;
  description: string;
  time: string;
  status: string;
}

export default function ApproverDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingAwards: 0,
    pendingApprovals: 0,
    activeRequests: 0,
    totalApproved: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [awardsData, approvalsData, activeData, approvedData] = await Promise.all([
        supabase
          .from('award_selections')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_approval'),

        supabase
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_approval'),

        supabase
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .in('status', ['approved', 'active', 'evaluation']),

        supabase
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'awarded'),
      ]);

      const recentAwards = await supabase
        .from('award_selections')
        .select(`
          id,
          selected_at,
          status,
          selected_amount,
          request:requests!award_selections_request_id_fkey(title, request_number)
        `)
        .order('selected_at', { ascending: false })
        .limit(5);

      const recentRequests = await supabase
        .from('requests')
        .select('id, title, request_number, status, created_at, updated_at')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false })
        .limit(3);

      const activity: ActivityItem[] = [];

      if (recentAwards.data) {
        recentAwards.data.forEach((award: any) => {
          activity.push({
            id: award.id,
            type: 'award',
            title: award.request?.title || 'Solicitud sin título',
            description: `Adjudicación por $${parseFloat(award.selected_amount).toLocaleString()} - ${award.status === 'pending_approval' ? 'Pendiente' : award.status === 'approved' ? 'Aprobada' : 'Rechazada'}`,
            time: award.selected_at,
            status: award.status,
          });
        });
      }

      if (recentRequests.data) {
        recentRequests.data.forEach((request) => {
          activity.push({
            id: request.id,
            type: 'approval',
            title: request.title,
            description: `${request.request_number} - Pendiente de aprobación`,
            time: request.created_at,
            status: request.status,
          });
        });
      }

      activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setStats({
        pendingAwards: awardsData.count || 0,
        pendingApprovals: approvalsData.count || 0,
        activeRequests: activeData.count || 0,
        totalApproved: approvedData.count || 0,
        recentActivity: activity.slice(0, 8),
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando panel de aprobador...</p>
        </div>
      </div>
    );
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Aprobador</h1>
        <p className="text-gray-600">Vista general de solicitudes y adjudicaciones pendientes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 rounded-lg p-3">
              <Award className="w-6 h-6 text-red-600" />
            </div>
            {stats.pendingAwards > 0 && (
              <Badge variant="danger" className="animate-pulse">
                Urgente
              </Badge>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.pendingAwards}</h3>
          <p className="text-sm text-gray-600 font-medium">Adjudicaciones Pendientes</p>
          {stats.pendingAwards > 0 && (
            <p className="text-xs text-red-600 mt-2 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Requiere aprobación inmediata
            </p>
          )}
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 rounded-lg p-3">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.pendingApprovals}</h3>
          <p className="text-sm text-gray-600 font-medium">Aprobaciones Pendientes</p>
          <p className="text-xs text-gray-500 mt-2">Nuevas solicitudes por aprobar</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 rounded-lg p-3">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.activeRequests}</h3>
          <p className="text-sm text-gray-600 font-medium">Solicitudes Activas</p>
          <p className="text-xs text-gray-500 mt-2">En proceso de cotización</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 rounded-lg p-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalApproved}</h3>
          <p className="text-sm text-gray-600 font-medium">Total Adjudicadas</p>
          <p className="text-xs text-gray-500 mt-2">Proceso completado</p>
        </Card>
      </div>

      {stats.pendingAwards > 0 && (
        <Card className="p-6 mb-8 border-2 border-red-200 bg-red-50">
          <div className="flex items-start space-x-4">
            <div className="bg-red-100 rounded-full p-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                Acción Requerida: {stats.pendingAwards} Adjudicación{stats.pendingAwards > 1 ? 'es' : ''} Pendiente{stats.pendingAwards > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-800 mb-3">
                Hay adjudicaciones esperando tu aprobación final. Los creadores han seleccionado proveedores ganadores y requieren tu autorización para proceder.
              </p>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent('navigate', { detail: 'pending-awards' }));
                }}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                <Award className="w-4 h-4 mr-2" />
                Revisar Adjudicaciones Pendientes
              </a>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Actividad Reciente</h2>
          <Clock className="w-5 h-5 text-gray-400" />
        </div>

        {stats.recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition border border-gray-100"
              >
                <div
                  className={`rounded-lg p-2 ${
                    item.type === 'award'
                      ? 'bg-red-100'
                      : item.type === 'approval'
                      ? 'bg-yellow-100'
                      : 'bg-blue-100'
                  }`}
                >
                  {item.type === 'award' ? (
                    <Award className="w-5 h-5 text-red-600" />
                  ) : item.type === 'approval' ? (
                    <CheckCircle className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {getTimeAgo(item.time)}
                  </span>
                  {item.status === 'pending_approval' && (
                    <Badge variant="warning" className="text-xs">
                      Pendiente
                    </Badge>
                  )}
                  {item.status === 'approved' && (
                    <Badge variant="success" className="text-xs">
                      Aprobada
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
