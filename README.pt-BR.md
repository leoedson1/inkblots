<p align="center">
  <img src="ink-node-editor/assets/icon.png" width="100" alt="Logo do Inkblots">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">简体中文</a> · <strong>Português (Brasil)</strong>
</p>

# Inkblots

Inkblots é um editor visual para desktop de roteiros de ficção interativa em [Ink](https://www.inklestudios.com/ink/). Ele transforma knots e stitches em cartões, diverts em conexões e escolhas em linhas estruturadas, mantendo o texto `.ink` comum como a fonte oficial do conteúdo.

> Inkblots é um projeto independente e não tem afiliação com a Inkle.

[Baixe a versão mais recente para Windows](https://github.com/leoedson1/inkblots/releases/latest)

## Prefácio

Quero deixar bem claro de cara que **este projeto foi vibecodado que só a porra**, porque eu só queria uma ferramenta assim para me ajudar a escrever meus cenários e **eu não sei porra nenhuma de JavaScript**. Do jeito que está agora, o Inkblots funciona bem o bastante para meus objetivos pessoais, mas quero continuar refinando os recursos até que muita gente possa aproveitar o programa. Por isso, **seu feedback é muitíssimo apreciado**.

#### Feedback que NÃO é muitíssimo apreciado

- Esse logo tá uma merda (eu sei, fiz ele rapidinho; talvez eu melhore depois).
- Tem um ícone de “+” desalinhado em um dos nós (eu já vi, tá me agoniando).
- Tá uma marmota essas gracinha nesse texto (https://thedecisionlab.com/biases/the-sunk-cost-fallacy).

Tirando isso, o Inkblots funciona bem o bastante para alguém como eu, que ainda está aprendendo Ink, então talvez também funcione para você! Conforme eu for me familiarizando mais com a linguagem, talvez eu possa refinar mais a integração dos nós com a lógica da linguagem de script, e tornar o uso mais intuitivo sem perder a coerência. Nessa seara, eu realmente gostaria de ficar sabendo da sua experiência com o programa, ja que talvez dê uma acelerada nesse processo.

## Destaques

- Organize knots e stitches em uma tela infinita com conexões arrastáveis.
- Edite a prosa da história e o texto das escolhas diretamente nos nós ou use o inspetor com destaque de Ink.
- Veja escolhas aninhadas, gathers, respostas de ramificação, condições e efeitos de variáveis no devido contexto.
- Organize histórias grandes com zonas de ajuste automático, notas adesivas, busca e minimapa.
- Gerencie variáveis globais, constantes e listas pelo inspetor.
- Compile e jogue histórias com `inkjs`, inclusive testando um knot selecionado com um estado novo.
- Abra vários arquivos `.ink` em abas e reabra arquivos recentes do disco.
- Use a interface em inglês, japonês, chinês simplificado ou português brasileiro. (Se as traduções em japonês e chinês parecerem estranhas, fique a vontade pra me sugerir correções. Quanto ao PT-BR, **eu estou ciente**.)

## Compatibilidade com Ink

O Inkblots lê e grava arquivos `.ink` comuns. As posições e a organização da tela são armazenadas em comentários Ink removíveis, então a história continua compatível com Inky, inklecate, integrações com Unity e outros ambientes de execução de Ink.

```ink
// --- Inkblots layout (safe to delete) ---
// @layout {"forest":[410,80],"cottage":[740,260]}
```

Excluir os metadados do Inkblots apenas redefine o layout visual; isso não remove o conteúdo da história.

## Instalação

Baixe o instalador para Windows na [versão mais recente](https://github.com/leoedson1/inkblots/releases/latest).

O empacotamento para macOS e Linux está configurado, mas este repositório atualmente publica apenas a versão testada para Windows.

## Executar a partir do código-fonte

O Inkblots requer uma versão atual do Node.js.

```powershell
cd ink-node-editor
npm install
npm start
```

Para criar um instalador para a plataforma atual, execute:

```powershell
npm run dist
```

## Desenvolvimento

O aplicativo Electron fica em [`ink-node-editor`](ink-node-editor). Alguns comandos úteis de verificação são:

```powershell
cd ink-node-editor
npm test
npm run test:design
npm run test:choices
npm run test:canvas
npm run test:languages
```

Consulte a [documentação detalhada do editor e da arquitetura](ink-node-editor/README.md) e o [histórico de versões](CHANGELOG.md) para saber mais.

## Estado do projeto

O Inkblots está em desenvolvimento ativo. Faça backup de histórias importantes e mantenha os arquivos `.ink` originais sob controle de versão, principalmente ao testar versões novas.
