# TODO PRO

> **TODO PRO** é uma aplicação web moderna, rápida e intuitiva para gerenciamento de tarefas de alta produtividade. Projetada para ser direta e focada no essencial — criar, descrever, organizar, priorizar, concluir e remover tarefas — sem a complexidade desnecessária de ferramentas como Jira, Notion ou Trello.

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** [Angular 22](https://angular.dev) (Standalone Components, Signals, Reactive Forms, SCSS Modular)
- **Design System:** Dark Mode exclusivo (`#0B0B12`, detalhes em roxo `#8B5CF6`), tokens CSS nativos, SVGs limpos, sem bibliotecas pesadas de UI (Bootstrap e Tailwind removidos).
- **Backend & Persistência:** [Supabase](https://supabase.com) PostgreSQL com Row Level Security (RLS) estrito.
- **Autenticação:** Supabase Auth Passwordless Email OTP (código de 6 dígitos seguro, sem senhas).
- **Testes Unitários:** [Vitest](https://vitest.dev) + jsdom com cobertura de 40 testes unitários.
- **Testes End-to-End (E2E):** [Playwright](https://playwright.dev) com fluxo completo automatizado.
- **Deploy:** [Cloudflare Workers](https://workers.cloudflare.com) Static Assets (serviço `todo-list-pro`).

---

## 📋 Funcionalidades Principais

1. **Gestão Ágil de Tarefas:**
   - Criação instantânea com UI otimista (reflete imediatamente e persiste online).
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
   - **QA & Testes (*QA*):** Tipo (*Teste, Bug, Regressão*), Severidade (*Baixa, Média, Alta, Crítica*), Ambiente testado, Passos para reproduzir, Resultados e link para gravação/evidência.
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

- **Node.js:** Versão 22 LTS ou Node 24 (`^22.22.3 || ^24.15.0 || >=26.0.0`). O repositório inclui um shim automático (`scripts/node-version-shim.cjs`) para garantir compatibilidade com Angular CLI.
- **NPM:** 10+ ou 11+.

---

## 📦 Instalação e Desenvolvimento Local

```bash
# 1. Clonar o repositório
git clone https://github.com/emersonbarrosdev/todo-list-pro.git
cd todo-list-pro

# 2. Instalar dependências
npm ci

# 3. Configurar variáveis de ambiente (veja seção Supabase)
cp .env.example .env

# 4. Iniciar servidor de desenvolvimento
npm run start
```

Acesse a aplicação em `http://localhost:4200` ou na porta informada pelo terminal.

---

## 🧪 Testes Automatizados

### Testes Unitários (Vitest)
Executa a suíte de 40 testes unitários cobrindo services (`AuthService`, `TaskService`, `ProfileService`), pipes (`SafeMarkdownPipe`), componentes e isolamento de RLS:

```bash
npm run test
```

### Testes End-to-End (Playwright)
Executa o fluxo completo do usuário no navegador Chromium (login, criação de tarefa, edição de descrição, prioridade, checklist, filtros, remoção e atalhos):

```bash
npm run test:e2e
```

### Build de Produção
Gera o bundle otimizado pronto para deploy em `dist/todo-list/browser`:

```bash
npm run build
```

---

## 🗄️ Configuração do Supabase

### 1. Variáveis de Ambiente
Defina as variáveis no `.env` ou nas configurações do seu ambiente:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-anon
```

> **Atenção:** NUNCA utilize a chave `service_role` no código Angular. Use exclusivamente a chave pública anônima (`anon`/`publishable`).

### 2. Migrations SQL
As migrations versionadas estão localizadas em `supabase/migrations/20261022000001_create_todo_pro_schema.sql`.

Elas criam:
- Tabela `profiles` vinculada a `auth.users(id)`.
- Tabela `tasks` com colunas estruturadas (`status`, `priority`, `work_mode`, `tags`, `checklist`, `metadata`).
- Triggers para atualização automática de `updated_at`.
- Trigger para criação automática de perfil padrão após o primeiro cadastro no Auth.
- Políticas de **Row Level Security (RLS)** que garantem que cada usuário acesse, crie, modifique e delete **apenas os seus próprios dados**.
- Índices otimizados para busca e ordenação rápida:
  - `idx_tasks_user_id`
  - `idx_tasks_user_status`
  - `idx_tasks_user_updated`
  - `idx_tasks_user_due`

### 3. Configuração de Email OTP (Passwordless)
No painel do Supabase (**Authentication -> Email Templates -> Magic Link / OTP**):
1. Altere o assunto para: `Seu código de acesso ao TODO PRO`.
2. No corpo do e-mail, utilize a variável `{{ .Token }}` para exibir o código de 6 dígitos:
   ```html
   <h2>Seu código de acesso TODO PRO</h2>
   <p>Digite o código de verificação abaixo para acessar sua conta:</p>
   <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
   <p>Este código expira em poucos minutos. Se você não solicitou este acesso, ignore este e-mail.</p>
   ```
3. Em **Authentication -> URL Configuration**, configure o Site URL e Redirect URLs do seu domínio de produção.

### 4. Provedor SMTP de Produção
Para ambiente de produção público, configure um provedor SMTP próprio no painel do Supabase (**Settings -> Authentication -> SMTP Settings**) para evitar os limites do provedor padrão:
- Exemplos recomendados: **Resend SMTP**, **SendGrid**, **Postmark** ou **Amazon SES**.
- O TODO PRO não depende de bibliotecas proprietárias de e-mail no frontend, delegando o envio com segurança ao Supabase Auth.

---

## 🛡️ Cloudflare Turnstile (Proteção Anti-Bot)

O TODO PRO possui integração nativa preparada para o [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/):
- Se a variável `TURNSTILE_SITE_KEY` estiver configurada, o widget do Turnstile é renderizado no formulário de autenticação e o captcha token é transmitido ao Supabase Auth.
- Se a variável não estiver definida, a aplicação funciona perfeitamente em modo padrão.

---

## ☁️ Deploy no Cloudflare Workers

O serviço configurado para deploy é: `todo-list-pro`.

A configuração está centralizada em `wrangler.jsonc` (e `wrangler.toml`):
```jsonc
{
  "name": "todo-list-pro",
  "compatibility_date": "2026-02-01",
  "assets": {
    "directory": "./dist/todo-list/browser",
    "not_found_handling": "single-page-application"
  }
}
```

O parâmetro `not_found_handling = "single-page-application"` é **essencial** para garantir que as rotas do Angular SPA (como `/auth` ou `/settings`) funcionem perfeitamente quando o usuário recarregar a página diretamente pelo navegador.

### Comando de Deploy
```bash
# Executa build de produção e deploy para o Cloudflare Workers
npm run deploy
```

---

## 🏛️ Arquitetura do Projeto

```
src/
├── app/
│   ├── core/                    # Serviços centrais, guards e modelos
│   │   ├── guards/              # authGuard e guestGuard
│   │   ├── models/              # Tipagem estrita (Task, Profile, WorkMode)
│   │   └── services/            # AuthService, TaskService, ProfileService, ToastService
│   ├── features/                # Telas e módulos principais (Lazy Loaded)
│   │   ├── auth/                # Tela de Login com Email OTP de 6 dígitos
│   │   ├── settings/            # Configurações de perfil e escolha de modo de trabalho
│   │   └── tasks/               # Painel principal de tarefas, filtros e atalhos
│   └── shared/                  # Componentes reutilizáveis e utilitários
│       ├── components/          # Header, TaskDetails, Onboarding, Toast
│       └── pipes/               # SafeMarkdownPipe (renderização segura e sanitizada)
├── environments/                # Configurações de ambiente para runtime e build
└── styles.scss                  # Design system tokens e variáveis globais
supabase/
└── migrations/                  # Scripts SQL versionados com RLS e triggers
e2e/                             # Testes automatizados Playwright
```

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).
