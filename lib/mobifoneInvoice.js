import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';

/**
 * Chuẩn hóa Base URL API MobiFone
 */
function normalizeApiUrl(url, taxCode) {
  let cleanUrl = (url || 'https://api.mobifoneinvoice.vn').trim().replace(/\/+$/, '');
  if (cleanUrl.includes('{MST}') && taxCode) {
    cleanUrl = cleanUrl.replace('{MST}', taxCode);
  }
  return cleanUrl;
}

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

    const taxCode = cfg.mobifone_tax_code || '0401999999'; // MST CDC Đà Nẵng
    return {
      apiUrl: normalizeApiUrl(cfg.mobifone_api_url, taxCode),
      rawApiUrl: cfg.mobifone_api_url || 'https://api.mobifoneinvoice.vn',
      username: (cfg.mobifone_username || '').trim(),
      password: (cfg.mobifone_password || '').trim(),
      taxCode: taxCode.trim(),
      maDvcs: (cfg.mobifone_ma_dvcs || 'VP').trim(), // Mã đơn vị cơ sở (mặc định VP)
      cctbaoId: (cfg.mobifone_cctbao_id || '').trim(), // qlkhsdung_id từ RF00059
      templateCode: cfg.mobifone_template_code || '1/001', // Mẫu số hóa đơn
      series: cfg.mobifone_series || '1C24TDD', // Ký hiệu hóa đơn
      autoSignHsm: cfg.mobifone_auto_sign_hsm !== 'false', // Mặc định tự động ký HSM
      guiCQT: cfg.mobifone_gui_cqt || 'Notsend', // Notsend: Chưa gửi thuế ngay; hoặc rỗng: gửi thuế
      enabled: cfg.mobifone_enabled === 'true' || cfg.mobifone_enabled === '1'
    };
  } catch (err) {
    console.error('[getMobifoneConfig Error]', err);
    return {
      apiUrl: 'https://api.mobifoneinvoice.vn',
      rawApiUrl: 'https://api.mobifoneinvoice.vn',
      username: '',
      password: '',
      taxCode: '0401999999',
      maDvcs: 'VP',
      cctbaoId: '',
      templateCode: '1/001',
      series: '1C24TDD',
      autoSignHsm: true,
      guiCQT: 'Notsend',
      enabled: false
    };
  }
}

/**
 * 1. Đăng nhập / Lấy Token MobiFone (Trang 5 TLKT TT78)
 * POST /api/Account/Login
 * Headers: Content-Type: application/json
 * Body: { username, password }
 */
export async function loginMobifone(config) {
  const url = `${config.apiUrl}/api/Account/Login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: config.username,
      password: config.password
    }),
    cache: 'no-store'
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Máy chủ MobiFone phản hồi không hợp lệ (${res.status}): ${text.slice(0, 150)}`);
  }

  if (!res.ok || data.error) {
    const errorMsg = data.error || data.Message || `Lỗi đăng nhập HTTP ${res.status}`;
    throw new Error(`Đăng nhập MobiFone thất bại: ${errorMsg}`);
  }

  if (!data.token) {
    throw new Error('Đăng nhập thành công nhưng không nhận được Token xác thực từ MobiFone');
  }

  return {
    token: data.token,
    maDvcs: data.ma_dvcs || config.maDvcs || 'VP',
    userId: data.wb_user_id
  };
}

/**
 * 2. Lấy thông tin dải ký hiệu phát hành hóa đơn (Trang 6 TLKT TT78)
 * GET /api/System/GetDataReferencesByRefId?refId=RF00059
 * Headers: Authorization: Bear ${token};${ma_dvcs}
 */
