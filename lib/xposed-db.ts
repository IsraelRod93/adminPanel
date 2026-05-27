import { neon } from '@neondatabase/serverless';

let _sql: ReturnType<typeof neon> | null = null;

export function getXposedDb() {
  if (!_sql) {
    const url = process.env.XPOSED_DATABASE_URL;
    if (!url) throw new Error('XPOSED_DATABASE_URL not set');
    _sql = neon(url);
  }
  return _sql;
}
