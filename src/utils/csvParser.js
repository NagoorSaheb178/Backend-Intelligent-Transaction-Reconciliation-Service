import { parse } from 'csv-parse';
import { createReadStream } from 'fs';
import { resolve } from 'path';
import logger from '../config/logger.js';

/**
 * Parse a CSV file row-by-row using csv-parse streams.
 * Returns an array of { record, raw, rowIndex, parseError } objects.
 * Invalid/unparseable rows are captured rather than thrown.
 *
 * @param {string} filePath - Absolute or relative path to the CSV file
 * @returns {Promise<Array<{ record: object|null, raw: string, rowIndex: number, parseError: string|null }>>}
 */
export const parseCSV = (filePath) => {
  return new Promise((resolve_promise, reject) => {
    const absolutePath = resolve(filePath);
    const rows = [];
    let rowIndex = 0;

    const parser = parse({
      columns: true,             // Use first row as headers
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,  // Don't throw on rows with differing column counts
      relax_quotes: true,
      cast: false,               // Keep everything as string for our own normalization
      on_record: (record, { lines }) => {
        rowIndex = lines;
        return record;
      },
    });

    const stream = createReadStream(absolutePath);

    stream.on('error', (err) => {
      logger.error({ err, filePath }, 'Failed to open CSV file');
      reject(new Error(`Cannot open file: ${filePath}. ${err.message}`));
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        rows.push({ record, raw: JSON.stringify(record), rowIndex: rows.length + 2, parseError: null });
      }
    });

    parser.on('error', (err) => {
      // Don't abort the whole file — log and continue
      logger.warn({ err, rowIndex }, 'CSV parse error on row');
      rows.push({ record: null, raw: '', rowIndex, parseError: err.message });
    });

    parser.on('end', () => {
      logger.info({ filePath, rowCount: rows.length }, 'CSV parsing complete');
      resolve_promise(rows);
    });

    stream.pipe(parser);
  });
};
