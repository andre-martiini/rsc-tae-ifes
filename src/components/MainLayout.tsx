import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

interface MainLayoutProps {
    children: React.ReactNode;
    activeView: 'dashboard' | 'catalog' | 'consolidate' | 'profile' | 'legislation';
    secondaryContent?: React.ReactNode;
}

export default function MainLayout({ children, activeView, secondaryContent }: MainLayoutProps) {
    const navigate = useNavigate();

    const handleNavigate = (view: string) => {
        switch (view) {
            case 'dashboard': navigate('/dashboard'); break;
            case 'profile': navigate('/perfil'); break;
            case 'catalog': navigate('/itens'); break;
            case 'consolidate': navigate('/consolidar'); break;
            case 'legislation': navigate('/legislacao'); break;
            default: navigate('/dashboard');
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans text-gray-900 print:h-auto print:w-auto print:overflow-visible print:bg-white">
            {/* Retractable Sidebar */}
            <div className="print:hidden flex h-full">
                <AppSidebar
                    activeView={activeView}
                    onNavigate={handleNavigate}
                    onLogout={() => navigate('/')}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
                {/* Top bar with status indicators */}
                <div className="print:hidden">
                    <AppHeader secondaryContent={secondaryContent} />
                </div>

                {/* Page Content */}
                <div className="relative flex-1 overflow-y-auto print:overflow-visible">
                    {children}
                </div>
            </div>
        </div>
    );
}
