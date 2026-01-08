'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dashboard } from '@/components/ui/dashboard';
import { Charts } from '@/components/ui/charts';
import { 
  Settings, 
  Database, 
  HardDrive, 
  Cpu, 
  Shield, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  BarChart3,
  MessageSquare,
  Zap,
  Users,
  Moon,
  Sun,
  Link,
  Monitor
} from 'lucide-react';

interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  description: string;
  updated_by: string;
  updated_at: string;
}

interface SystemStats {
  total_os: number;
  total_pecas: number;
  total_usuarios: number;
  total_backups: number;
}

interface SystemInfo {
  platform: string;
  arch: string;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  processUptime: number;
  processMemory: number;
  nodeVersion: string;
}

interface User {
  username: string;
  role: string;
  telefone: string;
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [rootUsers, setRootUsers] = useState<any[]>([]);
  const [newRootUser, setNewRootUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [authenticated, setAuthenticated] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const authenticate = async () => {
    if (!credentials.username || !credentials.password) {
      showMessage('error', 'Por favor, insira usuário e senha');
      return;
    }

    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.ok) {
        setAuthenticated(true);
        loadData();
      } else {
        showMessage('error', 'Credenciais inválidas');
      }
    } catch (error) {
      showMessage('error', 'Erro ao autenticar');
    }
  };

  const loadData = async () => {
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data.configs);
        setStats(data.stats);
        setUser(data.user);
      } else {
        showMessage('error', 'Erro ao carregar configurações');
      }
    } catch (error) {
      showMessage('error', 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ action: 'system_info' })
      });

      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data.systemInfo);
      }
    } catch (error) {
      console.error('Erro ao carregar informações do sistema:', error);
    }
  };

  const loadRootUsers = async () => {
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ action: 'list_root_users' })
      });

      if (response.ok) {
        const data = await response.json();
        setRootUsers(data.rootUsers || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários root:', error);
    }
  };

  const updateConfig = async (key: string, value: string) => {
    setSaving(true);
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          config_key: key,
          config_value: value
        })
      });

      if (response.ok) {
        showMessage('success', 'Configuração atualizada com sucesso');
        loadData();
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Erro ao atualizar configuração');
      }
    } catch (error) {
      showMessage('error', 'Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const addRootUser = async () => {
    if (!newRootUser) {
      showMessage('error', 'Por favor, informe o número do telefone');
      return;
    }

    setSaving(true);
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          action: 'add_root_user',
          telefone: newRootUser
        })
      });

      if (response.ok) {
        showMessage('success', 'Usuário adicionado como root com sucesso');
        setNewRootUser('');
        loadRootUsers(); // Recarregar a lista de usuários root
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Erro ao adicionar usuário root');
      }
    } catch (error) {
      showMessage('error', 'Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const removeRootUser = async (telefone: string) => {
    setSaving(true);
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          action: 'remove_root_user',
          telefone: telefone
        })
      });

      if (response.ok) {
        showMessage('success', 'Usuário removido dos root com sucesso');
        loadRootUsers(); // Recarregar a lista de usuários root
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Erro ao remover usuário root');
      }
    } catch (error) {
      showMessage('error', 'Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    setSaving(true);
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ action: 'backup' })
      });

      if (response.ok) {
        const data = await response.json();
        showMessage('success', `Backup criado: ${data.backup.name}`);
        loadData();
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Erro ao criar backup');
      }
    } catch (error) {
      showMessage('error', 'Erro ao criar backup');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadSystemInfo();
      loadRootUsers();
    }
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Configurações do Sistema</CardTitle>
            <CardDescription>
              Acesso restrito - Faça login para continuar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Digite seu usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Digite sua senha"
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              />
            </div>
            <Button onClick={authenticate} className="w-full">
              <Shield className="w-4 h-4 mr-2" />
              Entrar
            </Button>
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const getConfigValue = (key: string) => {
    const config = configs.find(c => c.config_key === key);
    return config?.config_value || '';
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigs(prev => prev.map(config => 
      config.config_key === key 
        ? { ...config, config_value: value }
        : config
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Settings className="w-8 h-8 mr-3" />
                Configurações do Sistema
              </h1>
              <p className="text-gray-600 mt-2">
                Painel de controle e configurações do bot WhatsApp
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-2">
                {user?.role.toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-600">
                Logado como: {user?.username}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert className="mb-6" variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="ai">IA & Root</TabsTrigger>
          </TabsList>

          {/* Dashboard Principal */}
          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard 
              stats={{
                totalOS: stats?.total_os || 0,
                osAbertas: Math.floor((stats?.total_os || 0) * 0.3),
                osEmAndamento: Math.floor((stats?.total_os || 0) * 0.2),
                osFinalizadas: Math.floor((stats?.total_os || 0) * 0.5),
                totalUsuarios: stats?.total_usuarios || 0,
                totalPecas: stats?.total_pecas || 0,
                tempoMedioResolucao: 4.2,
                osHoje: Math.floor((stats?.total_os || 0) * 0.1),
                tendenciaOS: 'up' as const,
                systemHealth: {
                  cpu: systemInfo ? Math.round((systemInfo.processMemory / 512) * 100) : 45,
                  memory: systemInfo ? Math.round(((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100) : 65,
                  disk: 35,
                  status: 'healthy' as const
                }
              }}
              isLoading={loading}
            />
            
            {/* Gráficos */}
            <Charts 
              osPorMes={[
                { mes: '2024-01', total: 45, finalizadas: 40 },
                { mes: '2024-02', total: 52, finalizadas: 48 },
                { mes: '2024-03', total: 38, finalizadas: 35 },
                { mes: '2024-04', total: 61, finalizadas: 58 },
                { mes: '2024-05', total: 49, finalizadas: 45 },
                { mes: '2024-06', total: 67, finalizadas: 62 }
              ]}
              osPorTecnico={[
                { tecnico_responsavel: 'João Silva', total: 25, finalizadas: 23 },
                { tecnico_responsavel: 'Maria Santos', total: 18, finalizadas: 16 },
                { tecnico_responsavel: 'Pedro Costa', total: 22, finalizadas: 20 },
                { tecnico_responsavel: 'Ana Lima', total: 15, finalizadas: 14 }
              ]}
              pecasPorStatus={[
                { status: 'pendente', total: 12 },
                { status: 'em_separacao', total: 8 },
                { status: 'atendida', total: 45 },
                { status: 'cancelada', total: 3 }
              ]}
              tempoMedioResolucao={4.2}
            />
          </TabsContent>

          {/* Aba de Mensagens */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Configuração de Mensagens
                </CardTitle>
                <CardDescription>
                  Personalize as mensagens automáticas do bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Configuração de Mensagens
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Acesse a página dedicada para personalizar todas as mensagens do bot
                    </p>
                    <Button 
                      onClick={() => window.open('/config/messages', '_blank')}
                      className="inline-flex items-center"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Abrir Editor de Mensagens
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configurações Gerais */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do WhatsApp</CardTitle>
                <CardDescription>
                  Configure as opções básicas do bot WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grupo_tecnico">ID do Grupo Técnico</Label>
                    <Input
                      id="grupo_tecnico"
                      value={getConfigValue('grupo_tecnico')}
                      onChange={(e) => handleConfigChange('grupo_tecnico', e.target.value)}
                      placeholder="ID do grupo técnico"
                    />
                    <p className="text-sm text-gray-500">
                      ID do grupo onde serão enviadas as notificações
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cleanup_days">Dias para Manter Histórico</Label>
                    <Input
                      id="cleanup_days"
                      type="number"
                      value={getConfigValue('cleanup_days')}
                      onChange={(e) => handleConfigChange('cleanup_days', e.target.value)}
                      placeholder="365"
                    />
                    <p className="text-sm text-gray-500">
                      Número de dias para manter OS finalizadas
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="backup_path">Caminho dos Backups</Label>
                    <Input
                      id="backup_path"
                      value={getConfigValue('backup_path')}
                      onChange={(e) => handleConfigChange('backup_path', e.target.value)}
                      placeholder="./backups"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="export_path">Caminho das Exportações</Label>
                    <Input
                      id="export_path"
                      value={getConfigValue('export_path')}
                      onChange={(e) => handleConfigChange('export_path', e.target.value)}
                      placeholder="./exports"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => {
                      configs.forEach(config => {
                        updateConfig(config.config_key, config.config_value);
                      });
                    }}
                    disabled={saving}
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Informações do Sistema */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                <CardTitle className="flex items-center">
                  <Cpu className="w-5 h-5 mr-2" />
                  Memória
                </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemInfo && (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-mono">{systemInfo.totalMemory} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Livre:</span>
                        <span className="font-mono">{systemInfo.freeMemory} GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bot:</span>
                        <span className="font-mono">{systemInfo.processMemory} MB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HardDrive className="w-5 h-5 mr-2" />
                    Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemInfo && (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Plataforma:</span>
                        <span className="font-mono">{systemInfo.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Arquitetura:</span>
                        <span className="font-mono">{systemInfo.arch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Node.js:</span>
                        <span className="font-mono">{systemInfo.nodeVersion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uptime:</span>
                        <span className="font-mono">{systemInfo.processUptime}h</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Recursos</CardTitle>
                <CardDescription>
                  Configure os limites de recursos do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_memory">Limite de Memória</Label>
                    <Input
                      id="max_memory"
                      value={getConfigValue('max_memory')}
                      onChange={(e) => handleConfigChange('max_memory', e.target.value)}
                      placeholder="512MB"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="storage_limit">Limite de Armazenamento</Label>
                    <Input
                      id="storage_limit"
                      value={getConfigValue('storage_limit')}
                      onChange={(e) => handleConfigChange('storage_limit', e.target.value)}
                      placeholder="2GB"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup_interval">Intervalo de Backup (horas)</Label>
                  <Input
                    id="backup_interval"
                    type="number"
                    value={getConfigValue('backup_interval')}
                    onChange={(e) => handleConfigChange('backup_interval', e.target.value)}
                    placeholder="24"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup */}
          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  Sistema de Backup
                </CardTitle>
                <CardDescription>
                  Gerencie backups do banco de dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Criar Backup Manual</h3>
                    <p className="text-sm text-gray-600">
                      Cria uma cópia de segurança do banco de dados atual
                    </p>
                  </div>
                  <Button onClick={createBackup} disabled={saving}>
                    {saving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Criar Backup
                  </Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Os backups são salvos automaticamente no diretório configurado. 
                    Recomenda-se fazer backups regulares antes de atualizações importantes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Estatísticas */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_os || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Solicitações de Peças</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_pecas || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_usuarios || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Backups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_backups || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Informações do Banco de Dados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Localização</Label>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                      ./bot-whatsapp/db/atendimento.db
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Última Atualização</Label>
                    <p className="text-sm">
                      {new Date().toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Controle da IA */}
          <TabsContent value="ai" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Controle da Inteligência Artificial</CardTitle>
                  <CardDescription>
                    Gerencie as configurações da IA Ollama
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Habilitar/Desabilitar IA</h3>
                      <p className="text-sm text-gray-600">
                        Ativa ou desativa a análise inteligente de mensagens
                      </p>
                    </div>
                    <Button 
                      onClick={() => updateConfig('ollama_enabled', getConfigValue('ollama_enabled') === 'true' ? 'false' : 'true')}
                      variant={getConfigValue('ollama_enabled') === 'true' ? 'default' : 'secondary'}
                    >
                      {getConfigValue('ollama_enabled') === 'true' ? 'Desabilitar IA' : 'Habilitar IA'}
                    </Button>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Quando a IA está habilitada, ela analisa automaticamente as mensagens dos usuários para classificar
                      problemas e fornecer respostas personalizadas. Quando desabilitada, o bot funciona em modo fallback,
                      criando ordens de serviço automaticamente para todas as mensagens.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gerenciamento de Usuários Root</CardTitle>
                  <CardDescription>
                    Adicione ou remova usuários com permissão root
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newRootUser}
                        onChange={(e) => setNewRootUser(e.target.value)}
                        placeholder="Número do telefone"
                        className="flex-1"
                      />
                      <Button onClick={addRootUser} disabled={saving}>
                        {saving ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Adicionar
                      </Button>
                    </div>

                    {rootUsers.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="font-medium">Usuários Root Atuais:</h4>
                        {rootUsers.map((rootUser) => (
                          <div key={rootUser.telefone} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{rootUser.nome || 'Nome não informado'}</p>
                              <p className="text-sm text-gray-600">{rootUser.telefone}</p>
                            </div>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => removeRootUser(rootUser.telefone)}
                              disabled={saving}
                            >
                              Remover
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhum usuário root cadastrado.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
