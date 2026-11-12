import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    const db = await getDb();
    const account = await db.get('SELECT * FROM accounts WHERE id = ? OR username = ?', token.id, token.username);

    if (!account) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản người dùng' }, { status: 404 });
    }

    const isMatch = bcrypt.compareSync(currentPassword, account.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await db.run('UPDATE accounts SET password_hash = ? WHERE id = ?', newHash, account.id);

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error('[ChangePassword Error]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
