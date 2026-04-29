# ⚡ Setup Rápido - Testar Melhorias

## 🚀 Início Rápido (5 minutos)

### 1. Instalar dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Aplicar migrações do banco

```bash
cd backend
npm run prisma:migrate
```

### 3. Iniciar serviços

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Bot (opcional):**
```bash
cd bot
npm run dev
```

### 4. Acessar

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **API Docs:** http://localhost:3000/api

---

## ✅ Verificar se funcionou

### Backend

```bash
# Testar health check
curl http://localhost:3000/api/health

# Deve retornar: OK
```

### Frontend

1. Abrir http://localhost:5173
2. Fazer login (ou criar conta)
3. Navegar entre menus
4. Verificar DevTools → Network → Chunks sendo carregados sob demanda

---

## 🔍 Testar Melhorias Principais

### 1. Code Splitting (Frontend)

✅ **Como ver:**
- Abrir DevTools (F12) → Network
- Recarregar página
- Ver múltiplos chunks `.js` sendo carregados conforme navega

✅ **Resultado:** Bundle inicial ~60% menor

### 2. Rate Limiting (Backend)

✅ **Como testar:**
```bash
# Fazer 65 requisições rápidas
for i in {1..65}; do curl http://localhost:3000/api/health; done
```

✅ **Resultado:** A partir da 61ª, retorna 429 (Too Many Requests)

### 3. Cache Redis (Backend)

✅ **Como ver:**
- Fazer requisição: `GET /api/stock`
- Ver logs do backend: `[Cache MISS]`
- Fazer novamente: `[Cache HIT]`

✅ **Resultado:** Segunda requisição instantânea

### 4. Validação de Datas (Bot)

✅ **Como testar:**
1. Enviar mensagem ao bot
2. Escolher "5" (Reservar equipamento)
3. Tentar data inválida: `30/02/2026 14:00`

✅ **Resultado:** Bot rejeita com "Data inválida"

### 5. Paginação (Backend)

✅ **Como testar:**
```bash
curl http://localhost:3000/api/stock?page=1&limit=5
```

✅ **Resultado:**
```json
{
  "items": [...],
  "total": 15,
  "page": 1,
  "limit": 5,
  "pages": 3
}
```

---

## 📚 Documentação Completa

Ver [GUIA_DE_TESTES.md](./GUIA_DE_TESTES.md) para testes detalhados de todas as 32 melhorias.

---

## 🐛 Problemas Comuns

### "Environment validation failed"

**Causa:** Variável de ambiente faltando

**Solução:**
```bash
cd backend
cp .env.example .env
# Editar .env com valores corretos
```

### "Cannot find module"

**Causa:** Dependências não instaladas

**Solução:**
```bash
cd backend && npm install
cd ../frontend && npm install
```

### "Prisma Client not generated"

**Causa:** Prisma Client desatualizado

**Solução:**
```bash
cd backend
npm run prisma:generate
```

---

## 📊 Commits Implementados

| Commit | Descrição | Arquivos |
|--------|-----------|----------|
| 2ef7a14 | Melhorias Críticas | 12 files |
| e06f66b | Sprint 1 - Segurança | 10 files |
| 0436fe3 | Sprint 3 - Performance Backend | 6 files |
| be2cf00 | Frontend - Code Splitting | 2 files |
| 2f78f9b | Documentação de Testes | 1 file |

**Total:** 5 commits, 31 arquivos, 32 melhorias

---

Pronto para testar! 🎉
