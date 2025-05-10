import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hash(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function compareHash(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}
