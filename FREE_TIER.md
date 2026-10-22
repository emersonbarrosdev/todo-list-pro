# Diretrizes de Operação 100% Free Tier - TODO PRO

Este documento define os parâmetros operacionais do **TODO PRO** para garantir a permanência estrita nos planos gratuitos de todos os serviços de infraestrutura utilizados. Nenhuma alteração, feature ou automação pode modificar ou atualizar planos para versões pagas.

---

## 1. Arquitetura e Limites dos Planos Gratuitos

### 1.1 Clerk (Plano Hobby - $0/mês)
- **Autenticação**: Passwordless com Código OTP por E-mail (Email Verification Code).
- **Sem Senha**: Não exige memorização ou redefinição de senhas.
- **Configurações Específicas**:
  - `touchSession: false`: Desabilita chamadas automáticas de `/touch` ao alternar foco de abas do navegador.
  - `signUpIfMissing: true`: Fluxo oficial unificado de sign-in/sign-up sem geração de erro HTTP 422 para novos usuários.
  - `skipCache: false`: Mantém o cache padrão de token de sessão do Clerk, sem forçar requisições adicionais de token.
  - Chamadas de `/tokens` ocorrem em conformidade com o tempo de vida do JWT (aproximadamente a cada 1 minuto) direcionadas à infraestrutura do Clerk (`*.clerk.accounts.dev`), não consumindo requisições do Worker ou leituras/escritas do D1.

### 1.2 Cloudflare Workers (Plano Free - $0/mês)
- **Cota**: 100.000 requisições diárias.
- **Isolamento de Assets Estáticos**:
  - Todos os arquivos estáticos (HTML, CSS, JS, SVG, fontes, imagens) são servidos diretamente pela CDN global do Cloudflare Static Assets (`run_worker_first: ["/api/*"]`).
  - Navegações de SPA e carregamento de bundles JavaScript não invocam o Worker.
  - Somente requisições destinadas ao prefixo `/api/*` acionam o Worker.
- **Validação Criptográfica de JWT Local (Networkless)**:
  - O Worker valida tokens RS256 localmente utilizando a Web Crypto API (`crypto.subtle`) e a chave pública JWK do Clerk.
  - Zero chamadas externas à API de Backend do Clerk por requisição `/api/tasks` ou `/api/profile`.
- **Tratamento de Limite (HTTP 429)**:
  - Caso o limite de 100.000 requisições diárias seja atingido, a aplicação exibe mensagem clara: *"Limite gratuito de requisições atingido. Tente novamente mais tarde."*
  - Em nenhuma hipótese deve haver ativação ou deploy em plano Workers Paid.

### 1.3 Cloudflare D1 (Plano Free - $0/mês)
- **Cotas**:
  - **Leituras**: 5.000.000 de linhas lidas/dia.
  - **Escritas**: 100.000 de linhas gravadas/dia.
  - **Armazenamento**: 5 GB.
- **Otimização de Linhas Lidas (Rows Read)**:
  - Carregamento inicial de tarefas (`GET /api/tasks`) realizado **uma única vez** no startup após o login.
  - Todas as operações de filtro (status, prioridade, modo), busca por texto e ordenação ocorrem estritamente **em memória no client-side** (Signals do Angular).
  - Nenhuma chamada `GET /api/tasks` ao digitar no campo de busca, clicar em abas ou trocar ordenação.
- **Otimização de Linhas Gravadas (Rows Written)**:
  - Remoção completa de qualquer autosave, debounce contínuo ou gravação em blur/change/input.
  - As alterações em formulários (título, descrição, prioridade, status, prazos, tags, checklists, metadados DEV/QA) permanecem exclusivamente no estado local.
  - Persistência única no D1 exclusivamente no clique de **"Salvar"** ou via atalho **Ctrl+S / Cmd+S**.
  - Criação de nova tarefa realiza escrita no D1 exclusivamente ao submeter o formulário (**"Criar tarefa"**).
  - Tratamento de erro resiliente: se a gravação no D1 falhar, o estado da UI permanece `dirty` com aviso amigável, impedindo perda de dados digitados pelo usuário e sem falsos registros no cliente.

---

## 2. Matriz de Auditoria de Requisições por Ação

| Ação do Usuário | Chamadas Worker API | Chamadas de Escrita D1 | Comportamento |
| :--- | :---: | :---: | :--- |
| **Abrir Aplicação** | 2 | 0 | 1 `GET /api/profile` + 1 `GET /api/tasks` |
| **Editar Título / Descrição** | 0 | 0 | Estado local do formulário (`dirty`) |
| **Marcar / Desmarcar Checklist** | 0 | 0 | Modificação local do array |
| **Alterar Prioridade** | 0 | 0 | Seleção local |
| **Alterar Status** | 0 | 0 | Seleção local |
| **Adicionar / Remover Tags** | 0 | 0 | Modificação local |
| **Campos DEV / QA** | 0 | 0 | Modificação local |
| **Filtrar (Todas/A fazer/Doing/Done)** | 0 | 0 | Filtro client-side em memória |
| **Buscar Texto (cada tecla)** | 0 | 0 | Filtro client-side em memória |
| **Ordenar (Recentes/Prazo/Prioridade)** | 0 | 0 | Ordenação client-side em memória |
| **Alternar de Aba / Foco** | 0 | 0 | `touchSession: false` impede `/touch` |
| **Clicar "Salvar"** | 1 | 1 | `PUT /api/tasks/:id` com estado consolidado |
| **Criar Nova Tarefa** | 1 | 1 | `POST /api/tasks` ao clicar em Criar |
| **Excluir Tarefa** | 1 | 1 | `DELETE /api/tasks/:id` após confirmação |
| **Clicar "Atualizar"** | 1 | 0 | `GET /api/tasks` sob demanda explícita |

---

## 3. Regras de Manutenção
1. Qualquer upgrade de infraestrutura deve ser validado manualmente.
2. Cartão de crédito não deve ser associado para evitar cobranças automáticas imprevistas.
3. Não habilitar WebSockets, Server-Sent Events, polling ou sincronizações realtime automáticas no cliente.
