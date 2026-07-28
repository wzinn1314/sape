# SAPE - Sistema de Apoio e Acolhimento Pedagógico

Sistema profissional de gestão pedagógica para alunos neurodivergentes, desenvolvido para fornecer suporte especializado e acompanhamento educacional.

## 📋 Visão Geral

O SAPE é um sistema web projetado para educadores especializados (AEE - Atendimento Educacional Especializado) que necessitam gerenciar alunos com necessidades educacionais especiais, criar relatórios pedagógicos, acompanhar evoluções e manter histórico completo de cada aluno.

### 🎯 Público-Alvo
- Professores de AEE (Atendimento Educacional Especializado)
- Administradores escolares
- Coordenadores pedagógicos
- Diretores de AEE

### 🚀 Objetivos do Sistema
- Centralizar gestão de alunos neurodivergentes
- Facilitar criação e armazenamento de relatórios pedagógicos
- Permitir acompanhamento longitudinal da evolução dos alunos
- Garantir controle de acesso baseado em permissões
- Fornecer interface profissional e intuitiva

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilização profissional
- **JavaScript (Vanilla)** - Lógica sem frameworks
- **Font Awesome 6.5.0** - Ícones
- **Phosphor Icons** - Ícones adicionais

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite3** - Banco de dados leve e relacional
- **JWT (JSON Web Tokens)** - Autenticação segura
- **Middleware de autenticação** - Controle de acesso

## 🗄️ Banco em Produção

- O SAPE usa SQLite por padrão (arquivo em disco).
- Para produção, o caminho do banco deve ficar em armazenamento persistente (volume/disk) do provedor, configurando `DB_PATH`.

### Segurança
- Autenticação JWT
- Validação de tokens expirados
- Controle de acesso por role
- Proteção de rotas sensíveis

## 📁 Estrutura do Projeto

```
SAPE/
├── backend/                      # Backend Node.js/Express
│   ├── config/
│   │   ├── database.js           # Conexão + init do SQLite
│   │   └── jwt.js                # Helpers JWT
│   ├── middleware/
│   │   ├── admin.js              # Verificação de role admin
│   │   ├── auth.js               # Autenticação JWT (Bearer)
│   │   └── studentAccess.js      # Checagem de vínculo professor↔aluno
│   ├── utils/
│   │   └── access.js             # Helper de vínculo (professorTemAcesso)
│   ├── .env.example              # Exemplo de configuração (NUNCA commitar .env)
│   ├── package.json              # Dependências do backend
│   └── server.js                 # Servidor principal (API + estáticos)
│
├── frontend/                     # Frontend HTML/CSS/JS
│   ├── assets/
│   ├── config.js                 # Config global do frontend
│   └── scrons/                   # Telas
│       ├── admin/
│       ├── deshboard/
│       ├── login/
│       ├── new_students/
│       ├── register/
│       ├── report/
│       ├── report generation/
│       ├── settings/
│       ├── students/
│       └── teacher-home/
│
├── index.html                    # Landing page
├── styles.css                    # CSS da landing page
├── .gitignore
└── README.md
```

## ⚙️ Configuração e Instalação

### Pré-requisitos
- Node.js (v14 ou superior)
- npm (gerenciador de pacotes Node.js)
- Git (opcional)

### Instalação

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd SAPE
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp backend/.env.example backend/.env
```

### Exemplo de arquivo `.env`:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=sua_chave_secreta_aqui_mais_longa_e_segura
JWT_EXPIRES_IN=7d
DB_PATH=./sapedb.sqlite
ADMIN_EMAIL=admin@escola.edu.br
ADMIN_MATRICULA=ADM2026
ADMIN_PASSWORD=troque_esta_senha
ALLOWED_EMAIL_DOMAINS=escola.edu.br
CORS_ORIGINS=
```

### Rodar o Servidor

**Desenvolvimento:**
```bash
npm start
```

**Produção:**
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 🔐 Sistema de Permissões

### Roles de Usuário

1. **Admin (Administrador)**
   - Acesso total ao sistema
   - Pode criar novos alunos
   - Pode acessar Dashboard completo
   - Pode acessar Painel Admin
   - É identificado por role contendo `admin` (ex.: `Admin`)

