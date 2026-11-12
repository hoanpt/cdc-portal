import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';
import { issueMobifoneInvoice } from '@/lib/mobifoneInvoice';

export async function POST(request, { params }) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const app = await db.get(`SELECT * FROM applications WHERE id = ?`, id);

    if (!app) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });
    }

    const issuer = token.fullName || token.username || 'Lê Thị Mỹ Phượng';
    const result = await issueMobifoneInvoice(app, issuer);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Lỗi phát hành HĐĐT MobiFone' }, { status: 500 });
    }

    const now = new Date().toISOString();

    // Tự động: Xác nhận thu tiền, ghi số HĐĐT, đính kèm HĐĐT và chuyển thẳng qua Khoa PCBTN
    await db.run(`
      UPDATE applications
      SET 
        invoice_no = ?,
        invoice_status = 'issued',
        invoice_issued_at = ?,
        invoice_issued_by = ?,
        invoice_file_url = ?,
        payment_confirmed = 1,
        payment_confirmed_at = COALESCE(payment_confirmed_at, ?),
        payment_confirmed_by = COALESCE(payment_confirmed_by, ?),
        status = 'processing',
        updated_at = ?
      WHERE id = ?
    `, 
      result.invoiceNo,
      result.issuedAt,
      issuer,
      result.invoicePdfUrl,
      now,
      issuer,
      now,
      id
    );

    // Ghi log xử lý
    await db.run(`
      INSERT INTO status_logs (application_id, old_status, new_status, changed_by, note)
      VALUES (?, ?, 'processing', ?, ?)
    `, 
      id, 
      app.status, 
      issuer, 
      `⚡ Xuất HĐĐT MobiFone thành công (Số HĐ: ${result.invoiceNo}). Đã chuyển Khoa PCBTN xử lý.`
    );

    return NextResponse.json({
      success: true,
      invoiceNo: result.invoiceNo,
      invoiceFileUrl: result.invoicePdfUrl,
      message: `Đã phát hành HĐĐT MobiFone (${result.invoiceNo}) và chuyển hồ sơ qua Khoa PCBTN thành công!`
    });
  } catch (err) {
    console.error('[Mobifone Invoice Route Error]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
