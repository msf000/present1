import { GoogleGenAI, Type } from "@google/genai";
import { Student, AttendanceRecord, AttendanceStatus } from '../types';

const getAiClient = () => {
  let apiKey = '';
  
  // 1. Try Vite environment variable (Standard for Vercel/Vite deployments)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // Continue if import.meta is not supported
  }

  // 2. Fallback to process.env (For Node.js or local preview environment)
  if (!apiKey && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  }

  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will not work. Please set VITE_API_KEY in your environment variables.");
  }

  return new GoogleGenAI({ apiKey });
};

export const analyzeAttendance = async (students: Student[], records: AttendanceRecord[]) => {
  try {
    const ai = getAiClient();
    
    // Prepare data summary for the AI
    // Map records to include notes clearly
    const recentRecords = records.slice(-50).map(r => ({
      status: r.status,
      note: r.note || '',
      date: r.date
    }));

    const dataSummary = {
      totalStudents: students.length,
      totalRecords: records.length,
      studentList: students.map(s => s.name),
      recentActivity: recentRecords,
    };

    const prompt = `
      أنت مساعد ذكي لمدير مدرسة. 
      لديك ملخص لبيانات الحضور:
      ${JSON.stringify(dataSummary)}

      المطلوب:
      1. تحليل أنماط الغياب العام.
      2. تحليل أسباب "الغياب بعذر" (Excused) بناءً على الملاحظات (Notes) المرفقة في البيانات (مثل: طبي، عائلي..).
      3. هل هناك أعذار متكررة تستدعي الانتباه؟
      4. تقديم نصائح إدارية مختصرة.
      
      اكتب التقرير باللغة العربية بأسلوب احترافي، ولا تذكر كود JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "عذراً، حدث خطأ أثناء تحليل البيانات. تأكد من إعداد مفتاح API بشكل صحيح (VITE_API_KEY).";
  }
};

export const analyzeStudentReport = async (student: Student, records: AttendanceRecord[]) => {
  try {
    const ai = getAiClient();
    
    const studentRecords = records.filter(r => r.studentId === student.id);
    const presentCount = studentRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const absentCount = studentRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const lateCount = studentRecords.filter(r => r.status === AttendanceStatus.LATE).length;
    const excusedCount = studentRecords.filter(r => r.status === AttendanceStatus.EXCUSED).length;
    
    // Extract notes for context
    const notes = studentRecords
      .filter(r => r.note && r.note.trim().length > 0)
      .map(r => `${r.date}: ${r.status} - ${r.note}`);

    const summary = {
      name: student.name,
      grade: student.grade,
      stats: { present: presentCount, absent: absentCount, late: lateCount, excused: excusedCount },
      notesHistory: notes
    };

    const prompt = `
      أنت مرشد طلابي. اكتب تقريراً لولي أمر الطالب:
      ${JSON.stringify(summary)}
      
      المطلوب:
      1. تقييم التزام الطالب.
      2. الإشارة إلى الملاحظات المسجلة (Notes) لتبرير الغياب أو شرح أسباب التأخير إن وجدت.
      3. إذا كان الطالب مجتهداً (غياب قليل)، امدحه.
      4. رسالة توجيهية قصيرة.
      
      اكتب باللغة العربية بأسلوب تربوي مهني.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating student report:", error);
    return "لا يمكن توليد التقرير حالياً. تأكد من إعداد مفتاح API.";
  }
};

