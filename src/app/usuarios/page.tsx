'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  User,
  Calendar,
  ArrowLeft,
  Phone,
  Mail,
  Shield,
  UserPlus,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface Usuario {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  role: 'root' | 'admin' | 'tecnico' | 'almoxarifado' | 'user';
  status: 'ativo' | 'inativo';
  data_cadastro: string;
  ultimo_acesso?: string;
  total_os: number;
  os_abertas: number;
}

const mockUsuarios: Usuario[] = [
  {
    id: 1,
    nome: "João Silva",
    telefone: "5569981170027",
    email: "joao@empresa.com",
    role: "root",
    status: "ativo",
    data_cadastro: "2024-01-15T10:30:00",
    ultimo_acesso: "2025-01-03T14:20:00",
    total_os: 45,
    os_abertas: 2
  },
  {
    id: 2,
    nome: "Maria Santos",
    telefone: "5569981248816",
    email: "maria@empresa.com",
    role: "admin",
    status: "ativo",
    data_cadastro: "2024-02-20T09:15:00",
    ultimo_acesso: "2025-01-03T13:45:00",
    total_os: 32,
    os_abertas: 1
  },
  {
    id: 3,
    nome: "Carlos Tech",
    telefone: "5569987654321",
    email: "carlos@empresa.com",
    role: "tecnico",
    status: "ativo",
    data_cadastro: "2024-03-10T14:00:00",
    ultimo_acesso: "2025-01-03T15:10:00",
    total_os: 0,
    os_abertas: 0
  },
  {
    id: 4,
    nome: "Ana Tech",
    telefone: "5569912345678",
    email: "ana@empresa.com",
    role: "tecnico",
    status: "ativo",
    data_cadastro: "2024-03-15T11:30:00",
    ultimo_acesso: "2025-01-03T12:30:00",
    total_os: 0,
    os_abertas: 0
  },
  {
    id: 5,
    nome: "Pedro Costa",
    telefone: "5569998877665",
    role: "user",
    status: "ativo",
    data_cadastro: "2024-04-01T16:20:00",
    ultimo_acesso: "2025-01-02T10:15:00",
    total_os: 12,
    os_abertas: 0
  },
  {
    id: 6,
    nome: "Lucia Ferreira",
    telefone: "5569955443322",
    role: "almoxarifado",
    status: "ativo",
    data_cadastro: "2024-05-12T08:45:00",
    ultimo_acesso: "2025-01-03T09:20:00",
    total_os: 8,
    os_abertas: 1
  },
  {
    id: 7,
    nome: "Roberto Lima",
    telefone: "5569944332211",
    role: "user",
    status: "inativo",
    data_cadastro: "2024-06-20T13:10:00",
    ultimo_acesso: "2024-12-15T14:30:00",
    total_os: 5,
    os_abertas: 0
  }
];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(mockUsuarios);
  const [filtro, setFiltro] = useState('');
  const [filtroRole, setFiltroRole] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'root': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'tecnico': return 'bg-blue-100 text-blue-800';
      case 'almoxarifado': return 'bg-green-100 text-green-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'root':
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'tecnico':
        return <Settings className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchTexto = usuario.nome.toLowerCase().includes(filtro.toLowerCase()) ||
                      usuario.telefone.includes(filtro) ||
                      (usuario.email && usuario.email.toLowerCase().includes(filtro.toLowerCase()));
    const matchRole = filtroRole === 'todos' || usuario.role === filtroRole;
    const matchStatus = filtroStatus === 'todos' || usuario.status === filtroStatus;
    return matchTexto && matchRole && matchStatus;
  });

  const estatisticas = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.status === 'ativo').length,
    tecnicos: usuarios.filter(u => u.role === 'tecnico').length,
    admins: usuarios.filter(u => ['root', 'admin'].includes(u.role)).length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/config">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Users className="w-8 h-8 mr-3" />
                  Usuários do Sistema
                </h1>
                <p className="text-gray-600 mt-2">
                  Gerenciamento de usuários e permissões
                </p>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.ativos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Técnicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.tecnicos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{estatisticas.admins}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, telefone ou email..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={filtroRole}
                  onChange={(e) => setFiltroRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todas as Funções</option>
                  <option value="root">Root</option>
                  <option value="admin">Administrador</option>
                  <option value="tecnico">Técnico</option>
                  <option value="almoxarifado">Almoxarifado</option>
                  <option value="user">Usuário</option>
                </select>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários */}
        <div className="space-y-4">
          {usuariosFiltrados.map((usuario) => (
            <Card key={usuario.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg flex items-center">
                        {getRoleIcon(usuario.role)}
                        <span className="ml-2">{usuario.nome}</span>
                      </CardTitle>
                      <Badge className={getRoleColor(usuario.role)}>
                        {usuario.role.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(usuario.status)}>
                        {usuario.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Telefone:</span>
                    <span className="font-mono">{usuario.telefone}</span>
                  </div>
                  {usuario.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Email:</span>
                      <span>{usuario.email}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Cadastro:</span>
                    <span>{new Date(usuario.data_cadastro).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {usuario.ultimo_acesso && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Último Acesso:</span>
                      <span>{new Date(usuario.ultimo_acesso).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Total OS:</span>
                    <span className="font-bold text-blue-600">{usuario.total_os}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">OS Abertas:</span>
                    <span className={`font-bold ${usuario.os_abertas > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {usuario.os_abertas}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    Ver Histórico
                  </Button>
                  <Button variant="outline" size="sm">
                    Editar Permissões
                  </Button>
                  <Button size="sm">
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {usuariosFiltrados.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum usuário encontrado para os filtros selecionados.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
