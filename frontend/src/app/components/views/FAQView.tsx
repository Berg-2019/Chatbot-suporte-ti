import { HelpCircle, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  views: number;
}

export default function FAQView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const faqs: FAQItem[] = [
    {
      id: 1,
      question: 'Como resetar minha senha?',
      answer: 'Entre em contato com o suporte TI pelo WhatsApp ou abra um ticket. Enviaremos um link de redefinição.',
      category: 'Acesso',
      views: 245
    },
    {
      id: 2,
      question: 'Meu mouse não está funcionando, o que fazer?',
      answer: '1. Verifique se o mouse está conectado corretamente\n2. Troque a bateria (se for sem fio)\n3. Teste em outra porta USB\n4. Reinicie o computador',
      category: 'Hardware',
      views: 189
    },
    {
      id: 3,
      question: 'Como conectar à rede WiFi da empresa?',
      answer: 'Use as credenciais fornecidas pelo RH. Rede: EmpresaWiFi | Senha disponível no mural.',
      category: 'Rede',
      views: 312
    },
    {
      id: 4,
      question: 'A impressora não está imprimindo',
      answer: '1. Verifique se há papel\n2. Confira se a impressora está ligada\n3. Verifique a fila de impressão no computador\n4. Reinicie a impressora',
      category: 'Hardware',
      views: 156
    },
    {
      id: 5,
      question: 'Como instalar novos programas?',
      answer: 'Entre em contato com o suporte TI. Por questões de segurança, apenas a equipe de TI pode instalar softwares.',
      category: 'Software',
      views: 98
    },
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">FAQ - Perguntas Frequentes</h1>
          <p className="text-slate-400">Gerencie as perguntas e respostas mais comuns</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Adicionar FAQ</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar perguntas, respostas ou categorias..."
            className="w-full bg-slate-800 text-white rounded-lg pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium whitespace-nowrap">
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
          >
            {category}
          </button>
        ))}
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        {filteredFaqs.map((faq) => (
          <div
            key={faq.id}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 hover:border-slate-700/50 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle className="text-blue-500" size={20} />
                  <h3 className="text-white font-semibold text-lg">{faq.question}</h3>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full">
                    {faq.category}
                  </span>
                  <span className="text-slate-400">{faq.views} visualizações</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Edit2 className="text-slate-400" size={18} />
                </button>
                <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Trash2 className="text-red-400" size={18} />
                </button>
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <p className="text-slate-300 whitespace-pre-line">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>

      {filteredFaqs.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Nenhuma pergunta encontrada</p>
        </div>
      )}
    </div>
  );
}
