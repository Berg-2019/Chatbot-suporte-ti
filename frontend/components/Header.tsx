'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';

export default function Header() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo / Status */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-2xl hover:opacity-80 transition">🎫</Link>
            <Link href="/dashboard">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">Helpdesk</h1>
            </Link>
            <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? '● Online' : '○ Offline'}
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/admin/estoque"
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition"
            >
              📦 Estoque
            </Link>
            <Link
              href="/admin/faq"
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition"
            >
              📚 FAQ
            </Link>
            <Link
              href="/admin/metrics"
              className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg text-sm transition"
            >
              📊 Métricas
            </Link>
            <Link
              href="/dashboard/history"
              className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg text-sm transition"
            >
              📜 Histórico
            </Link>
            <Link
              href="/dashboard/chat"
              className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-lg text-sm transition font-medium flex items-center gap-2"
            >
              💬 Chat Equipe
            </Link>
            
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>

            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.role}
              </span>
            </div>
            
            <button
              onClick={logout}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition border border-transparent hover:border-red-200"
            >
              Sair
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
             <div className="flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name.split(' ')[0]}
              </span>
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <span className="text-xl">☰</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden pt-4 pb-2 border-t border-gray-100 dark:border-gray-700 mt-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <Link
              href="/admin/estoque"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              📦 Estoque
            </Link>
            <Link
              href="/admin/faq"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              📚 FAQ
            </Link>
            <Link
              href="/admin/metrics"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-300"
            >
              📊 Métricas
            </Link>
            <Link
              href="/dashboard/history"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-700 dark:text-purple-300"
            >
              📜 Histórico
            </Link>
            <Link
              href="/dashboard/chat"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-700 dark:text-indigo-300"
            >
              💬 Chat Equipe
            </Link>
            
            <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>
            
            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              🚪 Sair do Sistema
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
