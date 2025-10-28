import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, Award, Plus, Eye, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';

interface DashboardStats {
  total: number;
  pending: number;
  active: number;
  awarded: number;
}

interface Activity {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

interface CreatorDashboardProps {
  onViewChange: (view: string) => void;
}

export default function CreatorDashboard({ onViewChange }: CreatorDashboardProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    active: 0,
    awarded: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData();
    }
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile?.id) return;

    const { data: requests } = await supabase
      .from('requests')
      .select('status')
      .eq('creator_id', profile.id);

    if (requests) {
      const newStats: DashboardStats = {
        total: requests.length,
        pending: requests.filter((r) => r.status === 'pending_approval').length,
        active: requests.filter((r) => r.status === 'active').length,
        awarded: requests.filter((r) => r.status === 'awarded').length,
      };
      setStats(newStats);
    }

    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (notifications) {
      setActivities(notifications);
    }

    setLoading(false);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `hace ${diffMins} minutos`;
    if (diffHours < 24) return `hace ${diffHours} horas`;
    return `hace ${diffDays} días`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'approved':
        return { Icon: CheckCircle, color: 'bg-success-50', iconColor: 'text-success-600' };
      case 'proposal':
        return { Icon: FileText, color: 'bg-primary-50', iconColor: 'text-primary-600' };
      case 'pending':
        return { Icon: Clock, color: 'bg-warning-50', iconColor: 'text-warning-600' };
      default:
        return { Icon: FileText, color: 'bg-secondary-100', iconColor: 'text-secondary-600' };
    }
  };

  const statCards = [
    { label: 'Total Solicitudes', value: stats.total, icon: FileText, gradient: 'from-primary-700 to-primary-900' },
    { label: 'Pendientes Aprobación', value: stats.pending, icon: Clock, gradient: 'from-warning-500 to-warning-600' },
    { label: 'Activas', value: stats.active, icon: CheckCircle, gradient: 'from-success-500 to-success-600' },
    { label: 'Adjudicadas', value: stats.awarded, icon: Award, gradient: 'from-accent-500 to-accent-700' },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-secondary-500">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">Panel Principal</h1>
        <p className="text-secondary-600">Resumen de tus solicitudes de compras</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6 hover:shadow-lg transition-all duration-200 animate-scale-in" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary-600 mb-1 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-secondary-900">{stat.value}</p>
                </div>
                <div className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-3 shadow-md`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-secondary-900">Actividad Reciente</h2>
            <TrendingUp className="w-5 h-5 text-secondary-400" />
          </div>
          {activities.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-secondary-400" />
              </div>
              <p className="text-sm text-secondary-500">No hay actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const { Icon, color, iconColor } = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary-50 transition-colors duration-200">
                    <div className={`${color} rounded-lg p-2 ring-1 ring-inset ring-secondary-200`}>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary-900">{activity.title}</p>
                      <p className="text-xs text-secondary-500 mt-0.5">
                        {activity.message} · {getTimeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-secondary-900">Acciones Rápidas</h2>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => onViewChange('create-request')}
              className="w-full text-left px-4 py-4 bg-gradient-to-r from-primary-50 to-primary-100/50 hover:from-primary-100 hover:to-primary-100 rounded-lg transition-all duration-200 group border border-primary-200/50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary-600 rounded-lg p-2 group-hover:scale-110 transition-transform duration-200">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-primary-900">Crear Nueva Solicitud</p>
                  <p className="text-xs text-primary-700">Iniciar un nuevo proceso de compras</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => onViewChange('my-requests')}
              className="w-full text-left px-4 py-4 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-all duration-200 group border border-secondary-200/50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-secondary-600 rounded-lg p-2 group-hover:scale-110 transition-transform duration-200">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-secondary-900">Ver Pendientes de Aprobación</p>
                  <p className="text-xs text-secondary-600">Revisar estado de solicitudes enviadas</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => onViewChange('my-requests')}
              className="w-full text-left px-4 py-4 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-all duration-200 group border border-secondary-200/50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-secondary-600 rounded-lg p-2 group-hover:scale-110 transition-transform duration-200">
                  <Eye className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-secondary-900">Ver Solicitudes Activas</p>
                  <p className="text-xs text-secondary-600">Monitorear compras en curso</p>
                </div>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
