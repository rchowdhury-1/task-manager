import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Hash of an unguessable random value; compared against on login when the
// email doesn't exist so missing and present accounts take the same time
// (prevents a timing oracle for user enumeration).
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer-not-a-real-password", SALT_ROUNDS);

export async function burnPasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
