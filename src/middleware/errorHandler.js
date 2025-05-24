// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
};