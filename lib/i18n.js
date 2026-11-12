'use client';
import { useState, useEffect } from 'react';

export const translations = {
  vi: {
    // Header
    home: 'Trang chủ',
    submit: 'Nộp hồ sơ',
    track: 'Tra cứu',
    admin: 'Quản trị',
    slogan: 'Phòng bệnh chủ động, vươn rộng tương lai',
    switch_lang: 'English',
    lang_code: 'vi',

    // Stepper
    step_0: 'Thông tin cá nhân',
    step_1: 'Giấy tờ đính kèm',
    step_2: 'Hình thức nhận KQ',
    step_3: 'Thanh toán & Hóa đơn',
    step_4: 'Xác nhận & Gửi',
    step_indicator: 'Bước {current} / {total}',

    // Privacy alert
    privacy_title: 'Chính sách bảo mật:',
    privacy_desc: 'Để đảm bảo an toàn thông tin cá nhân và tránh lộ lọt hình ảnh giấy tờ tùy thân, CDC Đà Nẵng không yêu cầu tải ảnh chụp CCCD/Hộ chiếu. Quý khách vui lòng nhập và đối chiếu thật chính xác số CCCD/Hộ chiếu để làm căn cứ cấp giấy chứng nhận.',

    // Step 0: Personal info
    full_name: 'Họ và tên người sử dụng dịch vụ',
    full_name_ph: 'NGUYỄN VĂN A',
    cccd: 'Số CCCD / Mã định danh cá nhân',
    cccd_ph: 'Nhập số CCCD (12 chữ số)',
    cccd_confirm: 'Xác nhận lại số CCCD',
    cccd_confirm_ph: 'Nhập lại chính xác số CCCD để xác nhận',
    cccd_match: '✓ Số CCCD đã trùng khớp',
    cccd_mismatch: '✗ Chưa trùng khớp với số CCCD đã nhập ở trên',
    passport: 'Số Hộ chiếu / Passport',
    passport_ph: 'Nhập số hộ chiếu (nếu có - không bắt buộc)',
    passport_hint: 'Không bắt buộc đối với công dân Việt Nam, cần thiết cho người nước ngoài hoặc khi có nhu cầu ghi nhận hộ chiếu',
    dob: 'Ngày sinh',
    gender: 'Giới tính',
    gender_select: '— Chọn giới tính —',
    gender_male: 'Nam',
    gender_female: 'Nữ',
    gender_other: 'Khác',
    phone: 'Số điện thoại liên hệ',
    phone_ph: '0901234567',
    email: 'Email liên hệ',
    email_ph: 'email@example.com',
    email_hint: 'Không bắt buộc. Chỉ bắt buộc khi chọn phương thức nhận kết quả qua Email.',
    address: 'Địa chỉ thường trú / Nơi ở',
    address_ph: 'Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành',
    commitment_text: 'Tôi xin cam đoan các thông tin cung cấp trên đây là chính xác và chịu trách nhiệm trước pháp luật về thông tin đã cung cấp.\nI hereby certify that the information provided above is accurate and take full legal responsibility for the information provided.',

    // Step 1: Documents
    doc_vaccine_title: 'Sổ tiêm chủng hoặc Giấy xác nhận tiêm chủng',
    doc_vaccine_desc: 'Đính kèm bản chụp hoặc file PDF rõ nét các trang ghi nhận mũi tiêm chủng cần cấp giấy chứng nhận.',
    drop_file: 'Kéo thả file vào đây hoặc bấm để chọn file',
    file_formats: 'Hỗ trợ định dạng: JPG, PNG, PDF (tối đa 15MB/file)',
    file_selected: 'Đã chọn tệp:',

    // Step 2: Receiving method
    receive_title: 'Chọn hình thức nhận kết quả',
    method_direct: 'Nhận trực tiếp tại CDC Đà Nẵng',
    method_direct_desc: 'Đến nhận trực tiếp tại bộ phận Một cửa — CDC Đà Nẵng (118 Lê Đình Lý, Thanh Khê, TP. Đà Nẵng).',
    method_email: 'Nhận qua Email (Bản điện tử / PDF có dấu đỏ)',
    method_email_desc: 'Giấy chứng nhận bản PDF có dấu đỏ và Hóa đơn điện tử sẽ được gửi trực tiếp về email đăng ký.',
    method_postal: 'Gửi qua Bưu điện (Chuyển phát nhanh)',
    method_postal_desc: 'Giấy chứng nhận bản gốc sẽ được gửi phát nhanh đến tận địa chỉ của bạn (người nhận thanh toán cước).',
    notes: 'Ghi chú thêm (nếu có)',
    notes_ph: 'Yêu cầu đặc biệt hoặc thông tin bổ sung cho cán bộ tiếp nhận...',

    // Step 3: Payment & Invoice
    payment_title: 'Thông tin tài khoản nhận thanh toán của Trung tâm:',
    org_name_label: 'Tên đơn vị:',
    org_name_val: 'Trung tâm Kiểm soát bệnh tật thành phố Đà Nẵng',
    org_addr_label: 'Địa chỉ:',
    org_addr_val: '118 Lê Đình Lý, phường Thanh Khê, TP. Đà Nẵng',
    bank_name_label: 'Ngân hàng:',
    bank_name_val: 'BIDV - Chi nhánh Đà Nẵng',
    acc_no_label: 'Số tài khoản:',
    fee_label: 'Số tiền lệ phí cố định:',
    fee_val: '85.000 VNĐ / hồ sơ',
    transfer_content_label: 'Nội dung chuyển khoản:',
    qr_title: 'Quét mã QR để thanh toán nhanh (BIDV VietQR)',
    qr_desc: 'Mã QR đã điền sẵn số tiền 85.000 VNĐ và nội dung chuyển tiền hợp lệ theo quy định.',
    receipt_title: 'Ảnh chụp Biên lai / Xác nhận chuyển khoản thành công',
    receipt_desc: 'Tải ảnh chụp màn hình ứng dụng ngân hàng thông báo chuyển khoản thành công.',
    receipt_selected: 'Đã đính kèm biên lai:',

    // Invoice
    invoice_sec_title: 'Thông tin xuất Hóa đơn điện tử (HĐĐT)',
    invoice_sec_desc: 'Kế toán thu phí sẽ kiểm tra tiền và phát hành Hóa đơn điện tử gửi về email cung cấp dưới đây.',
    invoice_type_personal: 'Hóa đơn Cá nhân',
    invoice_type_company: 'Hóa đơn Cơ quan / Công ty / Doanh nghiệp',
    invoice_personal_email: 'Email nhận Hóa đơn điện tử',
    invoice_company_name: 'Tên cơ quan, tổ chức / Công ty',
    invoice_company_name_ph: 'Công ty Cổ phần / TNHH...',
    invoice_tax_code: 'Mã số thuế (MST)',
    invoice_tax_code_ph: '0400123456',
    invoice_budget_code: 'Mã quan hệ ngân sách (nếu có)',
    invoice_company_addr: 'Địa chỉ cơ quan / công ty xuất hóa đơn',
    invoice_company_email: 'Email cơ quan nhận hóa đơn điện tử',

    // Step 4: Review
    review_title: 'Kiểm tra và xác nhận lại toàn bộ thông tin',
    review_desc: 'Vui lòng rà soát lại thông tin trước khi nhấn Gửi hồ sơ. Thông tin này sẽ được in trên Giấy chứng nhận và Hóa đơn điện tử.',

    // Buttons
    btn_back: 'Quay lại',
    btn_next: 'Tiếp tục',
    btn_submit: 'Gửi hồ sơ ngay',
    btn_submitting: 'Đang gửi hồ sơ...',

    // Result
    result_title: 'Nộp hồ sơ thành công!',
    result_desc: 'Hệ thống đã tiếp nhận hồ sơ của bạn. Vui lòng lưu lại mã tra cứu:',
    workflow_title: 'Quy trình xử lý:',
    workflow_1: '1. Bộ phận Kế toán kiểm tra xác nhận thanh toán và lập Hóa đơn điện tử.',
    workflow_2: '2. Khoa Phòng chống bệnh truyền nhiễm (PCBTN) đối chiếu lịch sử tiêm chủng và cấp Giấy chứng nhận.',
    workflow_3: '3. Kết quả Giấy chứng nhận & Hóa đơn điện tử sẽ được trả theo phương thức bạn đã đăng ký.',
    btn_track_now: 'Theo dõi hồ sơ',
    btn_submit_another: 'Nộp hồ sơ khác',

    // Validation errors
    err_name: 'Vui lòng nhập họ và tên người sử dụng dịch vụ',
    err_cccd: 'Vui lòng nhập số CCCD / Mã định danh cá nhân',
    err_cccd_len: 'Số CCCD phải từ 6 đến 15 ký tự',
    err_cccd_confirm: 'Vui lòng nhập lại số CCCD để xác nhận',
    err_cccd_mismatch: 'Số CCCD xác nhận không trùng khớp. Vui lòng kiểm tra lại thật chính xác.',
    err_dob: 'Vui lòng chọn ngày sinh của người sử dụng dịch vụ',
    err_gender: 'Vui lòng chọn giới tính',
    err_phone: 'Vui lòng nhập số điện thoại liên hệ hợp lệ (9-15 số)',
    err_address: 'Vui lòng nhập địa chỉ thường trú / nơi ở',
    err_email_invalid: 'Địa chỉ email không đúng định dạng',
    err_email_required_for_method: 'Bạn đã chọn hình thức nhận kết quả qua Email. Vui lòng nhập địa chỉ Email ở Bước 1 để nhận kết quả.',
    err_commit: 'Vui lòng đọc và tích chọn cam đoan tính chính xác của thông tin trước khi chuyển sang bước tiếp theo',
    err_vaccine: 'Vui lòng đính kèm file ảnh hoặc PDF Sổ / Chứng nhận tiêm chủng',
    err_receipt: 'Vui lòng đính kèm Ảnh chụp biên lai thanh toán chuyển khoản thành công',
    err_inv_company: 'Vui lòng nhập Tên cơ quan, tổ chức / Công ty xuất hóa đơn',
    err_inv_tax: 'Vui lòng nhập Mã số thuế của cơ quan / công ty',
    err_inv_addr: 'Vui lòng nhập Địa chỉ cơ quan / công ty xuất hóa đơn',
    err_inv_email: 'Vui lòng nhập Email nhận hóa đơn điện tử',
  },

  en: {
    // Header
    home: 'Home',
    submit: 'Submit Application',
    track: 'Track Status',
    admin: 'Staff Portal',
    slogan: 'Proactive Disease Prevention, Expanding the Future',
    switch_lang: 'Tiếng Việt',
    lang_code: 'en',

    // Stepper
    step_0: 'Personal Info',
    step_1: 'Documents',
    step_2: 'Delivery Method',
    step_3: 'Payment & Invoice',
    step_4: 'Review & Submit',
    step_indicator: 'Step {current} of {total}',

    // Privacy alert
    privacy_title: 'Privacy & Security Policy:',
    privacy_desc: 'To protect personal privacy and prevent identity theft, Danang CDC does NOT require uploading identity card/passport photos. Please enter and double-check your ID/Passport number accurately as it will be printed on the official certificate.',

    // Step 0: Personal info
    full_name: 'Full Name of Applicant',
    full_name_ph: 'JOHN SMITH',
    cccd: 'Citizen ID / National ID Number',
    cccd_ph: 'Enter ID number',
    cccd_confirm: 'Confirm ID Number',
    cccd_confirm_ph: 'Re-enter ID number accurately to confirm',
    cccd_match: '✓ ID numbers match',
    cccd_mismatch: '✗ Does not match the ID number entered above',
    passport: 'Passport Number (Optional)',
    passport_ph: 'Enter passport number (if applicable)',
    passport_hint: 'Optional for Vietnamese citizens; recommended for foreign nationals or international certificate requirements',
    dob: 'Date of Birth',
    gender: 'Gender',
    gender_select: '— Select gender —',
    gender_male: 'Male',
    gender_female: 'Female',
    gender_other: 'Other',
    phone: 'Phone Number',
    phone_ph: '+84 901234567',
    email: 'Contact Email',
    email_ph: 'email@example.com',
    email_hint: 'Optional. Only mandatory if you choose to receive results by Email.',
    address: 'Residential Address',
    address_ph: 'Street, Ward/District, City, Country',
    commitment_text: 'Tôi xin cam đoan các thông tin cung cấp trên đây là chính xác và chịu trách nhiệm trước pháp luật về thông tin đã cung cấp.\nI hereby certify that the information provided above is accurate and take full legal responsibility for the information provided.',

    // Step 1: Documents
    doc_vaccine_title: 'Vaccination Booklet or Immunization Record',
    doc_vaccine_desc: 'Attach clear photos or PDF scans of the vaccination booklet pages recording required vaccine doses.',
    drop_file: 'Drag and drop files here, or click to browse',
    file_formats: 'Supported formats: JPG, PNG, PDF (max 15MB/file)',
    file_selected: 'Selected file:',

    // Step 2: Receiving method
    receive_title: 'Select Delivery Method',
    method_direct: 'Direct Pickup at Danang CDC',
    method_direct_desc: 'Pick up in person at Danang CDC One-Stop Service Desk (118 Le Dinh Ly, Thanh Khe, Danang).',
    method_email: 'Receive by Email (Official Scan PDF with Red Seal)',
    method_email_desc: 'The official certificate with red seal and e-invoice will be emailed directly to your registered email.',
    method_postal: 'Postal Delivery (Express Courier)',
    method_postal_desc: 'The original hardcopy certificate will be delivered to your address (courier fee paid upon delivery).',
    notes: 'Additional Notes (Optional)',
    notes_ph: 'Special requests or notes for processing officers...',

    // Step 3: Payment & Invoice
    payment_title: 'Danang CDC Bank Account for Payment:',
    org_name_label: 'Beneficiary Unit:',
    org_name_val: 'Danang Center for Disease Control (Danang CDC)',
    org_addr_label: 'Address:',
    org_addr_val: '118 Le Dinh Ly, Thanh Khe District, Danang City',
    bank_name_label: 'Bank:',
    bank_name_val: 'BIDV - Danang Branch',
    acc_no_label: 'Account Number:',
    fee_label: 'Fixed Service Fee:',
    fee_val: '85,000 VND / application',
    transfer_content_label: 'Transfer Reference (Description):',
    qr_title: 'Scan QR to Pay via VietQR / BIDV',
    qr_desc: 'The QR code contains the fixed 85,000 VND fee and mandatory transfer description.',
    receipt_title: 'Payment Proof / Transfer Confirmation Screenshot',
    receipt_desc: 'Upload a screenshot of your successful bank transfer confirmation.',
    receipt_selected: 'Receipt attached:',

    // Invoice
    invoice_sec_title: 'Electronic Invoice (E-Invoice) Information',
    invoice_sec_desc: 'Cashier will verify payment and issue an official electronic invoice to the email provided below.',
    invoice_type_personal: 'Personal Invoice',
    invoice_type_company: 'Company / Organization Invoice',
    invoice_personal_email: 'Email to receive E-Invoice',
    invoice_company_name: 'Company / Organization Name',
    invoice_company_name_ph: 'Corporation / LLC / Organization name...',
    invoice_tax_code: 'Tax Identification Number (TIN / MST)',
    invoice_tax_code_ph: 'Tax code number',
    invoice_budget_code: 'State Budget Relation Code (if applicable)',
    invoice_company_addr: 'Company Registered Billing Address',
    invoice_company_email: 'Company Accounting Email for E-Invoice',

    // Step 4: Review
    review_title: 'Review and Confirm Application Details',
    review_desc: 'Please carefully check all details before submission. This information will be printed on the official certificate and invoice.',

    // Buttons
    btn_back: 'Back',
    btn_next: 'Continue',
    btn_submit: 'Submit Application',
    btn_submitting: 'Submitting application...',

    // Result
    result_title: 'Application Submitted Successfully!',
    result_desc: 'Your application has been received by Danang CDC. Please keep your tracking code:',
    workflow_title: 'Processing Workflow:',
    workflow_1: '1. Cashier department verifies payment and issues the electronic invoice.',
    workflow_2: '2. Communicable Disease Prevention Department (PCBTN) verifies vaccination records and issues the certificate.',
    workflow_3: '3. Official certificate and invoice will be delivered according to your chosen delivery method.',
    btn_track_now: 'Track Application Status',
    btn_submit_another: 'Submit Another Application',

    // Validation errors
    err_name: 'Please enter the applicant\'s full name',
    err_cccd: 'Please enter Citizen ID or Identification Number',
    err_cccd_len: 'ID number must be between 6 and 15 characters',
    err_cccd_confirm: 'Please re-enter ID number to confirm',
    err_cccd_mismatch: 'Confirmed ID number does not match. Please check carefully.',
    err_dob: 'Please select date of birth',
    err_gender: 'Please select gender',
    err_phone: 'Please enter a valid phone number (9-15 digits)',
    err_address: 'Please enter residential address',
    err_email_invalid: 'Invalid email address format',
    err_email_required_for_method: 'You selected delivery by Email. Please provide an email address in Step 1 to receive the results.',
    err_commit: 'Please read and check the commitment box to certify your information before continuing',
    err_vaccine: 'Please attach photo or PDF scan of vaccination record/booklet',
    err_receipt: 'Please attach proof of payment screenshot',
    err_inv_company: 'Please enter company / organization name',
    err_inv_tax: 'Please enter company tax code',
    err_inv_addr: 'Please enter company billing address',
    err_inv_email: 'Please enter email to receive electronic invoice',
  }
};

export function useLanguage() {
  const [lang, setLangState] = useState('vi');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cdc_portal_lang') : null;
    if (saved === 'en' || saved === 'vi') {
      setLangState(saved);
    }

    function handleLangChange() {
      const current = localStorage.getItem('cdc_portal_lang') || 'vi';
      setLangState(current);
    }

    window.addEventListener('cdc_lang_change', handleLangChange);
    return () => window.removeEventListener('cdc_lang_change', handleLangChange);
  }, []);

  function setLang(newLang) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cdc_portal_lang', newLang);
      window.dispatchEvent(new Event('cdc_lang_change'));
    }
    setLangState(newLang);
  }

  function t(key, params = {}) {
    let str = translations[lang]?.[key] || translations['vi']?.[key] || key;
    Object.keys(params).forEach(p => {
      str = str.replace(`{${p}}`, params[p]);
    });
    return str;
  }

  return { lang, setLang, t };
}
