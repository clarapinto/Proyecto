import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import MainLayout from './components/layout/MainLayout';

import CreatorDashboard from './components/creator/Dashboard';
import MyRequestsList from './components/creator/MyRequestsList';
import CreateRequestWizard from './components/creator/CreateRequestWizard';

import ApproverDashboard from './components/approver/Dashboard';
import PendingApprovalList from './components/approver/PendingApprovalList';
import ActiveRequestsList from './components/approver/ActiveRequestsList';
import PendingAwardsView from './components/approver/PendingAwardsView';

import SupplierDashboard from './components/supplier/Dashboard';
import InvitationsList from './components/supplier/InvitationsList';
import AllProposalsView from './components/supplier/AllProposalsView';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  const renderView = () => {
    if (profile.role === 'request_creator') {
      switch (currentView) {
        case 'dashboard':
          return <CreatorDashboard onViewChange={setCurrentView} />;
        case 'my-requests':
          return <MyRequestsList />;
        case 'create-request':
          return <CreateRequestWizard />;
        default:
          return <CreatorDashboard onViewChange={setCurrentView} />;
      }
    }

    if (profile.role === 'procurement_approver') {
      switch (currentView) {
        case 'dashboard':
          return <ApproverDashboard onViewChange={setCurrentView} />;
        case 'pending-approval':
          return <PendingApprovalList />;
        case 'active-requests':
          return <ActiveRequestsList />;
        case 'pending-awards':
          return <PendingAwardsView />;
        default:
          return <ApproverDashboard onViewChange={setCurrentView} />;
      }
    }

    if (profile.role === 'supplier') {
      switch (currentView) {
        case 'dashboard':
          return <SupplierDashboard onViewChange={setCurrentView} />;
        case 'invitations':
          return <InvitationsList />;
        case 'my-proposals':
          return <AllProposalsView />;
        default:
          return <SupplierDashboard onViewChange={setCurrentView} />;
      }
    }

    if (profile.role === 'admin') {
      return (
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900">Portal de Administración</h1>
          <p className="text-gray-600 mt-2">Funcionalidad de administración próximamente</p>
        </div>
      );
    }

    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">Bienvenido</h1>
        <p className="text-gray-600 mt-2">Tu rol: {profile.role}</p>
      </div>
    );
  };

  return (
    <MainLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderView()}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
