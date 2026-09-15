# Lotofácil Independência 2026 — Conferidor Inteligente

App PWA de alta performance para conferência de apostas da Lotofácil (Concurso 3780).

## 📁 Estrutura de Arquivos

```
lotofacil-app/
├── index.html    — Aplicação completa (HTML + CSS + JS)
├── manifest.json — Configurações PWA (ícones, tema, etc.)
├── sw.js         — Service Worker (cache-first, offline)
└── README.md     — Este arquivo
```

## 🚀 Como Hospedar (Grátis)

### Opção A — Netlify Drop (Recomendado)
1. Acesse [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Arraste a pasta `lotofacil-app/`
3. Copie o link gerado
4. Acesse no celular → instalar na tela inicial

### Opção B — Vercel
1. Acesse [https://vercel.com](https://vercel.com)
2. Importe a pasta como projeto
3. Deploy automático

### Opção C — GitHub Pages
1. Crie um repositório no GitHub
2. Faça upload dos arquivos
3. Ative GitHub Pages nas configurações

### Opção D — Servidor Local (PC)
```bash
cd lotofacil-app
python -m http.server 8000
```
Acesse `http://localhost:8000` no navegador.

## 📱 Instalação como App

**Android (Chrome/Edge):**
1. Acesse o link no celular
2. Toque em "Instalar" no menu do navegador
3. O app aparece na tela inicial como ícone

**iPhone (Safari):**
1. Abra no Safari
2. Toque no botão Compartilhar
3. "Adicionar à Tela de Início"

## 📦 Empacotar como APK (Android)

1. Hospede o app (Opção A, B ou C)
2. Acesse [https://www.pwabuilder.com](https://www.pwabuilder.com)
3. Cole o URL do seu app
4. Clique em "Package for stores" → Android
5. Baixe o .apk (teste) ou .aab (Play Store)

## ✨ Funcionalidades

- **149+ jogos** com conferencia de dezenas
- **Bolões suportados** (16 a 25 dezenas)
- **Cálculo combinatório** preciso (C(n,k))
- **Virtualização** de lista (IntersectionObserver)
- **100% offline** via Service Worker
- **Instalação PWA** na tela inicial
- **Busca/filtro** em tempo real
- **Export** JSON e CSV (removido)
- **Confetti animation** ao acertar 15 pontos
- **Haptic feedback** em mobile
- **Web Share API** para compartilhar resultados
- **Busca/filtro** em tempo real
- **Design responsivo** mobile-first

## 🎨 Tecnologias

- HTML5, CSS3 (Grid, Flexbox, Custom Properties)
- JavaScript ES6+ (zero dependências)
- PWA (Service Worker, Web App Manifest)
- IntersectionObserver, requestAnimationFrame
- Canvas API (confetti animation)

## ⚠️ Aviso

Os valores de 14 e 15 pontos são estimativas. O rateio oficial só é divulgado pela Caixa após o sorteio. Os valores de 11, 12 e 13 pontos são fixos por regra da Lotofácil.

## 🔒 Privacidade

Este app não coleta nenhum dado pessoal. Todo o processamento ocorre localmente no dispositivo.
