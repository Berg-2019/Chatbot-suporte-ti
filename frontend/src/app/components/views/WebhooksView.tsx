import { Webhook as WebhookIcon, Plus, Edit2, Trash2, Search, Loader2, X, Save, Play, BarChart3, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { webhooksApi, type Webhook, type WebhookLog, type WebhookStats } from '@/app/services/api';

const WEBHOOK_EVENTS = [
  { value: 'ticket_created', label: 'Ticket Criado' },
  { value: 'ticket_updated', label: 'Ticket Atualizado' },
  { value: 'ticket_assigned', label: 'Ticket Atribuído' },
  { value: 'ticket_resolved', label: 'Ticket Resolvido' },
  { value: 'ticket_closed', label: 'Ticket Fechado' },
  { value: 'message_received', label: 'Mensagem Recebida' },
  { value: 'message_sent', label: 'Mensagem Enviada' },
  { value: 'csat_received', label: 'CSAT Recebido' },
  { value: 'automation_executed', label: 'Automação Executada' },
  { value: 'contact_created', label: 'Contato Criado' },
  { value: 'contact_updated', label: 'Contato Atualizado' },
];

export default function WebhooksView() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    active: true,
    secret: '',
    customHeaders: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);

  // Logs modal
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Test state
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, [filterActive]);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await webhooksApi.list({ active: filterActive });
      setWebhooks(data);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
      setError('Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (webhook?: Webhook) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setFormData({
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        secret: webhook.secret || '',
        customHeaders: webhook.customHeaders || {},
      });
    } else {
      setEditingWebhook(null);
      setFormData({
        name: '',
        url: '',
        events: [],
        active: true,
        secret: '',
        customHeaders: {},
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWebhook(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);
      if (editingWebhook) {
        await webhooksApi.update(editingWebhook.id, formData);
      } else {
        await webhooksApi.create(formData);
      }
      handleCloseModal();
      fetchWebhooks();
    } catch (err: any) {
      console.error('Failed to save webhook:', err);
      alert(err.message || 'Erro ao salvar webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este webhook?')) return;

    try {
      await webhooksApi.delete(id);
      fetchWebhooks();
    } catch (err) {
      console.error('Failed to delete webhook:', err);
      alert('Erro ao excluir webhook');
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTesting(id);
      const result = await webhooksApi.test(id);
      alert(result.message);
      // Refresh logs if modal is open
      if (showLogsModal && selectedWebhook?.id === id) {
        fetchLogs(id);
      }
    } catch (err: any) {
      console.error('Failed to test webhook:', err);
      alert(err.message || 'Erro ao testar webhook');
    } finally {
      setTesting(null);
    }
  };

  const handleOpenLogs = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setShowLogsModal(true);
    await fetchLogs(webhook.id);
  };

  const fetchLogs = async (id: string) => {
    try {
      setLoadingLogs(true);
      const [logsData, statsData] = await Promise.all([
        webhooksApi.getLogs(id, 50),
        webhooksApi.getStats(id),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleEventToggle = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <WebhookIcon className="w-7 h-7" />
              Webhooks
            </h1>
            <p className="text-gray-600 mt-1">
              Integre eventos do sistema com aplicações externas
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Webhook
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filterActive === undefined ? '' : String(filterActive)}
            onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchWebhooks}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <WebhookIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {filterActive !== undefined
              ? 'Nenhum webhook encontrado com os filtros aplicados'
              : 'Nenhum webhook cadastrado'}
          </p>
          {filterActive === undefined && (
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Criar primeiro webhook
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <div
              key={webhook.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{webhook.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        webhook.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {webhook.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 font-mono break-all">{webhook.url}</p>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map(event => (
                      <span
                        key={event}
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs"
                      >
                        {WEBHOOK_EVENTS.find(e => e.value === event)?.label || event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 ml-4">
                  <button
                    onClick={() => handleOpenLogs(webhook)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Ver logs"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleTest(webhook.id)}
                    disabled={testing === webhook.id}
                    className="p-2 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                    title="Testar webhook"
                  >
                    {testing === webhook.id ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenModal(webhook)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 hover:bg-red-50 rounded transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Slack Notificações"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>

              {/* Events */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eventos <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {WEBHOOK_EVENTS.map(event => (
                    <label
                      key={event.value}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.value)}
                        onChange={() => handleEventToggle(event.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="Chave secreta para HMAC SHA256"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se fornecido, será enviado um header X-Webhook-Signature com HMAC SHA256
                </p>
              </div>

              {/* Active */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                  Webhook ativo
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && selectedWebhook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Logs: {selectedWebhook.name}
                </h2>
                {stats && (
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-gray-600">
                      Total: <strong>{stats.totalExecutions}</strong>
                    </span>
                    <span className="text-green-600">
                      Sucesso: <strong>{stats.successfulExecutions}</strong>
                    </span>
                    <span className="text-red-600">
                      Falhas: <strong>{stats.failedExecutions}</strong>
                    </span>
                    <span className="text-blue-600">
                      Taxa: <strong>{stats.successRate.toFixed(1)}%</strong>
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhuma execução registrada ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className={`border rounded-lg p-4 ${
                        log.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {log.success ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="font-medium text-sm">
                            {log.event}
                          </span>
                          {log.statusCode && (
                            <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                              log.statusCode >= 200 && log.statusCode < 300
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {log.statusCode}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.executedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {log.error && (
                        <p className="text-sm text-red-700 font-mono mt-2 p-2 bg-red-100 rounded">
                          {log.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
