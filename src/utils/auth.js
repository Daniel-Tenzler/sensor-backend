import crypto from 'crypto';

export const hashSecret = (secret) => {
    return crypto.createHash('sha256').update(secret).digest('hex');
};

export const verifySecret = (userSecret, expectedSecret) => {
    return userSecret === expectedSecret;
};