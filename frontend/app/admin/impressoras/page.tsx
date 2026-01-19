/**
 * Página de Monitoramento de Impressoras
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { printerApi } from '@/lib/api';
import Link from 'next/link';

interface Printer {
    id: string;
    name: string;
    ip: string;
    location?: string;
    model?: string;
    lastStatus?: string;
    lastTonerBlack?: number;
    lastTonerCyan?: number;
    lastTonerMagenta?: number;
    lastTonerYellow?: number;
    lastPageCount?: number;
    lastCheckedAt?: string;
}

interface PrinterStatus {
    online: boolean;
    status: string;
    model?: string;
    tonerBlack?: number;
    pageCount?: number;
    error?: string;
}

export default function PrintersPage() {
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPrinter, setNewPrinter] = useState({ name: '', ip: '', location: '' });

    const loadPrinters = useCallback(async () => {
        try {
            const response = await printerApi.list();
            setPrinters(response.data);
        } catch (error) {
            console.error('Erro ao carregar impressoras:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPrinters();
    }, [loadPrinters]);

    async function handleRefreshAll() {
        setRefreshing(true);
        try {
            const response = await printerApi.statusAll();
            // Recarregar lista após atualizar status
            await loadPrinters();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        } finally {
            setRefreshing(false);
        }
    }

    async function handleAddPrinter() {
        if (!newPrinter.name || !newPrinter.ip) {
            alert('Preencha nome e IP');
            return;
        }
        try {
            await printerApi.create(newPrinter);
            setNewPrinter({ name: '', ip: '', location: '' });
            setShowAddModal(false);
            loadPrinters();
        } catch (error) {
            alert('Erro ao adicionar impressora');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Remover esta impressora?')) return;
        try {
            await printerApi.delete(id);
            loadPrinters();
        } catch (error) {
            alert('Erro ao remover');
        }
    }

    function getStatusColor(status?: string) {
        if (status === 'online') return 'bg-green-500';
        if (status === 'offline') return 'bg-red-500';
        return 'bg-gray-400';
    }

    function getTonerColor(level?: number) {
        if (level === undefined || level === null) return 'bg-gray-300';
        if (level > 50) return 'bg-green-500';
        if (level > 20) return 'bg-yellow-500';
        return 'bg-red-500';
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                            ← Voltar
                        </Link>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        🖨️ Monitoramento de Impressoras
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Status em tempo real das impressoras da rede
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRefreshAll}
                        disabled={refreshing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition flex items-center gap-2"
                    >
                        {refreshing ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Atualizando...
                            </>
                        ) : (
                            <>🔄 Atualizar Todos</>
                        )}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                        ➕ Adicionar
                    </button>
                </div>
            </div>

            {/* Grid of Printers */}
            {printers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                    <p className="text-gray-500 text-lg mb-4">Nenhuma impressora cadastrada</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                        Adicionar Primeira Impressora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {printers.map((printer) => (
                        <div
                            key={printer.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                        >
                            {/* Status Badge */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${getStatusColor(printer.lastStatus)}`}></div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {printer.lastStatus === 'online' ? 'Online' : printer.lastStatus === 'offline' ? 'Offline' : 'Desconhecido'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDelete(printer.id)}
                                    className="text-gray-400 hover:text-red-500 text-sm"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Name & IP */}
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {printer.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                📍 {printer.ip}
                            </p>
                            {printer.location && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                    🏢 {printer.location}
                                </p>
                            )}

                            {/* Toner Level */}
                            {printer.lastTonerBlack !== undefined && printer.lastTonerBlack !== null && (
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        <span>Toner Preto</span>
                                        <span>{printer.lastTonerBlack}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${getTonerColor(printer.lastTonerBlack)}`}
                                            style={{ width: `${Math.min(100, printer.lastTonerBlack)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Page Count */}
                            {printer.lastPageCount !== undefined && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    📄 {printer.lastPageCount?.toLocaleString()} páginas
                                </div>
                            )}

                            {/* Last Check */}
                            {printer.lastCheckedAt && (
                                <div className="text-xs text-gray-400 mt-2">
                                    Atualizado: {new Date(printer.lastCheckedAt).toLocaleTimeString('pt-BR')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            ➕ Adicionar Impressora
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={newPrinter.name}
                                    onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                                    placeholder="Ex: HP LaserJet - Recepção"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    IP *
                                </label>
                                <input
                                    type="text"
                                    value={newPrinter.ip}
                                    onChange={(e) => setNewPrinter({ ...newPrinter, ip: e.target.value })}
                                    placeholder="Ex: 192.168.1.100"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Localização
                                </label>
                                <input
                                    type="text"
                                    value={newPrinter.location}
                                    onChange={(e) => setNewPrinter({ ...newPrinter, location: e.target.value })}
                                    placeholder="Ex: Sala 101"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddPrinter}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
