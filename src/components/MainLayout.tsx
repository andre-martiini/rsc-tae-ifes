import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import OnboardingSpotlight from './OnboardingSpotlight';
import { useAppContext } from '../context/AppContext';

interface MainLayoutProps {
    children: React.ReactNode;
    activeView: 'dashboard' | 'catalog' | 'documents' | 'consolidate' | 'profile' | 'help' | 'triagem';
}

export default function MainLayout({ children, activeView }: MainLayoutProps) {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const { activeSessionId } = useAppContext();

    const handleNavigate = (view: string) => {
        switch (view) {
            case 'dashboard': navigate('/dashboard'); break;
            case 'profile': navigate('/perfil'); break;
            case 'catalog': navigate('/itens'); break;
            case 'documents': navigate('/documentos'); break;
            case 'consolidate': navigate('/consolidar'); break;
            case 'help': navigate('/ajuda'); break;
            case 'triagem': navigate('/triagem'); break;
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
                        onOpenMenu={() => setMobileMenuOpen(true)}
                    />
                </div>

                <div className="relative flex-1 overflow-y-auto pb-[60px] lg:pb-0 print:overflow-visible">
                    {children}
                </div>

                <div className="print:hidden">
                    <AppFooter />
                </div>
            </div>

            <OnboardingSpotlight activeSessionId={activeSessionId} />
        </div>
    );
}
