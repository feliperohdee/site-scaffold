# Brief para o artigo: por que construímos nossa própria engine

> Documento de apoio (não-técnico) para o agente que vai reescrever o artigo.
> Tema central: por que largamos as ferramentas prontas e fizemos nossa própria
> base para construir sites — leve, rápida na borda, entregue em streaming,
> otimizada para SEO desde o primeiro dia, e que publica sem ficar esperando build.

---

## O contexto (a origem da história)

Criamos nossa própria base para construir sites porque as ferramentas populares
(como o Next.js) ficaram pesadas e complicadas demais para o que a gente
realmente precisava: **entregar páginas rápidas, leves e bem ranqueadas no
Google — com uma renderização de React simples no servidor**, sem carregar uma
montanha de complexidade junto.

Em vez de aceitar o excesso e lutar contra a ferramenta, paramos e fizemos algo
enxuto, sob medida. O resultado é uma base que entendemos por inteiro e que faz
exatamente o que precisamos — nem mais, nem menos.

> **O ângulo central do artigo:**
> "As ferramentas viraram pesadas e complicadas demais para uma coisa simples:
> entregar páginas rápidas e bem ranqueadas. Então paramos de lutar contra elas
> e construímos nossa própria base — leve, rápida na borda, entregue em
> streaming, otimizada para SEO desde o primeiro dia, e que publica no ar sem
> ficar esperando build."

---

## Os pilares da história

### 1. Leveza acima de tudo
As ferramentas atuais entregam ao visitante muito mais do que ele precisa —
camadas e camadas de coisa rodando no navegador só para mostrar uma página. A
gente virou isso: o trabalho pesado fica no servidor, e o visitante recebe só o
essencial. O resultado é uma página que abre instantânea, leve, sem peso
desnecessário.

### 2. Entrega em streaming (a página chega em tempo real)
Em vez de o servidor montar a página inteira e só então mandar tudo de uma vez,
a página é **enviada ao navegador em pedaços, conforme vai ficando pronta**. O
visitante começa a ver o conteúdo quase imediatamente, sem aquela tela em branco
esperando "tudo carregar". É a diferença entre receber o prato assim que a
primeira parte está pronta e esperar a cozinha terminar o pedido inteiro para só
então servir.

### 3. Feito para o SEO, não com SEO "remendado" depois
Aparecer no Google não é um plugin que você instala no fim — está no alicerce.
Cada página já nasce com tudo que os buscadores precisam para entender e
ranquear o conteúdo, e o site sabe produzir muitas páginas (uma por tema,
cidade, produto, etc.) automaticamente, mantendo a qualidade. SEO deixa de ser
uma dor de cabeça e vira algo que simplesmente acontece.

### 4. Entrega na borda (edge), perto de quem acessa
Em vez de tudo sair de um único servidor num canto do mundo, as páginas são
servidas a partir de uma rede global, do ponto mais próximo de cada visitante.
Quem acessa de Lisboa, São Paulo ou Tóquio tem a mesma sensação de velocidade.
Rápido em todo lugar, sem servidor para administrar.

### 5. Deploy sem espera — chega de ficar parado esperando build
Um dos maiores ganhos do dia a dia. Nas ferramentas tradicionais, publicar um
site grande significa "montar" cada página, uma por uma, antes de colocar no ar
— e esperar minutos (às vezes muito mais) a cada publicação. Na nossa base não
existe esse ritual: você publica na hora, e **cada página se monta sozinha na
primeira visita e já fica pronta (guardada) para as próximas**. Um site com
milhares de páginas sobe tão rápido quanto um de cinco. Você edita, publica,
está no ar — e itera sem fricção.

### 6. Controle e simplicidade
Como é a nossa própria base, a gente entende cada pedaço dela. Nada de
caixa-preta, nada de "mágica" que ninguém sabe explicar quando dá problema. É
simples de entender, simples de manter, e faz exatamente o que precisamos.

---

## Estratégia de conteúdo: artigos que são só arquivos numa pasta

A gente eliminou o CMS. Não tem painel de administração, não tem banco de dados
de conteúdo, não tem login para "criar um post". Escrever um artigo é
literalmente **jogar um arquivo de texto numa pasta** — e ele já está publicado.

**Como funciona na prática:**
- Você escreve o artigo em markdown (o mesmo formato simples usado para escrever
  no GitHub, no Notion, em qualquer lugar — títulos, listas, links, negrito,
  tudo em texto puro).
