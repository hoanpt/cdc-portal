import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    app: 'CDC Portal v2',
    version: '2.1.0',
    commit: 'a5d1d68',
    released_at: '2026-11-12T09:27:00+07:00',
    features: {
      cccd_upload_removed: true,
      cccd_reconfirmation: true,
      legal_commitment_bilingual: true,
      fee_fixed: 85000,
      bank: {
        name: 'BIDV',
        account: '5611147422',
        unit: 'Trung tâm Kiểm soát bệnh tật thành phố Đà Nẵng'
      },
      einvoice: {
        personal: true,
        company: true,
        budget_code: true
      },
      workflow_2_step: {
        step1_cashier: 'Lê Thị Mỹ Phượng (Xác nhận tiền & xuất HĐĐT)',
        step2_pcbtn: ['Nguyễn Thị Yến', 'Đoàn Cẩm Trúc', 'Đặng Thị Mai Khôi', 'Nguyễn Thị Kiều Diểm']
      },
      zalo_oa_notifications: true
    }
  });
}
