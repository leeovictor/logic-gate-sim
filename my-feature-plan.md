# Implementation Plan: Painel Lateral de Detalhes do Componente Selecionado

Adicionar um painel lateral à esquerda que exibe detalhes do componente selecionado. O painel aparece apenas quando exatamente um componente está selecionado, mostra tipo e pinos (sem edição), segue o estilo visual do toolbar, e é modular conforme a arquitetura do projeto.

## Architecture and design

- O painel será implementado como um módulo independente em `src/ui/`, sem dependências circulares.
- O painel será um elemento HTML fixo à esquerda, exibido/ocultado conforme o estado de seleção.
- O painel observará o estado de seleção do editor, reagindo a mudanças (seleção/desseleção).
- O conteúdo exibirá o tipo do componente e a lista de pinos, sem permitir edição.
- O estilo será consistente com o toolbar, reutilizando classes CSS e variáveis já existentes.
- Não haverá lógica de persistência ou alteração de estado além da leitura da seleção.

## Tasks

- [ ] Identificar onde e como ocorre a seleção de componentes (funções, estado, eventos).
- [ ] Definir interface de dados necessária para o painel (tipo e pinos do componente).
- [ ] Criar novo módulo `src/ui/sidebar-panel.ts` para o painel lateral.
- [ ] Implementar criação e montagem dinâmica do painel no DOM.
- [ ] Integrar painel ao ciclo de renderização/eventos para reagir à seleção/desseleção.
- [ ] Buscar dados do componente selecionado via estado/editor-state.
- [ ] Exibir tipo e pinos do componente selecionado no painel.
- [ ] Aplicar estilos visuais consistentes com o toolbar (reutilizar CSS ou criar variantes).
- [ ] Garantir que o painel só aparece quando exatamente um componente está selecionado.
- [ ] Esconder painel em qualquer outro caso (nenhum ou múltiplos selecionados).
- [ ] Adicionar testes de comportamento (unitários e/ou manuais) para seleção, exibição e ocultação do painel.
- [ ] Atualizar documentação se necessário.

## Open questions

1. O painel deve ser responsivo/adaptável em telas pequenas ou apenas ocultar-se?
2. Há necessidade de animação/transição ao mostrar/ocultar o painel?
3. O painel deve exibir informações adicionais além de tipo e pinos (ex: ID, posição)?
