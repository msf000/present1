import React, { useRef, useState } from 'react';
import { Printer, X, Download, FileText, Palette, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { generateThemeImage } from '../services/geminiService';

interface OfficialLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  studentName: string;
  type: 'warning' | 'appreciation';
  schoolName?: string;
}

const OfficialLetterModal: React.FC<OfficialLetterModalProps> = ({ 
  isOpen, 
  onClose, 
  content, 
  studentName, 
  type,
  schoolName = 'المدرسة النموذجية'
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'design'>('content');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [themePrompt, setThemePrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      const bgStyle = backgroundImage 
        ? `background-image: url('${backgroundImage}'); background-size: cover; background-position: center;` 
        : '';
        
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>خطاب رسمي - ${studentName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Tajawal', sans-serif; padding: 0; margin: 0; }
              .page { 
                width: 210mm; height: 297mm; padding: 25mm; box-sizing: border-box; 
                margin: auto; position: relative;
                ${bgStyle}
              }
              .page-content { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; }
              .bg-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.85); z-index: 0; }
              .header { text-align: center; margin-bottom: 50px; border-bottom: 2px solid #000; padding-bottom: 20px; }
              .logo { font-size: 24px; font-weight: bold; }
              .date { text-align: left; margin-bottom: 30px; }
              .content { font-size: 18px; line-height: 1.8; text-align: justify; flex: 1; }
              .footer { margin-top: 50px; display: flex; justify-content: space-between; }
              .signature { text-align: center; }
              @media print {
                body { background: white; }
                .page { margin: 0; box-shadow: none; page-break-after: always; }
              }
            </style>
          </head>
          <body>
            <div class="page">
              ${backgroundImage ? '<div class="bg-overlay"></div>' : ''}
              <div class="page-content">
                <div class="header">
                  <div class="logo">المملكة العربية السعودية</div>
                  <div class="logo">وزارة التعليم</div>
                  <div class="logo">${schoolName}</div>
                </div>
                
                <div class="date">
                  التاريخ: ${new Date().toLocaleDateString('ar-EG')}
                </div>

                <div class="content">
                  ${content.replace(/\n/g, '<br/>')}
                </div>

                <div class="footer">
                   <div class="signature">
                      <strong>المرشد الطلابي</strong><br/><br/>
                      ....................
                   </div>
                   <div class="signature">
                      <strong>مدير المدرسة</strong><br/><br/>
                      ....................
                   </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleGenerateTheme = async () => {
    if (!themePrompt) return;
    setIsGeneratingImage(true);
    const img = await generateThemeImage(themePrompt);
    if (img) setBackgroundImage(img);
    setIsGeneratingImage(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Sidebar (Controls) */}
        <div className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
           <div className="bg-slate-800 text-white p-4">
              <h3 className="font-bold flex items-center gap-2">
                <FileText size={20} />
                تجهيز الخطاب
              </h3>
           </div>
           
           <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'content' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                المحتوى
              </button>
              <button 
                onClick={() => setActiveTab('design')}
                className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'design' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Palette size={16} />
                التصميم
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {activeTab === 'content' ? (
                 <div className="space-y-4">
                    <div className="text-sm text-slate-500">تم توليد النص تلقائياً بناءً على بيانات الطالب. يمكنك معاينة الشكل النهائي في اللوحة المقابلة.</div>
                    <div className="bg-slate-50 p-3 rounded text-xs text-slate-600 leading-relaxed border border-slate-200 max-h-60 overflow-y-auto">
                       {content}
                    </div>
                 </div>
              ) : (
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Sparkles size={16} className="text-purple-500" />
                          تصميم خلفية خاصة
                       </label>
                       <p className="text-xs text-slate-500">صف النمط الذي تريده للخلفية (مثلاً: إطار إسلامي ذهبي، أشكال هندسية زرقاء).</p>
                       <textarea 
                          value={themePrompt}
                          onChange={(e) => setThemePrompt(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded text-sm h-24 resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder="مثال: زخرفة هندسية إسلامية باللون الأزرق الفاتح..."
                       />
                       <button 
                          onClick={handleGenerateTheme}
                          disabled={isGeneratingImage || !themePrompt}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                       >
                          {isGeneratingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
                          توليد التصميم (AI)
                       </button>
                    </div>

                    {backgroundImage && (
                       <button 
                          onClick={() => setBackgroundImage(null)}
                          className="w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded text-sm transition-colors"
                       >
                          إزالة الخلفية
                       </button>
                    )}
                 </div>
              )}
           </div>

           <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
              <button 
                onClick={handlePrint}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-bold shadow-sm"
              >
                <Printer size={18} />
                <span>طباعة الخطاب</span>
              </button>
              <button 
                onClick={onClose}
                className="w-full py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              >
                إغلاق
              </button>
           </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-slate-200 overflow-y-auto p-4 md:p-8 flex justify-center">
           <div 
             ref={contentRef}
             className="bg-white w-[210mm] min-h-[297mm] shadow-lg text-slate-900 relative flex flex-col overflow-hidden transition-all duration-500"
             style={{
                backgroundImage: backgroundImage ? `url('${backgroundImage}')` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
             }}
           >
              {backgroundImage && <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px]"></div>}
              
              <div className="relative z-10 p-[20mm] flex flex-col h-full">
                  {/* Header */}
                  <div className="border-b-2 border-black pb-6 mb-8 flex justify-between items-center">
                     <div className="text-center">
                        <p className="font-bold text-sm">المملكة العربية السعودية</p>
                        <p className="font-bold text-sm">وزارة التعليم</p>
                        <p className="font-bold text-lg mt-1">{schoolName}</p>
                     </div>
                     <div className="w-20 h-20 border border-slate-300 rounded-full flex items-center justify-center text-xs text-slate-400 bg-white">
                        شعار
                     </div>
                     <div className="text-left text-sm">
                        <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                        <p>المرفقات: ...</p>
                     </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 text-lg leading-loose text-justify whitespace-pre-line font-serif">
                     {content}
                  </div>

                  {/* Footer / Signatures */}
                  <div className="mt-16 flex justify-between px-8">
                     <div className="text-center">
                        <p className="font-bold mb-8">المرشد الطلابي</p>
                        <p className="text-slate-400">....................</p>
                     </div>
                     <div className="text-center">
                        <p className="font-bold mb-8">مدير المدرسة</p>
                        <p className="text-slate-400">....................</p>
                     </div>
                  </div>
                  
                  {/* Stamp Placeholder */}
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-32 h-32 border-4 border-slate-400 rounded-full opacity-20 flex items-center justify-center -rotate-12 pointer-events-none">
                     الختم الرسمي
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OfficialLetterModal;