export const analyzeMonthlyReport = async (monthName: string, grade: string, dailyStats: any[]) => {
  try {
    const ai = getAiClient();
    
    const prompt = `
      قم بتحليل تقرير الحضور الشهري التالي لشهر ${monthName} للصف ${grade === 'all' ? 'الكل' : grade}.
      البيانات اليومية (يوم: {حضور, غياب, تأخير}):
      ${JSON.stringify(dailyStats)}

      المطلوب:
      1. تحديد الأيام التي شهدت أعلى نسبة غياب.
      2. تحديد ما إذا كان هناك نمط معين (مثلاً غياب مرتفع في نهاية الأسبوع).
      3. تقديم ملخص عام عن انضباط هذا الشهر.
      
      اكتب التحليل في فقرة واحدة مركزة ومفيدة باللغة العربية.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating monthly report:", error);
    return "لا يمكن تحليل التقرير الشهري حالياً.";
  }
};

export const parseSmartAttendance = async (inputText: string, students: Student[]) => {
  try {
    const ai = getAiClient();
    
    // Create a minified student map for the prompt to save tokens and improve accuracy
    const studentMap = students.map(s => ({ id: s.id, name: s.name }));
    
    const prompt = `
      You are an intelligent attendance assistant for an Arabic school.
      I will give you a text describing attendance status for some students.
      Match the names in the text to this student list: ${JSON.stringify(studentMap)}.
      
      User Input: "${inputText}"
      
      Instructions:
      1. Identify student names from the text. Use fuzzy matching for Arabic names (e.g., "Ahmed" matches "أحمد").
      2. Determine their status: "present", "absent", "late", "excused".
      3. If a reason is provided, extract it as "note".
      4. Only return students explicitly mentioned in the text.
      
      Output JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              studentId: { type: Type.STRING },
              status: { type: Type.STRING },
              note: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Smart attendance error:", error);
    return [];
  }
};

export const processVoiceAttendance = async (audioBase64: string, mimeType: string, students: Student[]) => {
  try {
    const ai = getAiClient();
    
    const studentMap = students.map(s => ({ id: s.id, name: s.name }));
    
    const prompt = `
      Listen to the attendance voice record (Arabic).
      Match the names mentioned to this student list: ${JSON.stringify(studentMap)}.
      
      Return a JSON array of { studentId, status, note }.
      Status can be: present (حاضر), absent (غائب), late (متأخر), excused (بعذر).
      If a reason is mentioned (e.g. sick, traffic), put it in 'note'.
      
      Instructions:
      - Match Arabic pronunciations loosely to the names in the list.
      - Return ONLY the JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: audioBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              studentId: { type: Type.STRING },
              status: { type: Type.STRING },
              note: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Voice attendance error:", error);
    throw new Error("فشل تحليل الصوت، يرجى المحاولة مرة أخرى.");
  }
};

export const processImageAttendance = async (imageBase64: string, mimeType: string, students: Student[]) => {
  try {
    const ai = getAiClient();
    const studentMap = students.map(s => ({ id: s.id, name: s.name }));

    const prompt = `
      Analyze this image of a student attendance sheet (handwritten or printed).
      Match the names found in the image to this student list: ${JSON.stringify(studentMap)}.

      Determine the status for each matched student based on visual marks.
      - Checkmark/Tick (✓) or "P" usually means Present.
      - X/Cross (✕), "A", or "غ" usually means Absent.
      - "L" or "ت" usually means Late.
      
      Instructions:
      1. Extract names. Use fuzzy matching for Arabic text.
      2. Detect the mark next to the name.
      3. Return JSON array of { studentId, status, note }.
      
      Output JSON only.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: imageBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              studentId: { type: Type.STRING },
              status: { type: Type.STRING },
              note: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Image attendance error:", error);
    throw new Error("فشل تحليل الصورة، يرجى التأكد من وضوح الكتابة.");
  }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: "Transcribe the spoken Arabic/English text exactly. Do not add any other text." }
        ]
      }
    });
    return response.text;
  } catch (error) {
    console.error("Transcription error", error);
    return "";
  }
};

// --- TTS & Audio Playback Helpers ---

export const generateSpeech = async (text: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' }, // Zephyr (Male-ish) or Kore (Female-ish)
            },
        },
      },
    });
    
    // The API returns raw audio bytes in inlineData
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error", error);
    return null;
  }
};

// Helper to decode base64 string
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to play raw PCM data (Mono, 24kHz as per Gemini 2.5 TTS defaults)
export const playRawAudio = async (base64Audio: string) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext({ sampleRate: 24000 });
    
    // Decode manual buffer
    const audioBytes = decode(base64Audio);
    
    // Create AudioBuffer
    // Gemini TTS output is typically 24kHz mono PCM 16-bit
    // We need to convert Int16/Uint8 to Float32
    
    const dataInt16 = new Int16Array(audioBytes.buffer);
    const float32Data = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) {
      float32Data[i] = dataInt16[i] / 32768.0;
    }
    
    const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
    buffer.copyToChannel(float32Data, 0);
    
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
    
    return source; // return source in case we want to stop it
  } catch (e) {
    console.error("Error playing audio", e);
  }
};

