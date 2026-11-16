import { NextResponse } from 'next/server';
import { testMobifoneConnection } from '@/lib/mobifoneInvoice';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

export async function POST(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền kiểm tra kết nối API' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    
    // Nếu có truyền cấu hình tạm thời từ form trên giao diện
    const override = {};
    if (body.mobifone_api_url) override.apiUrl = body.mobifone_api_url;
    if (body.mobifone_username) override.username = body.mobifone_username;
    if (body.mobifone_password) override.password = body.mobifone_password;
    if (body.mobifone_tax_code) override.taxCode = body.mobifone_tax_code;
    if (body.mobifone_ma_dvcs) override.maDvcs = body.mobifone_ma_dvcs;

    const result = await testMobifoneConnection(Object.keys(override).length > 0 ? override : null);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      maDvcs: result.maDvcs,
      userId: result.userId,
      seriesList: result.seriesList || []
    });
  } catch (err) {
    console.error('[Test MobiFone Error]', err);
    return NextResponse.json({ success: false, error: 'Lỗi kiểm tra kết nối: ' + err.message }, { status: 500 });
  }
}
