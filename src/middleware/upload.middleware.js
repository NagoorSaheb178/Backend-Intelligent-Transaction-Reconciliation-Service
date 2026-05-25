import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration – keep original filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

// File filter – only allow CSV files
const csvFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (ext === '.csv' && (mime === 'text/csv' || mime === 'application/vnd.ms-excel')) {
    cb(null, true);
  } else {
    cb(new Error('Only .csv files are allowed'), false);
  }
};

/**
 * Multer upload middleware for reconciliation endpoint.
 * Expects two fields: userFile and exchangeFile (single file each).
 */
export const upload = multer({ storage, fileFilter: csvFileFilter });
