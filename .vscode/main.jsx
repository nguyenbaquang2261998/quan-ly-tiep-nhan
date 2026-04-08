import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, AlertCircle, FileText, Printer, 
  Search, Users, LogIn, LogOut, Upload, Loader2,
  ShieldCheck, ArrowLeft, Eye, ShieldAlert
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, doc, updateDoc, orderBy 
} from 'firebase/firestore';

// --- FIREBASE & API CONFIG ---
const apiKey = ""; // API Key will be provided by environment
let app, auth, db, appId;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'he-thong-tham-tra';
} catch (error) {
  console.error("Firebase init error:", error);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('student'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (!user) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <nav className="bg-white shadow-sm print:hidden border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-1.5 rounded-lg mr-2 sm:mr-3">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-800">EduVerify <span className="text-blue-600">AI</span></span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-4">
              <button 
                onClick={() => setView('student')}
                className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${view === 'student' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Học Viên
              </button>
              {view.startsWith('admin') ? (
                <button 
                  onClick={() => setView('student')}
                  className="flex items-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-1" /> Thoát
                </button>
              ) : (
                <button 
                  onClick={() => setView('admin_login')}
                  className="flex items-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 shadow-sm"
                >
                  <LogIn className="w-4 h-4 mr-1" /> Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        {view === 'student' && <StudentPortal db={db} appId={appId} />}
        {view === 'admin_login' && <AdminLogin onLogin={() => setView('admin_dashboard')} />}
        {view === 'admin_dashboard' && <AdminDashboard db={db} appId={appId} onPrint={(student) => { setSelectedStudent(student); setView('print_preview'); }} />}
        {view === 'print_preview' && selectedStudent && <PrintPreview student={selectedStudent} onBack={() => { setView('admin_dashboard'); setSelectedStudent(null); }} />}
      </main>
    </div>
  );
}

function StudentPortal({ db, appId }) {
  const [formData, setFormData] = useState({
    stt: '', hoTen: '', lop: '', ngaySinh: '',
    chucVu: '', queQuan: '', hocVan: '', capBac: '', vanBangBase64: '', camKet: false
  });
  const [fileError, setFileError] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [verifyResult, setVerifyResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFileError('Ảnh quá lớn (tối đa 2MB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, vanBangBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const callAIVerification = async (base64Image, studentInfo) => {
    const base64Data = base64Image.split(',')[1];
    const systemPrompt = `Bạn là chuyên gia thẩm định văn bằng pháp quy của Việt Nam. 
    Kiểm tra xem ảnh có phải là BẰNG ĐẠI HỌC/CAO ĐẲNG/TRUNG CẤP bản gốc hoặc sao y công chứng không.
    Đối chiếu Họ tên: ${studentInfo.hoTen} và Ngày sinh: ${studentInfo.ngaySinh}.
    Trả về JSON: { "is_valid": boolean, "status_text": string, "detail": string, "extracted_name": string, "extracted_dob": string }`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
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
      return JSON.parse(result.candidates[0].content.parts[0].text);
    } catch (error) {
      console.error("AI Call Error:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vanBangBase64) {
      setFileError('Vui lòng tải ảnh văn bằng.');
      return;
    }
    if (!formData.camKet) {
      alert('Vui lòng xác nhận cam kết.');
      return;
    }

    setStatus('processing');

    try {
      const aiResult = await callAIVerification(formData.vanBangBase64, formData);
      const docData = {
        ...formData,
        ngayNop: new Date().toISOString(),
        ketQuaThamTra: aiResult.status_text,
        chiTietThamTra: aiResult.detail,
        aiExtractedName: aiResult.extracted_name,
        aiExtractedDob: aiResult.extracted_dob
      };

      const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
      await addDoc(studentsRef, docData);

      setVerifyResult(aiResult);
      setStatus('done');
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Hệ thống AI bận hoặc gặp lỗi kết nối.");
      setStatus('idle');
    }
  };

  const resetForm = () => {
    setFormData({ stt: '', hoTen: '', lop: '', ngaySinh: '', chucVu: '', queQuan: '', hocVan: '', capBac: '', vanBangBase64: '', camKet: false });
    setVerifyResult(null);
    setStatus('idle');
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-8 sm:px-8 sm:py-10 text-white relative overflow-hidden">
          <div className="relative z-10 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 uppercase tracking-tight">Xác thực văn bằng</h2>
            <p className="text-blue-100 text-sm sm:text-base opacity-90">Hệ thống thẩm định hồ sơ tự động qua ảnh chụp</p>
          </div>
          <ShieldCheck className="absolute -right-6 -bottom-6 w-32 h-32 sm:w-48 sm:h-48 text-white opacity-10 pointer-events-none" />
        </div>

        <div className="p-5 sm:p-8">
          {status === 'idle' && (
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                {/* Cột 1: Thông tin cá nhân */}
                <div className="space-y-5">
                   <h3 className="font-bold text-gray-800 border-l-4 border-blue-500 pl-3 text-base sm:text-lg">Thông tin định danh</h3>
                   
                   <div className="flex gap-4">
                      <div className="w-20 sm:w-24">
                        <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">STT</label>
                        <input required type="number" name="stt" value={formData.stt} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Họ và Tên</label>
                        <input required type="text" name="hoTen" value={formData.hoTen} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="NGUYỄN VĂN A" />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Ngày sinh</label>
                        <input required type="date" name="ngaySinh" value={formData.ngaySinh} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Lớp</label>
                        <input required type="text" name="lop" value={formData.lop} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Chức vụ</label>
                        <input required type="text" name="chucVu" value={formData.chucVu} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Cấp bậc</label>
                        <input required type="text" name="capBac" value={formData.capBac} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Quê quán</label>
                      <input required type="text" name="queQuan" value={formData.queQuan} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                   </div>

                   <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Trình độ học vấn</label>
                      <select required name="hocVan" value={formData.hocVan} onChange={handleInputChange} className="w-full px-3 py-3 sm:py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none">
                        <option value="">-- Chọn trình độ --</option>
                        <option value="Tiến sĩ">Tiến sĩ</option>
                        <option value="Thạc sĩ">Thạc sĩ</option>
                        <option value="Đại học">Đại học</option>
                        <option value="Cao đẳng">Cao đẳng</option>
                        <option value="Trung cấp">Trung cấp</option>
                      </select>
                   </div>
                </div>

                {/* Cột 2: Upload ảnh */}
                <div className="space-y-5">
                  <h3 className="font-bold text-gray-800 border-l-4 border-blue-500 pl-3 text-base sm:text-lg">Tải lên văn bằng</h3>
                  
                  <div className={`mt-1 flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed rounded-xl transition-all min-h-[220px] sm:h-64 relative ${formData.vanBangBase64 ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-gray-50'}`}>
                    {formData.vanBangBase64 ? (
                       <div className="w-full h-full flex flex-col items-center">
                         <img src={formData.vanBangBase64} alt="Preview" className="max-h-48 sm:max-h-full w-auto object-contain rounded-lg shadow-sm" />
                         <button onClick={() => setFormData(p => ({...p, vanBangBase64: ''}))} className="mt-3 sm:absolute sm:top-2 sm:right-2 flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md text-xs font-bold">
                           <AlertCircle className="w-3 h-3" /> Thay ảnh khác
                         </button>
                       </div>
                    ) : (
                      <div className="text-center">
                        <div className="bg-blue-100 p-3 sm:p-4 rounded-full mb-3 text-blue-600 inline-block">
                           <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">Chụp hoặc chọn ảnh</p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-2 px-4 italic">Yêu cầu ảnh bản gốc hoặc bản sao công chứng rõ nét, không mờ nhòe.</p>
                        <input id="file-upload" type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                      </div>
                    )}
                  </div>
                  {fileError && <p className="text-red-500 text-xs font-bold text-center">{fileError}</p>}
                  
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <label className="flex items-start cursor-pointer select-none">
                      <input type="checkbox" name="camKet" checked={formData.camKet} onChange={handleInputChange} className="mt-1 h-5 w-5 text-blue-600 rounded border-gray-300" />
                      <span className="ml-3 text-[11px] sm:text-xs leading-relaxed text-amber-900 font-medium">
                        Tôi cam đoan đây là ảnh <strong>BẢN GỐC/CÔNG CHỨNG</strong>. Tôi chịu trách nhiệm trước pháp luật về tính trung thực của hồ sơ này.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-base">
                  <ShieldCheck className="w-5 h-5" />
                  XÁC THỰC & NỘP HỒ SƠ
                </button>
              </div>
            </form>
          )}

          {status === 'processing' && (
            <div className="py-16 sm:py-24 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <Loader2 className="animate-spin text-blue-600 w-16 h-16 sm:w-20 sm:h-20" />
                <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
              </div>
              <div className="text-center px-6">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Đang thẩm định thực tế</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">AI đang kiểm tra phôi bằng, đối soát con dấu và đọc dữ liệu để xác thực hồ sơ của bạn...</p>
              </div>
              <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-full animate-[loading_4s_ease-in-out_infinite]" style={{width: '60%'}}></div>
              </div>
            </div>
          )}

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

                <button onClick={resetForm} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all text-sm">
                  Quay lại trang nộp hồ sơ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-gray-400 text-[10px] mt-6 px-8 leading-relaxed">Hệ thống EduVerify AI sử dụng công nghệ thị giác máy tính tiên tiến nhất để đảm bảo tính khách quan và minh bạch.</p>
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

function AdminDashboard({ db, appId, onPrint }) {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    const unsubscribe = onSnapshot(studentsRef, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (parseInt(a.stt) || 0) - (parseInt(b.stt) || 0));
      setStudents(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [db, appId]);

  const filtered = students.filter(s => (s.hoTen || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="p-4 sm:p-6 bg-slate-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-base sm:text-xl font-black flex items-center gap-2">
           DỰ DANH TIẾP NHẬN <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded text-xs">{students.length}</span>
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Tìm tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-blue-600" /></div> : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Học viên</th>
                <th className="px-4 py-3 hidden sm:table-cell">Lớp</th>
                <th className="px-4 py-3">AI</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-400 text-xs">{s.stt}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800 text-xs sm:text-sm">{s.hoTen}</div>
                    <div className="text-[10px] text-gray-500 sm:hidden">{s.lop}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium hidden sm:table-cell">{s.lop}</td>
                  <td className="px-4 py-3">
                    <div className={`text-[9px] sm:text-[10px] font-black inline-block px-1.5 py-0.5 rounded uppercase ${s.ketQuaThamTra === 'Hợp lệ' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.ketQuaThamTra === 'Hợp lệ' ? 'Hợp lệ' : 'Không hợp lệ'}
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
    </div>
  );
}

function PrintPreview({ student, onBack }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden pb-10">
      <div className="bg-slate-100 p-4 border-b border-gray-200 flex justify-between items-center print:hidden sticky top-16 z-40">
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 font-bold text-sm"><ArrowLeft className="w-4 h-4 mr-1" /> QUAY LẠI</button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold shadow-lg flex items-center gap-2 text-sm"><Printer className="w-4 h-4" /> IN PHIẾU</button>
      </div>
      <div className="p-6 sm:p-12 max-w-4xl mx-auto print:p-0">
        <div className="text-center mb-8 border-b-4 border-double border-slate-800 pb-6">
          <h1 className="text-base sm:text-lg font-bold uppercase">Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam</h1>
          <h2 className="text-xs sm:text-sm font-bold underline mb-6">Độc lập - Tự do - Hạnh phúc</h2>
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-widest mt-4">Phiếu Kết Quả Thẩm Định</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 sm:gap-y-6 text-sm sm:text-base mb-8">
          <div className="sm:col-span-2">Họ và tên: <span className="font-black uppercase">{student.hoTen}</span></div>
          <div>Ngày sinh: <span className="font-bold">{new Date(student.ngaySinh).toLocaleDateString('vi-VN')}</span></div>
          <div>Số thứ tự: <span className="font-bold">{student.stt}</span></div>
          <div>Lớp: <span className="font-bold">{student.lop}</span></div>
          <div>Trình độ: <span className="font-bold uppercase text-blue-700">{student.hocVan}</span></div>
        </div>
        <div className="border-2 sm:border-4 border-slate-800 p-4 sm:p-6 rounded-lg mb-8">
          <h4 className="font-black uppercase text-sm sm:text-lg mb-4 text-center border-b border-slate-200 pb-2 italic">Dữ liệu xác thực thực tế</h4>
          <div className="space-y-3 text-xs sm:text-sm">
             <div className="flex justify-between">
                <span className="font-bold">Trạng thái:</span>
                <span className="font-black uppercase italic underline">{student.ketQuaThamTra}</span>
             </div>
             <div>
                <span className="font-bold">Phân tích AI:</span>
                <p className="mt-1 text-gray-700 italic leading-relaxed">{student.chiTietThamTra}</p>
             </div>
          </div>
        </div>
        <div className="page-break-inside-avoid">
           <h4 className="font-bold text-center mb-2 italic text-xs">Văn bằng đính kèm</h4>
           <div className="border border-slate-300 p-1">
             <img src={student.vanBangBase64} alt="Degree" className="max-w-full h-auto max-h-[300px] sm:max-h-[400px] mx-auto" />
           </div>
        </div>
        <div className="mt-12 flex justify-between text-center text-xs sm:text-sm">
           <div className="w-1/2">
             <p className="font-black mb-16 sm:mb-20 uppercase">Người nộp</p>
             <p className="font-bold">{student.hoTen}</p>
           </div>
           <div className="w-1/2">
             <p className="font-black mb-16 sm:mb-20 uppercase">Hệ thống AI</p>
             <p className="italic underline">Đã thẩm định điện tử</p>
           </div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .page-break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}