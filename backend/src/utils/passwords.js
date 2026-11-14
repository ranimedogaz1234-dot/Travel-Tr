import argon2 from 'argon2';

// Paramètres Argon2id conformes aux recommandations OWASP (m = 19 Mio, t = 2, p = 1).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const hashPassword = (plain) => argon2.hash(plain, OPTIONS);

export async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Hachage factice utilisé lorsque l'e-mail n'existe pas, pour que le temps de
// réponse ne révèle pas l'existence d'un compte.
let dummyHashPromise;
export function dummyVerify(plain) {
  dummyHashPromise ??= argon2.hash('travel-tr-dummy-password', OPTIONS);
  return dummyHashPromise.then((hash) => verifyPassword(hash, plain)).then(() => false);
}
