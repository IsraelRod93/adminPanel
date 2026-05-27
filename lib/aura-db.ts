import postgres from 'postgres';

let _sql: ReturnType<typeof postgres>;

export function getAuraDb() {
  if (!_sql) {
    const url = process.env.AURASECRET_DATABASE_URL;
    if (!url) throw new Error('AURASECRET_DATABASE_URL not set');
    _sql = postgres(url, { ssl: 'require' });
  }
  return _sql;
}
