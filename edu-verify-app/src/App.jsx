import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertCircle, FileText, Printer,
  Search, Users, LogIn, LogOut, Upload, Loader2,
  ShieldCheck, ArrowLeft, Eye, ShieldAlert, Plus, Trash2, Edit, Save
} from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function App() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <nav className="bg-white shadow-sm print:hidden border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-1.5 rounded-lg mr-2 sm:mr-3">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-800">HVCT - Tiếp nhận</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<StudentPortal />} />
          <Route path="/admin/login" element={<AdminLogin onLogin={() => navigate('/admin/dashboard')} />} />
          <Route path="/admin/dashboard" element={<AdminDashboard onPrint={(student) => { setSelectedStudent(student); navigate('/admin/print'); }} />} />
          <Route path="/admin/config" element={<AdminConfig />} />
          <Route path="/admin/print" element={selectedStudent && <PrintPreview student={selectedStudent} onBack={() => { setSelectedStudent(null); navigate('/admin/dashboard'); }} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
export { AppWrapper };

function StudentPortal() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    stt: '', hoTen: '', lop: '', ngaySinh: '',
    chucVu: '', queQuan: '', hocVan: '', capBac: '', vanBangFile: null, camKet: false,
    donVi: '', soDienThoai: '', gioiTinh: '', danToc: '', doiTuong: '', region: ''
  });
  const [fileError, setFileError] = useState('');
  const [status, setStatus] = useState('idle');
  const [verifyResult, setVerifyResult] = useState(null);
  const [classes, setClasses] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesResponse, locationsResponse] = await Promise.all([
          fetch('/data/classes.json'),
          fetch('/data/location.json')
        ]);
        const classesData = await classesResponse.json();
        const locationsData = await locationsResponse.json();
        setClasses(classesData.filter(cls => cls.active === true));
        setLocations(locationsData.filter(loc => loc.active === true));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  const validateField = (name, value) => {
    if (name === 'hoTen' && value && !/^[a-zA-ZÀ-ỹ\s]+$/.test(value)) {
      return 'Họ tên chỉ được chứa chữ cái';
    }
    if (name === 'soDienThoai' && value && !/^0\d{9}$/.test(value)) {
      return 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)';
    }
    if (name === 'ngaySinh' && value) {
      const dob = new Date(value);
      const now = new Date();
      if (dob >= now) return 'Ngày sinh không hợp lệ';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    setErrors(prev => ({ ...prev, [name]: '' }));

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      return;
    }

    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setFormData(prev => ({ ...prev, region: location.name, donVi: '' }));
  };

  const step2RequiredFields = [
    'stt', 'hoTen', 'ngaySinh', 'danToc', 'queQuan',
    'soDienThoai', 'chucVu', 'capBac', 'hocVan', 'donVi'
  ];

  const isStep2Valid = () => {
    return step2RequiredFields.every(f => String(formData[f] || '').trim() !== '') &&
      !step2RequiredFields.some(f => errors[f]);
  };

  const nextStep = () => {
    if (currentStep === 2) {
      // Trigger validation on all required fields
      const newErrors = {};
      step2RequiredFields.forEach(f => {
        if (!String(formData[f] || '').trim()) {
          newErrors[f] = 'Trường này là bắt buộc';
        } else {
          const err = validateField(f, formData[f]);
          if (err) newErrors[f] = err;
        }
      });
      setErrors(prev => ({ ...prev, ...newErrors }));
      if (Object.values(newErrors).some(v => v)) return;
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedLocation(null);
    setFormData({
      stt: '', hoTen: '', ngaySinh: '', lop: '',
      chucVu: '', queQuan: '', hocVan: '', capBac: '',
      region: '', donVi: '', soDienThoai: '', gioiTinh: '',
      danToc: '', doiTuong: '', vanBangFile: null, camKet: false
    });
    setVerifyResult(null);
    setStatus('idle');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFileError('Ảnh quá lớn (tối đa 2MB).');
        return;
      }
      setFormData(prev => ({ ...prev, vanBangFile: file }));
    }
  };

  const callAIVerification = async (base64Image, studentInfo) => {
    const base64Data = base64Image.split(',')[1];
    const systemPrompt = `Bạn là chuyên gia thẩm định văn bằng pháp quy của Việt Nam. 
    Kiểm tra xem ảnh có phải là BẰNG ĐẠI HỌC/CAO ĐẲNG/TRUNG CẤP bản gốc hoặc sao y công chứng không.
    Đối chiếu Họ tên: ${studentInfo.hoTen} và Ngày sinh: ${studentInfo.ngaySinh}.
    Trả về JSON: { "is_valid": boolean, "status_text": string, "detail": string, "extracted_name": string, "extracted_dob": string }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { inlineData: { mimeType: "image/png", data: base64Data } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const result = await response.json();
    if (!response.ok || !result.candidates) {
      console.error("Gemini API error:", result);
      throw new Error(result.error?.message || "Gemini API error");
    }
    return JSON.parse(result.candidates[0].content.parts[0].text);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vanBangFile) { setFileError('Vui lòng tải ảnh văn bằng.'); return; }
    if (!formData.camKet) { alert('Vui lòng xác nhận cam kết.'); return; }

    setStatus('processing');
    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(formData.vanBangFile);
      });

      const aiResult = await callAIVerification(base64Image, formData);

      const formDataToSubmit = new FormData();
      formDataToSubmit.append('stt', formData.stt);
      formDataToSubmit.append('hoTen', formData.hoTen);
      formDataToSubmit.append('danToc', formData.danToc);
      formDataToSubmit.append('lop', formData.lop);
      formDataToSubmit.append('ngaySinh', formData.ngaySinh);
      formDataToSubmit.append('chucVu', formData.chucVu);
      formDataToSubmit.append('doiTuong', formData.doiTuong);
      formDataToSubmit.append('region', formData.region);
      formDataToSubmit.append('donVi', formData.donVi);
      formDataToSubmit.append('queQuan', formData.queQuan);
      formDataToSubmit.append('hocVan', formData.hocVan);
      formDataToSubmit.append('capBac', formData.capBac);
      formDataToSubmit.append('soDienThoai', formData.soDienThoai);
      formDataToSubmit.append('gioiTinh', formData.gioiTinh);
      formDataToSubmit.append('vanBangImage', formData.vanBangFile);
      formDataToSubmit.append('ketQuaThamTra', aiResult.status_text);
      formDataToSubmit.append('isValid', aiResult.is_valid);
      formDataToSubmit.append('chiTietThamTra', aiResult.detail);
      formDataToSubmit.append('aiExtractedName', aiResult.extracted_name || '');
      formDataToSubmit.append('aiExtractedDob', aiResult.extracted_dob || '');
      formDataToSubmit.append('camKet', String(formData.camKet));

      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        body: formDataToSubmit
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || errData.error || 'Lỗi server');
      }

      setVerifyResult(aiResult);
      setStatus('done');
    } catch (error) {
      console.error('❌ Lỗi:', error.message);
      alert('Lỗi: ' + error.message);
      setStatus('idle');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-8 sm:px-8 sm:py-10 text-white relative overflow-hidden">
          <div className="relative z-10 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 uppercase tracking-tight">Xác thực văn bằng</h2>
            <p className="text-blue-100 text-sm sm:text-base opacity-90">Hệ thống tiếp nhận & thẩm tra văn bằng sử dụng AI</p>
          </div>
          <ShieldCheck className="absolute -right-6 -bottom-6 w-32 h-32 sm:w-48 sm:h-48 text-white opacity-10 pointer-events-none" />
        </div>

        <div className="p-5 sm:p-8" style={{ textAlign: 'left' }}>
          {/* Step Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
                <span className="ml-2 text-sm font-medium">Khu vực</span>
              </div>
              <div className={`flex-1 h-1 mx-2 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
                <span className="ml-2 text-sm font-medium">Thông tin định danh</span>
              </div>
              <div className={`flex-1 h-1 mx-2 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
                <span className="ml-2 text-sm font-medium">Tải văn bằng</span>
              </div>
            </div>
          </div>

          {/* Processing Status */}
          {status === 'processing' && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Đang thẩm định thực tế</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">AI đang kiểm tra phôi bằng, đối soát con dấu và đọc dữ liệu để xác thực hồ sơ của bạn...</p>
              </div>
            </div>
          )}

          {/* Verification Result */}
          {status === 'done' && verifyResult && (
            <div className="py-2 sm:py-6 animate-in fade-in zoom-in duration-500">
              <div className={`rounded-2xl p-6 sm:p-8 border-2 shadow-xl ${verifyResult.is_valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex flex-col items-center text-center mb-6">
                  {verifyResult.is_valid ? (
                    <div className="bg-green-500 p-3 rounded-full text-white mb-4 shadow-lg">
                      <ShieldCheck className="w-10 h-10" />
                    </div>
                  ) : (
                    <div className="bg-red-500 p-3 rounded-full text-white mb-4 shadow-lg">
                      <ShieldAlert className="w-10 h-10" />
                    </div>
                  )}
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">
                    {verifyResult.status_text}
                  </h3>
                  <div className="bg-white/60 px-4 py-2 sm:px-6 sm:py-3 rounded-xl border border-current/5 text-sm sm:text-lg font-medium leading-relaxed">
                    {verifyResult.detail}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:gap-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dữ liệu đối soát</h4>
                    <div className="flex justify-between text-xs sm:text-sm border-b border-gray-50 pb-2">
                      <span className="text-gray-500 italic">Học viên khai:</span>
                      <span className="font-bold">{formData.hoTen}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm pt-1">
                      <span className="text-gray-500 italic">AI đọc trên bằng:</span>
                      <span className={`font-bold ${verifyResult.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                        {verifyResult.extracted_name || 'Không tìm thấy'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'idle' && (
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              {/* Step 1: Location Selection */}
              {currentStep === 1 && (
                <div>
                  <h3 className="font-bold text-gray-800 border-l-4 border-blue-500 pl-3 text-base sm:text-lg mb-6">Bước 1: Chọn khu vực tiếp nhận</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.map(location => (
                      <div
                        key={location.id}
                        onClick={() => handleLocationSelect(location)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedLocation?.id === location.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <h4 className="font-bold text-gray-800">{location.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{location.description || ''}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!selectedLocation}
                      className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        selectedLocation
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Tiếp tục →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Personal Information */}
              {currentStep === 2 && (
                <div>
                  <h3 className="font-bold text-gray-800 border-l-4 border-blue-500 pl-3 text-base sm:text-lg mb-6">Bước 2: Thông tin định danh</h3>

                  {/* Thông tin cá nhân */}
                  <div className="mb-8">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <div className="w-1 h-4 bg-blue-500 mr-2"></div>
                      Thông tin cá nhân
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-5">
                        <div className="flex gap-4">
                          <div className="w-20 sm:w-24">
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              STT <span className="text-red-500">*</span>
                            </label>
                            <input required type="number" name="stt" value={formData.stt} onChange={handleInputChange} className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.stt ? 'border-red-500' : 'border-gray-200'}`} />
                            {errors.stt && <p className="text-red-500 text-xs mt-1">{errors.stt}</p>}
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Họ và Tên <span className="text-red-500">*</span>
                            </label>
                            <input
                              required
                              type="text"
                              name="hoTen"
                              value={formData.hoTen}
                              onChange={handleInputChange}
                              className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.hoTen ? 'border-red-500' : 'border-gray-200'}`}
                              placeholder="NGUYỄN VĂN A"
                            />
                            {errors.hoTen && <p className="text-red-500 text-xs mt-1">{errors.hoTen}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Ngày sinh <span className="text-red-500">*</span>
                            </label>
                            <input
                              required
                              type="date"
                              name="ngaySinh"
                              value={formData.ngaySinh}
                              onChange={handleInputChange}
                              lang="vi-VN"
                              className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.ngaySinh ? 'border-red-500' : 'border-gray-200'}`}
                              style={{ colorScheme: 'light' }}
                            />
                            {errors.ngaySinh && <p className="text-red-500 text-xs mt-1">{errors.ngaySinh}</p>}
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Giới tính <span className="text-red-500">*</span>
                            </label>
                            <select required name="gioiTinh" value={formData.gioiTinh} onChange={handleInputChange} className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none ${errors.gioiTinh ? 'border-red-500' : 'border-gray-200'}`}>
                              <option value="">-- Chọn giới tính --</option>
                              <option value="nam">Nam</option>
                              <option value="nữ">Nữ</option>
                            </select>
                            {errors.gioiTinh && <p className="text-red-500 text-xs mt-1">{errors.gioiTinh}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Dân tộc <span className="text-red-500">*</span>
                            </label>
                            <input required type="text" name="danToc" value={formData.danToc} onChange={handleInputChange} className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.danToc ? 'border-red-500' : 'border-gray-200'}`} placeholder="Kinh" />
                            {errors.danToc && <p className="text-red-500 text-xs mt-1">{errors.danToc}</p>}
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Quê quán (Tỉnh/Thành phố) <span className="text-red-500">*</span>
                            </label>
                            <input required type="text" name="queQuan" value={formData.queQuan} onChange={handleInputChange} className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.queQuan ? 'border-red-500' : 'border-gray-200'}`} />
                            {errors.queQuan && <p className="text-red-500 text-xs mt-1">{errors.queQuan}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                            Số điện thoại <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            name="soDienThoai"
                            value={formData.soDienThoai}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.soDienThoai ? 'border-red-500' : 'border-gray-200'}`}
                            placeholder="09xxxxxxxx"
                          />
                          {errors.soDienThoai && <p className="text-red-500 text-xs mt-1">{errors.soDienThoai}</p>}
                        </div>

                        <div className="hidden">
                          <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Lớp</label>
                          <select name="lop" value={formData.lop} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none">
                            <option value="">-- Chọn lớp --</option>
                            {classes.map(cls => (
                              <option key={cls.id} value={cls.name}>{cls.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin công tác */}
                  <div className="mb-8">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <div className="w-1 h-4 bg-green-500 mr-2"></div>
                      Thông tin công tác
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Đối tượng <span className="text-red-500">*</span>
                            </label>
                            <select required disabled name="doiTuong" value={formData.doiTuong} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none">
                              <option value="CCLLCT">Cao cấp lý luận chính trị</option>
                              <option value="SQ">Sĩ quan</option>
                              <option value="QNCN">Quân nhân chuyên nghiệp</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Chức vụ <span className="text-red-500">*</span>
                            </label>
                            <input required type="text" name="chucVu" value={formData.chucVu} onChange={handleInputChange} className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.chucVu ? 'border-red-500' : 'border-gray-200'}`} />
                            {errors.chucVu && <p className="text-red-500 text-xs mt-1">{errors.chucVu}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Cấp bậc <span className="text-red-500">*</span>
                            </label>
                            <input required type="text" name="capBac" value={formData.capBac} onChange={handleInputChange} className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.capBac ? 'border-red-500' : 'border-gray-200'}`} />
                            {errors.capBac && <p className="text-red-500 text-xs mt-1">{errors.capBac}</p>}
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Trình độ (ĐH, ThS, TS) <span className="text-red-500">*</span>
                            </label>
                            <input required type="text" name="hocVan" value={formData.hocVan} onChange={handleInputChange} className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.hocVan ? 'border-red-500' : 'border-gray-200'}`} />
                            {errors.hocVan && <p className="text-red-500 text-xs mt-1">{errors.hocVan}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Khu vực tiếp nhận <span className="text-red-500">*</span>
                            </label>
                            <input required type="text" name="region" value={formData.region} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" readOnly />
                          </div>
                          <div>
                            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">
                              Đơn vị <span className="text-red-500">*</span>
                            </label>
                            <input required type="text" name="donVi" value={formData.donVi} onChange={handleInputChange} className={`w-full px-3 py-3 sm:py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm ${errors.donVi ? 'border-red-500' : 'border-gray-200'}`} placeholder="Nhập đơn vị của bạn" />
                            {errors.donVi && <p className="text-red-500 text-xs mt-1">{errors.donVi}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <button type="button" onClick={prevStep} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all">
                      ← Quay lại
                    </button>
                    <div className="flex flex-col items-end gap-1">
                      {!isStep2Valid() && (
                        <p hidden className="text-xs text-red-500">Vui lòng điền đầy đủ các trường bắt buộc</p>
                      )}
                      <button
                        type="button"
                        onClick={nextStep}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${
                          isStep2Valid()
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Tiếp tục →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: File Upload */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="font-bold text-gray-800 border-l-4 border-blue-500 pl-3 text-base sm:text-lg mb-6">Bước 3: Tải văn bằng</h3>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Ảnh văn bằng</label>
                    <div className={`mt-1 flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed rounded-xl transition-all min-h-[220px] sm:h-64 relative ${formData.vanBangFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-gray-50'}`}>
                      {formData.vanBangFile ? (
                        <div className="w-full h-full flex flex-col items-center">
                          <img src={URL.createObjectURL(formData.vanBangFile)} alt="Preview" className="max-h-48 sm:max-h-full w-auto object-contain rounded-lg shadow-sm" />
                          <button type="button" onClick={() => setFormData(p => ({ ...p, vanBangFile: null }))} className="mt-3 sm:absolute sm:top-2 sm:right-2 flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md text-xs font-bold">
                            <AlertCircle className="w-3 h-3" /> Thay ảnh khác
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 mb-2">Nhấn để chọn ảnh hoặc kéo thả file vào đây</p>
                          <p className="text-xs text-gray-500">JPG, PNG (tối đa 2MB)</p>
                          <input
                            type="file"
                            name="vanBangFile"
                            onChange={handleFileChange}
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                    {fileError && <p className="text-red-500 text-xs mt-1">{fileError}</p>}
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      name="camKet"
                      checked={formData.camKet}
                      onChange={handleInputChange}
                      className="mt-1 mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-700">
                      Tôi cam kết các thông tin trên là đúng sự thật và chịu trách nhiệm trước pháp luật về tính xác thực của hồ sơ.
                    </label>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button type="button" onClick={prevStep} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all">
                      ← Quay lại
                    </button>
                    <button
                      type="submit"
                      disabled={!formData.vanBangFile || !formData.camKet}
                      className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        formData.vanBangFile && formData.camKet
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Nộp hồ sơ
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
      <p className="text-center text-gray-400 text-[10px] pt-2 px-8 leading-relaxed">Hệ thống Tiếp nhận học viên sử dụng công nghệ thị giác máy tính tiên tiến nhất để đảm bảo tính khách quan và minh bạch.</p>
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === 'admin123') onLogin();
    else setError('Mã PIN không đúng.');
  };
  return (
    <div className="max-w-md mx-auto mt-6 sm:mt-12 bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
      <div className="text-center mb-6 sm:mb-8">
        <div className="bg-slate-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7 sm:w-8 sm:h-8 text-slate-800" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">Quản trị viên</h2>
        <p className="text-xs sm:text-sm text-gray-500">Xác thực quyền cán bộ tiếp nhận</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-4">
        <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full px-4 py-4 sm:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-800 outline-none text-center text-lg tracking-widest" placeholder="Mã PIN" autoFocus />
        {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
        <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl hover:bg-slate-900 shadow-lg text-sm sm:text-base">Đăng nhập</button>
      </form>
    </div>
  );
}

function AdminLayout({ children, title }) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin/dashboard', label: 'Danh sách học viên', icon: Users },
    { path: '/admin/config', label: 'Cấu hình khu vực', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <span className="font-bold text-gray-800 text-lg">Trang quản lý</span>
            <nav className="hidden md:flex space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="md:hidden">
              <Link to="/" className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all">
                <LogOut className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden bg-white border-b border-gray-200 print:hidden">
        <div className="px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ padding: '0px' }}>
        {children}
      </div>
    </div>
  );
}