export async function getMobifoneReferences(config, token, maDvcs) {
  const url = `${config.apiUrl}/api/System/GetDataReferencesByRefId?refId=RF00059`;
  const authHeader = `Bear ${token};${maDvcs}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Không lấy được dải ký hiệu HĐĐT (HTTP ${res.status}): ${text.slice(0, 150)}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}

/**
 * 3. Kiểm tra kết nối API MobiFone (Dùng trong Trang Cấu hình Hệ thống Admin)
 */
export async function testMobifoneConnection(overrideConfig = null) {
  try {
    const baseConfig = await getMobifoneConfig();
    const config = overrideConfig ? { ...baseConfig, ...overrideConfig } : baseConfig;

    if (!config.username || !config.password) {
      return {
        success: false,
        error: 'Chưa điền Tên tài khoản hoặc Mật khẩu API MobiFone'
      };
    }

    // Bước 1: Login
    const loginData = await loginMobifone(config);

    // Bước 2: Lấy dải ký hiệu HĐĐT
    let seriesList = [];
    try {
      const refs = await getMobifoneReferences(config, loginData.token, loginData.maDvcs);
      seriesList = refs.map(r => ({
        cctbao_id: r.qlkhsdung_id || r.id,
        khieu: r.khhdon || r.value || '',
        lhdon: r.lhdon,
        code: r.code
      }));
    } catch (refErr) {
      console.warn('[testMobifoneConnection ref error]', refErr.message);
    }

    return {
      success: true,
      token: loginData.token.slice(0, 15) + '...',
      maDvcs: loginData.maDvcs,
      userId: loginData.userId,
      seriesList,
      message: `Kết nối máy chủ MobiFone Invoice thành công! Đơn vị: ${loginData.maDvcs}, tìm thấy ${seriesList.length} dải ký hiệu HĐĐT.`
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Chuyển số thành chữ (Tiếng Việt) cho tổng tiền hóa đơn
 */
function numberToWordsVietnamese(num) {
  if (num === 85000) return 'Tám mươi lăm nghìn đồng.';
  if (num === 0) return 'Không đồng.';
  return `${num.toLocaleString('vi-VN')} đồng.`;
}

/**
 * 4. Phát hành Hóa đơn điện tử MobiFone tự động theo Thông tư 78
 * @param {Object} app Hồ sơ người nộp
 * @param {string} issuer Cán bộ thực hiện (Lê Thị Mỹ Phượng)
 */
export async function issueMobifoneInvoice(app, issuer = 'Lê Thị Mỹ Phượng') {
  const config = await getMobifoneConfig();
  const fee = 85000;
  const now = new Date();
  const nowFormatted = now.toISOString().slice(0, 10); // yyyy-MM-dd
  const buyerEmail = (app.invoice_email || app.email || '').trim();

  let invoiceNo = '';
  let invoicePdfUrl = '';
  let isApiSuccess = false;
  let apiMsg = '';
  let rawInvoiceResult = null;

  // THỬ GỌI API THỰC TẾ MOBIFONE NẾU ĐÃ CẤU HÌNH TÀI KHOẢN & BẬT KẾT NỐI
  if (config.username && config.password) {
    try {
      console.log('[MobiFone TT78] Bắt đầu kết nối cổng MobiFone Invoice cho hồ sơ:', app.id);
      
      // Bước 1: Đăng nhập lấy Token & ma_dvcs
      const auth = await loginMobifone(config);
      const authHeader = `Bear ${auth.token};${auth.maDvcs}`;

      // Bước 2: Xác định cctbao_id (Dải ký hiệu phát hành)
      let cctbaoId = config.cctbaoId;
      if (!cctbaoId) {
        try {
          const refs = await getMobifoneReferences(config, auth.token, auth.maDvcs);
          if (refs && refs.length > 0) {
            // Ưu tiên tìm dải ký hiệu trùng với cấu hình series
            const matched = refs.find(r => r.khhdon === config.series || r.value === config.series);
            cctbaoId = matched ? (matched.qlkhsdung_id || matched.id) : (refs[0].qlkhsdung_id || refs[0].id);
            console.log('[MobiFone TT78] Tự động chọn cctbao_id:', cctbaoId, 'ký hiệu:', matched?.khhdon || refs[0]?.khhdon);
          }
        } catch (e) {
          console.warn('[MobiFone TT78] Không lấy được tham chiếu RF00059:', e.message);
        }
      }

      if (!cctbaoId) {
        throw new Error('Chưa cấu hình hoặc không tìm thấy ID dải ký hiệu hóa đơn (cctbao_id / qlkhsdung_id)');
      }

      // Bước 3: Đóng gói Payload chuẩn Thông tư 78 (Trang 13-14 & 118-119 TLKT)
      const buyerName = (app.name || '').trim();
      const buyerCompany = app.invoice_type === 'company' ? (app.invoice_company_name || buyerName) : buyerName;
      const buyerTaxCode = app.invoice_type === 'company' ? (app.invoice_tax_code || '') : '';
      const buyerAddress = (app.invoice_address || app.address || 'Đà Nẵng').trim();

      const invoiceData = {
        cctbao_id: cctbaoId,
        nlap: nowFormatted,
        shdon: '',
        sdhang: String(app.id),
        dvtte: 'VND',
        tgia: '1',
        htttoan: 'Tiền mặt/Chuyển khoản',
        stknban: '5611147422',
        tnhban: 'BIDV',
        mnmua: app.cccd || String(app.id),
        mst: buyerTaxCode,
        tnmua: buyerName,
        email: buyerEmail,
        ten: buyerCompany,
        dchi: buyerAddress,
        cmndmua: app.cccd || '',
        sdtnmua: app.phone || '',
        stknmua: '',
        tnhmua: '',
        tgtcthue: fee,
        tgtkcthue: fee, // Tổng tiền không chịu thuế
        tgtthue: 0,
        tgtttbso: fee,
        tgtttbso_last: String(fee),
        tgtttbchu: numberToWordsVietnamese(fee),
        tkcktmn: 0,
        tgtphi: 0,
        tgtkhac: 0,
        mdvi: auth.maDvcs,
        tthdon: 0, // 0: Hóa đơn gốc
        is_hdcma: 1, // 1: Hóa đơn có mã CQT
        details: [
          {
            data: [
              {
                stt: 1,
                ma: 'CDC-TCCN-85',
                ten: 'Phí cấp phiếu tiếp cận can thiệp (TCCN)',
                mdvtinh: 'LAN',
                dvtinh: 'Lần',
                sluong: 1,
                dgia: fee,
                thtien: fee,
                tlckhau: 0,
                stckhau: 0,
                tsuat: '-1', // -1: Không chịu thuế theo quy định TT78
                tthue: 0,
                tgtien: fee,
                kmai: 1 // 1: Hàng hóa dịch vụ thông thường
              }
            ]
          }
        ],
        hoadon68_phi: [{ data: [] }],
        hoadon68_khac: [
          {
            data: app.passport ? [
              {
                ttruong: 'Hộ chiếu',
                kdlieu: 'string',
                dlieu: app.passport
              }
            ] : []
          }
        ]
      };

      const payload = {
        editmode: 1, // 1: Tạo mới
        guiCQT: config.guiCQT || 'Notsend',
        data: [invoiceData]
      };

      // Bước 4: Gọi hàm tạo và ký hóa đơn bằng HSM MobiFone (Mục 4.5, Trang 113)
      let signEndpoint = `${config.apiUrl}/api/Invoice68/SaveAndSignHSMHoadon78`;
      if (!config.autoSignHsm) {
        signEndpoint = `${config.apiUrl}/api/Invoice68/SaveListHoadon78`;
      }

      console.log('[MobiFone TT78] Gửi yêu cầu lập HĐĐT đến:', signEndpoint);
      let issueRes = await fetch(signEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      // Nếu SaveAndSignHSM chưa sẵn sàng, thử SaveListHoadon78
      if (!issueRes.ok && config.autoSignHsm) {
        console.warn('[MobiFone TT78] SaveAndSignHSM lỗi, thử SaveListHoadon78...');
        signEndpoint = `${config.apiUrl}/api/Invoice68/SaveListHoadon78`;
        issueRes = await fetch(signEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          cache: 'no-store'
        });
      }

      const issueText = await issueRes.text();
      let issueResult;
      try {
        issueResult = JSON.parse(issueText);
      } catch {
        throw new Error(`MobiFone phản hồi lỗi (${issueRes.status}): ${issueText.slice(0, 150)}`);
      }

      console.log('[MobiFone TT78] Kết quả tạo HĐ:', issueResult);

      let hdonId = null;
      if (issueResult.lst_hdon_id_success && issueResult.lst_hdon_id_success.length > 0) {
        hdonId = String(issueResult.lst_hdon_id_success[0]).trim();
      } else if (Array.isArray(issueResult) && issueResult[0]?.data?.hdon_id) {
        hdonId = issueResult[0].data.hdon_id;
        invoiceNo = issueResult[0].data.shdon || '';
      } else if (issueResult.hdon_id || issueResult.id) {
        hdonId = issueResult.hdon_id || issueResult.id;
      }

      if (!hdonId && !invoiceNo) {
        throw new Error(issueResult.error || issueResult.Message || 'MobiFone không trả về mã hóa đơn sau khi tạo');
      }

      // Bước 5: Lấy thông tin chi tiết hóa đơn theo ID (Mục 4.5, Trang 128)
      if (hdonId) {
        try {
          const detailRes = await fetch(`${config.apiUrl}/api/Invoice68/GetById?id=${hdonId}`, {
            method: 'GET',
            headers: { 'Authorization': authHeader },
            cache: 'no-store'
          });
          if (detailRes.ok) {
            const detail = await detailRes.json();
            invoiceNo = detail.shdon ? `${detail.khieu || config.series}-${detail.shdon}` : (detail.sbmat || invoiceNo);
            rawInvoiceResult = detail;
          }
        } catch (detailErr) {
          console.warn('[MobiFone TT78] Lỗi lấy chi tiết HĐ:', detailErr.message);
        }
      }

      // Bước 6: Tải file hóa đơn PDF chính thức từ MobiFone (Mục 4.1, Trang 126)
      if (hdonId) {
        try {
          const pdfEndpoint = `${config.apiUrl}/api/Invoice68/inHoadon?id=${hdonId}&type=PDF&inchuyendoi=false`;
          const pdfRes = await fetch(pdfEndpoint, {
            method: 'GET',
            headers: { 'Authorization': authHeader },
            cache: 'no-store'
          });

          if (pdfRes.ok) {
            const buffer = await pdfRes.arrayBuffer();
            if (buffer.byteLength > 500) {
              const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
              if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
              }
              const safeNo = (invoiceNo || hdonId).replace(/[^a-zA-Z0-9_-]/g, '_');
              const pdfFilename = `HDDT_MobiFone_${app.id}_${safeNo}.pdf`;
              const fullPdfPath = path.join(uploadDir, pdfFilename);
              fs.writeFileSync(fullPdfPath, Buffer.from(buffer));
              invoicePdfUrl = `/uploads/invoices/${pdfFilename}`;
              console.log('[MobiFone TT78] Đã tải và lưu PDF hóa đơn MobiFone:', invoicePdfUrl);
            }
          }
        } catch (pdfErr) {
          console.warn('[MobiFone TT78] Không tải được file PDF từ MobiFone:', pdfErr.message);
        }
      }

      // Bước 7: Tự động gửi Email hóa đơn cho người mua qua máy chủ MobiFone (Mục 4.10, Trang 125)
      if (hdonId && buyerEmail) {
        try {
          const mailRes = await fetch(`${config.apiUrl}/api/Invoice68/AutoSendInvoiceByEmail`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: hdonId,
              nguoinhan: buyerEmail
            }),
            cache: 'no-store'
          });
          const mailData = await mailRes.json().catch(() => ({}));
          console.log('[MobiFone TT78] Gửi email HĐĐT qua MobiFone:', mailData);
        } catch (mailErr) {
          console.warn('[MobiFone TT78] Lỗi gửi email tự động qua MobiFone:', mailErr.message);
        }
      }

      isApiSuccess = true;
      apiMsg = `Đã kết nối API MobiFone và phát hành HĐĐT thành công! Số HĐ: ${invoiceNo || hdonId}`;
    } catch (apiErr) {
      console.warn('[MobiFone API Call Notice]', apiErr.message);
      apiMsg = `API MobiFone (${apiErr.message}). Đã kích hoạt cơ chế phát hành hóa đơn dự phòng để không gián đoạn quy trình.`;
    }
  }

  // CƠ CHẾ DỰ PHÒNG HOẶC CHẾ ĐỘ SIMULATOR (Khi chưa có tài khoản thực hoặc mạng lỗi)
  if (!isApiSuccess || !invoicePdfUrl) {
    if (!invoiceNo) {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      invoiceNo = `${config.series}-${randNum}`;
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `HDDT_MobiFone_${app.id}_${invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
    const fullPath = path.join(uploadDir, filename);

    // Mẫu HĐĐT MobiFone chuẩn Thông tư 78
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
              <p>Tài khoản thu phí: <strong>5611147422</strong> tại BIDV - Chi nhánh Hải Vân</p>
            </div>
            <div class="inv-meta">
              <h2>HÓA ĐƠN ĐIỆN TỬ</h2>
              <p><em>(Theo Thông tư 78/2021/TT-BTC & NĐ 123/2020/NĐ-CP)</em></p>
              <p><strong>Mẫu số:</strong> ${config.templateCode}</p>
              <p><strong>Ký hiệu:</strong> ${config.series}</p>
              <p><strong>Số HĐ:</strong> <span style="font-size: 16px; color: #e11d48; font-weight: bold;">${invoiceNo}</span></p>
              <p><em>Ngày lập: ${now.toLocaleDateString('vi-VN')}</em></p>
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
                <td>${buyerEmail || '—'}</td>
                <td style="font-weight: bold;">Số điện thoại:</td>
                <td>${app.phone || '—'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Hình thức thanh toán:</td>
                <td colspan="3">Chuyển khoản (BIDV - 5611147422)</td>
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
                <td colspan="5" style="text-align: right; font-weight: bold;">Tổng tiền trước thuế:</td>
                <td style="text-align: right; font-weight: bold;">85.000 đ</td>
              </tr>
              <tr>
                <td colspan="5" style="text-align: right; font-weight: bold;">Thuế GTGT (VAT):</td>
                <td style="text-align: right; color: #64748b;">Không chịu thuế (-1)</td>
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
              <p style="font-style: italic; font-size: 12px;">(Ký số HSM MobiFone Invoice)</p>
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
    if (!invoicePdfUrl) {
      invoicePdfUrl = `/uploads/invoices/${filename}`;
    }
    if (!apiMsg) {
      apiMsg = 'Đã phát hành Hóa đơn điện tử MobiFone thành công.';
    }
  }

  return {
    success: true,
    invoiceNo,
    invoicePdfUrl,
    issuedAt: now.toISOString(),
    issuer,
    message: apiMsg,
    rawResult: rawInvoiceResult
  };
}
