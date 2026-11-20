import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';
import { sendStatusUpdateEmail } from '@/lib/email';

export const config = { api: { bodyParser: false } };

export async function POST(request, { params }) {
  try {
    const { verifyToken } = require('@/lib/auth');
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
    if (!match) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = verifyToken(match[1]);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Cán bộ thu phí không có quyền cấp chứng nhận ở Bước 2
    if (token.role === 'accountant') {
      return NextResponse.json({ 
        error: 'Tài khoản Thu phí không có quyền thực hiện Bước 2 (cấp chứng nhận). Chức năng này dành riêng cho Cán bộ Khoa PCBTN.' 
      }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file_certificate');
    const notes = formData.get('notes') || '';
    const handlerName = formData.get('handler_name') || '';

    const db = await getDb();
    const app = await db.get('SELECT * FROM applications WHERE id = ?', id);
    if (!app) return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });

    let fileUrl = null;
    if (app.certificate_json) {
      try {
        const parsed = typeof app.certificate_json === 'string' ? JSON.parse(app.certificate_json) : app.certificate_json;
        fileUrl = parsed?.url || null;
      } catch (e) {}
    }

    // File Giấy chứng nhận bản scan là không bắt buộc
    if (file && typeof file.arrayBuffer === 'function' && file.size > 0 && file.name) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${id}_CERT_${Date.now()}_${safeName}`;
      const destPath = path.join(uploadDir, filename);
      await fs.promises.writeFile(destPath, buffer);
      fileUrl = `/uploads/${filename}`;
    }

    const certId = app.certificate_id || `CNTH-${id.replace('CDC-', '')}`;
    const now = new Date().toISOString();
    const certificate_json = JSON.stringify({ certId, issuedAt: now, url: fileUrl });

    await db.run(`
      UPDATE applications 
      SET status = 'completed', certificate_id = ?, certificate_json = ?, package_date = ?, handler_name = COALESCE(NULLIF(?, ''), handler_name), updated_at = ? 
      WHERE id = ?
    `, certId, certificate_json, now.split('T')[0], handlerName, now, id);

    const logPerformer = handlerName ? `${handlerName} (Khoa PCBTN)` : token.username;
    await db.run(`
      INSERT INTO status_logs (application_id, old_status, new_status, changed_by, note)
      VALUES (?, ?, ?, ?, ?)
    `, id, app.status, 'completed', logPerformer, notes ? `[Cán bộ: ${logPerformer}] ${notes}` : `Cán bộ ${logPerformer} hoàn tất xử lý và trả kết quả cho khách hàng`);

    // Gửi email thông báo kết quả (nếu có cấu hình SMTP)
    const updatedApp = await db.get('SELECT * FROM applications WHERE id = ?', id);
    const emailResult = await sendStatusUpdateEmail(updatedApp, 'completed', notes || 'Hồ sơ đã được xử lý hoàn tất. Bạn có thể tra cứu và tải kết quả trên cổng thông tin.');

    return NextResponse.json({ 
      success: true, 
      url: fileUrl, 
      emailSent: emailResult.sent, 
      emailReason: emailResult.reason 
    });
  } catch (err) {
    console.error('[Applications/ID/Certificate POST]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
