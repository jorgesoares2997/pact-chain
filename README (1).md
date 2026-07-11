<div align="center">
  <img src="public/favicon.png" alt="Verb Matrix Pro Logo" width="120" />
</div>

<h1 align="center">Verb Matrix Pro</h1>

## 🎯 O problema que o projeto resolve
Aprender e memorizar os tempos verbais e verbos irregulares em inglês pode ser uma tarefa repetitiva, estática e desmotivadora. O **Verb Matrix Pro** atua diretamente nessa dor, oferecendo uma plataforma de prática dinâmica, interativa e orientada ao aprendizado ativo. Em vez de exercícios monótonos, a aplicação cria um ambiente imersivo com validação em tempo real. Além disso, traz um diferencial de contexto: o vocabulário e os cenários são fortemente inspirados no mundo da tecnologia, engenharia de software e web3, aproximando o ensino da realidade de desenvolvedores e profissionais de TI que precisam dominar o idioma.

## 🛠 Tecnologias utilizadas
- **Frontend & UI**: [React (v18)](https://react.dev/), [Vite](https://vitejs.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização & Componentes**: [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (baseado em Radix UI), [Framer Motion](https://www.framer.com/motion/) para animações e [Lucide React](https://lucide.dev/) para iconografia.
- **Gerenciamento de Estado & Validação**: [React Query](https://tanstack.com/query/latest) (@tanstack/react-query), [Zod](https://zod.dev/) e [React Hook Form](https://react-hook-form.com/).
- **Roteamento**: [React Router DOM](https://reactrouter.com/)
- **Testes & Qualidade**: [Vitest](https://vitest.dev/) (Testes unitários) e [Playwright](https://playwright.dev/) (Testes E2E).

## 🚀 Como rodar ou acessar o projeto

### Pré-requisitos
- Node.js (v18 ou superior)
- Gerenciador de pacotes (npm, pnpm, yarn ou bun)

### Instalação e Execução local

1. Clone o repositório para sua máquina local:
   ```bash
   git clone <SEU_REPOSITORIO>
   cd verb-matrix-pro
   ```

2. Instale todas as dependências necessárias:
   ```bash
   npm install
   # ou use: pnpm install / bun install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse a aplicação no seu navegador padrão: `http://localhost:5173`.

## ✨ Principais funcionalidades
- **Practice Matrix (Matriz de Prática)**: Uma dashboard abrangente para praticar e cruzar diferentes tempos verbais de forma integrada.
- **Páginas Dedicadas por Tempo Verbal**: Trilhas isoladas focadas em mecânicas específicas (ex: Simple Past, Past Continuous, Present Perfect) com regras teóricas e desafios práticos.
- **Domínio de Verbos Irregulares**: Um módulo especializado com listas, filtros e exercícios práticos focados exclusivamente em irregularidades.
- **Geração Dinâmica de Exercícios (Rejogabilidade)**: Sistema que carrega subconjuntos aleatórios de questões (random subsets), garantindo que cada sessão de estudo seja um novo desafio.
- **Módulos de Revisão e Exame**: Páginas focadas na compilação de unidades e exames finais de ciclo para consolidar o conhecimento (*Cycle Final Exams* e *Compiled Exercises*).
- **Feedback Visual e Validação Inteligente**: Correção em tempo real com algoritmo resiliente (case-insensitive, ignora espaços múltiplos e pontuação), mostrando ao usuário exatamente onde ele acertou ou errou.

## 🧠 Decisões técnicas tomadas
- **Arquitetura Baseada em JSON (Data Abstraction)**: O conteúdo dos exercícios está completamente abstraído em estruturas estáticas de dados (JSON/TypeScript). Essa decisão permite escalar o número de perguntas infinitamente sem adicionar complexidade ao código dos componentes React.
- **Validação Resiliente (Granular Validation)**: Implementação de um algoritmo de correção customizado flexível. Ele suporta múltiplas respostas aceitáveis por input (usando separadores lógicos), valida múltiplos espaços em branco (*gaps*) na mesma sentença, e limpa ruídos de digitação (como pontuação final e case), evitando falsos negativos frustrantes.
- **Isolamento de Estado em Exercícios**: A lógica de gerenciamento de estado das respostas e correções é feita de forma encapsulada por seção ou bloco de exercício. Os usuários podem refazer partes específicas da página ou checar respostas localmente sem afetar o estado global de outras unidades.
- **UI Premium e Acessível**: A combinação de `shadcn/ui`, `Tailwind CSS` e `Framer Motion` viabilizou um design system consistente, moderno e com micro-interações, focado não apenas em estética, mas em usabilidade e acessibilidade (WAI-ARIA).

## 📸 Prints, vídeo, deploy ou exemplos de uso
- **Deploy:** [https://verb-flowjs.vercel.app/](https://verb-flowjs.vercel.app/)

> *Screenshots da aplicação*

### Home Page
![Home Page](public/screenshots/home-page-react-jorge.png)

### Design da Interface (UI)
![Design da Interface (UI)](public/screenshots/ui-design-react-tailwind.png)

### Matriz de Exercícios
![Página de Exercícios](public/screenshots/pagina-de-exercicios-react-jorge.png)

### Domínio de Verbos Irregulares
![Página de Verbos Irregulares](public/screenshots/pagina-verbos-irregulares-react-tailwind.png)

### Exame Final
![Exame Final](public/screenshots/exame-final-react-jorge.png)

## 🔮 Próximos passos de melhoria
- **Integração com Backend/BaaS:** Conectar com Supabase ou Firebase para autenticação de usuários, permitindo salvar histórico de progresso, acertos e *analytics* de estudo.
- **Gamificação Avançada:** Implementar sistema de conquistas (badges), *streaks* (ofensivas diárias) e um *leaderboard* para incentivar o engajamento contínuo.
- **Módulos para Entrevistas Técnicas:** Criação de rotas específicas simulando cenários e diálogos comuns em processos seletivos para engenharia de software em inglês.
- **Suporte a Áudio e Pronúncia:** Integração com APIs de Text-to-Speech (TTS) e Speech-to-Text (STT) para treino de pronúncia em tempo real (listening e speaking).
