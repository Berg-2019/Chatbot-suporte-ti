import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, Loader2, Sparkles } from 'lucide-react';
import { cannedResponsesApi, type CannedResponse } from '@/app/services/api';
import { useDebounce } from '@/hooks/useDebounce';

interface CannedResponsePickerProps {
  onSelect: (content: string) => void;
  trigger?: string; // Character that triggers the picker (default: '/')
  contactData?: {
    name?: string;
    phone?: string;
    sector?: string;
  };
  ticketData?: {
    id?: string;
    priority?: string;
  };
  agentName?: string;
}

export default function CannedResponsePicker({
  onSelect,
  trigger = '/',
  contactData,
  ticketData,
  agentName,
}: CannedResponsePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  const fetchSuggestions = async (search: string) => {
    try {
      setLoading(true);
      const results = await cannedResponsesApi.suggest(search);
      setSuggestions(results);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const interpolateVariables = (content: string): string => {
    const now = new Date();
    const variables: Record<string, string> = {
      contact_name: contactData?.name || '[Nome]',
      contact_phone: contactData?.phone || '[Telefone]',
      contact_sector: contactData?.sector || '[Setor]',
      agent_name: agentName || '[Agente]',
      ticket_id: ticketData?.id || '[ID]',
      ticket_priority: ticketData?.priority || '[Prioridade]',
      current_time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      current_date: now.toLocaleDateString('pt-BR'),
    };

    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  };

  const handleSelect = (response: CannedResponse) => {
    const interpolatedContent = interpolateVariables(response.content);
    onSelect(interpolatedContent);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setSuggestions([]);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === trigger) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        handleClose();
        e.preventDefault();
        break;
      case 'ArrowDown':
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        e.preventDefault();
        break;
      case 'Enter':
        if (suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
          e.preventDefault();
        }
        break;
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current && suggestions.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, suggestions]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
        title={`Respostas prontas (${trigger})`}
      >
        <MessageSquare className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
      </button>

      {/* Picker Modal */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite para buscar respostas..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Use ↑↓ para navegar, Enter para selecionar, Esc para fechar
            </p>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 px-4">
                {query.length < 2 ? (
                  <>
                    <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Digite pelo menos 2 caracteres para buscar
                    </p>
                  </>
                ) : (
                  <>
                    <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Nenhuma resposta encontrada para "{query}"
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {suggestions.map((response, index) => (
                  <button
                    key={response.id}
                    onClick={() => handleSelect(response)}
                    className={`w-full text-left p-3 hover:bg-blue-50 transition-colors ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <code className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">
                          {response.shortcode}
                        </code>
                        <span className="font-medium text-sm text-gray-900">
                          {response.title}
                        </span>
                      </div>
                      {response.category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {response.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {interpolateVariables(response.content)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {suggestions.length > 0 && (
            <div className="p-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Sparkles className="w-3 h-3" />
                <span>
                  {suggestions.length} resultado{suggestions.length !== 1 ? 's' : ''} encontrado{suggestions.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close picker */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleClose}
        />
      )}
    </div>
  );
}
