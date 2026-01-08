'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, Clock, CheckCircle, XCircle, User, MapPin, Monitor, FileText } from 'lucide-react';

interface SolicitacaoPecas {
  id: number;
  ordem_id: number;
  tecnico_telefone: string;
  tecnico_nome: string;
  pecas_solicitadas: string;
  observacoes?: string;
  status: string;
  almoxarifado_responsavel?: string;
  created_at: string;
  updated_at: string;
  atendida_at?: string;
  usuario_nome: string;
  local_atendimento?: string;
  equipamento?: string;
  problema: string;
}

const statusConfig = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  em_separacao: { label: 'Em Separação', color: 'bg-blue-500', icon: Package },
  atendida: { label: 'Atendida', color: 'bg-green-500', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-red-500', icon: XCircle }
};

export default function PartsPage() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPecas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pendente');
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchSolicitacoes = async (status?: string) => {
    try {
      setLoading(true);
      const url = status && status !== 'all' 
        ? `/api/parts?status=${status}&limit=100` 
        : '/api/parts?limit=100';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setSolicitacoes(data.parts || []);
        setError(null);
      } else {
        setError(data.error || 'Erro ao carregar solicitações');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
      console.error('Erro ao buscar solicitações:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string, almoxarifado?: string) => {
    try {
      setUpdating(id);
      const response = await fetch('/api/parts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: newStatus,
          almoxarifado_responsavel: almoxarifado || 'Sistema Web'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Recarregar dados
        await fetchSolicitacoes(activeTab);
      } else {
        setError(data.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
      console.error('Erro ao atualizar status:', err);
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchSolicitacoes(activeTab);
  }, [activeTab]);

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatPecas = (pecas: string) => {
    return pecas.split('\n').filter(p => p.trim()).map((peca, index) => (
      <div key={index} className="flex items-center gap-2">
        <Package className="w-3 h-3 text-gray-500" />
        <span className="text-sm">{peca.replace(/^[-•]\s*/, '')}</span>
      </div>
    ));
  };

  if (loading && solicitacoes.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Carregando solicitações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Peças</h1>
        <p className="text-gray-600">Gerencie as solicitações de peças dos técnicos</p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          <TabsTrigger value="em_separacao">Em Separação</TabsTrigger>
          <TabsTrigger value="atendida">Atendidas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {solicitacoes.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Nenhuma solicitação encontrada</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {solicitacoes.map((solicitacao) => (
                <Card key={solicitacao.id} className="w-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Solicitação #{solicitacao.id}
                        </CardTitle>
                        <CardDescription>
                          OS #{solicitacao.ordem_id} - {solicitacao.usuario_nome}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(solicitacao.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Informações do Técnico
                          </h4>
                          <p className="text-sm text-gray-600">
                            <strong>Nome:</strong> {solicitacao.tecnico_nome}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Telefone:</strong> {solicitacao.tecnico_telefone}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Local e Equipamento
                          </h4>
                          <p className="text-sm text-gray-600">
                            <strong>Local:</strong> {solicitacao.local_atendimento || 'Não informado'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Equipamento:</strong> {solicitacao.equipamento || 'Não informado'}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Problema
                          </h4>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {solicitacao.problema}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Peças Solicitadas
                          </h4>
                          <div className="space-y-1 bg-blue-50 p-3 rounded">
                            {formatPecas(solicitacao.pecas_solicitadas)}
                          </div>
                        </div>

                        {solicitacao.observacoes && (
                          <div>
                            <h4 className="font-semibold mb-2">Observações</h4>
                            <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                              {solicitacao.observacoes}
                            </p>
                          </div>
                        )}

                        <div>
                          <h4 className="font-semibold mb-2">Datas</h4>
                          <p className="text-sm text-gray-600">
                            <strong>Solicitado:</strong> {formatDate(solicitacao.created_at)}
                          </p>
                          {solicitacao.atendida_at && (
                            <p className="text-sm text-gray-600">
                              <strong>Atendida:</strong> {formatDate(solicitacao.atendida_at)}
                            </p>
                          )}
                          {solicitacao.almoxarifado_responsavel && (
                            <p className="text-sm text-gray-600">
                              <strong>Responsável:</strong> {solicitacao.almoxarifado_responsavel}
                            </p>
                          )}
                        </div>

                        {solicitacao.status === 'pendente' && (
                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => updateStatus(solicitacao.id, 'em_separacao')}
                              disabled={updating === solicitacao.id}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {updating === solicitacao.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Package className="w-4 h-4 mr-2" />
                              )}
                              Iniciar Separação
                            </Button>
                            <Button
                              onClick={() => updateStatus(solicitacao.id, 'atendida')}
                              disabled={updating === solicitacao.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {updating === solicitacao.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Marcar como Atendida
                            </Button>
                          </div>
                        )}

                        {solicitacao.status === 'em_separacao' && (
                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => updateStatus(solicitacao.id, 'atendida')}
                              disabled={updating === solicitacao.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {updating === solicitacao.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Finalizar Atendimento
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