function AdminDashboard({ onPrint }) {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSTT, setFilterSTT] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const studentsPerPage = 10;
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/students?page=${currentPage}&limit=${studentsPerPage}`);
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error('❌ Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    const testConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/test');
        if (response.ok) {
          fetchStudents();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Server connection test error:', error);
        setLoading(false);
      }
    };

    testConnection();
  }, [currentPage]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:5000/api/students/latest');
        if (response.ok) {
          const data = await response.json();
          const currentFirstStudent = students[0];
          const newFirstStudent = data.student;
          if (currentFirstStudent && newFirstStudent && currentFirstStudent._id !== newFirstStudent._id) {
            const fullResponse = await fetch(`http://localhost:5000/api/students?page=${currentPage}&limit=${studentsPerPage}`);
            if (fullResponse.ok) {
              const fullData = await fullResponse.json();
              setStudents(fullData.students);
              setTotalPages(fullData.totalPages);
              setLastUpdate(Date.now());
            }
          }
        }
      } catch (error) {
        console.error('❌ Auto-refresh error:', error);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [students, currentPage, studentsPerPage]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const filtered = students.filter(s => {
    const matchesName = (s.hoTen || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSTT = filterSTT === '' || String(s.stt).includes(filterSTT);
    const matchesRegion = filterRegion === '' || (s.khuVucTiepNhan || '').toLowerCase().includes(filterRegion.toLowerCase());
    const matchesClass = filterClass === '' || (s.lop || '').toLowerCase().includes(filterClass.toLowerCase());
    const matchesDate = filterDate === '' || (new Date(s.ngayTiepNhan || s.ngayNop).toISOString().split('T')[0]) === filterDate;
    return matchesName && matchesSTT && matchesRegion && matchesClass && matchesDate;
  });

  return (
    <AdminLayout title="Danh sách tiếp nhận học viên">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-xl font-black flex items-center gap-2" style={{ color: 'unset' }}>
                Danh sách học viên <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded text-xs">{students.length}</span>
              </h2>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Auto-refresh</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Cập nhật: {new Date(lastUpdate).toLocaleTimeString('vi-VN')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" style={{ textAlign: 'left' }}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ngày tiếp nhận</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">STT</label>
              <input type="text" value={filterSTT} onChange={(e) => setFilterSTT(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nhập STT..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tên học viên</label>
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nhập tên..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Khu vực tiếp nhận</label>
              <input type="text" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nhập khu vực..." />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-600" /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Ngày tiếp nhận</th>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Ngày sinh</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Chức vụ</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Đơn vị</th>
                  <th className="px-4 py-3 hidden md:table-cell">Khu vực tiếp nhận</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Lớp</th>
                  <th className="px-4 py-3">Kết quả thẩm định</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => (
                  <tr key={s._id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium">
                      {s.ngayTiepNhan || s.ngayNop ? new Date(s.ngayTiepNhan || s.ngayNop).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-400 text-xs">{s.stt}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 text-xs sm:text-sm">{s.hoTen}</div>
                      <div className="text-[10px] text-gray-500 sm:hidden">{s.ngaySinh} • {s.lop}</div>
                      <div className="text-[10px] text-gray-500 sm:hidden">{s.khuVucTiepNhan || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium hidden sm:table-cell">{s.ngaySinh}</td>
                    <td className="px-4 py-3 text-xs font-medium hidden lg:table-cell">{s.chucVu || '-'}</td>
                    <td className="px-4 py-3 text-xs font-medium hidden lg:table-cell">{s.donVi || '-'}</td>
                    <td className="px-4 py-3 text-xs font-medium hidden md:table-cell">{s.khuVucTiepNhan || '-'}</td>
                    <td className="px-4 py-3 text-xs font-medium hidden sm:table-cell">{s.lop}</td>
                    <td className="px-4 py-3">
                      <div className={`text-[9px] sm:text-[10px] font-black inline-block px-1.5 py-0.5 rounded uppercase ${s.isValid === true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.isValid === true ? 'Hợp lệ' : 'Không hợp lệ'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onPrint(s)} className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100 inline-flex items-center">
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-between items-center p-4 bg-white border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Hiển thị {filtered.length} / {students.length} học viên
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                  {page}
                </button>
              ))}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function AdminConfig() {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({ name: '', description: '', active: true });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/data/location.json');
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  const handleAddLocation = () => {
    if (newLocation.name.trim()) {
      if (editingId !== null) {
        setLocations(prev => prev.map(loc => loc.id === editingId ? { ...loc, ...newLocation } : loc));
      } else {
        const newId = Math.max(...locations.map(l => l.id || 0), 0) + 1;
        setLocations(prev => [...prev, { ...newLocation, id: newId }]);
      }
      setNewLocation({ name: '', description: '', active: true });
      setEditingId(null);
    }
  };

  const handleEditLocation = (location) => {
    setNewLocation({ name: location.name, description: location.description, active: location.active });
    setEditingId(location.id);
  };

  const handleDeleteLocation = (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa khu vực này?')) {
      setLocations(prev => prev.filter(loc => loc.id !== id));
    }
  };

  const handleToggleActive = (id) => {
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, active: !loc.active } : loc));
  };

  return (
    <AdminLayout title="Cấu hình khu vực tiếp nhận">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-gray-100">
          <h2 className="text-base sm:text-xl font-black flex items-center gap-2">
            <Users className="w-5 h-5" />
            CẤU HÌNH KHU VỰC TIẾP NHẬN
          </h2>
        </div>

        <div className="p-4 sm:p-6">
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-4">
              {editingId !== null ? 'Cập nhật khu vực' : 'Thêm khu vực mới'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tên khu vực</label>
                <input type="text" value={newLocation.name} onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nhập tên khu vực..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
                <input type="text" value={newLocation.description} onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Nhập mô tả..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAddLocation} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all flex items-center gap-1">
                <Save className="w-4 h-4" />
                {editingId !== null ? 'Cập nhật' : 'Thêm'}
              </button>
              {editingId !== null && (
                <button onClick={() => { setNewLocation({ name: '', description: '', active: true }); setEditingId(null); }} className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-all">
                  Hủy
                </button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-4">Danh sách khu vực tiếp nhận</h3>
            {loading ? (
              <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-600" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map(location => (
                  <div key={location.id} className={`p-4 border-2 rounded-lg transition-all ${location.active ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800">{location.name}</h4>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditLocation(location)} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteLocation(location.id)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{location.description || ''}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${location.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {location.active ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                      <button onClick={() => handleToggleActive(location.id)} className={`text-xs font-medium px-2 py-1 rounded transition-all ${location.active ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                        {location.active ? 'Khóa' : 'Mở'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function PrintPreview({ student, onBack }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ fontFamily: 'initial' }}>
      <div className="p-6 sm:p-8 max-w-4xl mx-auto print:p-8 print:max-w-none" style={{ paddingTop: '0px' }}>
        <div className="text-center mb-8">
          <h4 className="font-bold text-lg">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
          <h4 className="font-bold text-lg">Độc lập - Tự do - Hạnh phúc</h4>
          <h4 className="font-bold text-lg mb-4 mt-8">PHIẾU ĐĂNG KÝ NHẬP HỌC</h4>
          <h4 className="font-bold text-lg">Lớp: {student.lop}</h4>
          <h4 className="font-bold text-lg">Kính gửi: Phòng đào tạo - Học viện Chính trị</h4>
        </div>

        <div className="mb-4" style={{ textAlign: 'left' }}>
          <h4 className="font-bold text-lg mb-4">I. THÔNG TIN HỌC VIÊN</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2"><span className="font-bold">1. Số thứ tự:</span> <span className="ml-2 font-bold">{student.stt}</span></div>
            <div className="col-span-2"><span className="font-bold">2. Họ và tên:</span> <span className="ml-2 uppercase font-black">{student.hoTen}</span></div>
            <div className="col-span-2"><span className="font-bold">3. Ngày sinh:</span> <span className="ml-2">{new Date(student.ngaySinh).toLocaleDateString('vi-VN')}</span></div>
            <div className="col-span-2"><span className="font-bold">4. Quê quán:</span> <span className="ml-2">{student.queQuan}</span></div>
            <div className="col-span-2"><span className="font-bold">5. Dân tộc:</span> <span className="ml-2">{student.danToc || '-'}</span></div>
            <div className="col-span-2"><span className="font-bold">6. Giới tính:</span> <span className="ml-2">{student.gioiTinh || '-'}</span></div>
          </div>
        </div>

        <div className="mb-4" style={{ textAlign: 'left' }}>
          <h4 className="font-bold text-lg mb-4">II. THÔNG TIN CÔNG TÁC</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2"><span className="font-bold">1. Cấp bậc:</span> <span className="ml-2">{student.capBac}</span></div>
            <div className="col-span-2"><span className="font-bold">2. Chức vụ:</span> <span className="ml-2">{student.chucVu}</span></div>
            <div className="col-span-2"><span className="font-bold">3. Đơn vị:</span> <span className="ml-2">{student.donVi || '-'}</span></div>
            <div className="col-span-2"><span className="font-bold">4. Trình độ học vấn:</span> <span className="ml-2 uppercase">{student.hocVan}</span></div>
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <h4 className="font-bold text-lg mb-4">III. THÔNG TIN LIÊN HỆ</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2"><span className="font-bold">1. Số điện thoại:</span> <span className="ml-2">{student.soDienThoai}</span></div>
          </div>
        </div>

        <div className="mt-2 text-center">
          <p className="text-xs">Tôi xin cam đoan các thông tin kê khai trên là hoàn toàn chính xác và chấp hành nghiêm chỉnh mọi quy chế, quy định của Học viện.</p>
          <div className="mt-4 mb-4">
            <p className="text-xs">Ngày {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
          <div className="col-span-2">
            <div className="pb-16 mb-2">
              <p className="text-sm font-bold">NGƯỜI KÊ KHAI</p>
              <p className="text-xs">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="font-bold uppercase">{student.hoTen}</p>
          </div>
        </div>

        <div className="page-break"></div>

        <div className="mb-8">
          <h4 className="font-bold text-lg mb-4 text-center">KẾT QUẢ THẨM ĐỊNH VĂN BẰNG</h4>
          <div className="border-2 border-slate-800 p-4 rounded">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-bold">Trạng thái:</span>
                <span className={`ml-2 font-black uppercase ${student.ketQuaThamTra === 'Hợp lệ' ? 'text-green-700' : 'text-red-700'}`}>
                  {student.ketQuaThamTra}
                </span>
              </div>
              <div>
                <span className="font-bold">Ngày thẩm định:</span>
                <span className="ml-2">{new Date().toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
            <div>
              <span className="font-bold">Chi tiết:</span>
              <p className="mt-2 text-sm text-gray-700 italic">{student.chiTietThamTra}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 max-w-4xl mx-auto print:p-8 print:max-w-none">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold uppercase">VĂN BẰNG ĐÍNH KÈM</h3>
          <p className="text-sm text-gray-600">Hình ảnh văn bằng gốc của học viên</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50">
          <img
            src={`http://localhost:5000/images/${student.vanBangImage}`}
            alt="Văn bằng gốc"
            className="w-full max-w-full mx-auto object-contain"
            style={{ maxHeight: '70vh' }}
          />
        </div>
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Hệ thống đã xác thực văn bằng này vào ngày {new Date().toLocaleDateString('vi-VN')}</p>
          <p>Mã xác thực: {student._id}</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .page-break { page-break-before: always; }
          .page-break-inside-avoid { break-inside: avoid; }
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}