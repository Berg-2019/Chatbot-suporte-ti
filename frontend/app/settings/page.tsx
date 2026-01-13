'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { botAPI, usersAPI, authAPI } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  skills: string[];
  online: boolean;
}

export default function SettingsPage() {
  const { user, loading, isAdmin } = useAuth();
  const { botStatus, qrCode, pairingCode } = useSocket();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'qr' | 'pairing'>('pairing');
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'technician' });
  const [showAddUser, setShowAddUser] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const { data } = await usersAPI.list();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleConnectQR = async () => {
    setConnecting(true);
    setConnectionMode('qr');
    try {
      await botAPI.connectQR();
    } catch (error) {
      console.error('Erro ao conectar:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectPairing = async () => {
    if (!phoneNumber.trim()) {
      alert('Digite o número do telefone');
      return;
    }
    setConnecting(true);
    setConnectionMode('pairing');
    try {
      await botAPI.connectPairing(phoneNumber);
    } catch (error) {
      console.error('Erro ao conectar:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Deseja desconectar o WhatsApp?')) {
      await botAPI.disconnect();
    }
  };

  const handleClearSession = async () => {
    if (confirm('Isso irá limpar a sessão. Você precisará conectar novamente. Continuar?')) {
      await botAPI.clearSession();
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authAPI.register(newUser);
      setNewUser({ email: '', password: '', name: '', role: 'technician' });
      setShowAddUser(false);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao criar usuário');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await usersAPI.delete(userId);
        loadUsers();
      } catch (error) {
        console.error('Erro ao excluir:', error);
      }
    }
  };

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-slate-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Configurações</h1>
              <p className="text-sm text-slate-400">Gerenciar bot e usuários</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* WhatsApp Connection */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">📱 Conexão WhatsApp</h2>
          </div>
          <div className="p-5">
            {/* Status */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-3 h-3 rounded-full ${botStatus?.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-white font-medium">
                {botStatus?.connected ? `Conectado: ${botStatus.phoneNumber}` : 'Desconectado'}
              </span>
            </div>

            {botStatus?.connected ? (
              <div className="space-y-3">
                <button
                  onClick={handleDisconnect}
                  className="w-full py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium transition"
                >
                  Desconectar
                </button>
                <button
                  onClick={handleClearSession}
                  className="w-full py-3 bg-slate-700/50 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition"
                >
                  Limpar sessão
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* QR/Pairing Tabs */}
                <div className="flex gap-2 p-1 bg-slate-700/50 rounded-lg">
                  <button
                    onClick={() => setConnectionMode('pairing')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                      connectionMode === 'pairing' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Código de Pareamento
                  </button>
                  <button
                    onClick={() => setConnectionMode('qr')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                      connectionMode === 'qr' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    QR Code
                  </button>
                </div>

                {connectionMode === 'pairing' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="5569981170027"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleConnectPairing}
                      disabled={connecting}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg font-medium transition"
                    >
                      {connecting ? 'Conectando...' : 'Gerar Código'}
                    </button>
                    
                    {pairingCode && (
                      <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
                        <p className="text-sm text-green-300 mb-2">Digite este código no WhatsApp:</p>
                        <p className="text-3xl font-bold text-green-400 tracking-widest">{pairingCode}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleConnectQR}
                      disabled={connecting}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white rounded-lg font-medium transition"
                    >
                      {connecting ? 'Gerando QR...' : 'Gerar QR Code'}
                    </button>
                    
                    {qrCode && (
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Users Management */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">👥 Técnicos</h2>
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition"
            >
              + Adicionar
            </button>
          </div>

          {showAddUser && (
            <form onSubmit={handleAddUser} className="p-5 border-b border-slate-700 bg-slate-700/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nome"
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Email"
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Senha"
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="technician">Técnico</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-700">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                    u.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{u.name}</p>
                    <p className="text-sm text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {u.role}
                  </span>
                  {u.id !== user.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
