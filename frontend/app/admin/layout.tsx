/**
 * Admin Layout - Layout com Sidebar para área administrativa
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
    { href: '/admin', icon: '🏠', label: 'Dashboard', adminOnly: true },
    { href: '/admin/metrics', icon: '📊', label: 'Métricas', adminOnly: false },
    { href: '/admin/bot', icon: '🤖', label: 'Configurar Bot', adminOnly: true },
    { href: '/admin/reports', icon: '📈', label: 'Relatórios', adminOnly: true },
    { href: '/admin/faq', icon: '📚', label: 'FAQ', adminOnly: false },
    { href: '/admin/estoque', icon: '📦', label: 'Estoque', adminOnly: false },
    { href: '/admin/users', icon: '👥', label: 'Usuários', adminOnly: true },
    { href: '/dashboard/chat', icon: '💬', label: 'Chat Equipe', adminOnly: false },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
        // Agora AGENT pode acessar algumas rotas do admin
        // Vamos bloquear apenas se for uma rota Restrita e o usuario nao for ADMIN
        // Mas como este layout cobre /admin/*, vamos permitir o acesso
        // e confiar que as paginas individuais ou o sidebar protegem o resto?
        // Melhor: Se for AGENT e tentar acessar /admin (dashboard), redirecionar.
        // Se acessar /admin/metrics, permitir.

        if (!loading && user && user.role !== 'ADMIN') {
            // Lista de rotas permitidas para técnicos
            const allowedRoutes = ['/admin/metrics', '/admin/faq', '/admin/estoque'];
            const isAllowed = allowedRoutes.some(route => pathname?.startsWith(route));

            if (!isAllowed) {
                // Se tentar acessar rota bloqueada, manda pro dashboard
                router.push('/dashboard');
            }
        }
    }, [user, loading, router, pathname]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // Permitir renderizar se for ADMIN ou se estiver em rota permitida
    const allowedRoutes = ['/admin/metrics', '/admin/faq', '/admin/estoque'];
    const isAllowed = user.role === 'ADMIN' || allowedRoutes.some(route => pathname?.startsWith(route));

    if (!isAllowed) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-800 min-h-screen fixed left-0 top-0 flex flex-col">
                {/* Logo */}
                <div className="p-4 border-b border-gray-700">
                    <Link href="/admin" className="flex items-center gap-3">
                        <span className="text-3xl">🎫</span>
                        <div>
                            <h1 className="text-xl font-bold text-white">Helpdesk</h1>
                            <p className="text-xs text-gray-400">Painel Administrativo</p>
                        </div>
                    </Link>
                </div>

                {/* Menu */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                            }`}
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Separador */}
                <div className="px-4">
                    <hr className="border-gray-700" />
                </div>

                {/* User Info */}
                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{user.name}</p>
                            <p className="text-gray-400 text-xs truncate">{user.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition"
                    >
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64">
                {children}
            </main>
        </div>
    );
}
