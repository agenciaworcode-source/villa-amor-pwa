# Deploy — Villa Amor PWA

Guia completo para publicar o app em produção via **Vercel** (plataforma recomendada para Next.js).

---

## Pré-requisitos

- Conta na [Vercel](https://vercel.com) (plano gratuito é suficiente)
- CLI da Vercel instalada: `npm i -g vercel`
- Projeto no Supabase com banco configurado
- Node.js 18+ na máquina

---

## 1. Preparar o ambiente local

### 1.1 Instalar dependências limpas

```bash
npm install
```

> **Por quê:** o `next-pwa` v5 foi removido do package.json (conflito com
> `@ducanh2912/next-pwa` v10). O `npm install` remove ele de `node_modules`.

### 1.2 Verificar build local

```bash
npm run build
```

Confirme que não há erros. O build gera:
- `.next/` — bundle da aplicação
- `public/sw.js` — Service Worker gerado pelo Workbox
- `public/workbox-*.js` — runtime do Workbox

### 1.3 Testar PWA localmente (opcional mas recomendado)

```bash
npm run start
```

Abra `http://localhost:3000` no Chrome.  
Vá em **DevTools → Application → Service Workers** e confirme que o SW está ativo.  
Vá em **DevTools → Application → Manifest** e confirme que o manifesto carrega.

---

## 2. Configurar variáveis de ambiente no Vercel

### 2.1 Via painel web (recomendado)

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Crie um novo projeto → **Import Git Repository** (ou use CLI abaixo)
3. Na tela de configuração do projeto, adicione as seguintes variáveis em **Environment Variables**:

| Variável | Valor | Ambientes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key do Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase | Production, Preview, Development |

> **Atenção:** `SUPABASE_SERVICE_ROLE_KEY` dá acesso total ao banco — nunca exponha no frontend.
> Ela é usada apenas em Server Components e API routes (lado servidor).

### 2.2 Via CLI (alternativo)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

---

## 3. Deploy via CLI

### 3.1 Login na Vercel

```bash
vercel login
```

### 3.2 Primeiro deploy (configura o projeto)

```bash
vercel
```

Responda às perguntas:
- **Set up and deploy?** → `Y`
- **Which scope?** → selecione sua conta
- **Link to existing project?** → `N` (cria novo)
- **Project name?** → `villa-amor` (ou o nome que preferir)
- **In which directory is your code located?** → `.` (diretório atual)
- **Want to modify settings?** → `N`

### 3.3 Deploy em produção

```bash
vercel --prod
```

A URL de produção será exibida no final, ex.: `https://villa-amor.vercel.app`

---

## 4. Configurar Supabase para produção

### 4.1 Allowed redirect URLs

No painel do Supabase:
1. Vá em **Authentication → URL Configuration**
2. Em **Site URL**, coloque a URL de produção: `https://villa-amor.vercel.app`
3. Em **Redirect URLs**, adicione:
   ```
   https://villa-amor.vercel.app/**
   https://villa-amor.vercel.app/login
   ```

### 4.2 RLS (Row Level Security)

Confirme que todas as tabelas com dados sensíveis têm RLS habilitado:
- `residents` — ativo
- `executions` — ativo
- `alerts` — ativo
- `users` — ativo

---

## 5. Configurar domínio customizado (opcional)

### 5.1 Via painel Vercel

1. Vá em **Project → Settings → Domains**
2. Adicione o domínio, ex.: `app.villaamor.com.br`
3. Configure o DNS conforme instruído (geralmente um registro CNAME)

### 5.2 Atualizar Supabase

Após o domínio customizado propagar, atualize os URLs no Supabase:
- **Site URL:** `https://app.villaamor.com.br`
- **Redirect URLs:** `https://app.villaamor.com.br/**`

---

## 6. Validar PWA em produção

### 6.1 Checklist no Chrome DevTools

Abra a URL de produção no Chrome e veja em **DevTools → Application**:

- [ ] **Manifest** — sem erros, ícones carregando
- [ ] **Service Workers** — status `activated and running`
- [ ] **Storage → Cache Storage** — caches `mobile-pages`, `supabase-api`, `google-fonts` populados após navegar

### 6.2 Lighthouse PWA audit

No Chrome DevTools → **Lighthouse** → marque só **Progressive Web App** → **Analyze page load**.

Pontuação esperada: 100 (ou próximo).

### 6.3 Testar install prompt

No Chrome (desktop ou Android):
- Deve aparecer o botão **"Instalar Villa Amor"** no topo do app
- Ou ícone de instalação na barra de endereço do Chrome

### 6.4 Testar modo offline

1. Instale o PWA na tela inicial
2. No DevTools → **Network** → marque **Offline**
3. Recarregue a página
4. Páginas já visitadas devem carregar normalmente (cache NetworkFirst)
5. Páginas não visitadas devem exibir a tela `/offline`

---

## 7. Deploys subsequentes

Para cada nova versão, basta:

```bash
vercel --prod
```

Ou conecte o repositório Git à Vercel para **deploy automático a cada push na branch `main`**:
1. **Project → Settings → Git** → conecte o repositório
2. Todo push para `main` dispara deploy automático

---

## 8. Monitoramento pós-deploy

| O que verificar | Onde |
|---|---|
| Erros de runtime | Vercel Dashboard → Functions → Logs |
| Erros de autenticação | Supabase → Authentication → Logs |
| Performance do banco | Supabase → Database → Query Performance |
| Service Worker ativo | Chrome DevTools → Application → SW |

---

## Resumo dos arquivos críticos para o deploy

```
next.config.mjs          — configuração do PWA + Workbox (caching strategies)
public/manifest.json     — metadados do PWA (nome, ícones, cores)
public/icon-192.png      — ícone obrigatório
public/icon-512.png      — ícone obrigatório
public/icon-512-maskable.png — ícone maskable (Android)
middleware.ts            — auth guard + RBAC (protege todas as rotas)
.env.local               — variáveis locais (NÃO commitar no git)
```

> **Importante:** confirme que `.env.local` está no `.gitignore` antes de
> subir o código para qualquer repositório público.