- No topo do arquivo você coloca o básico: título, data, um resumo opcional,
  algumas tags.
- Salva o arquivo na pasta de artigos. Pronto. Ele aparece na lista de artigos e
  ganha sua própria página, com o endereço derivado do nome do arquivo.

**Por que isso é uma vantagem (e não uma limitação):**
- **Sem ferramenta no meio do caminho** — o conteúdo vive junto com o código,
  versionado, com histórico. Nada de "perdi o acesso ao painel" ou "o CMS caiu".
- **Escrever é só escrever** — qualquer editor de texto serve. Sem aprender uma
  interface, sem campos obrigatórios, sem fricção entre a ideia e a publicação.
- **Zero custo e zero manutenção** — não há um CMS para pagar, atualizar ou
  proteger. Menos peças, menos coisa para quebrar.
- **Rápido por natureza** — como as páginas já saem prontas, leves e em
  streaming, os artigos herdam a mesma velocidade e o mesmo SEO embutido.

> O ângulo: "publicar conteúdo deveria ser tão simples quanto escrever um arquivo
> de texto e salvá-lo. Cortamos todo o resto."

---

## Estratégia de pSEO (SEO programático)

pSEO é a estratégia de criar **muitas páginas a partir de um único molde + um
conjunto de dados**, onde cada página mira uma busca específica do Google. É o
que faz sites como o Zapier ("conecte App A com App B"), o TripAdvisor ("o que
fazer em [cidade]") ou o G2 ("alternativas ao [produto]") terem dezenas de
milhares de páginas, cada uma capturando um termo de busca diferente.

**A ideia central:** em vez de escrever 5.000 páginas à mão, você desenha **um
molde uma vez** e conecta seus dados (sua lista de cidades, produtos,
comparações, o que for). O sistema gera todas as páginas sozinho — cada uma com
seu próprio endereço, seu título único e tudo que o Google precisa para
entendê-la.

**O que a gente automatizou (e que normalmente daria um trabalho enorme):**
- **Uma página por item, mais uma página-índice** que conecta todas elas —
  porque página solta que ninguém linka não ranqueia. As páginas se "dão as mãos"
  entre si automaticamente.
- **Título e descrição únicos por página** — repetir o mesmo título em 50
  páginas é sinal de conteúdo raso para o Google. Cada página recebe o seu,
  montado a partir dos dados.
- **Entrada automática no mapa do site** (a lista que os buscadores leem para
  descobrir as páginas), inclusive quando passa de dezenas de milhares de URLs.
- **Dados estruturados** que deixam a página elegível para os resultados "ricos"
  do Google (estrelas de avaliação, preços, etc.).

**O diferencial mais importante — o "portão de qualidade":**
O maior risco do pSEO hoje é o Google penalizar páginas "fininhas", sem conteúdo
suficiente. A gente embutiu um **controle de qualidade**: uma página que ainda
não tem dados o bastante (poucas avaliações, sem descrição) fica automaticamente
**escondida dos buscadores** — ela continua existindo e funcionando, só não
entra no índice do Google. Quando os dados crescem, ela volta a ser indexável
sozinha. Isso evita o erro clássico que derruba sites de pSEO inteiros.

> O ângulo: "SEO programático costuma ser uma faca de dois gumes — ou você escala
> e enche o site de páginas vazias que o Google pune, ou faz tudo à mão e não
> escala. A gente resolveu os dois lados: gera milhares de páginas a partir de um
> molde, mas com um portão de qualidade que mantém o lixo fora do índice."

---

## Resumo dos pontos que o artigo NÃO pode esquecer

1. **Por que** — Next.js (e cia.) pesado/complexo demais para uma renderização de
   React simples no servidor.
2. **Leveza** — o trabalho fica no servidor; o visitante recebe só o essencial.
3. **Streaming** — a página chega em pedaços, em tempo real; nada de tela branca.
4. **SEO de alicerce** — embutido desde o primeiro dia, não remendado depois.
5. **Edge** — servido da borda global, rápido perto de cada visitante.
6. **Deploy sem espera** — publica na hora; páginas se montam sob demanda e ficam
   guardadas; site grande sobe tão rápido quanto um pequeno.
7. **Controle/simplicidade** — base própria, sem caixa-preta.
8. **Artigos = markdown numa pasta** — sem CMS, sem banco, sem painel.
9. **pSEO** — um molde + dados → milhares de páginas, com portão de qualidade
   contra páginas fininhas.
