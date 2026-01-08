# 🤝 Contribuindo para o Bot de Atendimento WhatsApp

Obrigado por considerar contribuir para este projeto! Este guia irá ajudá-lo a entender como contribuir de forma efetiva.

## 📋 Índice

- [Como Contribuir](#como-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)

## 🚀 Como Contribuir

### 1. Fork do Repositório
```bash
# Clone seu fork
git clone https://github.com/SEU_USUARIO/bot-whatsapp-atendimento.git
cd bot-whatsapp-atendimento

# Adicione o repositório original como upstream
git remote add upstream https://github.com/USUARIO_ORIGINAL/bot-whatsapp-atendimento.git
```

### 2. Configuração do Ambiente
```bash
# Instale as dependências
npm install
cd bot-whatsapp && npm install && cd ..

# Configure as variáveis de ambiente
cd bot-whatsapp
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicialize o banco de dados
node init-db.js
```

### 3. Crie uma Branch
```bash
# Crie uma branch para sua feature/correção
git checkout -b feature/nova-funcionalidade
# ou
git checkout -b fix/correcao-bug
```

## 🛠️ Configuração do Ambiente

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- WhatsApp instalado (para testes do bot)
- Chave da OpenAI (opcional)

### Estrutura do Projeto
```
/
├── bot-whatsapp/          # Bot WhatsApp
├── src/                   # Painel Web Next.js
├── .github/               # GitHub Actions
├── README.md              # Documentação principal
└── package.json           # Dependências do painel
```

## 📝 Padrões de Código

### JavaScript/TypeScript
- Use **ESLint** para linting
- Siga o padrão **Prettier** para formatação
- Use **camelCase** para variáveis e funções
- Use **PascalCase** para classes e componentes
- Comente código complexo em português

### Commits
Use o padrão **Conventional Commits**:
```
feat: adiciona comando !backup para administradores
fix: corrige erro de reconexão do WhatsApp
docs: atualiza documentação da API
style: formata código com prettier
refactor: reorganiza estrutura de comandos
test: adiciona testes para comandos de usuário
```

### Mensagens de Commit
- Use português brasileiro
- Seja descritivo mas conciso
- Use verbos no imperativo

## 🔄 Processo de Pull Request

### 1. Antes de Submeter
- [ ] Teste localmente o bot WhatsApp
- [ ] Teste o painel web
- [ ] Execute os lints: `npm run lint`
- [ ] Verifique se não há conflitos
- [ ] Atualize a documentação se necessário

### 2. Criando o PR
1. Push sua branch: `git push origin feature/nova-funcionalidade`
2. Abra um Pull Request no GitHub
3. Use o template de PR (se disponível)
4. Descreva claramente as mudanças
5. Adicione screenshots se aplicável

### 3. Template de PR
```markdown
## 📝 Descrição
Breve descrição das mudanças realizadas.

## 🔄 Tipo de Mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## ✅ Checklist
- [ ] Código testado localmente
- [ ] Documentação atualizada
- [ ] Testes passando
- [ ] Lint sem erros

## 📸 Screenshots (se aplicável)
Adicione screenshots das mudanças visuais.

## 🧪 Como Testar
Passos para testar as mudanças:
1. ...
2. ...
```

## 🐛 Reportando Bugs

### Antes de Reportar
- Verifique se o bug já foi reportado
- Teste com a versão mais recente
- Colete informações do ambiente

### Template de Bug Report
```markdown
## 🐛 Descrição do Bug
Descrição clara e concisa do bug.

## 🔄 Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Execute '...'
4. Veja o erro

## ✅ Comportamento Esperado
O que deveria acontecer.

## 📱 Ambiente
- OS: [Windows/Mac/Linux]
- Node.js: [versão]
- WhatsApp: [versão]
- Navegador: [se aplicável]

## 📋 Logs
```
Cole aqui os logs relevantes
```

## 💡 Sugerindo Melhorias

### Template de Feature Request
```markdown
## 🚀 Funcionalidade Sugerida
Descrição clara da funcionalidade.

## 🎯 Problema que Resolve
Qual problema esta funcionalidade resolve?

## 💭 Solução Proposta
Como você imagina que deveria funcionar?

## 🔄 Alternativas Consideradas
Outras soluções que você considerou?

## 📋 Contexto Adicional
Qualquer outra informação relevante.
```

## 🏷️ Tipos de Contribuição

### 🐛 Correções de Bug
- Correções de erros no bot
- Correções na interface web
- Melhorias de performance

### ✨ Novas Funcionalidades
- Novos comandos para o bot
- Melhorias no painel web
- Integrações com outras APIs

### 📚 Documentação
- Melhorias no README
- Documentação de código
- Tutoriais e guias

### 🧪 Testes
- Testes unitários
- Testes de integração
- Testes end-to-end

### 🎨 Interface
- Melhorias no design
- Responsividade
- Acessibilidade

## 📞 Suporte

### Canais de Comunicação
- **Issues**: Para bugs e sugestões
- **Discussions**: Para perguntas gerais
- **WhatsApp**: Números root para suporte urgente

### Tempo de Resposta
- Issues: 1-3 dias úteis
- Pull Requests: 2-5 dias úteis
- Discussions: 1-2 dias úteis

## 🎉 Reconhecimento

Todos os contribuidores serão reconhecidos:
- Nome no README.md
- Menção nos releases
- Badge de contribuidor

## 📜 Código de Conduta

### Nossos Compromissos
- Ambiente acolhedor e inclusivo
- Respeito a diferentes opiniões
- Foco no que é melhor para a comunidade
- Empatia com outros membros

### Comportamentos Esperados
- Linguagem acolhedora e inclusiva
- Respeito a diferentes pontos de vista
- Aceitar críticas construtivas
- Foco no que é melhor para a comunidade

### Comportamentos Inaceitáveis
- Linguagem ou imagens sexualizadas
- Trolling, comentários insultuosos
- Assédio público ou privado
- Publicar informações privadas de outros

## 🔧 Configurações de Desenvolvimento

### VSCode (Recomendado)
Extensões recomendadas:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

### Configuração do Git
```bash
# Configure seu nome e email
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"

# Configure o editor padrão
git config --global core.editor "code --wait"
```

---

**Obrigado por contribuir! 🚀**

Sua contribuição ajuda a tornar este projeto melhor para toda a comunidade.
