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

  // Only process if Content-Encoding is deflate (case-insensitive)
  if (!contentEncoding || contentEncoding.toLowerCase() !== 'deflate') {
    console.log('[Deflate Debug] Not a deflate request, skipping decompression');
    return next();
  }

  console.log('[Deflate Debug] Processing deflate-compressed request');

  // Collect compressed data
  const chunks = [];

  req.on('data', (chunk) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      if (chunks.length === 0) {
        console.log('[Deflate Debug] Error: Empty compressed payload');
        return next(new ValidationError('Empty compressed payload'));
      }

      const compressed = Buffer.concat(chunks);
      console.log('[Deflate Debug] Compressed buffer created:', {
        bufferSize: compressed.length
      });

      // Decompress using zlib
      const decompressed = zlib.inflateSync(compressed);
      console.log('[Deflate Debug] Decompression successful:', {
        originalSize: compressed.length,
        decompressedSize: decompressed.length,
        compressionRatio: ((compressed.length / decompressed.length) * 100).toFixed(2) + '%'
      });

      // Parse JSON from decompressed data
      const jsonString = decompressed.toString('utf-8');
      console.log('[Deflate Debug] Decompressed JSON string:', {
        jsonLength: jsonString.length,
        jsonPreview: jsonString.substring(0, 100) + '...'
      });

      req.body = JSON.parse(jsonString);
      console.log('[Deflate Debug] JSON parsed successfully:', {
        bodyKeys: Object.keys(req.body),
        bodyPreview: JSON.stringify(req.body).substring(0, 100) + '...'
      });

      // Remove Content-Encoding header since we've decompressed
      delete req.headers['content-encoding'];

      // Mark body as already parsed to prevent express.json() from parsing again
      req._body = true;

      console.log('[Deflate Debug] Deflate decompression completed successfully');
      next();
    } catch (error) {
      console.error('[Deflate Debug] Error during decompression:', {
        error: error.message,
        errorCode: error.code,
        errorType: error.constructor.name,
        stack: error.stack
      });

      if (error instanceof SyntaxError) {
        return next(new ValidationError(`Invalid JSON in compressed payload: ${error.message}`));
      }
      if (error.code === 'Z_DATA_ERROR' || error.code === 'Z_BUF_ERROR') {
        return next(new ValidationError(`Failed to decompress request body: ${error.message}`));
      }
      return next(
        new ValidationError(`Error processing compressed request body: ${error.message}`)
      );
    }
  });

  req.on('error', (err) => {
    console.error('[Deflate Debug] Error reading request body:', {
      error: err.message,
      errorCode: err.code
    });
    next(new ValidationError(`Error reading request body: ${err.message}`));
  });
};

export default deflateDecompression;
