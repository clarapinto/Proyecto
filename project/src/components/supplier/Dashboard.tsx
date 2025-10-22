import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../shared/Card';

interface DashboardStats {
  activeInvitations: number;
  pendingProposals: number;
  submittedProposals: number;
  awards: number;
}

interface Activity {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

export default function SupplierDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeInvitations: 0,
    pendingProposals: 0,
    submittedProposals: 0,
    awards: 0,
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

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, total_awards')
      .eq('contact_email', profile.email)
      .maybeSingle();

    if (supplier) {
      const { data: invitations } = await supabase
        .from('request_invitations')
        .select('id, request:requests(status, round_deadline)')
        .eq('supplier_id', supplier.id);

      const activeInvitations = invitations?.filter((inv: any) => {
        const request = inv.request;
        if (!request) return false;
        const isActive = request.status === 'active' || request.status === 'approved';
        const deadline = request.round_deadline ? new Date(request.round_deadline) : null;
        const notExpired = !deadline || deadline > new Date();
        return isActive && notExpired;
      }).length || 0;

      const { data: proposals } = await supabase
        .from('proposals')
        .select('status')
        .eq('supplier_id', supplier.id);

      const pendingProposals = proposals?.filter((p) => p.status === 'draft').length || 0;
      const submittedProposals = proposals?.filter((p) => p.status === 'submitted').length || 0;

      setStats({
        activeInvitations,
        pendingProposals,
        submittedProposals,
        awards: supplier.total_awards || 0,
      });
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
      case 'invitation':
        return { Icon: FileText, color: 'bg-blue-100', iconColor: 'text-blue-600' };
      case 'submitted':
        return { Icon: CheckCircle, color: 'bg-green-100', iconColor: 'text-green-600' };
      case 'adjustment':
        return { Icon: Clock, color: 'bg-yellow-100', iconColor: 'text-yellow-600' };
      default:
        return { Icon: FileText, color: 'bg-gray-100', iconColor: 'text-gray-600' };
    }
  };

  const statCards = [
    { label: 'Invitaciones Activas', value: stats.activeInvitations, icon: FileText, color: 'bg-blue-500' },
    { label: 'Propuestas Pendientes', value: stats.pendingProposals, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Enviadas', value: stats.submittedProposals, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Adjudicaciones Ganadas', value: stats.awards, icon: Award, color: 'bg-purple-500' },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel Principal</h1>
        <p className="text-gray-600">Resumen de tus propuestas e invitaciones</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500">No hay actividad reciente</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const { Icon, color, iconColor } = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`${color} rounded-full p-2`}>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">
                        {activity.message} - {getTimeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Desempeño</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Tasa de Éxito</span>
                <span className="text-sm font-semibold text-gray-900">62.5%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '62.5%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Tasa de Respuesta</span>
                <span className="text-sm font-semibold text-gray-900">95%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Adjudicaciones</span>
                <span className="text-xl font-bold text-gray-900">$245,000</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
