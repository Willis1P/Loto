# 📋 COMO CONFIGURAR VARIABLES NO VERCEL

## Parte A — IA (NVIDIA_API_KEY, opcional)
### Passo 1 — Acesse o Vercel
1. Vá em [https://vercel.com](https://vercel.com) e faça login
2. Clique no projeto **lotofacil-ia** (ou o nome do seu projeto)

### Passo 2 — Adicione a chave NVIDIA API
1. No menu lateral, clique em **Settings**
2. Clique em **Environment Variables**
3. Clique em **+ Add New**
4. Preencha:
   - **Key:** `NVIDIA_API_KEY`
   - **Value:** Cole sua chave da NVIDIA (ex: `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`)
5. Clique em **Save**

## Parte B — Sync automática entre aparelhos (Upstash Redis)
Sem isso, a sync automática mostra “não configurado” — o link/arquivo continua funcionando.

### Passo 1 — Criar o banco Redis (grátis)
1. No Vercel, vá em **Storage** (menu superior) → **Create Database** → **Upstash Redis** (ou acesse [https://console.upstash.com](https://console.upstash.com) e crie um Redis grátis)
2. Conecte ao seu projeto (o Vercel adiciona as variáveis sozinho) **ou** copie manualmente:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Passo 2 — Adicionar manualmente (se não conectou automático)
1. Projeto → **Settings** → **Environment Variables** → **+ Add New**
2. Adicione as duas:
   - **Key:** `UPSTASH_REDIS_REST_URL` → **Value:** a URL REST do seu Redis
   - **Key:** `UPSTASH_REDIS_REST_TOKEN` → **Value:** o token
3. **Save**

### Passo 3 — Redeploy (obrigatório após mexer em variáveis)
1. Volte para a aba **Deployments**
2. Clique em **...** no deploy mais recente
3. Clique em **Redeploy**
4. Aguarde o build terminar (~1-2 minutos)

### Passo 4 — Usar no app
1. No celular, abra o painel **🔄 Sincronizar**, crie um código (ex: `LOTO123`) e clique **Ativar**
2. No outro navegador, informe o **MESMO código** e clique **Ativar** — ele puxa tudo sozinho
3. Daí em diante: alterou de um lado, ao abrir (ou voltar à aba) do outro lado aparece atualizado

## Passo 3 — Teste (IA)
1. Acesse a URL do projeto
2. Selecione uma foto ou PDF de um volante
3. Clique em **"Analisar e lançar apostas"**
4. A IA vai extrair os números automaticamente

## Se a IA não funcionar (erro 404):
Verifique se o `api/nvidia.js` está na pasta `api/` do projeto.
O endpoint `/api/nvidia` deve ser acessível.

---

## 🔧 Extração Manual (sempre funciona)
Se a IA não funcionar, use a extração manual:
1. Cole os números em um por linha: `01 03 04 05 07 09 12 14 15 18 20 21 23 24 25`
2. Clique em **"Usar números manuais"**
