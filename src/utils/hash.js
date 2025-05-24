import crypto from 'crypto';

export const sha256 = (message) => {
    return crypto.createHash('sha256').update(message).digest('hex');
};