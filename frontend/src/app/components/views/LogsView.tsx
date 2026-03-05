import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Download,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  User,
  Tag,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Switch } from '@/app/components/ui/switch';

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  userId?: string;
  user?: {
    name: string;
    email: string;
  };
  createdAt: string;
}

const logLevelConfig = {
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    darkBg: 'bg-blue-900/20',
    label: 'INFO',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-100',
    darkBg: 'bg-yellow-900/20',
    label: 'WARN',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-100',
    darkBg: 'bg-red-900/20',
    label: 'ERROR',
  },
  debug: {
    icon: CheckCircle2,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    darkBg: 'bg-gray-900/20',
    label: 'DEBUG',
  },
};

export default function LogsView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [contexts, setContexts] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    fetchLogs();

    // Auto-refresh every 5 seconds if enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, currentPage]);

  useEffect(() => {
    filterLogs();
    extractContexts();
  }, [logs, searchQuery, selectedLevel, selectedContext]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: logsPerPage.toString(),
      });

      const response = await fetch(`http://localhost:3000/api/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || data);
        setTotalPages(data.totalPages || 1);
      } else {
        toast.error('Erro ao carregar logs');
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setIsLoading(false);
    }
  };

  const extractContexts = () => {
    const uniqueContexts = Array.from(
      new Set(logs.map((log) => log.context).filter(Boolean))
    ) as string[];
    setContexts(uniqueContexts.sort());
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.context?.toLowerCase().includes(query) ||
          log.user?.name.toLowerCase().includes(query)
      );
    }

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((log) => log.level === selectedLevel);
    }

    // Filter by context
    if (selectedContext !== 'all') {
      filtered = filtered.filter((log) => log.context === selectedContext);
    }

    setFilteredLogs(filtered);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/logs/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Logs exportados com sucesso!');
      } else {
        toast.error('Erro ao exportar logs');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar logs');
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/logs/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast.success('Logs limpos com sucesso!');
        fetchLogs();
      } else {
        toast.error('Erro ao limpar logs');
      }
    } catch (error) {
      console.error('Clear logs error:', error);
      toast.error('Erro ao limpar logs');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--cw-text-primary)' }}>
              Logs do Sistema
            </h1>
            <p className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>
              Monitore atividades, erros e eventos do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={fetchLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}>
                  <FileText className="w-5 h-5" style={{ color: 'var(--cw-accent)' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>
                    {logs.length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                    Total de Logs
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>
                    {logs.filter((l) => l.level === 'error').length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                    Erros
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>
                    {logs.filter((l) => l.level === 'warn').length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                    Avisos
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>
                    {logs.filter((l) => l.level === 'info').length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                    Info
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--cw-text-tertiary)' }}
                  />
                  <Input
                    placeholder="Buscar logs por mensagem, contexto ou usuário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="px-3 py-2 rounded-md border min-w-[120px]"
                    style={{
                      backgroundColor: 'var(--cw-bg-primary)',
                      borderColor: 'var(--cw-border)',
                      color: 'var(--cw-text-primary)',
                    }}
                  >
                    <option value="all">Todos os níveis</option>
                    <option value="info">Info</option>
                    <option value="warn">Avisos</option>
                    <option value="error">Erros</option>
                    <option value="debug">Debug</option>
                  </select>

                  <select
                    value={selectedContext}
                    onChange={(e) => setSelectedContext(e.target.value)}
                    className="px-3 py-2 rounded-md border min-w-[150px]"
                    style={{
                      backgroundColor: 'var(--cw-bg-primary)',
                      borderColor: 'var(--cw-border)',
                      color: 'var(--cw-text-primary)',
                    }}
                  >
                    <option value="all">Todos contextos</option>
                    {contexts.map((context) => (
                      <option key={context} value={context}>
                        {context}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoRefresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="autoRefresh" className="text-sm">
                    Atualização automática (5s)
                  </Label>
                </div>

                <Button variant="destructive" size="sm" onClick={handleClearLogs}>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Limpar Todos os Logs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardContent className="p-0">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center">
                <FileText
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  style={{ color: 'var(--cw-text-tertiary)' }}
                />
                <p style={{ color: 'var(--cw-text-tertiary)' }}>
                  {searchQuery || selectedLevel !== 'all' || selectedContext !== 'all'
                    ? 'Nenhum log encontrado com os filtros aplicados'
                    : 'Nenhum log registrado ainda'}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--cw-border)' }}>
                {filteredLogs.map((log) => {
                  const config = logLevelConfig[log.level];
                  const Icon = config.icon;

                  return (
                    <div key={log.id} className="p-4 hover:bg-opacity-50" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.darkBg}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={`${config.color} text-xs`}
                              variant="outline"
                            >
                              {config.label}
                            </Badge>

                            {log.context && (
                              <Badge variant="secondary" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {log.context}
                              </Badge>
                            )}

                            <span
                              className="text-xs ml-auto flex items-center gap-1"
                              style={{ color: 'var(--cw-text-tertiary)' }}
                            >
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(log.createdAt)}
                            </span>
                          </div>

                          <p
                            className="text-sm font-medium mb-1"
                            style={{ color: 'var(--cw-text-primary)' }}
                          >
                            {log.message}
                          </p>

                          {log.user && (
                            <div
                              className="text-xs flex items-center gap-1 mb-2"
                              style={{ color: 'var(--cw-text-tertiary)' }}
                            >
                              <User className="w-3 h-3" />
                              {log.user.name} ({log.user.email})
                            </div>
                          )}

                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary
                                className="text-xs cursor-pointer"
                                style={{ color: 'var(--cw-text-tertiary)' }}
                              >
                                Ver metadados
                              </summary>
                              <pre
                                className="mt-2 p-2 rounded text-xs overflow-x-auto"
                                style={{
                                  backgroundColor: 'var(--cw-bg-tertiary)',
                                  color: 'var(--cw-text-secondary)',
                                }}
                              >
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
