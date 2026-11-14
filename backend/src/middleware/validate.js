import { badRequest } from '../utils/http-error.js';

/**
 * Valide req[source] avec un schéma Zod et place le résultat dans req.valid[source].
 * Les erreurs sont renvoyées champ par champ, en français.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        fields[key] ??= issue.message;
      }
      return next(badRequest('Certaines informations sont invalides.', fields));
    }
    req.valid ??= {};
    req.valid[source] = result.data;
    next();
  };
}
