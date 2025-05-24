import dotenv from 'dotenv';

dotenv.config();

const config = {
    // eslint-disable-next-line no-undef
    PORT: process.env.PORT || 3000,
    // eslint-disable-next-line no-undef
    SECRET_KEY: process.env.SECRET_KEY
};

if (!config.SECRET_KEY) {
    console.warn('Warning: SECRET_KEY is not set in environment variables');
}

export default config;