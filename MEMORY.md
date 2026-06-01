# Memory - Villa Amor PWA Project

## Status Atual
- **Pivot Arquitetural Concluído:** O projeto foi reorientado de um monorepo (Expo + Next.js) para uma aplicação web única (PWA) utilizando Next.js 14+ (App Router).
- **Infraestrutura e Auth:** Sprint 0 e Sprint 1 concluídas. O sistema possui roteamento protegido, login com Supabase e layout mobile-first.
- **Análise de Prototipagem:** Identificados componentes estáticos em `fluxo-components` e `web-components` que servirão de base para a implementação real.

## Decisões Arquiteturais (Pivot PWA)
- **Framework:** Next.js 14+ com App Router.
- **Estilo:** Tailwind CSS + Shadcn/ui (Mobile-first).
- **Backend:** Supabase (Auth, DB, Realtime, Storage).
- **Offline:** Service Workers + IndexedDB para resiliência de rede.
- **Câmera:** Restrição rigorosa de "somente câmera ao vivo" via atributos de captura web.

## Plano de Ação (Sprints)

### Sprint 0: Infraestrutura e Setup (CONCLUÍDA)
- [x] Inicializar projeto Next.js (pnpm create next-app).
- [x] Configurar Tailwind e Shadcn/ui com tokens de design do Villa Amor.
- [x] Configurar Manifest PWA e Service Worker básico.
- [x] Configurar Supabase Client (Auth + Public client).

### Sprint 1: Autenticação e Navegação Base (CONCLUÍDA)
- [x] Implementar fluxo de login (Supabase Auth).
- [x] Implementar middleware de proteção de rotas por role (`operational`, `admin`).
- [x] Criar casca (layout) mobile-first para colaboradores.

### Sprint 2: Migração do Fluxo Mobile (Core Business)
- [ ] Implementar lista de residentes do turno.
- [ ] Implementar motor de execução de POPs (steps sequenciais).
- [ ] Implementar captura de evidência (Câmera API) com upload para Supabase Storage.

### Sprint 3: Dashboard e Gestão
- [ ] Implementar visão de gestor (timeline de execuções em tempo real).
- [ ] Implementar builder de POPs (admin).

## Pendências / Riscos
- **Validação de Câmera:** Testar a eficácia de `capture="camera"` em diferentes browsers mobile para garantir que a galeria não seja acessada.
- **Geofencing:** Validar a precisão da Web Geolocation API dentro da clínica.

---
*Última atualização: 2026-05-09*

