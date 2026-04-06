import React, { useState } from 'react';
import {
    LayoutDashboard,
    UserCircle,
    ScrollText,
    FileCheck,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Scale,
    X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import AppLogo from './AppLogo';
import { useAppContext } from '../context/AppContext';

interface SidebarProps {
    activeView: 'dashboard' | 'catalog' | 'consolidate' | 'profile' | 'legislation';
    onNavigate: (view: any) => void;
    onLogout: () => void;
    mobileOpen?: boolean;
    onCloseMobile?: () => void;
}

export default function AppSidebar({
    activeView,
    onNavigate,
    onLogout,
    mobileOpen = false,
    onCloseMobile,
}: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const { servidor } = useAppContext();

    const menuItems = [
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { key: 'profile', label: 'Perfil', icon: UserCircle },
        { key: 'catalog', label: 'Itens', icon: ScrollText },
        { key: 'consolidate', label: 'Consolidar', icon: FileCheck },
        { key: 'legislation', label: 'Legislação', icon: Scale },
    ] as const;

    const sidebarContent = (isMobile = false) => (
        <>
            <div className="flex h-20 items-center justify-between border-b border-gray-50 px-5">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="shrink-0">
                        <AppLogo className="h-10 w-10" />
                    </div>
                    <AnimatePresence>
                        {(!collapsed || isMobile) && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-col whitespace-nowrap"
                            >
                                <span className="text-[11px] font-semibold tracking-tight text-gray-400">Assistente</span>
                                <span className="text-sm font-black tracking-tight text-gray-900 uppercase">RSC-TAE</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {isMobile && (
                    <button
                        type="button"
                        onClick={onCloseMobile}
                        className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {!isMobile && (
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-24 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-colors hover:bg-gray-50"
                >
                    {collapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                        <ChevronLeft className="h-3.5 w-3.5 text-gray-500" />
                    )}
                </button>
            )}

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6 scrollbar-none">
                {menuItems.map(({ key, label, icon: Icon }) => {
                    const isActive = activeView === key;
                    return (
                        <button
                            key={key}
                            onClick={() => {
                                onNavigate(key);
                                if (isMobile) onCloseMobile?.();
                            }}
                            className={cn(
                                'group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                                isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            )}
                        >
                            <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary')} />
                            <AnimatePresence>
                                {(!collapsed || isMobile) && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        className="whitespace-nowrap"
                                    >
                                        {label}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {isActive && collapsed && !isMobile && (
                                <div className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-white" />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="border-t border-gray-100 p-4">
                <div className={cn(
                    'flex items-center gap-3 rounded-2xl p-2 transition-colors',
                    (!collapsed || isMobile) && 'bg-gray-50'
                )}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {servidor?.nome_completo?.charAt(0) || <UserCircle className="h-6 w-6" />}
                    </div>
                    <AnimatePresence>
                        {(!collapsed || isMobile) && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                className="min-w-0 flex-1"
                            >
                                <p className="truncate text-sm font-bold text-gray-900">{servidor?.nome_completo || 'UsuÃ¡rio'}</p>
                                <p className="truncate text-[11px] font-medium text-gray-500">SIAPE: {servidor?.siape || '---'}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-4 flex flex-col gap-1">
                    <button
                        onClick={() => {
                            onLogout();
                            if (isMobile) onCloseMobile?.();
                        }}
                        className={cn(
                            'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-red-50 hover:text-red-600',
                            collapsed && !isMobile ? 'justify-center text-gray-400' : 'text-gray-500'
                        )}
                        title="Sair / Trocar sessÃ£o"
                    >
                        <LogOut className="h-5 w-5" />
                        <AnimatePresence>
                            {(!collapsed || isMobile) && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                >
                                    Sair
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <>
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 80 : 260 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={cn(
                    'relative hidden h-screen flex-col border-r border-gray-200 bg-white lg:flex',
                    'shadow-[4px_0_24px_rgba(0,0,0,0.02)]'
                )}
            >
                {sidebarContent()}
            </motion.aside>

            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.button
                            type="button"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onCloseMobile}
                            className="fixed inset-0 z-40 bg-gray-950/45 lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                            className="fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-gray-200 bg-white shadow-2xl lg:hidden"
                        >
                            {sidebarContent(true)}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
