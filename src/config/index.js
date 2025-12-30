import dotenv from 'dotenv';

dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  API_SECRET: process.env.API_SECRET || 'your_shared_secret_here',
  DATABASE_URL: process.env.DATABASE_URL
};

export default config;
