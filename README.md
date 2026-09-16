# Toolbench — ferramentas de UGC

Site estático, sem build, sem dependência. Todas as ferramentas rodam inteiras
no navegador: nenhuma imagem ou arquivo sai do computador.

## Estrutura

```
index.html                 home — índice das ferramentas
assets/ui.css              tokens de cor/tipo, shell e primitivas de UI
assets/shell.js            topbar, navegação, toast e utilitários compartilhados
tools/comentarios.html     gerador de comentários (Instagram / TikTok)
tools/textbox.html         gerador de text box (legenda por linha)
tools/luma-grade.html      referência vira LUT .cube
tools/safe-zones.html      conferência de áreas seguras
```

## Deploy

Sobe a pasta inteira em qualquer host estático (Cloudflare Pages, Vercel,
Netlify, GitHub Pages). Não tem passo de build nem variável de ambiente.
Abrir `index.html` direto do disco também funciona.

## Adicionar uma ferramenta nova

A lista de ferramentas mora em um lugar só: o array `TOOLS` no topo de
`assets/shell.js`. Acrescentar uma entrada lá já coloca o item na navegação de
todas as páginas e no grid da home. Depois é só criar o arquivo em `tools/`
seguindo o molde de qualquer um dos existentes:

```html
<body data-tool="ID-DA-FERRAMENTA">
<div id="topbar"></div>
<script src="../assets/shell.js"></script>
```

O `data-tool` é o que marca o item ativo na navegação.

---

# Auditoria do código

## Por que multi-página e não um arquivo só

Juntar as três ferramentas num único HTML quebraria em silêncio. Elas colidem em:

- **IDs**: `radius`, `text`, `reset`, `download`, `scale`, `pad`, `width` existem
  em mais de uma ferramenta. `getElementById` pega o primeiro do documento — o
  slider de uma ferramenta passaria a controlar a outra.
- **Classes CSS**: `.panel`, `.btn`, `.stage`, `.hint`, `.seg`, `.chip`, `.dot`,
  `.range`, `.toast` estão definidas com valores diferentes em cada arquivo.
- **Listeners globais**: o gerador de comentários e o Luma Grade registram os
  dois `window.addEventListener('paste')`. Num documento só, colar uma imagem
  dispararia os dois ao mesmo tempo.

Cada ferramenta numa página resolve tudo isso sem gambiarra de namespace, e
ainda faz cada página carregar só o que ela usa.

## Correções aplicadas

### Luma Grade

- **Preview travando (a correção mais relevante).** O preview era limitado por
  largura (`maxW=960`). Num frame 9:16 isso virava 960×1706 — 1,6 milhão de
  pixels. Medi o custo por quadro: aplicar a LUT nessa imagem levava **87 ms**,
  contra 39 ms para construir a LUT. Ou seja, o gargalo não era a matemática da
  cor, era o tamanho do preview. Passou a ser limitado por **área**
  (620 mil pixels), o que mantém o custo estável em qualquer proporção.
- **Preview em resolução reduzida: testado e descartado.** Cheguei a gerar a LUT
  do preview em 17³ em vez de 33³ (8,5x mais rápido). Comparei as duas contra
  15 mil amostras: erro médio baixo, mas **pico de 22 níveis de 255**, e não só
  em cores saturadas — 23% das amostras passavam de 2 níveis. Numa ferramenta de
  cor isso é o preview mentindo para você, então mantive 33³ em tudo.
- **Vazamento de memória.** Cada troca de imagem criava um `URL.createObjectURL`
  e nunca revogava o anterior. Agora o URL antigo é revogado na troca.
- **Divisória antes/depois** voltava para o meio sempre que a janela era
  redimensionada. Agora a posição escolhida é mantida.
- **Arquivo não-imagem** arrastado para o campo falhava sem avisar. Agora avisa.
- **Novo: "Baixar frame tratado"** — exporta o frame com o look aplicado, na
  resolução original (não na reduzida do preview).

### Gerador de comentários

- **Cursor pulando.** `syncPanel()` reescrevia o `value` de campos que podiam
  estar em foco durante a digitação. Agora o campo em foco nunca é reescrito.
- **Ações na tabela em lote** (gerar avatar, remover foto, duplicar) mexiam numa
  linha mas deixavam o preview em outra. Agora a linha clicada vira a ativa.
- **Nomes repetidos no .zip** viravam `arquivo-b.png`, depois `arquivo-b-b.png`.
  Agora numera: `-2`, `-3`.
- **Novo: preferências lembradas.** Plataforma, tema, idioma, largura, margem,
  escala de exportação e afins ficam salvos entre sessões. Conteúdo (textos,
  linhas, avatares) nunca é salvo. "Restaurar padrão" limpa o que foi guardado.

### Gerador de text box

- **Emenda entre as caixas.** Cada caixa era pintada com um `fill()` próprio;
  mesmo encostando no mesmo pixel, cada uma fazia o antialiasing dela contra o
  fundo e sobrava uma linha fina. Agora todas entram num path só, com um `fill()`
  único.
- **Largura da caixa com espaçamento entre letras.** `measureText` da string
  inteira não bate com a soma dos caracteres (kerning e ligaduras), e o texto é
  desenhado caractere a caractere quando há tracking. A medição passou a somar
  do mesmo jeito que o desenho, senão a caixa ficava mais estreita que o texto.
- **Novo**: espaçamento entre letras, maiúsculas, sombra, atalhos de estilo,
  arrastar o bloco direto no preview, copiar imagem, e preferências lembradas.

### Compartilhado

- **`URL.revokeObjectURL` em todo download** — antes ficava um objeto pendurado
  na memória por arquivo exportado.
- **`localStorage` sempre dentro de `try/catch`** — em aba anônima ou com o
  armazenamento cheio ele lança exceção, e isso derrubaria a ferramenta inteira.
- **Fontes por `<link>` em vez de `@import` dentro do `<style>`** — o `@import`
  bloqueia o resto do CSS enquanto baixa.

## O que ficou de fora e por quê

- **Minificação e bundle.** São 160 KB no total, sem dependência externa. Um
  passo de build entregaria pouco e custaria manutenção.
- **Service worker para uso offline.** As páginas já funcionam offline depois de
  carregadas uma vez pelo cache do navegador. Um service worker resolveria o
  primeiro carregamento, mas traz invalidação de cache junto — vale a pena só se
  isso virar um incômodo real.

## Uma ressalva sobre as áreas seguras

As faixas de interface do TikTok, Reels e Shorts são **aproximações** medidas
sobre capturas de tela em aparelho alto (~19,5:9). Cada app muda a interface com
frequência e o recorte varia com o tamanho da tela. Use como guia de trabalho e
confirme no celular antes de subir. Os números estão no objeto `PLATFORMS`, no
topo do script de `tools/safe-zones.html`, fáceis de ajustar quando você medir
no seu aparelho.