export const streamAssistantMessage = async (
  message: string, 
  contextData: any
) => {
  const ai = getAiClient();
  
  const systemInstruction = `
    أنت المساعد الذكي لنظام إدارة المدارس.
    
    البيانات الحالية:
    ${JSON.stringify(contextData)}
    
    المهام:
    1. الإجابة عن أسئلة حول الحضور والطلاب.
    2. صياغة رسائل لأولياء الأمور.
    3. تقديم تحليلات سريعة.
    4. الإجابة عن الأسئلة العامة باستخدام البحث (مثل العطل الرسمية، الأخبار التعليمية).
    
    تعليمات:
    - تحدث باللغة العربية بأسلوب مهني وودود.
    - كن موجزاً ومباشراً.
    - استخدم تنسيق Markdown عند الحاجة.
  `;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      tools: [{googleSearch: {}}], // Enable Search
    }
  });

  return chat.sendMessageStream({ message });
};

export const generateSchoolLetter = async (
  studentName: string,
  grade: string,
  type: 'warning' | 'appreciation',
  details: { days?: string[], reason?: string }
) => {
  try {
    const ai = getAiClient();
    
    let prompt = '';
    
    if (type === 'warning') {
      prompt = `
        اكتب خطاب إنذار رسمي لولي أمر الطالب "${studentName}" بالصف "${grade}".
        الطالب لديه غيابات في الأيام التالية: ${details.days?.join(', ')}.
        مجموع أيام الغياب: ${details.days?.length}.
        
        الهيكل المطلوب:
        - ابدأ بـ "المكرم ولي أمر الطالب...".
        - ذكر عدد أيام الغياب وتواريخها بوضوح.
        - تحذير من تجاوز النسبة المسموحة وتأثير ذلك على الدرجات.
        - طلب الحضور للمدرسة أو التواصل مع المرشد الطلابي.
        - خاتمة رسمية (إدارة المدرسة).
        
        الصياغة:
        - لغة عربية فصحى، رسمية جداً، وحازمة ومهذبة.
        - لا تضع أي ترويسة أو توقيع، فقط نص الرسالة (body).
      `;
    } else {
      prompt = `
        اكتب خطاب شكر وتقدير لولي أمر الطالب "${studentName}" بالصف "${grade}".
        السبب: ${details.reason || 'الانتظام في الحضور والتميز السلوكي'}.
        
        الهيكل المطلوب:
        - ابدأ بـ "المكرم ولي أمر الطالب...".
        - شكر وتقدير لاهتمام الأسرة ومتابعتها.
        - الإشادة بالطالب وانتظامه.
        - تمنيات بالتوفيق.
        - خاتمة رسمية (إدارة المدرسة).
        
        الصياغة:
        - لغة عربية فصحى، رسمية، دافئة ومشجعة.
        - لا تضع أي ترويسة أو توقيع، فقط نص الرسالة (body).
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Letter generation error", error);
    return "عذراً، لم نتمكن من صياغة الخطاب حالياً.";
  }
};

export const generateThemeImage = async (prompt: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Create a professional letter background or border image. Style: ${prompt}. Minimalist, high quality, suitable for school documents. No text.` }]
      },
      config: {
         imageConfig: {
            aspectRatio: "3:4", 
         }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image gen error", error);
    return null;
  }
};

export const generateDailyInsight = async (summaryData: any) => {
  try {
    const ai = getAiClient();
    
    const prompt = `
      بناءً على ملخص بيانات المدرسة اليوم:
      ${JSON.stringify(summaryData)}
      
      قدم "رؤية استراتيجية" واحدة قصيرة جداً (سطرين كحد أقصى) للمدير.
      ركز على: صف دراسي معين يعاني من مشاكل، أو نمط غياب (مثل يوم معين)، أو نصيحة لتحسين الانضباط.
      ابدأ النصيحة مباشرة بدون مقدمات.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    return null;
  }
};