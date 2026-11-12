import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

function getWeekRange(date = new Date(), offset = 0) {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  // Monday of the target week
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  // Sunday of the target week
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function getYearRange(year) {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // 'week', 'month', 'year', 'custom', 'all'
    const weekType = searchParams.get('weekType') || 'current'; // 'current', 'previous'
    const targetYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const targetMonth = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');
    const paymentFilter = searchParams.get('paymentFilter') || 'all'; // 'all', 'confirmed', 'unconfirmed'
    const invoiceFilter = searchParams.get('invoiceFilter') || 'all'; // 'all', 'issued', 'unissued'

    let start = null;
    let end = null;
    let periodLabel = '';

    const now = new Date();

    if (period === 'week') {
      const offset = weekType === 'previous' ? -1 : 0;
      const range = getWeekRange(now, offset);
      start = range.start;
      end = range.end;
      const sStr = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
      const eStr = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}/${end.getFullYear()}`;
      periodLabel = weekType === 'previous' ? `Tuần trước (${sStr} - ${eStr})` : `Tuần này (${sStr} - ${eStr})`;
    } else if (period === 'month') {
      const range = getMonthRange(targetYear, targetMonth);
      start = range.start;
      end = range.end;
      periodLabel = `Tháng ${String(targetMonth).padStart(2, '0')}/${targetYear}`;
    } else if (period === 'year') {
      const range = getYearRange(targetYear);
      start = range.start;
      end = range.end;
      periodLabel = `Năm ${targetYear}`;
    } else if (period === 'custom') {
      if (customStart) {
        start = new Date(`${customStart}T00:00:00`);
      }
      if (customEnd) {
        end = new Date(`${customEnd}T23:59:59.999`);
      }
      const sStr = customStart ? customStart.split('-').reverse().join('/') : 'Trước nay';
      const eStr = customEnd ? customEnd.split('-').reverse().join('/') : 'Hiện tại';
      periodLabel = `Từ ${sStr} đến ${eStr}`;
    } else {
      periodLabel = 'Toàn bộ thời gian';
    }

    const db = await getDb();
    const rows = await db.all(`
      SELECT 
        id, submitted_at, name, cccd, passport, dob, gender, phone, email, address, receive_method,
        status, notes, certificate_id, package_date, handler_name,
        invoice_type, invoice_company_name, invoice_tax_code, invoice_budget_code,
        invoice_address, invoice_email, invoice_status, invoice_no, invoice_issued_at,
        invoice_issued_by, invoice_file_url,
        payment_confirmed, payment_confirmed_at, payment_confirmed_by,
        created_at, updated_at
      FROM applications
      ORDER BY submitted_at DESC
    `);

    // Lọc theo mốc thời gian (dựa trên payment_confirmed_at hoặc submitted_at)
    const filtered = rows.filter(r => {
      // Xác định ngày xét: ưu tiên payment_confirmed_at nếu đã thu tiền, nếu chưa thì lấy submitted_at
      const dateToCheck = r.payment_confirmed_at ? new Date(r.payment_confirmed_at) : (r.submitted_at ? new Date(r.submitted_at) : null);

      if (start && end && dateToCheck) {
        if (dateToCheck < start || dateToCheck > end) return false;
      } else if (start && dateToCheck) {
        if (dateToCheck < start) return false;
      } else if (end && dateToCheck) {
        if (dateToCheck > end) return false;
      }

      // Lọc trạng thái thu tiền
      if (paymentFilter === 'confirmed' && !r.payment_confirmed) return false;
      if (paymentFilter === 'unconfirmed' && r.payment_confirmed) return false;

      // Lọc trạng thái HĐĐT
      if (invoiceFilter === 'issued' && r.invoice_status !== 'issued') return false;
      if (invoiceFilter === 'unissued' && r.invoice_status === 'issued') return false;

      return true;
    });

    // Thống kê tổng hợp
    const totalRecords = filtered.length;
    const confirmedCount = filtered.filter(r => !!r.payment_confirmed).length;
    const unconfirmedCount = totalRecords - confirmedCount;
    const feePerCase = 85000;
    const totalFee = confirmedCount * feePerCase;
    const issuedInvoiceCount = filtered.filter(r => r.invoice_status === 'issued').length;
    const unissuedInvoiceCount = totalRecords - issuedInvoiceCount;
    const transferredCount = filtered.filter(r => !!r.payment_confirmed && (!!r.handler_name || r.status !== 'pending')).length;

    return NextResponse.json({
      period,
      periodLabel,
      startDate: start ? start.toISOString() : null,
      endDate: end ? end.toISOString() : null,
      summary: {
        totalRecords,
        confirmedCount,
        unconfirmedCount,
        feePerCase,
        totalFee,
        issuedInvoiceCount,
        unissuedInvoiceCount,
        transferredCount,
      },
      records: filtered
    });
  } catch (err) {
    console.error('[Cashier Report API Error]', err);
    return NextResponse.json({ error: 'Lỗi máy chủ khi tạo báo cáo: ' + err.message }, { status: 500 });
  }
}