2. **Professor (Professor AEE)**
   - Acesso apenas a alunos vinculados
   - Pode criar relatórios apenas de alunos vinculados
   - Acesso à tela de início específica
   - Não pode criar novos alunos
   - Não pode acessar Dashboard geral

### Redirecionamento por Role

- **Admin/Diretor** → `deshboard/index.html`
- **Professor AEE** → `teacher-home/index.html`

## 🌐 API Endpoints

### Autenticação
- `POST /login` ou `POST /auth/login` - Login do usuário
- `GET /me` ou `GET /auth/me` - Dados do usuário autenticado
- `POST /register` ou `POST /auth/register` - Criar usuário (requer Admin)

### Alunos
- `GET /students` - Listar todos os alunos (Admin) ou vinculados (Professor)
- `GET /students/:id` - Detalhes de um aluno específico
- `POST /students` - Criar novo aluno (Admin apenas)
- `PUT /students/:id` - Atualizar aluno
- `DELETE /students/:id` - Deletar aluno

### Alunos Vinculados (Professor)
- `GET /users/:userId/students` - Listar alunos vinculados a um professor
- `GET /users/:userId/reports` - Listar relatórios de um professor

### Relatórios
- `GET /reports` - Listar relatórios (Admin) ou do professor
- `POST /reports` - Criar novo relatório
- `DELETE /reports/:id` - Deletar relatório

### Dashboard
- `GET /students/dashboard` - Dados do dashboard (Admin)

### Vínculos
- `POST /vinculos` - Criar vínculo professor-aluno
- `DELETE /vinculos/:professorId/:studentId` - Remover vínculo

### Admin
- `POST /admin/create-user` - Criar novo usuário (Admin)

## 🗄️ Estrutura do Banco de Dados

### Tabela `user`
- `id` - ID do usuário
- `name` - Nome completo
- `email` - E-mail
- `matricula` - Matrícula funcional
- `password` - Senha (hash)
- `role` - Role (admin/professor/teacher)
- `specialization` - Especialização
- `approved` - Status de aprovação
- `emailVerified` - E-mail verificado

### Tabela `students`
- `id` - ID do aluno
- `name` - Nome completo
- `birth_date` - Data de nascimento
- `registration_number` - Matrícula escolar
- `cpf` - CPF
- `turma` - Turma
- `curso` - Curso
- `ano_letivo` - Ano letivo
- `diagnostico` - Diagnóstico
- `pei` - Possui PEI (0/1)
- `suporte` - Tipo de suporte
- `hiperfocos` - Hiperfocos
- `gatilhos` - Gatilhos
- `estrategias` - Estratégias
- `adaptacoes` - Adaptações curriculares
- `responsavel_nome` - Nome do responsável
- `parentesco` - Parentesco
- `telefone` - Telefone
- `registered_by` - ID de quem cadastrou
- `created_at` - Data de criação

### Tabela `reports`
- `id` - ID do relatório
- `student_id` - ID do aluno
- `user_id` - ID do professor que criou
- `pdf_content` - Conteúdo do relatório
- `file_name` - Nome do arquivo
- `created_at` - Data de criação

### Tabela `professor_aluno`
- `id` - ID do vínculo
- `professor_id` - ID do professor
- `student_id` - ID do aluno
- `created_at` - Data de criação

## 📱 Funcionalidades do Sistema

### 1. Login e Autenticação
- ✅ Autenticação via JWT
- ✅ Redirecionamento por role
- ✅ Verificação de sessão expirada
- ✅ Validação de credenciais

### 2. Dashboard (Admins/Diretores)
- ✅ Visão geral do sistema
- ✅ Estatísticas em tempo real
- ✅ Alunos registrados recentemente
- ✅ Avisos importantes
- ✅ Métricas de desempenho

### 3. Tela Início (Professores)
- ✅ Lista de alunos vinculados
- ✅ Relatórios pendentes
- ✅ Ações rápidas
- ✅ Últimos relatórios realizados
- ✅ Foco em tarefas diárias

