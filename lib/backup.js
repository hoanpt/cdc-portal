import fs from 'fs';
import path from 'path';
import getDb from './db.js';
import { uploadBackupToDrive, isDriveEnabled } from './drive.js';

const BACKUP_DIR = process.env.BACKUP_DIR || './data/backups';
const KEEP_DAYS = parseInt(process.env.BACKUP_KEEP_DAYS || '30');

/**
 * Tạo bản backup của DB PostgreSQL dưới dạng JSON cấu trúc
 * @param {string} triggeredBy - 'system' hoặc username admin
 */
export async function createBackup(triggeredBy = 'system') {
  const db = await getDb();
  const backupDir = path.resolve(BACKUP_DIR);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `cdc_backup_${dateStr}.json`;
  const destPath = path.join(backupDir, filename);

  // Đọc dữ liệu từ toàn bộ bảng của PostgreSQL
  const tables = ['accounts', 'applications', 'status_logs', 'backup_logs', 'settings'];
  const backupData = {};
  
  for (const table of tables) {
    backupData[table] = await db.all(`SELECT * FROM ${table}`);
  }

  // Ghi dữ liệu JSON ra file local
  fs.writeFileSync(destPath, JSON.stringify(backupData, null, 2), 'utf8');

  const stat = fs.statSync(destPath);

  // Upload lên Google Drive nếu Drive được cấu hình
  let driveFileId = null;
  if (isDriveEnabled()) {
    try {
      console.log('[Backup] Đang upload bản backup lên Google Drive...');
      const driveResult = await uploadBackupToDrive(destPath, filename);
      if (driveResult) {
        driveFileId = driveResult.id;
        console.log('[Backup] Upload Drive thành công. ID:', driveFileId);
      }
    } catch (driveErr) {
      console.error('[Backup] Lỗi upload Drive:', driveErr.message);
    }
  }

  // Ghi log vào DB
  await db.run(`
    INSERT INTO backup_logs (filename, file_size, size_bytes, drive_file_id, created_by, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `, 
    filename,
    stat.size,
    stat.size,
    driveFileId,
    triggeredBy,
    driveFileId ? 'Lưu local & Google Drive' : 'Lưu local'
  );

  // Xóa backup cũ hơn KEEP_DAYS ngày
  cleanOldBackups(backupDir);

  return {
    filename,
    path: destPath,
    size: stat.size,
    driveFileId,
  };
}

function cleanOldBackups(backupDir) {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  try {
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('cdc_backup_') && f.endsWith('.json'));
    files.forEach(f => {
      const filePath = path.join(backupDir, f);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        console.log('[Backup] Đã xóa backup cũ:', f);
      }
    });
  } catch (e) {
    console.warn('[Backup] Lỗi khi dọn backup cũ:', e.message);
  }
}

export function getBackupList() {
  const backupDir = path.resolve(BACKUP_DIR);
  if (!fs.existsSync(backupDir)) return [];

  return fs.readdirSync(backupDir)
    .filter(f => f.startsWith('cdc_backup_') && f.endsWith('.json'))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

let _schedulerStarted = false;

/**
 * Khởi động scheduler backup tự động mỗi 24h
 */
export function startBackupScheduler() {
  if (_schedulerStarted) return;
  _schedulerStarted = true;

  // Chạy backup lần đầu sau 5 phút khi server start
  setTimeout(async () => {
    console.log('[Backup] Chạy backup tự động lần đầu...');
    try {
      const result = await createBackup('system-auto');
      console.log('[Backup] Hoàn tất:', result.filename);
    } catch (e) {
      console.error('[Backup] Lỗi backup tự động:', e.message);
    }
  }, 5 * 60 * 1000);

  // Sau đó chạy mỗi 24h
  setInterval(async () => {
    console.log('[Backup] Chạy backup tự động định kỳ...');
    try {
      const result = await createBackup('system-auto');
      console.log('[Backup] Hoàn tất:', result.filename);
    } catch (e) {
      console.error('[Backup] Lỗi backup tự động:', e.message);
    }
  }, 24 * 60 * 60 * 1000);

  console.log('[Backup] Scheduler đã được khởi động. Backup mỗi 24h.');
}
