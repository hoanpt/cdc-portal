import getDb from './db.js';

/**
 * Gửi thông báo qua Zalo OA khi có hồ sơ mới được nộp
 * @param {Object} app - Thông tin hồ sơ mới nộp
 */
export async function sendZaloNotification(app) {
  try {
    const db = await getDb();
    const rows = await db.all("SELECT key, value FROM settings WHERE key LIKE 'zalo_%'");
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);

    const token = settings.zalo_token || process.env.ZALO_OA_TOKEN;
    const phonesStr = settings.zalo_notify_phones || process.env.ZALO_NOTIFY_PHONES || '';

    if (!token && !phonesStr) {
      console.log('[ZaloOA] Chưa cấu hình Access Token hoặc SĐT nhận thông báo Zalo OA.');
      return { sent: false, reason: 'Chưa cấu hình Zalo OA' };
    }

    const phones = phonesStr.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
    if (phones.length === 0) {
      console.log('[ZaloOA] Không có số điện thoại cán bộ nào được cấu hình nhận thông báo.');
      return { sent: false, reason: 'Chưa có SĐT nhận' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const messageContent = [
      `🔔 [CDC ĐÀ NẴNG] CÓ HỒ SƠ MỚI NỘP TRỰC TUYẾN`,
      `---------------------------------`,
      `• Mã hồ sơ: ${app.id}`,
      `• Người nộp: ${app.name}`,
      `• Số CCCD/Hộ chiếu: ${app.cccd}`,
      `• Số điện thoại: ${app.phone}`,
      `• Lệ phí: 85.000 VNĐ (Đã chuyển khoản BIDV)`,
      `• Yêu cầu xuất HĐĐT: ${app.invoice_type === 'company' ? `Doanh nghiệp (${app.invoice_company_name} - MST: ${app.invoice_tax_code})` : 'Cá nhân'}`,
      `• Thời gian: ${new Date().toLocaleString('vi-VN')}`,
      `---------------------------------`,
      `👉 Kế toán kiểm tra tiền tài khoản BIDV 5611147422 để xuất HĐĐT.`,
      `👉 Cán bộ Khoa PCBTN mở chi tiết hồ sơ: ${appUrl}/admin/cases/${app.id}`
    ].join('\n');

    console.log(`[ZaloOA] Đang gửi thông báo hồ sơ ${app.id} đến ${phones.length} cán bộ (${phones.join(', ')})...`);

    // Gửi qua Zalo OA API
    let successCount = 0;
    for (const phone of phones) {
      try {
        // Chuẩn hóa định dạng số điện thoại VN (ví dụ 0905 -> 84905)
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '84' + formattedPhone.slice(1);
        }

        // Gọi API Zalo Cloud Service (ZNS hoặc Consultation message)
        const response = await fetch('https://business.openapi.zalo.me/message/template', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': token || ''
          },
          body: JSON.stringify({
            phone: formattedPhone,
            template_id: settings.zalo_template_id || '',
            template_data: {
              app_id: app.id,
              customer_name: app.name,
              phone: app.phone,
              fee: '85.000 VNĐ',
              time: new Date().toLocaleString('vi-VN')
            }
          })
        });

        const resData = await response.json();
        if (resData.error === 0) {
          successCount++;
          console.log(`[ZaloOA] Gửi thành công đến SĐT ${phone}`);
        } else {
          console.warn(`[ZaloOA] Gửi tới ${phone} phản hồi: ${resData.message || JSON.stringify(resData)}`);
        }
      } catch (errPhone) {
        console.error(`[ZaloOA] Lỗi gửi tới ${phone}:`, errPhone.message);
      }
    }

    return { sent: successCount > 0, count: successCount, total: phones.length };
  } catch (err) {
    console.error('[ZaloOA] Lỗi xử lý thông báo Zalo OA:', err.message);
    return { sent: false, error: err.message };
  }
}
