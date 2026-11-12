import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isDriveEnabled, uploadFileToDrive } from '@/lib/drive';

export const config = { api: { bodyParser: false } };

export async function POST(request, { params }) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
    if (!match) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = verifyToken(match[1]);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Chỉ kế toán hoặc admin mới có quyền xác nhận thu tiền và xuất HĐĐT
    if (token.role !== 'accountant' && token.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Chỉ Kế toán thu phí (Lê Thị Mỹ Phượng) hoặc Quản trị viên mới có quyền thực hiện Bước 1 (xác nhận tiền và xuất HĐĐT).' 
      }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file_invoice');
    const invoiceNo = formData.get('invoice_no')?.trim() || '';
    const notes = formData.get('notes')?.trim() || '';
    const issuerName = formData.get('issuer_name')?.trim() || token.fullName || 'Lê Thị Mỹ Phượng (Thu phí)';

    const db = await getDb();
    const app = await db.get('SELECT * FROM applications WHERE id = ?', id);
    if (!app) return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });

    let invoiceFileUrl = app.invoice_file_url || null;

    if (file && file.name && typeof file !== 'string') {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${id}_HDDT_${Date.now()}_${safeName}`;
      const destPath = path.join(uploadDir, filename);
      await fs.promises.writeFile(destPath, buffer);

      invoiceFileUrl = `/uploads/${filename}`;

      // Upload Drive nếu có folder
      if (app.gdrive_folder_id && isDriveEnabled()) {
        try {
          await uploadFileToDrive(destPath, filename, file.type, app.gdrive_folder_id);
        } catch (e) {
          console.error('[Drive Invoice Upload Error]', e.message);
        }
      }
    }

    const now = new Date().toISOString();
    const nextStatus = 'processing'; // Chuyển qua Khoa PCBTN xử lý chuyên môn

    // Cập nhật thông tin vào applications
    await db.run(`
      UPDATE applications 
      SET 
        payment_confirmed = 1,
        payment_confirmed_at = ?,
        payment_confirmed_by = ?,
        invoice_status = 'issued',
        invoice_no = ?,
        invoice_file_url = ?,
        invoice_issued_at = ?,
        invoice_issued_by = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `, 
      now, issuerName,
      invoiceNo || app.invoice_no || 'Đã xuất',
      invoiceFileUrl,
      now, issuerName,
      nextStatus, now, id
    );

    // Ghi audit log
    await db.run(`
      INSERT INTO status_logs (application_id, old_status, new_status, changed_by, note)
      VALUES (?, ?, ?, ?, ?)
    `, 
      id, 
      app.status, 
      nextStatus, 
      issuerName, 
      notes || `Kế toán đã xác nhận thu tiền, xuất HĐĐT${invoiceNo ? ` số ${invoiceNo}` : ''} và chuyển hồ sơ qua Khoa PCBTN xử lý`
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Đã xác nhận thu tiền, đính kèm HĐĐT và chuyển hồ sơ qua Khoa PCBTN thành công!',
      invoiceFileUrl,
      invoiceNo
    });
  } catch (err) {
    console.error('[Applications/ID/Invoice POST]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
