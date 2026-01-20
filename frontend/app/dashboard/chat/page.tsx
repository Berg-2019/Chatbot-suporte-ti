'use client';

import { TeamChat } from '@/components/TeamChat';
import Link from 'next/link';

export default function TeamChatPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow mb-6">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ← Voltar
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                        Canal Interno da Equipe
                    </h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 pb-8">
                <TeamChat />
            </main>
        </div>
    );
}
