-- JurosForge — Cloudflare D1 schema
-- Aplicar com:  npm run db:schema        (remoto)
--               npm run db:schema:local  (dev local)

-- Cenários compartilhados: um código curto guarda o par A/B completo.
CREATE TABLE IF NOT EXISTS shares (
  code        TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,   -- JSON: { v, a, b, comparar }
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shares_created ON shares (created_at);
