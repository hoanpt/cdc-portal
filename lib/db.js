import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool, types } = pg;

// Cấu hình type parser cho INT8 (OID 20) để tự động convert sang Number trong JS
types.setTypeParser(types.builtins.INT8, (val) => parseInt(val, 10));

let poolPromise;

export default async function getDb() {
  if (poolPromise) return poolPromise;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined in .env.local');
  }

  // Khởi tạo Pool kết nối
  const pool = new Pool({
    connectionString,
    // Bật SSL nếu trong môi trường production (như Vercel/Render)
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  poolPromise = (async () => {
    // Khởi tạo cấu trúc bảng (schema)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'staff',
        is_active INTEGER DEFAULT 1,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        cccd VARCHAR(50) NOT NULL,
        dob VARCHAR(50),
        gender VARCHAR(50),
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        address TEXT,
        receive_method VARCHAR(50) NOT NULL,
        notes TEXT,
        gdrive_folder_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        certificate_id VARCHAR(255),
        certificate_json TEXT,
        files_json TEXT,
        package_date VARCHAR(50),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS status_logs (
        id SERIAL PRIMARY KEY,
        application_id VARCHAR(50) NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        changed_by VARCHAR(255) NOT NULL,
        note TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id)
      );

      CREATE TABLE IF NOT EXISTS backup_logs (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL,
        size_bytes BIGINT,
        drive_file_id VARCHAR(255),
        created_by VARCHAR(255),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tạo tài khoản admin mặc định nếu chưa tồn tại
    const checkAdmin = await pool.query("SELECT COUNT(*) as c FROM accounts WHERE username = 'admin'");
    const adminCount = parseInt(checkAdmin.rows[0].c, 10);
    if (adminCount === 0) {
      const hash = bcrypt.hashSync('123456', 10);
      await pool.query(
        "INSERT INTO accounts (username, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
        ['admin', hash, 'Quản trị hệ thống', 'admin']
      );
    }

    // Trả về wrapper tương thích với SQLite API
    return {
      get: async (sql, ...params) => {
        const converted = convertSql(sql);
        const res = await pool.query(converted, params);
        return res.rows[0];
      },
      all: async (sql, ...params) => {
        const converted = convertSql(sql);
        const res = await pool.query(converted, params);
        return res.rows;
      },
      run: async (sql, ...params) => {
        const converted = convertSql(sql);
        const res = await pool.query(converted, params);
        return {
          lastInsertRowid: res.rows?.[0]?.id || null,
          changes: res.rowCount
        };
      },
      exec: async (sql) => {
        await pool.query(sql);
      },
      end: async () => {
        await pool.end();
      }
    };
  })();

  return poolPromise;
}

// Chuyển đổi tham số binding từ SQLite (?) sang PostgreSQL ($1, $2, ...)
function convertSql(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}
