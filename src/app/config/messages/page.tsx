'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Save, 
  RefreshCw, 
  Eye, 
  Copy,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Bot,
  Users,
  Settings
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema de validação
const messageSchema = z.object({
  saudacao: z.string().min(10, 'Mensagem de saudação deve ter pelo menos 10 caracteres'),
  final: z.string().min(5, 'Mensagem final deve ter pelo menos 5 caracteres'),
  ajuda: z.string().min(20, 'Mensagem de ajuda deve ter pelo menos 20 caracteres'),
  erro: z.string().min(10, 'Mensagem de erro deve ter pelo menos 10 caracteres'),
  aguarde: z.string().min(5, 'Mensagem de aguarde deve ter pelo menos 5 caracteres'),
  indisponivel: z.string().min(10, 'Mensagem de indisponível deve ter pelo menos 10 caracteres'),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
}

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [authenticated, setAuthenticated] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema)
  });

  const watchedMessages = watch();

  // Templates predefinidos
  const messageTemplates: MessageTemplate[] = [
    {
      id: 'saudacao_formal',
      name: 'Saudação Formal',
      description: 'Mensagem de boas-vindas profissional',
      template: 'Olá! Bem-vindo ao suporte técnico da {empresa}. Sou seu assistente virtual e estou aqui para ajudá-lo. Para abrir um chamado, use o comando !abrir ou descreva seu problema.',
      variables: ['empresa']
    },
    {
      id: 'saudacao_casual',
      name: 'Saudação Casual',
      description: 'Mensagem de boas-vindas descontraída',
      template: 'Oi! 👋 Sou o bot do suporte técnico. Como posso te ajudar hoje? Se precisar abrir um chamado, é só usar !abrir ou me contar qual é o problema!',
      variables: []
    },
    {
      id: 'final_agradecimento',
      name: 'Final com Agradecimento',
      description: 'Mensagem de finalização com agradecimento',
      template: 'Atendimento finalizado com sucesso! ✅\n\nObrigado por utilizar nossos serviços. Se precisar de mais alguma coisa, estarei sempre aqui para ajudar! 😊',
      variables: []
    },
    {
      id: 'ajuda_completa',
      name: 'Ajuda Completa',
      description: 'Lista completa de comandos disponíveis',
      template: `🤖 *CENTRAL DE AJUDA*

*COMANDOS PARA USUÁRIOS:*
• !ajuda - Esta mensagem
• !status [id] - Consultar status da OS
• !cancelar [id] - Cancelar OS
• !abrir - Abrir novo chamado

*COMANDOS PARA TÉCNICOS:*
• !menu - Menu técnico
• !atendendo [id] - Assumir OS
• !prioridade [id] - Marcar como prioritário
• !finalizado [id] - Finalizar OS

*PRECISA DE AJUDA?*
Digite sua dúvida ou problema que te ajudo! 💬`,
      variables: []
    }
  ];

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
        loadMessages();
      } else {
        showMessage('error', 'Credenciais inválidas');
      }
    } catch (error) {
      showMessage('error', 'Erro ao autenticar');
    }
  };

  const loadMessages = async () => {
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config/messages', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Preencher o formulário com as mensagens carregadas
        Object.keys(data.messages).forEach(key => {
          setValue(key as keyof MessageFormData, data.messages[key]);
        });
      } else {
        showMessage('error', 'Erro ao carregar mensagens');
      }
    } catch (error) {
      showMessage('error', 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: MessageFormData) => {
    setSaving(true);
    try {
      const auth = btoa(`${credentials.username}:${credentials.password}`);
      const response = await fetch('/api/config/messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ messages: data })
      });

      if (response.ok) {
        showMessage('success', 'Mensagens atualizadas com sucesso!');
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Erro ao salvar mensagens');
      }
    } catch (error) {
      showMessage('error', 'Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setPreviewMessage(template.template);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showMessage('success', 'Texto copiado para a área de transferência!');
  };

  const previewInWhatsApp = (message: string) => {
    setPreviewMessage(message);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Configuração de Mensagens</CardTitle>
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
              <MessageSquare className="w-4 h-4 mr-2" />
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
          <p>Carregando configurações de mensagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-8 h-8 mr-3" />
            Configuração de Mensagens
          </h1>
          <p className="text-gray-600 mt-2">
            Personalize as mensagens automáticas do bot WhatsApp
          </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário Principal */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Básicas</TabsTrigger>
                  <TabsTrigger value="system">Sistema</TabsTrigger>
                  <TabsTrigger value="advanced">Avançadas</TabsTrigger>
                </TabsList>

                {/* Mensagens Básicas */}
                <TabsContent value="basic" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Bot className="w-5 h-5 mr-2" />
                        Mensagens de Interação
                      </CardTitle>
                      <CardDescription>
                        Mensagens principais que os usuários verão
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="saudacao">Mensagem de Saudação</Label>
                        <Textarea
                          id="saudacao"
                          {...register('saudacao')}
                          placeholder="Mensagem de boas-vindas..."
                          rows={3}
                        />
                        {errors.saudacao && (
                          <p className="text-sm text-red-600">{errors.saudacao.message}</p>
                        )}
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => previewInWhatsApp(watchedMessages.saudacao || '')}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(watchedMessages.saudacao || '')}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label htmlFor="final">Mensagem de Finalização</Label>
                        <Textarea
                          id="final"
                          {...register('final')}
                          placeholder="Mensagem de despedida..."
                          rows={2}
                        />
                        {errors.final && (
                          <p className="text-sm text-red-600">{errors.final.message}</p>
                        )}
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => previewInWhatsApp(watchedMessages.final || '')}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(watchedMessages.final || '')}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Mensagens do Sistema */}
                <TabsContent value="system" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Mensagens do Sistema
                      </CardTitle>
                      <CardDescription>
                        Mensagens automáticas e de erro
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="erro">Mensagem de Erro</Label>
                        <Textarea
                          id="erro"
                          {...register('erro')}
                          placeholder="Mensagem quando ocorre um erro..."
                          rows={2}
                        />
                        {errors.erro && (
                          <p className="text-sm text-red-600">{errors.erro.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aguarde">Mensagem de Aguarde</Label>
                        <Input
                          id="aguarde"
                          {...register('aguarde')}
                          placeholder="Aguarde um momento..."
                        />
                        {errors.aguarde && (
                          <p className="text-sm text-red-600">{errors.aguarde.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="indisponivel">Mensagem de Indisponibilidade</Label>
                        <Textarea
                          id="indisponivel"
                          {...register('indisponivel')}
                          placeholder="Sistema temporariamente indisponível..."
                          rows={2}
                        />
                        {errors.indisponivel && (
                          <p className="text-sm text-red-600">{errors.indisponivel.message}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Mensagens Avançadas */}
                <TabsContent value="advanced" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Mensagem de Ajuda
                      </CardTitle>
                      <CardDescription>
                        Lista completa de comandos disponíveis
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="ajuda">Mensagem de Ajuda Completa</Label>
                        <Textarea
                          id="ajuda"
                          {...register('ajuda')}
                          placeholder="Lista de comandos e instruções..."
                          rows={10}
                          className="font-mono text-sm"
                        />
                        {errors.ajuda && (
                          <p className="text-sm text-red-600">{errors.ajuda.message}</p>
                        )}
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => previewInWhatsApp(watchedMessages.ajuda || '')}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(watchedMessages.ajuda || '')}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copiar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Botão de Salvar */}
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Mensagens
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar com Templates e Preview */}
          <div className="space-y-6">
            {/* Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Templates Prontos</CardTitle>
                <CardDescription>
                  Modelos predefinidos para usar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {messageTemplates.map((template) => (
                  <div key={template.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {template.variables.length} vars
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {template.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="w-full"
                    >
                      Usar Template
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Preview */}
            {previewMessage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Smartphone className="w-5 h-5 mr-2" />
                    Preview WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-100 p-3 rounded-lg border-l-4 border-green-500">
                    <div className="whitespace-pre-wrap text-sm">
                      {previewMessage}
                    </div>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(previewMessage)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
