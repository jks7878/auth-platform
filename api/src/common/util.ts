import { createHash } from 'crypto';

export function createSha256Hash(text: string) {
    return createHash('sha256').update(text).digest('hex');
}
