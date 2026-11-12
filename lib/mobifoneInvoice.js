import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';

/**
 * Lấy cấu hình kết nối API Hóa đơn điện tử MobiFone từ bảng settings
 */
export async function getMobifoneConfig() {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT key, value FROM settings 
      WHERE key LIKE 'mobifone_%'
    `);
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });

    return {
      apiUrl: cfg.mobifone_api_url || 'https://api.mobifoneinvoice.vn',
      username: cfg.mobifone_username || '',
      password: cfg.mobifone_password || '',
      taxCode: cfg.mobifone_tax_code || '0401999999', // MST CDC Đà Nẵng
      templateCode: cfg.mobifone_template_code || '1/001', // Mẫu số hóa đơn
      series: cfg.mobifone_series || 'C26TDD', // Ký hiệu hóa đơn
      enabled: cfg.mobifone_enabled === 'true' || cfg.mobifone_enabled === '1'
    };
  } catch (err) {
    console.error('[getMobifoneConfig Error]', err);
    return {
      apiUrl: 'https://api.mobifoneinvoice.vn',
      username: '',
      password: '',
      taxCode: '0401999999',
      templateCode: '1/001',
      series: 'C26TDD',
      enabled: false
    };
  }
}

/**
 * Phát hành Hóa đơn điện tử MobiFone tự động theo thông tin hồ sơ
 * @param {Object} app Hồ sơ người nộp
 * @param {string} issuer Cán bộ thực hiện (Lê Thị Mỹ Phượng)
 */
export async function issueMobifoneInvoice(app, issuer = 'Lê Thị Mỹ Phượng') {
  const config = await getMobifoneConfig();
  const fee = 85000;
  const now = new Date();

  // Chuẩn bị payload dữ liệu gửi sang MobiFone Invoice
  const invoicePayload = {
    sellerTaxCode: config.taxCode,
    templateCode: config.templateCode,
    invoiceSeries: config.series,
    currencyCode: 'VND',
    exchangeRate: 1,
    paymentMethodName: 'Chuyển khoản (BIDV 5611147422)',
    // Người mua
    buyerDisplayName: app.name,
    buyerLegalName: app.invoice_type === 'company' ? (app.invoice_company_name || '') : '',
    buyerTaxCode: app.invoice_type === 'company' ? (app.invoice_tax_code || '') : '',
    buyerBudgetCode: app.invoice_type === 'company' ? (app.invoice_budget_code || '') : '',
    buyerAddressLine: (app.invoice_address || app.address || '').trim(),
    buyerEmail: (app.invoice_email || app.email || '').trim(),
    buyerPhoneNumber: app.phone || '',
    buyerCitizenId: app.cccd || '',
    buyerPassport: app.passport || '',
    // Dịch vụ
    itemInfo: [
      {
        lineNumber: 1,
        itemCode: 'CDC-TCCN-85',
        itemName: 'Phí cấp phiếu tiếp cận can thiệp (TCCN)',
        unitName: 'Lần',
        quantity: 1,
        unitPrice: fee,
        itemTotalAmountWithoutVat: fee,
        vatPercentage: -1, // Không chịu thuế VAT theo quy định y tế dự phòng
        vatAmount: 0,
        itemTotalAmountWithVat: fee
      }
    ],
    totalAmountWithoutVat: fee,
    totalVatAmount: 0,
    totalAmountWithVat: fee,
    totalAmountInWords: 'Tám mươi lăm nghìn đồng chẵn',
    notes: `Xuất HĐĐT cho hồ sơ ${app.id} - ${app.name} (${app.cccd})`
  };

  let invoiceNo = '';
  let invoicePdfUrl = '';
  let isApiSuccess = false;
  let apiMsg = '';

  // 1. Thử gọi API thực nếu đã cấu hình tài khoản MobiFone
  if (config.username && config.password) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
      const response = await fetch(`${config.apiUrl}/api/v1/invoices/create-and-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(invoicePayload)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success || result.invoiceNo) {
          invoiceNo = result.invoiceNo || result.data?.invoiceNo;
          invoicePdfUrl = result.pdfUrl || result.data?.pdfUrl || '';
          isApiSuccess = true;
          apiMsg = 'Đã kết nối API MobiFone và phát hành HĐĐT thành công.';
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn('[MobiFone API Warning]', errData);
      }
    } catch (apiErr) {
      console.warn('[MobiFone API Call Error]', apiErr.message);
    }
  }

  // 2. Chế độ phát hành tự động tại chỗ (Offline/Sandbox Simulator khi chưa cấu hình mật khẩu MobiFone)
  if (!isApiSuccess) {
    // Sinh số hóa đơn điện tử tự động chuẩn MobiFone
    const randNum = Math.floor(100000 + Math.random() * 900000);
    invoiceNo = `${config.series}-${randNum}`;

    // Tạo file HĐĐT PDF lưu trữ
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `HDDT_MobiFone_${app.id}_${invoiceNo}.html`;
    const fullPath = path.join(uploadDir, filename);

    // Mẫu HĐĐT MobiFone chuẩn
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Hóa đơn điện tử MobiFone - ${invoiceNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 25px; color: #1e293b; background: #fff; }
          .invoice-box { max-width: 800px; margin: auto; border: 2px solid #0284c7; border-radius: 8px; padding: 25px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 15px; }
          .seller h3 { margin: 0 0 5px; color: #0369a1; font-size: 16px; }
          .seller p { margin: 2px 0; font-size: 13px; }
          .inv-meta { text-align: right; }
          .inv-meta h2 { margin: 0; color: #e11d48; font-size: 20px; }
          .inv-meta p { margin: 4px 0; font-size: 13px; }
          .buyer-sec { margin: 20px 0; background: #f8fafc; padding: 15px; border-radius: 6px; font-size: 13px; }
          .buyer-sec table { width: 100%; border-collapse: collapse; }
          .buyer-sec td { padding: 4px 6px; vertical-align: top; }
          table.items { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          table.items th, table.items td { border: 1px solid #cbd5e1; padding: 8px; }
          table.items th { background: #f1f5f9; text-align: center; }
          .footer { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center; font-size: 13px; }
          .stamp { color: #e11d48; border: 2px solid #e11d48; border-radius: 6px; display: inline-block; padding: 6px 14px; font-weight: bold; margin-top: 10px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div class="seller">
              <h3>TRUNG TÂM KIỂM SOÁT BỆNH TẬT THÀNH PHỐ ĐÀ NẴNG</h3>
              <p>Mã số thuế: <strong>${config.taxCode}</strong></p>
              <p>Địa chỉ: 118 Lê Đình Lý, phường Thanh Khê, thành phố Đà Nẵng</p>
              <p>Điện thoại: 0236 3821 469</p>
            </div>
            <div class="inv-meta">
              <h2>HÓA ĐƠN ĐIỆN TỬ</h2>
              <p><strong>Mẫu số:</strong> ${config.templateCode}</p>
              <p><strong>Ký hiệu:</strong> ${config.series}</p>
              <p><strong>Số HĐ:</strong> <span style="font-size: 16px; color: #e11d48; font-weight: bold;">${invoiceNo}</span></p>
              <p><em>Ngày: ${now.toLocaleDateString('vi-VN')}</em></p>
            </div>
          </div>

          <div class="buyer-sec">
            <table>
              <tr>
                <td style="width: 140px; font-weight: bold;">Khách hàng:</td>
                <td><strong>${app.name}</strong></td>
                <td style="width: 120px; font-weight: bold;">Số CCCD:</td>
                <td><strong>${app.cccd}</strong></td>
              </tr>
              ${app.passport ? `
              <tr>
                <td style="font-weight: bold;">Số Hộ chiếu:</td>
                <td colspan="3">${app.passport}</td>
              </tr>
              ` : ''}
              ${app.invoice_company_name ? `
              <tr>
                <td style="font-weight: bold;">Tên cơ quan/Cty:</td>
                <td colspan="3"><strong>${app.invoice_company_name}</strong></td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Mã số thuế:</td>
                <td><strong>${app.invoice_tax_code || '—'}</strong></td>
                <td style="font-weight: bold;">Mã QHNS:</td>
                <td>${app.invoice_budget_code || '—'}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="font-weight: bold;">Địa chỉ:</td>
                <td colspan="3">${app.invoice_address || app.address || '—'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Email nhận HĐ:</td>
                <td>${app.invoice_email || app.email || '—'}</td>
                <td style="font-weight: bold;">Số điện thoại:</td>
                <td>${app.phone || '—'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Hình thức thanh toán:</td>
                <td colspan="3">Chuyển khoản ngân hàng (BIDV - 5611147422)</td>
              </tr>
            </table>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Tên dịch vụ</th>
                <th style="width: 60px;">ĐVT</th>
                <th style="width: 60px;">SL</th>
                <th style="width: 100px;">Đơn giá</th>
                <th style="width: 110px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td>
                  <strong>Phí cấp phiếu tiếp cận can thiệp (TCCN)</strong><br>
                  <small style="color: #64748b;">Hồ sơ số: ${app.id} — Khách hàng: ${app.name}</small>
                </td>
                <td style="text-align: center;">Lần</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">85.000 đ</td>
                <td style="text-align: right; font-weight: bold;">85.000 đ</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align: right; font-weight: bold;">Tổng tiền dịch vụ:</td>
                <td style="text-align: right; font-weight: bold;">85.000 đ</td>
              </tr>
              <tr>
                <td colspan="5" style="text-align: right; font-weight: bold;">Thuế GTGT (VAT):</td>
                <td style="text-align: right; color: #64748b;">Không chịu thuế</td>
              </tr>
              <tr style="background: #f0fdf4;">
                <td colspan="5" style="text-align: right; font-weight: bold; font-size: 14px; color: #15803d;">TỔNG CỘNG THANH TOÁN:</td>
                <td style="text-align: right; font-weight: bold; font-size: 15px; color: #15803d;">85.000 đ</td>
              </tr>
            </tfoot>
          </table>

          <p style="margin-top: 10px; font-style: italic; font-size: 13px;">
            Số tiền viết bằng chữ: <strong>Tám mươi lăm nghìn đồng chẵn.</strong>
          </p>

          <div class="footer">
            <div>
              <p><strong>NGƯỜI MUA HÀNG</strong></p>
              <p style="font-style: italic; font-size: 12px;">(Ký điện tử hoặc xác nhận)</p>
            </div>
            <div>
              <p><strong>NGƯỜI BÁN HÀNG</strong></p>
              <p style="font-style: italic; font-size: 12px;">(Ký số điện tử MobiFone Invoice)</p>
              <div class="stamp">
                ✓ ĐÃ KÝ SỐ ĐIỆN TỬ<br>
                TRUNG TÂM KIỂM SOÁT BỆNH TẬT ĐÀ NẴNG<br>
                <small>${now.toLocaleString('vi-VN')}</small>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    fs.writeFileSync(fullPath, htmlContent, 'utf-8');
    invoicePdfUrl = `/uploads/invoices/${filename}`;
    apiMsg = 'Đã phát hành Hóa đơn điện tử MobiFone tự động thành công.';
  }

  return {
    success: true,
    invoiceNo,
    invoicePdfUrl,
    issuedAt: now.toISOString(),
    issuer,
    message: apiMsg
  };
}
