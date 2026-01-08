'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Settings, BarChart3, MessageSquare, Users, Database } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Bot WhatsApp - Painel de Controle
                </h1>
                <p className="text-gray-600 mt-2">
                  Sistema de atendimento técnico automatizado
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Navegação */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/config">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center">
                  <Settings className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <CardTitle>Configurações</CardTitle>
                    <CardDescription>
                      Painel principal de configurações do sistema
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Acesse o dashboard, configure mensagens, gerencie usuários e monitore o sistema.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/config/messages">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center">
                  <MessageSquare className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <CardTitle>Mensagens</CardTitle>
                    <CardDescription>
                      Editor de mensagens automáticas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Personalize todas as mensagens automáticas do bot com templates e preview.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/parts">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <CardTitle>Gerenciar Peças</CardTitle>
                    <CardDescription>
                      Sistema de solicitação de peças
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Gerencie solicitações de peças e controle o almoxarifado.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Informações do Sistema */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Funcionalidades Implementadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Dashboard Interativo</span>
                <span className="text-green-600 font-medium">✓ Implementado</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Gráficos e Métricas</span>
                <span className="text-green-600 font-medium">✓ Implementado</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Editor de Mensagens</span>
                <span className="text-green-600 font-medium">✓ Implementado</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sistema de Autenticação</span>
                <span className="text-green-600 font-medium">✓ Implementado</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Gerenciamento de Usuários</span>
                <span className="text-green-600 font-medium">✓ Implementado</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sistema de Backup</span>
                <span className="text-green-600 font-medium">✓ Implementado</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Melhorias Implementadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">Interface Visual</h4>
                <p className="text-sm text-blue-700">
                  Dashboard moderno com gráficos interativos e métricas em tempo real
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900">Editor de Mensagens</h4>
                <p className="text-sm text-green-700">
                  Sistema completo para personalizar mensagens com templates e preview
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900">Validação de Formulários</h4>
                <p className="text-sm text-purple-700">
                  Validação robusta com react-hook-form e zod para melhor UX
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900">Componentes Reutilizáveis</h4>
                <p className="text-sm text-orange-700">
                  Dashboard e Charts como componentes modulares e reutilizáveis
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instruções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Como Usar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-medium mb-2">Acesse as Configurações</h3>
                <p className="text-sm text-gray-600">
                  Clique no card "Configurações" para acessar o painel principal
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <h3 className="font-medium mb-2">Explore o Dashboard</h3>
                <p className="text-sm text-gray-600">
                  Visualize métricas, gráficos e monitore o sistema em tempo real
                </p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <h3 className="font-medium mb-2">Personalize Mensagens</h3>
                <p className="text-sm text-gray-600">
                  Use o editor para customizar todas as mensagens automáticas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
