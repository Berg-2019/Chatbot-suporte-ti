import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Filter,
  Tag,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Save,
  X,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Switch } from '@/app/components/ui/switch';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  slug: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  views: number;
  upvotes: number;
  downvotes: number;
  authorId: string;
  author?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CreateArticleDto {
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
}

const categories = [
  'Troubleshooting',
  'Procedimentos',
  'Manutenção',
  'Configuração',
  'FAQ',
  'Políticas',
  'Tutoriais',
];

export default function KnowledgeArticlesView() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateArticleDto>({
    title: '',
    content: '',
    category: 'FAQ',
    tags: [],
    isPublished: false,
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, selectedCategory]);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/knowledge', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      } else {
        toast.error('Erro ao carregar artigos');
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      toast.error('Erro ao carregar artigos');
    } finally {
      setIsLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((article) => article.category === selectedCategory);
    }

    setFilteredArticles(filtered);
  };

  const handleCreateNew = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      content: '',
      category: 'FAQ',
      tags: [],
      isPublished: false,
    });
    setTagInput('');
    setShowEditor(true);
  };

  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
      isPublished: article.isPublished,
    });
    setTagInput('');
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const method = editingArticle ? 'PUT' : 'POST';
      const url = editingArticle
        ? `http://localhost:3000/api/knowledge/${editingArticle.id}`
        : 'http://localhost:3000/api/knowledge';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingArticle ? 'Artigo atualizado!' : 'Artigo criado!');
        setShowEditor(false);
        fetchArticles();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao salvar artigo');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar artigo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este artigo?')) return;

    try {
      const response = await fetch(`http://localhost:3000/api/knowledge/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast.success('Artigo excluído com sucesso!');
        fetchArticles();
      } else {
        toast.error('Erro ao excluir artigo');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir artigo');
    }
  };

  const handleTogglePublish = async (article: KnowledgeArticle) => {
    try {
      const response = await fetch(`http://localhost:3000/api/knowledge/${article.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...article,
          isPublished: !article.isPublished,
        }),
      });

      if (response.ok) {
        toast.success(article.isPublished ? 'Artigo despublicado' : 'Artigo publicado');
        fetchArticles();
      }
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
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
              Base de Conhecimento
            </h1>
            <p className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>
              Gerencie artigos, tutoriais e FAQs para suporte automatizado
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Artigo
          </Button>
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
                    {articles.length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                    Total de Artigos
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>
                    {articles.filter((a) => a.isPublished).length}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                    Publicados
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}>
                  <Eye className="w-5 h-5" style={{ color: 'var(--cw-accent)' }} />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>
                    {articles.reduce((sum, a) => sum + a.views, 0)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                    Total de Visualizações
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}>
                  <ThumbsUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>
                    {articles.reduce((sum, a) => sum + a.upvotes, 0)}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                    Avaliações Positivas
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--cw-text-tertiary)' }} />
                <Input
                  placeholder="Buscar artigos por título, conteúdo ou tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Filter className="w-4 h-4" style={{ color: 'var(--cw-text-tertiary)' }} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 rounded-md border min-w-[150px]"
                  style={{
                    backgroundColor: 'var(--cw-bg-primary)',
                    borderColor: 'var(--cw-border)',
                    color: 'var(--cw-text-primary)',
                  }}
                >
                  <option value="all">Todas Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Articles List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: 'var(--cw-text-tertiary)' }} />
                <p style={{ color: 'var(--cw-text-tertiary)' }}>
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Nenhum artigo encontrado com os filtros aplicados'
                    : 'Nenhum artigo criado ainda. Clique em "Novo Artigo" para começar.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredArticles.map((article) => (
              <Card key={article.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                          {article.title}
                        </h3>
                        {article.isPublished ? (
                          <Badge className="bg-green-500">Publicado</Badge>
                        ) : (
                          <Badge variant="secondary">Rascunho</Badge>
                        )}
                      </div>

                      <p
                        className="text-sm mb-3 line-clamp-2"
                        style={{ color: 'var(--cw-text-secondary)' }}
                      >
                        {article.content.substring(0, 200)}...
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <Badge variant="outline">{article.category}</Badge>
                        {article.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                            +{article.tags.length - 3} mais
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {article.views} visualizações
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {article.upvotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsDown className="w-3 h-3" />
                          {article.downvotes}
                        </span>
                        <span>
                          Por {article.author?.name || 'Desconhecido'}
                        </span>
                        <span>
                          {new Date(article.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(article)}
                      >
                        {article.isPublished ? 'Despublicar' : 'Publicar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(article)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
            </DialogTitle>
            <DialogDescription>
              Crie artigos completos com suporte a Markdown
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Como resolver erro de impressora..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={200}
              />
              <p className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                {formData.title.length}/200 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-md border"
                style={{
                  backgroundColor: 'var(--cw-bg-primary)',
                  borderColor: 'var(--cw-border)',
                  color: 'var(--cw-text-primary)',
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo * (Markdown suportado)</Label>
              <textarea
                id="content"
                placeholder="# Título&#10;&#10;Conteúdo do artigo em Markdown...&#10;&#10;## Subtítulo&#10;&#10;- Item 1&#10;- Item 2"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={15}
                maxLength={50000}
                className="w-full px-3 py-2 rounded-md border font-mono text-sm"
                style={{
                  backgroundColor: 'var(--cw-bg-primary)',
                  borderColor: 'var(--cw-border)',
                  color: 'var(--cw-text-primary)',
                }}
              />
              <p className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
                {formData.content.length}/50000 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (máximo 10)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Adicionar tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  disabled={formData.tags.length >= 10}
                />
                <Button type="button" onClick={addTag} disabled={formData.tags.length >= 10}>
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
              <Label htmlFor="isPublished">Publicar imediatamente</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingArticle ? 'Atualizar' : 'Criar'} Artigo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
