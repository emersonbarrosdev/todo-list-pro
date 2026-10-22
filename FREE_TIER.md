# 🛡️ Diretrizes do Plano Gratuito (100% Free Tier) - TODO PRO

Este documento registra os limites operacionais, arquitetura e boas práticas para manter o **TODO PRO** permanentemente **100% gratuito**, sem custos ocultos, cobranças automáticas ou necessidade de cartão de crédito.

---

## 📊 Limites Operacionais dos Serviços Gratuitos

| Serviço | Plano | Limites Gratuitos Oficiais | Regra de Uso no TODO PRO |
| :--- | :--- | :--- | :--- |
| **Clerk Auth** | Hobby ($0) | • Até **50.000** Usuários Ativos Retidos/mês (MRU)<br>• Código OTP de 6 dígitos por e-mail incluído<br>• Aplicações ilimitadas | Não utilizar recursos marcados como Pro ou SMS. Utilizar exclusivamente verificação por e-mail OTP de 6 dígitos. |
| **Cloudflare Workers** | Free ($0) | • **100.000** requisições por dia<br>• 10ms de tempo de CPU por requisição | Rotas de API leves (`/api/tasks`, `/api/profile`) servidas diretamente do Edge, sem cold-start. |
| **Cloudflare Static Assets** | Free ($0) | • Transferência e hospedagem de assets ilimitadas dentro da cota do Workers | Entrega o SPA Angular compilado (`dist/todo-list/browser`) com compressão e cache nos servidores globais. |
| **Cloudflare D1 (SQL)** | Free ($0) | • **5.000.000** de leituras de linha/dia (rows read)<br>• **100.000** de escritas de linha/dia (rows written)<br>• **500 MB** de armazenamento por banco<br>• **5 GB** totais por conta | Consultas com índices obrigatórios, sem full table scan. Paginação e filtros eficientes. |

> [!NOTE]
> Os limites dos provedores podem ser atualizados periodicamente por Clerk e Cloudflare. Consulte os painéis oficiais para atualizações de termos.

---

## ⚡ Estratégias de Otimização e Prevenção de Custos

Para garantir que o TODO PRO nunca atinja ou ultrapasse os limites gratuitos:

1. **Zero Polling Desnecessário**:
   - A aplicação não executa loops de verificação (`setInterval` / polling contínuo).
   - O estado é reativo utilizando Angular Signals e eventos orientados à ação do usuário.
2. **Cache Local no Frontend**:
   - O `TaskService` e `ProfileService` mantêm cache local em `localStorage` para exibição instantânea, evitando chamadas repetidas à API.
3. **Debounce em Buscas**:
   - A busca por tarefas aplica debounce para não emitir uma requisição a cada caractere digitado.
4. **Consultas Indexadas no D1**:
   - Toda consulta no banco D1 utiliza o índice `tasks(user_id)` ou `tasks(user_id, status)`, garantindo que apenas as linhas do usuário sejam lidas, mantendo o consumo de *rows read* mínimo.
5. **Falha Controlada**:
   - Caso a rede esteja offline ou o limite gratuito de requisições diárias seja atingido, a aplicação opera em modo resiliente com fallback local, informando amigavelmente o usuário sem travar e **sem realizar upgrades automáticos**.

---

## 🔒 Princípio de Cartão Zero e Não-Upgrade

- **Proibido ativar Clerk Pro ou Billing**: A conta permanece no plano Hobby.
- **Proibido ativar Workers Paid**: A conta Cloudflare permanece no plano Free.
- **Proibido cadastrar cartão de crédito** como requisito para continuar a execução.
- Se qualquer recurso futuro exigir pagamento, ele **não será ativado**, priorizando alternativas gratuitas ou mantendo a funcionalidade fora do escopo.
