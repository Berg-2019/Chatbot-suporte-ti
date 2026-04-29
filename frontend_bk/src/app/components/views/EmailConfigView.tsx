import {
  Mail,
  Server,
  Key,
  Clock,
  Settings,
  Save,
  Play,
  Square,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  TrendingUp
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Badge } from '@/app/components/ui/badge';

interface EmailConfig {
  id: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapTls: boolean;
  smtpHost?: string;
  smtpPort?: number;
  enabled: boolean;
  pollInterval: number;
  autoAssign: boolean;
  defaultPriority: string;
  defaultSector?: string;
  createdAt: string;
  updatedAt: string;
}

interface EmailHealth {
  isRunning: boolean;
  isProcessing: boolean;
  circuitOpen: boolean;
  failureCount: number;
  lastSuccessfulPoll: string | null;
  totalEmailsProcessed: number;
  totalErrors: number;
}

export default function EmailConfigView() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [health, setHealth] = useState<EmailHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    imapHost: '',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    imapTls: true,
    smtpHost: '',
    smtpPort: 587,
    enabled: false,
    pollInterval: 60,
    autoAssign: true,
    defaultPriority: 'NORMAL',
    defaultSector: 'Email',
  });

  // Fetch configuration and health
  useEffect(() => {
    fetchConfig();
    fetchHealth();

    // Auto-refresh health every 10 seconds
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/email-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setFormData({
          imapHost: data.imapHost || '',
          imapPort: data.imapPort || 993,
          imapUser: data.imapUser || '',
          imapPassword: data.imapPassword || '',
          imapTls: data.imapTls ?? true,
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 587,
          enabled: data.enabled ?? false,
          pollInterval: data.pollInterval || 60,
          autoAssign: data.autoAssign ?? true,
          defaultPriority: data.defaultPriority || 'NORMAL',
          defaultSector: data.defaultSector || 'Email',
        });
      }
    } catch (error) {
      console.error('Failed to fetch email config:', error);
      toast.error('Erro ao carregar configuração de email');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/email-config/health', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const method = config ? 'PUT' : 'POST';
      const url = config
        ? `http://localhost:3000/api/email-config/${config.id}`
        : 'http://localhost:3000/api/email-config';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Configuração salva com sucesso!');
        fetchConfig();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleService = async () => {
    if (!config) return;

    try {
      const action = health?.isRunning ? 'stop' : 'start';
      const response = await fetch(`http://localhost:3000/api/email-config/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast.success(`Serviço ${action === 'start' ? 'iniciado' : 'parado'} com sucesso!`);
        setTimeout(fetchHealth, 1000);
      } else {
        toast.error('Erro ao alternar serviço');
      }
    } catch (error) {
      console.error('Toggle service error:', error);
      toast.error('Erro ao alternar serviço');
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch('http://localhost:3000/api/email-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('✅ Conexão testada com sucesso!');
        } else {
          toast.error(`❌ Falha na conexão: ${result.message}`);
        }
      } else {
        toast.error('Erro ao testar conexão');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--cw-accent)' }} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--cw-bg-secondary)' }}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--cw-text-primary)' }}>
              Configuração de Email
            </h1>
            <p className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>
              Configure a ingestão automática de emails como tickets
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configuração
          </Button>
        </div>

        {/* Health Status Card */}
        {config && health && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Status do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {health.isRunning ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--cw-text-primary)' }}>
                      {health.isRunning ? 'Rodando' : 'Parado'}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                      {health.isProcessing ? 'Processando emails...' : 'Aguardando'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {health.circuitOpen ? (
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--cw-text-primary)' }}>
                      Circuit Breaker
                    </div>
                    <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                      {health.circuitOpen ? 'ABERTO' : 'FECHADO'} ({health.failureCount} falhas)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5" style={{ color: 'var(--cw-accent)' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--cw-text-primary)' }}>
                      {health.totalEmailsProcessed} emails
                    </div>
                    <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                      {health.totalErrors} erros
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleToggleService}
                  variant={health.isRunning ? 'destructive' : 'default'}
                  size="sm"
                >
                  {health.isRunning ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Parar Serviço
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Iniciar Serviço
                    </>
                  )}
                </Button>
                <Button onClick={fetchHealth} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>

              {health.lastSuccessfulPoll && (
                <div className="mt-3 text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                  Última verificação bem-sucedida:{' '}
                  {new Date(health.lastSuccessfulPoll).toLocaleString('pt-BR')}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* IMAP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Configuração IMAP (Recebimento)
            </CardTitle>
            <CardDescription>
              Configure o servidor IMAP para receber emails e criar tickets automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imapHost">Host IMAP</Label>
                <Input
                  id="imapHost"
                  placeholder="imap.gmail.com"
                  value={formData.imapHost}
                  onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imapPort">Porta IMAP</Label>
                <Input
                  id="imapPort"
                  type="number"
                  placeholder="993"
                  value={formData.imapPort}
                  onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imapUser">Email/Usuário</Label>
                <Input
                  id="imapUser"
                  type="email"
                  placeholder="suporte@empresa.com"
                  value={formData.imapUser}
                  onChange={(e) => setFormData({ ...formData, imapUser: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imapPassword">Senha</Label>
                <div className="relative">
                  <Input
                    id="imapPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.imapPassword}
                    onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" style={{ color: 'var(--cw-text-tertiary)' }} />
                    ) : (
                      <Eye className="w-4 h-4" style={{ color: 'var(--cw-text-tertiary)' }} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="imapTls"
                checked={formData.imapTls}
                onCheckedChange={(checked) => setFormData({ ...formData, imapTls: checked })}
              />
              <Label htmlFor="imapTls">Usar TLS/SSL</Label>
            </div>

            <Button onClick={testConnection} variant="outline" disabled={isTestingConnection}>
              {isTestingConnection ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              Testar Conexão IMAP
            </Button>
          </CardContent>
        </Card>

        {/* Service Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pollInterval">Intervalo de Verificação (segundos)</Label>
                <Input
                  id="pollInterval"
                  type="number"
                  min="10"
                  max="3600"
                  value={formData.pollInterval}
                  onChange={(e) => setFormData({ ...formData, pollInterval: parseInt(e.target.value) })}
                />
                <p className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                  Recomendado: 60 segundos (mínimo 10, máximo 3600)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultPriority">Prioridade Padrão</Label>
                <select
                  id="defaultPriority"
                  value={formData.defaultPriority}
                  onChange={(e) => setFormData({ ...formData, defaultPriority: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--cw-bg-primary)',
                    borderColor: 'var(--cw-border)',
                    color: 'var(--cw-text-primary)',
                  }}
                >
                  <option value="LOW">Baixa</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultSector">Setor Padrão</Label>
                <Input
                  id="defaultSector"
                  placeholder="Email"
                  value={formData.defaultSector}
                  onChange={(e) => setFormData({ ...formData, defaultSector: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <Label htmlFor="enabled">Serviço Habilitado</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoAssign"
                  checked={formData.autoAssign}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoAssign: checked })}
                />
                <Label htmlFor="autoAssign">Atribuir Automaticamente</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4" />
              Informações Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2" style={{ color: 'var(--cw-text-secondary)' }}>
              <li>• Emails não lidos serão automaticamente convertidos em tickets</li>
              <li>• Respostas serão agrupadas por thread (baseado no Message-ID)</li>
              <li>• O circuit breaker abre após 5 falhas consecutivas (cooldown de 5 minutos)</li>
              <li>• 3 tentativas de retry com delays configuráveis</li>
              <li>• Para Gmail, use uma "Senha de App" ao invés da senha normal</li>
              <li>• Emails duplicados são automaticamente detectados e ignorados</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
