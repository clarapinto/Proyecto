import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Briefcase,
  Users,
  Settings,
  LogOut,
  Bell,
  ShoppingBag
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const [unreadCount] = useState(3);
  const [pendingAwardsCount, setPendingAwardsCount] = useState(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    if (profile?.role === 'procurement_approver') {
      loadPendingCounts();

      const interval = setInterval(loadPendingCounts, 30000);

      const handleNavigate = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
          onViewChange(customEvent.detail);
        }
      };

      const handleAwardsUpdate = () => {
        loadPendingCounts();
      };

      window.addEventListener('navigate', handleNavigate);
      window.addEventListener('awards-updated', handleAwardsUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('navigate', handleNavigate);
        window.removeEventListener('awards-updated', handleAwardsUpdate);
      };
    }
  }, [profile, onViewChange]);

  const loadPendingCounts = async () => {
    const [awardsResult, approvalsResult] = await Promise.all([
      supabase
        .from('award_selections')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),

      supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval')
    ]);

    setPendingAwardsCount(awardsResult.count || 0);
    setPendingApprovalsCount(approvalsResult.count || 0);
  };

  const getMenuItems = () => {
    switch (profile?.role) {
      case 'request_creator':
        return [
          { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
          { id: 'my-requests', label: 'Mis Solicitudes', icon: FileText },
          { id: 'create-request', label: 'Crear Solicitud', icon: FileText },
        ];
      case 'procurement_approver':
        return [
          { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
          { id: 'pending-approval', label: 'Pendientes de Aprobación', icon: CheckCircle, badge: pendingApprovalsCount },
          { id: 'pending-awards', label: 'Adjudicaciones Pendientes', icon: Briefcase, badge: pendingAwardsCount },
          { id: 'active-requests', label: 'Solicitudes Activas', icon: FileText },
          { id: 'history', label: 'Historial', icon: ShoppingBag },
        ];
      case 'supplier':
        return [
          { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
          { id: 'invitations', label: 'Invitaciones', icon: FileText },
          { id: 'my-proposals', label: 'Mis Propuestas', icon: Briefcase },
        ];
      case 'admin':
        return [
          { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
          { id: 'requests', label: 'Todas las Solicitudes', icon: FileText },
          { id: 'suppliers', label: 'Proveedores', icon: Users },
          { id: 'users', label: 'Usuarios', icon: Users },
          { id: 'settings', label: 'Configuración', icon: Settings },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'request_creator': 'Creador de Solicitudes',
      'procurement_approver': 'Aprobador',
      'supplier': 'Proveedor',
      'admin': 'Administrador',
    };
    return labels[role] || role;
  };

  return (
    <div className="h-screen w-64 bg-white border-r border-secondary-200/60 flex flex-col shadow-sm">
      <div className="p-6 border-b border-secondary-200/60 bg-gradient-to-br from-primary-900 to-primary-800">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl p-2 shadow-lg">
            <img
              src="/logotipo solo.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">E-Procurement</h1>
            <p className="text-xs text-primary-100">Gestión de Compras</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                    : 'text-secondary-700 hover:bg-secondary-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-xs font-bold rounded-full min-w-[1.5rem] h-6 px-2 flex items-center justify-center shadow-sm animate-pulse ${
                    item.id === 'pending-awards'
                      ? 'bg-accent-600 text-white'
                      : 'bg-warning-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-secondary-200/60 p-4 bg-secondary-50/30">
        <button
          onClick={() => onViewChange('notifications')}
          className="w-full flex items-center justify-between px-3 py-2.5 mb-3 rounded-lg text-secondary-700 hover:bg-white hover:shadow-sm transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            <span className="text-sm font-medium">Notificaciones</span>
          </div>
          {unreadCount > 0 && (
            <span className="bg-accent-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="px-3 py-3 mb-3 bg-white rounded-lg border border-secondary-200/60 shadow-sm">
          <p className="text-sm font-semibold text-secondary-900 truncate">{profile?.full_name}</p>
          <p className="text-xs text-secondary-500 truncate mt-0.5">{profile?.email}</p>
          <div className="mt-2 pt-2 border-t border-secondary-200/60">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200">
              {profile?.role && getRoleLabel(profile.role)}
            </span>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-danger-600 hover:bg-danger-50 transition-all duration-200 font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
