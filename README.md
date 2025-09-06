# Gerador de Sinais Cripto

Projeto Vite + React + TypeScript em `project/`.

## Desenvolvimento

- Instalar dependências:
	- entre em `project/` e rode `npm ci`
- Rodar dev server:
	- `npm run dev`
- Build de produção:
	- `npm run build`

## Deploy no GitHub Pages

Este repositório já possui um workflow no GitHub Actions que:

- Faz o build em `project/`
- Publica o conteúdo de `project/dist` no GitHub Pages

Como habilitar:

1. Vá em Settings > Pages e selecione Source: GitHub Actions
2. Após um push na `main`, o site ficará disponível em:
	 - `https://<seu-usuario>.github.io/geradorbom/`

Notas:

- `project/vite.config.ts` define `base: '/geradorbom/'` para apontar assets corretamente no Pages.
- `project/public/_redirects` adiciona fallback para SPA.