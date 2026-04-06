import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';

interface MainLayoutProps {
    children: React.ReactNode;
    activeView: 'dashboard' | 'catalog' | 'consolidate' | 'profile' | 'legislation';
    secondaryContent?: React.ReactNode;
    hideAutoSave?: boolean;
}

export default function MainLayout({ children, activeView, secondaryContent, hideAutoSave = false }: MainLayoutProps) {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const handleNavigate = (view: string) => {
        switch (view) {
            case 'dashboard': navigate('/dashboard'); break;
            case 'profile': navigate('/perfil'); break;
            case 'catalog': navigate('/itens'); break;
            case 'consolidate': navigate('/consolidar'); break;
            case 'legislation': navigate('/legislacao'); break;
            default: navigate('/dashboard');
        }
        setMobileMenuOpen(false);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-gray-900 print:min-h-0 print:h-auto print:overflow-visible print:bg-white">
            <div className="print:hidden">
                <AppSidebar
                    activeView={activeView}
                    onNavigate={handleNavigate}
                    onLogout={() => navigate('/')}
                    mobileOpen={mobileMenuOpen}
                    onCloseMobile={() => setMobileMenuOpen(false)}
                />
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
                <div className="print:hidden">
                    <AppHeader
                        secondaryContent={secondaryContent}
                        onOpenMenu={() => setMobileMenuOpen(true)}
                        hideAutoSave={hideAutoSave}
                    />
                </div>

                <div className="relative flex-1 overflow-y-auto print:overflow-visible">
                    {children}
                </div>

                <div className="print:hidden">
                    <AppFooter />
                </div>
            </div>
        </div>
    );
}
