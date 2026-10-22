# TODO PRO

> **TODO PRO** é uma aplicação web moderna, ultra-rápida e intuitiva para gerenciamento de tarefas de alta produtividade. Projetada para ser direta e focada no essencial — criar, descrever, organizar, priorizar, concluir e remover tarefas — com design escuro elegante e arquitetura 100% serverless gratuita no Edge.

---

## 🚀 Arquitetura & Tecnologias (100% Free Tier)

- **Frontend:** [Angular 22](https://angular.dev) (Standalone Components, Signals, Reactive Forms, SCSS Modular)
- **Autenticação:** [Clerk](https://clerk.com) Hobby ($0, até 50.000 MRU) com fluxo de código de verificação por e-mail de 6 dígitos sem senhas.
- **Backend Edge:** [Cloudflare Workers](https://workers.cloudflare.com) (Worker `todo-pro`) expondo API REST segura com validação de JWT Clerk.
- **Banco de Dados SQL:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (`todo-pro-db`), SQLite serverless global de alta velocidade, sem cold-start e que **nunca é pausado por inatividade**.
- **Hospedagem Estática:** Cloudflare Static Assets servindo a aplicação Angular com compressão global e SPA routing.
- **Testes Unitários:** [Vitest](https://vitest.dev) + jsdom com cobertura de 40 testes unitários.
- **Testes End-to-End (E2E):** [Playwright](https://playwright.dev) automatizado.

---

## 📋 Funcionalidades Principais

1. **Gestão Ágil de Tarefas:**
   - Criação instantânea com UI otimista (reflete imediatamente e persiste no D1).
   - Conclusão rápida pelo checkbox com atualização automática de `status` e `completed_at`.
   - Remoção segura com opção de **Desfazer** (*Undo*) por 5 segundos.
2. **Painel Lateral de Detalhes:**
   - Título e descrição com formatação Markdown segura (sanitização contra XSS).
   - Toolbar rápida de Markdown (Negrito, Listas, Código).
   - Checklist interativo com adição, marcação e exclusão de itens.
   - Salvamento automático (*auto-save*) com debounce visual discreto.
3. **Propriedades & Metadados:**
   - Status: *A fazer*, *Em andamento*, *Concluída*.
   - Prioridade: *Baixa*, *Normal*, *Alta*.
   - Prazos com destaque visual para tarefas atrasadas (*overdue*).
   - Tags simples (limite de até 5 tags por tarefa).
4. **Modos de Trabalho Especializados:**
   - **Geral (*General*):** Experiência limpa e objetiva para o dia a dia.
   - **Desenvolvimento (*Developer*):** Tipo de item (*Feature, Bug, Refactor, Chore, Docs*), Projeto, Branch, Ambiente e link seguro para PR.
   - **QA & Testes (*QA*):** Tipo (*Teste, Bug, Regressão*), Severidade (*Baixa, Média, Alta, Crítica*), Ambiente testado, Passos para reproduzir, Resultados e evidências.
5. **Busca, Filtros e Ordenação:**
   - Pesquisa rápida por título, descrição e tags.
   - Filtros compactos por status, prioridade e modo de trabalho.
   - Ordenação por: *Mais recentes*, *Mais antigas*, *Prazo mais próximo* e *Prioridade*.
6. **Atalhos de Teclado:**
   - `N`: Focar no campo de nova tarefa (quando fora de inputs).
   - `Ctrl + K` / `Cmd + K`: Focar na barra de busca.
   - `Esc`: Fechar painel lateral de detalhes ou cancelar foco.

---

## 🛠️ Requisitos de Ambiente

- **Node.js:** Versão 22.x ou 24.x (recomendado via `.nvmrc`)
- **NPM:** 10.x ou superior
- **Wrangler:** Cloudflare CLI integrado no projeto via `npx wrangler`

---

## 🏃 Como Rodar Localmente

```bash
# 1. Clonar repositório
git clone https://github.com/emersonbarrosdev/todo-list-pro.git
cd todo-list-pro

# 2. Instalar dependências
npm ci

# 3. Executar o servidor de desenvolvimento Angular
npm start
```

A aplicação abrirá em `http://localhost:4200/`.

---

## 🧪 Testes Automatizados

```bash
# Executar a suite de testes unitários com Vitest
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes end-to-end com Playwright
npm run test:e2e
```

---

## 🔐 Configuração do Clerk

1. No dashboard do [Clerk](https://dashboard.clerk.com):
   - Ative a opção **Email verification code (OTP)** em **User & Authentication -> Email, Phone, Username**.
   - Copie sua **Publishable Key** (`pk_test_...` para dev ou `pk_live_...` para prod).
2. Configure a Publishable Key no arquivo `src/environments/environment.ts` ou via variável de ambiente.
3. No Cloudflare Worker (`todo-pro`), caso queira validar o secret token em modo restrito, adicione o segredo:
   ```bash
   npx wrangler secret put CLERK_SECRET_KEY
   ```

---

## 🗄️ Banco de Dados Cloudflare D1

O banco de dados oficial utilizado é o **`todo-pro-db`**.

Para aplicar a migração no D1:
```bash
# Aplicar localmente para testes:
npx wrangler d1 execute todo-pro-db --local --file=./migrations/0001_create_todo_pro_d1.sql

# Aplicar em produção no Cloudflare CLI:
npx wrangler d1 execute todo-pro-db --remote --file=./migrations/0001_create_todo_pro_d1.sql

# Ou via Painel Cloudflare (D1 > todo-pro-db > Console):
# Cole o script SQL de ./migrations/0001_create_todo_pro_d1.sql e clique em Execute.
```

Tabelas estruturadas:
- `profiles`: armazena `clerk_user_id`, `display_name`, `work_mode`.
- `tasks`: armazena tarefas isoladas por `user_id` com índices para busca otimizada.

---

## ☁️ Deploy no Cloudflare Worker (`todo-pro`)

A aplicação utiliza o modelo híbrido **Worker + Static Assets**:
- Rotas `/api/*`: executadas pelo Worker (`worker/index.ts`) com acesso ao D1.
- Demais rotas: entregues pelo Cloudflare Static Assets com Single Page Application routing.

Para compilar e publicar:
```bash
npm run deploy
```

Consulte [FREE_TIER.md](file:///c:/Users/emers/PROJETOS/APLICA%C3%87%C3%95ES/todo-list-pro/FREE_TIER.md) para detalhes de cotas gratuitas e boas práticas.
