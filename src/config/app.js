import express from 'express';

const app = express();
// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
// eslint-disable-next-line no-undef
const SECRET_KEY = process.env.SECRET_KEY;

app.use(express.json());

export { app, PORT, SECRET_KEY };