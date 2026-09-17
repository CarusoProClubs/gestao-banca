# Gestão de Banca

App no navegador. Cada cliente é uma `organization`.

## Fluxo da semana

- Domingo o admin analisa os eventos, monta a tabela em `/alavancagem/semana` e publica.
- A faixa (3–5x / 6–9x / 10–15x) sai da **quantidade de eventos ativos**, não da escolha do cliente.
- O cliente em `/alavancagem` só informa o valor que quer investir naquela faixa.
- Alteração no meio da semana gera aviso nativo no sino do app. Sem cadastro extra e sem Telegram para o cliente.

## SQL extra

No Supabase SQL Editor, rode também `supabase/semana.sql` (depois de `schema.sql` e `boletim.sql`).
O perfil que publica precisa ter `profiles.role = 'admin'`.

## Subir local

```bash
npm install
cp .env.example .env.local
npm run dev
```
