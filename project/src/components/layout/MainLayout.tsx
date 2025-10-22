import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function MainLayout({ children, currentView, onViewChange }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-secondary-50">
      <Sidebar currentView={currentView} onViewChange={onViewChange} />
      <main className="flex-1 overflow-y-auto">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