### 4. Gestão de Alunos
- ✅ Listagem com busca e filtros
- ✅ Visualização detalhada
- ✅ Paginação
- ✅ Filtro por vínculo (professores)
- ✅ Criação de novos alunos (Admin)

### 5. Cadastro de Aluno
- ✅ Formulário com 4 abas
- ✅ Validação por etapa
- ✅ Dados completos (PEI/PDI, saúde, responsável)
- ✅ Redirecionamento automático após sucesso

### 6. Painel Admin
- ✅ Cadastro de professores
- ✅ Vínculo professor-aluno
- ✅ Gestão de vínculos
- ✅ Autorização por JWT + role admin

### 7. Relatórios
- ✅ Listagem completa
- ✅ Filtros por aluno/professor
- ✅ Busca em tempo real
- ✅ Ações (visualizar, download, excluir)
- ✅ Filtro por vínculo (professores)

### 8. Geração de Relatórios
- ✅ Seleção de aluno (vinculado)
- ✅ Tipos de relatório
- ✅ Editor de conteúdo
- ✅ Encaminhamentos
- ✅ Data/hora automática
- ✅ Salvamento no banco e localStorage

## 🧪 Testando o Sistema

### Teste de Login

**Como Admin:**
1. Acesse `login/index.html`
2. Use `ADMIN_EMAIL` ou `ADMIN_MATRICULA` configurados no `.env`
3. Use `ADMIN_PASSWORD` configurada no `.env`
4. Deve redirecionar para `deshboard/index.html`

**Como Professor:**
1. Acesse `login/index.html`
2. Use credenciais de professor
3. Deve redirecionar para `teacher-home/index.html`

### Teste de Permissões

**Teste Dashboard:**
- Tente acessar `deshboard/index.html` como professor
- Deve ser redirecionado para `teacher-home/index.html`

**Teste Novo Aluno:**
- Tente acessar `new_students/index.html` como professor
- Deve ser bloqueado com mensagem de erro

**Teste Relatórios:**
- Admin vê todos os relatórios
- Professor vê apenas relatórios de alunos vinculados

### Teste de Vínculos
1. Acesse `admin/admin.html` como admin
2. Crie um novo professor
3. Vincule o professor a alunos
4. Login como professor
5. Veja apenas os alunos vinculados

## 📚 Guia de Refatorização

Durante o processo de refatorização, o sistema foi atualizado para:

### Segurança
- ✅ Autenticação JWT em todas as chamadas API
- ✅ Validação de tokens expirados
- ✅ Sistema de permissões por role
- ✅ Proteção de rotas sensíveis

### UX Profissional
- ✅ Toast notifications (substituindo alerts)
- ✅ Loading states
- ✅ Feedback visual consistente
- ✅ Redirecionamentos inteligentes

### Código
- ✅ Padronização de respostas API
- ✅ Estrutura modular
- ✅ Comentários em português
- ✅ Convenções de código consistentes

### Design
- ✅ Menu lateral padrão
- ✅ Tema visual profissional
- ✅ Responsividade
- ✅ Animações suaves

## 🐛 Troubleshooting

### Problema: Sessão expirada frequentemente
**Solução:** Verifique a configuração do JWT_SECRET no arquivo `.env`

### Problema: Alunos não aparecem para professores
**Solução:** Verifique se os vínculos foram criados no Painel Admin

### Problema: Relatórios não estão sendo salvos
**Solução:** Verifique se a tabela `reports` tem a coluna `user_id`

### Problema: Erro ao conectar com o banco
**Solução:** Verifique se o arquivo do banco de dados existe e tem permissões de escrita

## 🤝 Contribuindo

Este é um projeto em desenvolvimento. Para contribuir:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m "Adiciona nova funcionalidade"`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade da instituição educacional. Todos os direitos reservados.

## 👥 Desenvolvedores

- Equipe de desenvolvimento SAPE
- Refatorização e melhorias: Devin AI Assistant

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema, entre em contato com a equipe de TI da instituição.

---

**Versão Atual:** 2.0 (Refatorizado)
**Última Atualização:** Julho 2026
