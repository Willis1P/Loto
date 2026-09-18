# 📋 COMO CONFIGURAR VARIABLES NO VERCEL

## Passo 1 — Acesse o Vercel
1. Vá em [https://vercel.com](https://vercel.com) e faça login
2. Clique no projeto **lotofacil-ia**

## Passo 2 — Adicione a chave NVIDIA API
1. No menu lateral, clique em **Settings**
2. Clique em **Environment Variables**
3. Clique em **+ Add New**
4. Preencha:
   - **Key:** `NVIDIA_API_KEY`
   - **Value:** Cole sua chave da NVIDIA (ex: `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`)
5. Clique em **Save**

## Passo 3 — Faça o Redeploy
1. Volte para a aba **Deployments**
2. Clique em **...** no deploy mais recente
3. Clique em **Redeploy**
4. Aguarde o build terminar (~1-2 minutos)

## Passo 4 — Teste
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
