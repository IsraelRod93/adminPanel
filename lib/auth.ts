import { createHmac } from 'crypto';
import { cookies } from 'next/headers';

export function generateToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? '';
  const day = Math.floor(Date.now() / 86400000).toString();
  return createHmac('sha256', password).update(day).digest('hex');
}

export async function verifyAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get('admin_token')?.value;
  return token === generateToken();
}
