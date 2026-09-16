# Gestão de Banca

App no navegador. Cada cliente futuro é uma `organization`.
No começo você é a única org no plano free do Supabase.
Quando a grade de clientes crescer, sobe o plano. O modelo não muda.

## Peças

- Telegram (`leitor-bilhete`) — print vira JSON
- Este app — importa o JSON, banca, Green/Red manual
- Supabase — dados
- Vercel — URL pública

## Subir local

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Supabase: rode `supabase/schema.sql` no SQL Editor.
Cole `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`.
