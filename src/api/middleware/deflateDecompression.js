import zlib from 'zlib';
import { ValidationError } from '../utils/errorHandler.js';

/**
 * Middleware to decompress deflate-compressed request bodies
 * Handles Content-Encoding: deflate header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const deflateDecompression = (req, res, next) => {
  const contentEncoding = req.headers['content-encoding'];

  // Only process if Content-Encoding is deflate
  if (contentEncoding !== 'deflate') {
    return next();
  }

  // Collect compressed data
  const chunks = [];

  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      const compressed = Buffer.concat(chunks);

      // Decompress using zlib
      const decompressed = zlib.inflateSync(compressed);

      // Parse JSON from decompressed data
      const jsonString = decompressed.toString('utf-8');
      req.body = JSON.parse(jsonString);

      // Remove Content-Encoding header since we've decompressed
      delete req.headers['content-encoding'];

      // Mark body as already parsed to prevent express.json() from parsing again
      req._body = true;

      next();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return next(new ValidationError('Invalid JSON in compressed payload'));
      }
      if (error.code === 'Z_DATA_ERROR' || error.code === 'Z_BUF_ERROR') {
        return next(new ValidationError('Failed to decompress request body'));
      }
      return next(new ValidationError('Error processing compressed request body'));
    }
  });

  req.on('error', () => {
    next(new ValidationError('Error reading request body'));
  });
};

export default deflateDecompression;
