import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  BookOpen,
  Search,
  Trash2,
  Loader2,
  Languages,
  FileText,
  Save,
  AlertCircle,
  X,
  Type,
  Sparkles,
  Volume2,
  PlayCircle,
  ArrowLeft,
  PlusCircle,
  Edit,
  LayoutDashboard,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  Highlighter,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Filter,
  Gauge,
  CheckCircle,
  Undo,
  RefreshCw,
  CalendarClock,
  Paperclip,
  Video,
  Music,
  RotateCcw,
  RotateCw,
  Library,
  Palette,
  Download,
  Upload,
  Database
} from 'lucide-react';

const apiKey = "AIzaSyAqJ4PTBsFmSnAUEsk--uogP1196Ga5jZQ";

// --- Simple IndexedDB Wrapper for Large Storage ---
const dbName = "VocabMasterDB";
const storeName = "appData";

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveData = async (key, val) => {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(val, key);
  return tx.complete;
};

const getData = async (key) => {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const request = tx.objectStore(storeName).get(key);
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result);
  });
};

// --- Pastel Colors for Grammar Cards ---
const PASTEL_COLORS = [
  { id: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', hex: '#e0e7ff' },
  { id: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', hex: '#d1fae5' },
  { id: 'amber', bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', hex: '#fef3c7' },
  { id: 'rose', bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', hex: '#ffe4e6' },
  { id: 'violet', bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', hex: '#ede9fe' },
  { id: 'sky', bg: 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-200', hex: '#e0f2fe' },
  { id: 'orange', bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', hex: '#ffedd5' },
  { id: 'mint', bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200', hex: '#ccfbf1' },
];

// --- Custom Media Player with Seek Controls ---
const CustomMediaPlayer = ({ media }) => {
  const mediaRef = useRef(null);

  const seek = (seconds) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime += seconds;
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between overflow-hidden">
        <p className="text-xs font-bold text-slate-700 truncate flex items-center gap-1">
          {media.type === 'video' ? <Video className="w-3 h-3 text-indigo-500" /> : <Music className="w-3 h-3 text-indigo-500" />}
          {media.name}
        </p>
      </div>

      <div className="relative group">
        {media.type === 'video' ? (
          <video ref={mediaRef} controls className="w-full rounded-lg max-h-48 bg-black">
            <source src={media.url} />
          </video>
        ) : (
          <audio ref={mediaRef} controls className="w-full h-10 shadow-inner rounded-lg">
            <source src={media.url} />
          </audio>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-50">
        <button
          onClick={() => seek(-10)}
          className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
          title="Lùi 10 giây"
        >
          <RotateCcw size={18} />
          <span className="text-[10px] font-bold">-10s</span>
        </button>
        <button
          onClick={() => seek(-5)}
          className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
          title="Lùi 5 giây"
        >
          <RotateCcw size={18} />
          <span className="text-[10px] font-bold">-5s</span>
        </button>
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <button
          onClick={() => seek(5)}
          className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
          title="Tiến 5 giây"
        >
          <RotateCw size={18} />
          <span className="text-[10px] font-bold">+5s</span>
        </button>
        <button
          onClick={() => seek(10)}
          className="flex flex-col items-center gap-1 p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
          title="Tiến 10 giây"
        >
          <RotateCw size={18} />
          <span className="text-[10px] font-bold">+10s</span>
        </button>
      </div>
    </div>
  );
};

// --- Utility function to strip HTML tags for AI & TTS ---
const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// --- Custom Rich Text Editor Component ---
const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const isTyping = useRef(false);

  useEffect(() => {
    if (!isTyping.current && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
    isTyping.current = false;
  }, [value]);

  const execCmd = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    editorRef.current.focus();
    onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    isTyping.current = true;
    onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-inner">
      <div className="flex gap-1 p-2 bg-white border-b border-slate-200 flex-wrap items-center">
        <button onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="In đậm"><Bold size={16} /></button>
        <button onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="In nghiêng"><Italic size={16} /></button>
        <button onClick={() => execCmd('underline')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Gạch chân"><Underline size={16} /></button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button onClick={() => execCmd('backColor', '#fef08a')} className="p-2 hover:bg-yellow-100 text-yellow-600 rounded-lg transition-colors" title="Highlight Vàng"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#a7f3d0')} className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors" title="Highlight Xanh lá"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#fbcfe8')} className="p-2 hover:bg-pink-100 text-pink-600 rounded-lg transition-colors" title="Highlight Hồng"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#bfdbfe')} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Highlight Xanh dương"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#fed7aa')} className="p-2 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors" title="Highlight Cam"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#e9d5ff')} className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors" title="Highlight Tím"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', 'transparent')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors ml-1 border-l pl-3 border-slate-200" title="Xóa Highlight"><Eraser size={16} /></button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button onClick={() => execCmd('justifyLeft')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Căn trái"><AlignLeft size={16} /></button>
        <button onClick={() => execCmd('justifyCenter')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Căn giữa"><AlignCenter size={16} /></button>
        <button onClick={() => execCmd('justifyRight')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Căn phải"><AlignRight size={16} /></button>
        <button onClick={() => execCmd('justifyFull')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Căn đều"><AlignJustify size={16} /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="w-full h-80 px-5 py-4 outline-none overflow-y-auto leading-relaxed text-slate-700 custom-editor"
        placeholder={placeholder}
      />
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vocabList, setVocabList] = useState([]);
  const [passages, setPassages] = useState([]);
  const [grammarList, setGrammarList] = useState([]); // Grammar State
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(null);
  const [error, setError] = useState(null);

  // Form states - General Vocabulary Search
  const [newWord, setNewWord] = useState('');
  const [searchResultWords, setSearchResultWords] = useState([]);
  const [searchExInputs, setSearchExInputs] = useState({});
  const [vocabSearchTerm, setVocabSearchTerm] = useState('');
  const [learnedSearchTerm, setLearnedSearchTerm] = useState('');
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');
  const [reviewModalWordId, setReviewModalWordId] = useState(null);

  // Dashboard filter state
  const [dashboardFilter, setDashboardFilter] = useState('all');

  // Selection states
  const [selectedPassageId, setSelectedPassageId] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState(null);
  const [selectedGrammarId, setSelectedGrammarId] = useState(null);

  // Specific passage word add state
  const [passageWordInput, setPassageWordInput] = useState('');
  const [passageWordLoading, setPassageWordLoading] = useState(false);

  // States for editing extracted words (Preview)
  const [previewWordInput, setPreviewWordInput] = useState('');
  const [previewWordLoading, setPreviewWordLoading] = useState(false);
  const [editingExtractedIndex, setEditingExtractedIndex] = useState(null);
  const [editExtractedData, setEditExtractedData] = useState(null);

  // States for editing passage words (Detail view)
  const [editingPassageWordIndex, setEditingPassageWordIndex] = useState(null);
  const [editPassageWordData, setEditPassageWordData] = useState(null);

  // States for editing/adding grammar
  const [isAddingGrammar, setIsAddingGrammar] = useState(false);
  const [editingGrammarId, setEditingGrammarId] = useState(null);
  const [grammarTitle, setGrammarTitle] = useState('');
  const [grammarContent, setGrammarContent] = useState('');
  const [grammarColor, setGrammarColor] = useState('indigo');

  // States cho phép chỉnh sửa/thêm ví dụ khi đang ở chế độ Edit bài đọc
  const [editExEn, setEditExEn] = useState('');
  const [editExVi, setEditExVi] = useState('');

  // States cho phép bổ sung ví dụ ở màn hình chi tiết từ vựng
  const [detailExEn, setDetailExEn] = useState('');
  const [detailExVi, setDetailExVi] = useState('');

  // Passage states
  const [readingTitle, setReadingTitle] = useState('');
  const [readingContent, setReadingContent] = useState('');
  const [readingMedia, setReadingMedia] = useState([]);
  const [extractedWords, setExtractedWords] = useState([]);

  // Edit passage states
  const [isEditingPassage, setIsEditingPassage] = useState(false);
  const [editPassageTitle, setEditPassageTitle] = useState('');
  const [editPassageContent, setEditPassageContent] = useState('');
  const [editPassageMedia, setEditPassageMedia] = useState([]);

  // --- Data Backup & Restore ---
  const exportData = () => {
    const dataToExport = { vocabList, passages, grammarList };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VocabMaster_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.vocabList) setVocabList(importedData.vocabList);
        if (importedData.passages) setPassages(importedData.passages);
        if (importedData.grammarList) setGrammarList(importedData.grammarList);
        alert("Tuyệt vời! Đã phục hồi toàn bộ dữ liệu học tập thành công.");
      } catch (err) {
        alert("Lỗi: File sao lưu không hợp lệ. Vui lòng chọn đúng file JSON của VocabMaster.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // --- Load Data from IndexedDB ---
  useEffect(() => {
    const loadAppData = async () => {
      try {
        const savedVocab = await getData('vocabList');
        const savedPassages = await getData('passages');
        const savedGrammar = await getData('grammarList');
        if (savedVocab) setVocabList(savedVocab);
        if (savedPassages) setPassages(savedPassages);
        if (savedGrammar) setGrammarList(savedGrammar);
      } catch (e) {
        console.error("Lỗi khi nạp dữ liệu từ IndexedDB:", e);
      }
    };
    loadAppData();
  }, []);

  // --- Save Data to IndexedDB ---
  useEffect(() => {
    const saveToDB = async () => {
      try {
        await saveData('vocabList', vocabList);
        await saveData('passages', passages);
        await saveData('grammarList', grammarList);
      } catch (e) {
        setError("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra dung lượng trình duyệt.");
      }
    };
    // Debounce saving slightly to avoid too many writes
    const timer = setTimeout(() => {
      saveToDB();
    }, 500);
    return () => clearTimeout(timer);
  }, [vocabList, passages, grammarList]);

  const filterDataByTime = (data) => {
    if (dashboardFilter === 'all') return data;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return data.filter(item => {
      const diff = now - item.id;
      if (dashboardFilter === 'day') return diff <= oneDay;
      if (dashboardFilter === 'week') return diff <= 7 * oneDay;
      if (dashboardFilter === 'month') return diff <= 30 * oneDay;
      if (dashboardFilter === 'quarter') return diff <= 90 * oneDay;
      if (dashboardFilter === 'year') return diff <= 365 * oneDay;
      return true;
    });
  };

  const getDifficultyConfig = (level) => {
    switch (level) {
      case 3: return { label: 'Khó', color: 'bg-red-100 text-red-700 border-red-200' };
      case 2: return { label: 'Vừa', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default: return { label: 'Dễ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
  };

  const handleFileUpload = (e, setMediaState) => {
    const files = Array.from(e.target.files);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const type = file.type.startsWith('video/') ? 'video' : 'audio';
        setMediaState(prev => [...prev, {
          id: Date.now() + Math.random(),
          type,
          url: event.target.result,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = null;
  };

  const pcmToWav = (pcmBase64, sampleRate = 24000) => {
    const pcmData = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false);
    view.setUint32(4, 36 + pcmData.length, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, pcmData.length, true);

    const pcmView = new Uint8Array(buffer, 44);
    pcmView.set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const speak = async (text, id) => {
    if (audioLoading) return;
    setAudioLoading(id);
    setError(null);

    let retries = 0;
    const delays = [1000, 2000, 4000];

    const fetchAudio = async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }
          }
        })
      });

      if (!response.ok) throw new Error('TTS API failed');
      return await response.json();
    };

    try {
      let result;
      while (retries < 3) {
        try {
          result = await fetchAudio();
          break;
        } catch (e) {
          retries++;
          if (retries === 3) throw e;
          await new Promise(res => setTimeout(res, delays[retries - 1]));
        }
      }

      const audioPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (audioPart) {
        const wavBlob = pcmToWav(audioPart.inlineData.data);
        const audioUrl = URL.createObjectURL(wavBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setAudioLoading(null);
          URL.revokeObjectURL(audioUrl);
        };
        audio.play();
      }
    } catch (err) {
      setError("Không thể phát âm thanh lúc này.");
      setAudioLoading(null);
    }
  };

  const callGemini = async (prompt) => {
    let retries = 0;
    const delays = [1000, 2000, 4000];
    while (retries < 5) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        if (!response.ok) throw new Error('API request failed');
        const result = await response.json();
        return JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
      } catch (err) {
        retries++;
        if (retries === 5) throw err;
        await new Promise(res => setTimeout(res, delays[retries - 1]));
      }
    }
  };

  const generateWordInfo = async (wordToSearch = newWord) => {
    if (!wordToSearch.trim()) return;
    setLoading(true);
    setError(null);
    setSearchResultWords([]);
    setSearchExInputs({});
    setNewWord(wordToSearch);

    const prompt = `
      Phân tích (các) từ vựng tiếng Anh sau: "${wordToSearch}". Nếu có nhiều từ (ngăn cách bởi dấu phẩy), hãy phân tích TẤT CẢ.
      Trả về MẢNG JSON, mỗi phần tử đại diện cho 1 từ và có cấu trúc:
      [
        {
          "isValid": boolean,
          "suggestions": ["sug1", "sug2"],
          "word": "từ_đúng_chính_tả",
          "ipa": "phiên âm IPA",
          "type": "loại từ (Noun, Verb...)",
          "definition": "nghĩa tiếng Việt",
          "examples": [{"en": "English sentence", "vi": "nghĩa tiếng Việt"}]
        }
      ]
    `;

    try {
      const data = await callGemini(prompt);
      let results = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (data.words && Array.isArray(data.words)) {
        results = data.words;
      } else if (data.word || data.isValid !== undefined) {
        results = [data];
      }
      setSearchResultWords(results);
    } catch (err) {
      setError("Lỗi tra cứu AI. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const reSearchSingleWord = async (index, correctedWord) => {
    setLoading(true);
    setError(null);
    const prompt = `
      Phân tích từ vựng tiếng Anh: "${correctedWord}".
      Trả về JSON:
      {
        "isValid": boolean,
        "suggestions": [],
        "word": "correct_word",
        "ipa": "IPA",
        "type": "loại từ",
        "definition": "nghĩa tiếng Việt",
        "examples": [{"en": "English sentence", "vi": "nghĩa tiếng Việt"}]
      }
    `;
    try {
      const data = await callGemini(prompt);
      const newResults = [...searchResultWords];
      newResults[index] = Array.isArray(data) ? data[0] : (data.word ? data : newResults[index]);
      setSearchResultWords(newResults);
    } catch (err) {
      setError("Lỗi tra cứu AI cho từ " + correctedWord);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchExChange = (idx, field, value) => {
    setSearchExInputs(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), [field]: value }
    }));
  };

  const saveSingleSearchedWord = (idx) => {
    const wordObj = searchResultWords[idx];
    if (!wordObj.isValid) return;

    if (vocabList.some(v => v.word.toLowerCase() === wordObj.word.toLowerCase())) {
      setError(`Từ "${wordObj.word}" đã có trong kho từ vựng của bạn!`);
      return;
    }

    let finalWordData = { ...wordObj, difficulty: 1, id: Date.now() };
    const en = searchExInputs[idx]?.en?.trim();
    const vi = searchExInputs[idx]?.vi?.trim();
    if (en && vi) {
      finalWordData.examples = [...(finalWordData.examples || []), { en, vi }];
    }

    setVocabList([finalWordData, ...vocabList]);

    const newResults = searchResultWords.filter((_, i) => i !== idx);
    setSearchResultWords(newResults);

    if (newResults.length === 0) {
      setNewWord('');
      setSearchExInputs({});
      setActiveTab('dashboard');
    }
  };

  const saveAllSearchedWords = () => {
    let newWordsToAdd = [];
    let skippedWords = [];

    searchResultWords.forEach((wordObj, idx) => {
      if (wordObj.isValid) {
        if (vocabList.some(v => v.word.toLowerCase() === wordObj.word.toLowerCase())) {
          skippedWords.push(wordObj.word);
        } else {
          let finalWordData = { ...wordObj, difficulty: 1, isLearned: false, id: Date.now() + idx };
          const en = searchExInputs[idx]?.en?.trim();
          const vi = searchExInputs[idx]?.vi?.trim();
          if (en && vi) {
            finalWordData.examples = [...(finalWordData.examples || []), { en, vi }];
          }
          newWordsToAdd.push(finalWordData);
        }
      }
    });

    if (skippedWords.length > 0) {
      setError(`Đã bỏ qua các từ bị trùng: ${skippedWords.join(', ')}`);
    }

    if (newWordsToAdd.length > 0) {
      setVocabList([...newWordsToAdd, ...vocabList]);
      setSearchResultWords([]);
      setNewWord('');
      setSearchExInputs({});
      setActiveTab('dashboard');
    } else if (skippedWords.length > 0 && newWordsToAdd.length === 0) {
      setSearchResultWords([]);
      setNewWord('');
    }
  };

  const openReviewModal = (id, e) => {
    if (e) e.stopPropagation();
    setReviewModalWordId(id);
  };

  const confirmLearned = (days) => {
    if (!reviewModalWordId) return;
    const nextDate = days !== null ? Date.now() + days * 24 * 60 * 60 * 1000 : null;
    setVocabList(vocabList.map(w => w.id === reviewModalWordId ? { ...w, isLearned: true, nextReviewDate: nextDate } : w));
    setReviewModalWordId(null);
  };

  const undoLearned = (id, e) => {
    if (e) e.stopPropagation();
    setVocabList(vocabList.map(w => w.id === id ? { ...w, isLearned: false, nextReviewDate: null } : w));
  };

  const updateWordDifficulty = (id, level) => {
    setVocabList(vocabList.map(w => w.id === id ? { ...w, difficulty: level } : w));
  };

  const addToReviewFromPassage = (wordData, e) => {
    if (e) e.stopPropagation();
    const existingWord = vocabList.find(v => v.word.toLowerCase() === wordData.word.toLowerCase());
    let targetId;

    if (existingWord) {
      targetId = existingWord.id;
      setReviewModalWordId(targetId);
    } else {
      targetId = Date.now() + Math.floor(Math.random() * 1000);
      const newVocabItem = {
        ...wordData,
        id: targetId,
        difficulty: 1,
        isLearned: false
      };
      setVocabList([newVocabItem, ...vocabList]);
      setReviewModalWordId(targetId);
    }
  };

  // --- Reading Analysis ---
  const analyzePassage = async () => {
    const plainText = stripHtml(readingContent);
    if (!plainText.trim()) return;
    setLoading(true);
    setError(null);
    const prompt = `
      Trích xuất 5 từ vựng quan trọng từ đoạn văn sau: "${plainText}".
      Trả về mảng JSON chứa các đối tượng có cấu trúc:
      {
        "word": "từ tiếng Anh",
        "ipa": "phiên âm IPA",
        "type": "loại từ (danh từ, động từ...)",
        "definition": "nghĩa tiếng Việt",
        "examples": [{"en": "ví dụ tiếng Anh trích từ bài", "vi": "nghĩa tiếng Việt của ví dụ"}]
      }
    `;
    try {
      const data = await callGemini(prompt);
      const wordsWithDifficulty = (Array.isArray(data) ? data : (data.words || [])).map(w => ({ ...w, difficulty: 1 }));
      setExtractedWords(wordsWithDifficulty);
    } catch (err) {
      setError("Lỗi phân tích bài đọc.");
    } finally {
      setLoading(false);
    }
  };

  const savePassage = () => {
    if (!readingTitle.trim()) {
      setError("Vui lòng nhập tiêu đề cho bài đọc trước khi lưu.");
      return;
    }
    if (!readingContent) return;

    const newPassage = {
      id: Date.now(),
      title: readingTitle.trim(),
      content: readingContent,
      words: extractedWords,
      media: readingMedia
    };

    setPassages([newPassage, ...passages]);
    setReadingContent('');
    setReadingTitle('');
    setExtractedWords([]);
    setReadingMedia([]);
    setSelectedPassageId(newPassage.id);
    setError(null);
  };

  const handleAddWordToExtracted = async () => {
    if (!previewWordInput.trim()) return;
    setPreviewWordLoading(true);
    setError(null);
    const prompt = `
      Phân tích từ: "${previewWordInput}".
      Trả về JSON:
      {
        "isValid": boolean,
        "suggestions": ["s1", "s2"],
        "word": "correct_word",
        "ipa": "IPA",
        "type": "loại từ",
        "definition": "nghĩa tiếng Việt",
        "examples": [{"en": "English sentence", "vi": "nghĩa tiếng Việt"}]
      }
    `;
    try {
      const data = await callGemini(prompt);
      if (data && data.isValid) {
        setExtractedWords([{ ...data, difficulty: 1, id: Date.now() }, ...extractedWords]);
        setPreviewWordInput('');
      } else {
        setError(`Từ không hợp lệ. Gợi ý: ${data.suggestions?.join(", ") || "Không có"}`);
      }
    } catch (err) {
      setError("Lỗi khi thêm từ vào kết quả trích xuất.");
    } finally {
      setPreviewWordLoading(false);
    }
  };

  const handleAddWordToPassage = async (passageId) => {
    if (!passageWordInput.trim()) return;
    setPassageWordLoading(true);
    setError(null);

    const prompt = `
      Phân tích từ: "${passageWordInput}".
      Trả về JSON:
      {
        "isValid": boolean,
        "suggestions": ["suggestion1", "suggestion2"],
        "word": "correct_word",
        "ipa": "IPA",
        "type": "loại từ",
        "definition": "nghĩa tiếng Việt",
        "examples": [{"en": "English sentence", "vi": "nghĩa tiếng Việt"}]
      }
    `;

    try {
      const data = await callGemini(prompt);
      if (data && data.isValid) {
        setPassages(passages.map(p => {
          if (p.id === passageId) {
            return { ...p, words: [{ ...data, difficulty: 1, id: Date.now() }, ...p.words] };
          }
          return p;
        }));
        setPassageWordInput('');
      } else {
        setError(`Từ không hợp lệ. Gợi ý: ${data.suggestions?.join(", ") || "Không có"}`);
      }
    } catch (err) {
      setError("Lỗi khi thêm từ vào bài đọc.");
    } finally {
      setPassageWordLoading(false);
    }
  };

  const removeWordFromPassage = (passageId, wordIndex) => {
    setPassages(passages.map(p => {
      if (p.id === passageId) {
        return { ...p, words: p.words.filter((_, idx) => idx !== wordIndex) };
      }
      return p;
    }));
  };

  const saveEditPassageWord = (passageId) => {
    setPassages(passages.map(p => {
      if (p.id === passageId) {
        const newWords = [...p.words];
        let finalWordData = { ...editPassageWordData };
        if (editExEn.trim() && editExVi.trim()) {
          finalWordData.examples = [...(finalWordData.examples || []), { en: editExEn.trim(), vi: editExVi.trim() }];
        }
        newWords[editingPassageWordIndex] = finalWordData;
        return { ...p, words: newWords };
      }
      return p;
    }));
    setEditingPassageWordIndex(null);
    setEditExEn(''); setEditExVi('');
  };

  const getSelectedPassage = () => passages.find(p => p.id === selectedPassageId);
  const getSelectedWord = () => vocabList.find(w => w.id === selectedWordId);
  const getSelectedGrammar = () => grammarList.find(g => g.id === selectedGrammarId);

  const openPassage = (id) => {
    setSelectedPassageId(id);
    setActiveTab('reading');
    setSelectedWordId(null);
    setSelectedGrammarId(null);
    setIsEditingPassage(false);
  };

  const startEditingPassage = () => {
    const p = getSelectedPassage();
    if (p) {
      setEditPassageTitle(p.title);
      setEditPassageContent(p.content);
      setEditPassageMedia(p.media || []);
      setIsEditingPassage(true);
    }
  };

  const savePassageEdit = () => {
    if (!editPassageTitle.trim()) {
      setError("Vui lòng không để trống tiêu đề bài đọc.");
      return;
    }

    setPassages(passages.map(p => {
      if (p.id === selectedPassageId) {
        return { ...p, title: editPassageTitle.trim(), content: editPassageContent, media: editPassageMedia };
      }
      return p;
    }));
    setIsEditingPassage(false);
    setError(null);
  };

  // --- Grammar Logic ---
  const saveGrammar = () => {
    if (!grammarTitle.trim()) {
      setError("Vui lòng nhập tiêu đề bài ngữ pháp.");
      return;
    }
    if (editingGrammarId) {
      setGrammarList(grammarList.map(g => {
        if (g.id === editingGrammarId) {
          return { ...g, title: grammarTitle.trim(), content: grammarContent, color: grammarColor };
        }
        return g;
      }));
    } else {
      const newGrammar = {
        id: Date.now(),
        title: grammarTitle.trim(),
        content: grammarContent,
        color: grammarColor,
        createdAt: Date.now()
      };
      setGrammarList([newGrammar, ...grammarList]);
    }
    resetGrammarForm();
    setError(null);
  };

  const resetGrammarForm = () => {
    setGrammarTitle('');
    setGrammarContent('');
    setGrammarColor('indigo');
    setEditingGrammarId(null);
    setIsAddingGrammar(false);
  };

  const startEditGrammar = (id) => {
    const g = grammarList.find(x => x.id === id);
    if (g) {
      setGrammarTitle(g.title);
      setGrammarContent(g.content);
      setGrammarColor(g.color || 'indigo');
      setEditingGrammarId(id);
      setIsAddingGrammar(true);
      setSelectedGrammarId(null);
    }
  };

  const deleteGrammar = (id) => {
    if (confirm("Bạn có chắc chắn muốn xóa bài ngữ pháp này?")) {
      setGrammarList(grammarList.filter(g => g.id !== id));
      setSelectedGrammarId(null);
    }
  };

  const displayedVocab = filterDataByTime(vocabList);
  const displayedPassages = filterDataByTime(passages);

  const now = Date.now();
  const learningVocabList = displayedVocab.filter(item => !item.isLearned);
  const learnedVocabList = displayedVocab.filter(item => item.isLearned && (!item.nextReviewDate || item.nextReviewDate > now));
  const reviewVocabList = displayedVocab.filter(item => item.isLearned && item.nextReviewDate && item.nextReviewDate <= now);

  const filteredVocabList = learningVocabList.filter(item =>
    item.word.toLowerCase().includes(vocabSearchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(vocabSearchTerm.toLowerCase())
  );

  const filteredLearnedVocabList = learnedVocabList.filter(item =>
    item.word.toLowerCase().includes(learnedSearchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(learnedSearchTerm.toLowerCase())
  );

  const filteredReviewVocabList = reviewVocabList.filter(item =>
    item.word.toLowerCase().includes(reviewSearchTerm.toLowerCase()) ||
    item.definition.toLowerCase().includes(reviewSearchTerm.toLowerCase())
  );

  const getSelectedWordStatus = () => {
    const w = getSelectedWord();
    if (!w) return { isLearnedNow: false, isReviewing: false };
    const isReviewing = w.isLearned && w.nextReviewDate && w.nextReviewDate <= now;
    const isLearnedNow = w.isLearned && (!w.nextReviewDate || w.nextReviewDate > now);
    return { isLearnedNow, isReviewing };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-100">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hidden sm:block">Vocab</h1>
          </div>
          <nav className="flex bg-slate-100/50 p-1 rounded-xl overflow-x-auto custom-scrollbar">
            {[
              { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'vocabulary', label: 'Từ vựng', icon: <Languages className="w-4 h-4" /> },
              { id: 'reading', label: 'Bài đọc', icon: <BookOpen className="w-4 h-4" /> },
              { id: 'grammar', label: 'Ngữ pháp', icon: <Library className="w-4 h-4" /> },
              { id: 'learned', label: 'Đã học', icon: <CheckCircle className="w-4 h-4" /> },
              { id: 'review', label: 'Ôn tập', icon: <RefreshCw className="w-4 h-4" />, count: reviewVocabList.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedPassageId(null);
                  setSelectedWordId(null);
                  setSelectedGrammarId(null);
                  setIsAddingGrammar(false);
                }}
                className={`px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span className="hidden md:inline">{tab.icon}</span>
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" /> <span className="text-sm font-medium">{error}</span>
            </div>
            <button onClick={() => setError(null)}><X className="w-4 h-4 hover:text-red-900" /></button>
          </div>
        )}

        {/* ===================== CHI TIẾT TỪ VỰNG ===================== */}
        {selectedWordId && getSelectedWord() && (
          <div className="animate-in slide-in-from-bottom-8 duration-300">
            <button onClick={() => setSelectedWordId(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold transition-colors">
              <ArrowLeft className="w-5 h-5" /> Quay lại
            </button>
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 md:p-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800">{getSelectedWord().word}</h1>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg uppercase">{getSelectedWord().type}</span>
                    {getSelectedWordStatus().isLearnedNow && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-lg flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Đã học
                      </span>
                    )}
                    {getSelectedWordStatus().isReviewing && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-lg flex items-center gap-1">
                        <RefreshCw className="w-4 h-4" /> Cần ôn tập
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-mono text-indigo-600">{getSelectedWord().ipa}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => getSelectedWordStatus().isLearnedNow ? undoLearned(selectedWordId, e) : openReviewModal(selectedWordId, e)}
                      className={`p-3 rounded-2xl transition-colors ${getSelectedWordStatus().isLearnedNow ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                      title={getSelectedWordStatus().isLearnedNow ? "Hủy đánh dấu đã học" : "Đánh dấu đã học / Ôn xong"}
                    >
                      {getSelectedWordStatus().isLearnedNow ? <Undo className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => speak(getSelectedWord().word, `detail-word-${selectedWordId}`)}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl hover:bg-indigo-100 transition-colors font-bold"
                    >
                      {audioLoading === `detail-word-${selectedWordId}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                      Nghe phát âm
                    </button>
                    <button
                      onClick={() => {
                        setVocabList(vocabList.filter(v => v.id !== selectedWordId));
                        setSelectedWordId(null);
                      }}
                      className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
                      title="Xóa từ vựng"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 pl-3 pr-1"><Gauge className="w-4 h-4 inline mr-1" />Mức độ:</span>
                    {[
                      { val: 1, label: 'Dễ', col: 'hover:bg-emerald-100 hover:text-emerald-700' },
                      { val: 2, label: 'Vừa', col: 'hover:bg-amber-100 hover:text-amber-700' },
                      { val: 3, label: 'Khó', col: 'hover:bg-red-100 hover:text-red-700' }
                    ].map(btn => {
                      const isActive = (getSelectedWord().difficulty || 1) === btn.val;
                      const activeClass = isActive ? getDifficultyConfig(btn.val).color : 'text-slate-400 bg-transparent';
                      return (
                        <button
                          key={btn.val}
                          onClick={() => updateWordDifficulty(selectedWordId, btn.val)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors border ${isActive ? activeClass : 'border-transparent ' + btn.col}`}
                        >
                          {btn.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-3">Định nghĩa tiếng Việt</h3>
                <p className="text-2xl text-slate-700 font-medium leading-relaxed">{getSelectedWord().definition}</p>
              </div>

              <div className="mt-12">
                <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-6">Ví dụ câu ({getSelectedWord().examples?.length || 0})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getSelectedWord().examples?.map((ex, idx) => (
                    <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-colors">
                      <button
                        onClick={() => speak(ex.en, `detail-ex-${selectedWordId}-${idx}`)}
                        className="mb-4 p-2 bg-white text-indigo-600 rounded-full shadow-sm hover:shadow-md transition-all"
                      >
                        {audioLoading === `detail-ex-${selectedWordId}-${idx}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 size={16} className="w-4 h-4" />}
                      </button>
                      <p className="font-semibold text-lg text-slate-800 italic mb-2 leading-relaxed">"{ex.en}"</p>
                      <p className="text-slate-600">{ex.vi}</p>
                    </div>
                  ))}

                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 border-dashed hover:border-indigo-300 transition-colors flex flex-col justify-center">
                    <h4 className="font-bold text-sm text-slate-500 mb-4 flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Thêm ví dụ mới</h4>
                    <input
                      value={detailExEn}
                      onChange={e => setDetailExEn(e.target.value)}
                      placeholder="Câu tiếng Anh..."
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      value={detailExVi}
                      onChange={e => setDetailExVi(e.target.value)}
                      placeholder="Nghĩa tiếng Việt..."
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => {
                        if (detailExEn.trim() && detailExVi.trim()) {
                          setVocabList(vocabList.map(w => w.id === selectedWordId ? { ...w, examples: [...(w.examples || []), { en: detailExEn.trim(), vi: detailExVi.trim() }] } : w));
                          setDetailExEn('');
                          setDetailExVi('');
                        }
                      }}
                      disabled={!detailExEn.trim() || !detailExVi.trim()}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      Thêm vào danh sách
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: DASHBOARD ===================== */}
        {activeTab === 'dashboard' && !selectedWordId && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Tiến độ học tập</h2>
                <p className="text-slate-500">Xem lại các từ vựng và bài đọc bạn đã lưu</p>
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <Filter className="w-4 h-4 text-slate-400 ml-2" />
                <select
                  value={dashboardFilter}
                  onChange={(e) => setDashboardFilter(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 py-2 pr-4 outline-none cursor-pointer"
                >
                  <option value="all">Tất cả thời gian</option>
                  <option value="day">Thêm Hôm nay</option>
                  <option value="week">Tuần này</option>
                  <option value="month">Tháng này</option>
                  <option value="quarter">Quý này</option>
                  <option value="year">Năm này</option>
                </select>
              </div>
            </div>

            {/* --- Backup & Restore Panel --- */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
              <div className="flex items-center gap-4 z-10">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hidden sm:block">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Bảo vệ dữ liệu của bạn</h3>
                  <p className="text-sm text-slate-500 font-medium">Tải file Backup xuống máy tính để phòng ngừa mất dữ liệu khi xóa lịch sử web.</p>
                </div>
              </div>
              <div className="flex w-full md:w-auto gap-3 z-10 shrink-0">
                <button onClick={exportData} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md">
                  <Download className="w-4 h-4" /> Sao lưu
                </button>
                <label className="flex-1 md:flex-none px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200">
                  <Upload className="w-4 h-4" /> Phục hồi
                  <input type="file" accept=".json" className="hidden" onChange={importData} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-8 rounded-3xl text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Type className="w-32 h-32" /></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/20 rounded-2xl">
                      <Type className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-indigo-100 font-semibold mb-1">Từ vựng đang học</p>
                  <h2 className="text-5xl font-black">{learningVocabList.length} <span className="text-2xl font-medium text-indigo-200">từ</span></h2>
                  <p className="text-indigo-200 text-sm mt-3 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Đã hoàn thành: <span className="font-bold text-white">{learnedVocabList.length}</span> từ</p>
                  {reviewVocabList.length > 0 && (
                    <p className="text-amber-300 text-sm mt-1 flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Cần ôn tập: <span className="font-bold text-amber-200">{reviewVocabList.length}</span> từ</p>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900"><BookOpen className="w-32 h-32" /></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <button onClick={() => setActiveTab('reading')} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      Thêm bài <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold mb-1">Bài đọc theo bộ lọc</p>
                    <h2 className="text-5xl font-black text-slate-800">{displayedPassages.length} <span className="text-2xl font-medium text-slate-400">bài</span></h2>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Cột 1: Danh sách từ vựng */}
              <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col h-[700px]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Languages className="w-5 h-5 text-indigo-600" /> Danh sách từ vựng ({filteredVocabList.length})
                  </h2>
                  <button onClick={() => setActiveTab('vocabulary')} className="text-sm font-semibold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                    + Thêm từ
                  </button>
                </div>

                <div className="relative mb-4 shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm nhanh từ vựng..."
                    value={vocabSearchTerm}
                    onChange={e => setVocabSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 text-sm transition-all"
                  />
                </div>

                {filteredVocabList.length === 0 ? (
                  <div className="text-center py-12 opacity-60 m-auto">
                    <Search className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 text-sm">Không tìm thấy từ vựng nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar content-start flex-grow">
                    {filteredVocabList.map(item => {
                      const diffConfig = getDifficultyConfig(item.difficulty || 1);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedWordId(item.id)}
                          className="group p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex justify-between items-center"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors truncate">{item.word}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white rounded border uppercase text-slate-500 whitespace-nowrap">{item.type}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${diffConfig.color}`}>
                                {diffConfig.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 truncate">{item.definition}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => openReviewModal(item.id, e)}
                              className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors"
                              title="Đánh dấu đã học"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Cột 2: Danh sách bài đọc & Ngữ pháp */}
              <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col h-[700px]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" /> Bài đọc & Ngữ pháp
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar content-start flex-grow">
                  {grammarList.slice(0, 5).map(g => (
                    <div key={g.id} onClick={() => { setSelectedGrammarId(g.id); setActiveTab('grammar'); }} className="p-4 bg-amber-50/50 rounded-2xl border-l-4 border-amber-300 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group">
                      <div className="flex-1 min-w-0 pr-3">
                        <h3 className="font-bold text-amber-900 truncate text-lg mb-0.5">{g.title}</h3>
                        <p className="text-xs text-amber-600 font-bold uppercase tracking-widest">Ngữ pháp</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-amber-300 group-hover:text-amber-500" />
                    </div>
                  ))}
                  {displayedPassages.map(p => (
                    <div key={p.id} onClick={() => openPassage(p.id)} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-400 cursor-pointer transition-all hover:shadow-md flex items-center justify-between group">
                      <div className="flex-1 min-w-0 pr-3">
                        <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate text-lg mb-0.5">{p.title}</h3>
                        <p className="text-xs text-slate-500 font-medium">{p.words?.length || 0} từ vựng nổi bật</p>
                      </div>
                      <div className="w-8 h-8 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-indigo-50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ===================== TAB: TỪ VỰNG ĐÃ HỌC ===================== */}
        {activeTab === 'learned' && !selectedWordId && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col h-[80vh]">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" /> Từ vựng đã nắm vững ({filteredLearnedVocabList.length})
                </h2>
              </div>

              <div className="relative mb-6 shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm từ đã học..."
                  value={learnedSearchTerm}
                  onChange={e => setLearnedSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-400 text-sm transition-all"
                />
              </div>

              {filteredLearnedVocabList.length === 0 ? (
                <div className="text-center py-12 opacity-60 m-auto">
                  <CheckCircle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Bạn chưa có từ vựng nào trong danh sách đã học.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar content-start flex-grow">
                  {filteredLearnedVocabList.map(item => {
                    const diffConfig = getDifficultyConfig(item.difficulty || 1);
                    const remainingDays = item.nextReviewDate ? Math.ceil((item.nextReviewDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedWordId(item.id)}
                        className="group p-5 bg-green-50/30 rounded-2xl border border-green-100 hover:border-green-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div className="mb-3">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-bold text-slate-800 text-xl group-hover:text-green-700 transition-colors truncate">{item.word}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white rounded border uppercase text-slate-500 whitespace-nowrap">{item.type}</span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{item.definition}</p>
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-3 border-t border-green-100/50">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-2 py-1 rounded-md border uppercase ${diffConfig.color}`}>
                              {diffConfig.label}
                            </span>
                            {remainingDays !== null && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 flex items-center gap-1 shadow-sm">
                                <CalendarClock className="w-3 h-3" />
                                Còn {remainingDays} ngày
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => undoLearned(item.id, e)}
                            className="p-2 text-green-500 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
                            title="Hủy đánh dấu đã học (chuyển về Đang học)"
                          >
                            <Undo className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================== TAB: TỪ VỰNG ÔN TẬP ===================== */}
        {activeTab === 'review' && !selectedWordId && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="bg-white rounded-3xl shadow-sm border border-amber-200 p-6 md:p-8 flex flex-col h-[80vh]">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2 text-amber-600">
                  <RefreshCw className="w-6 h-6" /> Tới hạn ôn tập ({filteredReviewVocabList.length})
                </h2>
              </div>

              <div className="relative mb-6 shrink-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm từ cần ôn..."
                  value={reviewSearchTerm}
                  onChange={e => setReviewSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-sm transition-all"
                />
              </div>

              {filteredReviewVocabList.length === 0 ? (
                <div className="text-center py-12 opacity-60 m-auto">
                  <CalendarClock className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Tuyệt vời! Bạn không có từ vựng nào cần ôn tập lúc này.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar content-start flex-grow">
                  {filteredReviewVocabList.map(item => {
                    const diffConfig = getDifficultyConfig(item.difficulty || 1);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedWordId(item.id)}
                        className="group p-5 bg-amber-50/30 rounded-2xl border border-amber-200 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div className="mb-3">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-bold text-slate-800 text-xl group-hover:text-amber-700 transition-colors truncate">{item.word}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white rounded border uppercase text-slate-500 whitespace-nowrap">{item.type}</span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{item.definition}</p>
                        </div>
                        <div className="flex justify-between items-center mt-auto pt-3 border-t border-amber-200/50">
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-md border uppercase ${diffConfig.color}`}>
                            {diffConfig.label}
                          </span>
                          <button
                            onClick={(e) => openReviewModal(item.id, e)}
                            className="p-2 text-amber-600 hover:text-white hover:bg-amber-500 bg-amber-100 rounded-full transition-colors flex items-center gap-1 text-xs font-bold px-3"
                            title="Đã ôn xong"
                          >
                            <CheckCircle className="w-3 h-3" /> Ôn xong
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================== TAB: THÊM TỪ VỰNG CHUNG ===================== */}
        {activeTab === 'vocabulary' && !selectedWordId && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" /> Tra cứu & Thêm từ mới
              </h2>
              <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Nhập một hoặc nhiều từ cách nhau bằng dấu phẩy (VD: link, van, can)..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                    onKeyPress={(e) => e.key === 'Enter' && generateWordInfo()}
                  />
                  {loading && <Loader2 className="absolute right-4 top-4 w-6 h-6 text-indigo-600 animate-spin" />}
                </div>
                <button
                  onClick={() => generateWordInfo()}
                  disabled={loading || !newWord.trim()}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 shadow-md shrink-0"
                >
                  Tra AI
                </button>
              </div>

              {searchResultWords.length > 0 && (
                <div className="mt-8 space-y-6">
                  {searchResultWords.length > 1 && (
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <h3 className="text-indigo-800 font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> Tìm thấy {searchResultWords.length} từ
                      </h3>
                      <button onClick={saveAllSearchedWords} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-colors">
                        <Save className="w-4 h-4" /> Lưu tất cả
                      </button>
                    </div>
                  )}

                  {searchResultWords.map((wordObj, idx) => (
                    <div key={idx} className="border border-indigo-100 bg-indigo-50/30 rounded-3xl p-6 md:p-8 animate-in zoom-in-95 relative">
                      {!wordObj.isValid ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                          <p className="text-amber-700 text-sm font-semibold mb-2">Từ "{wordObj.word || newWord.split(',')[idx]?.trim()}" không hợp lệ. Bạn có ý định tìm:</p>
                          <div className="flex flex-wrap gap-2">
                            {wordObj.suggestions?.map((s, sIdx) => (
                              <button key={sIdx} onClick={() => reSearchSingleWord(idx, s)} className="px-3 py-1 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 text-sm font-medium transition-colors">{s}</button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setSearchResultWords(searchResultWords.filter((_, i) => i !== idx))} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                          </button>

                          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 pr-10">
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-3xl font-black text-slate-800">{wordObj.word}</h3>
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded uppercase">{wordObj.type}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <p className="text-xl font-mono text-indigo-600">{wordObj.ipa}</p>
                                  <button onClick={() => speak(wordObj.word, `preview-general-${idx}`)} className="p-2 bg-white rounded-full shadow-sm hover:text-indigo-600 transition-colors">
                                    {audioLoading === `preview-general-${idx}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => saveSingleSearchedWord(idx)} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 active:scale-95 shadow-md shrink-0 transition-colors">
                              <Save className="w-5 h-5" /> Lưu từ này
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Định nghĩa</label>
                              <p className="text-xl text-slate-700 font-medium">{wordObj.definition}</p>

                              <div className="mt-6 pt-4 border-t border-indigo-100 space-y-2">
                                <input
                                  placeholder="Thêm ví dụ tiếng Anh..."
                                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                  value={searchExInputs[idx]?.en || ''}
                                  onChange={(e) => handleSearchExChange(idx, 'en', e.target.value)}
                                />
                                <input
                                  placeholder="Dịch nghĩa..."
                                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                  value={searchExInputs[idx]?.vi || ''}
                                  onChange={(e) => handleSearchExChange(idx, 'vi', e.target.value)}
                                />
                                <button onClick={() => addSearchEx(idx)} className="w-full py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors">
                                  + Thêm ví dụ thủ công
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ví dụ ({wordObj.examples?.length || 0})</label>
                              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {wordObj.examples?.map((ex, exIdx) => (
                                  <div key={exIdx} className="group bg-white p-4 rounded-2xl border border-slate-100 relative shadow-sm hover:shadow-md transition-all">
                                    <button onClick={() => {
                                      const newResults = [...searchResultWords];
                                      newResults[idx].examples = newResults[idx].examples.filter((_, i) => i !== exIdx);
                                      setSearchResultWords(newResults);
                                    }} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <X className="w-3 h-3" />
                                    </button>
                                    <div className="flex items-start gap-2">
                                      <button onClick={() => speak(ex.en, `ex-gen-${idx}-${exIdx}`)} className="mt-1 text-indigo-400 hover:text-indigo-600 transition-colors shrink-0">
                                        {audioLoading === `ex-gen-${idx}-${exIdx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 size={12} className="w-3 h-3" />}
                                      </button>
                                      <div>
                                        <p className="text-slate-800 font-semibold italic text-sm mb-1">"{ex.en}"</p>
                                        <p className="text-slate-500 text-xs">{ex.vi}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {(!wordObj.examples || wordObj.examples.length === 0) && (
                                  <p className="text-slate-400 italic text-sm text-center py-4">Chưa có ví dụ nào.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================== TAB: THÊM BÀI ĐỌC ===================== */}
        {activeTab === 'reading' && !selectedPassageId && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
            {/* Input Side */}
            <div className="lg:col-span-7 space-y-6">
              <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-indigo-600" /> Phân tích bài đọc mới</h2>
                <div className="space-y-4">
                  <input value={readingTitle} onChange={(e) => setReadingTitle(e.target.value)} placeholder="Nhập tiêu đề bài học..." className="w-full px-5 py-3 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />

                  {/* File đính kèm Upload */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors w-fit">
                      <Paperclip className="w-4 h-4" /> Đính kèm Audio / Video
                      <input type="file" accept="audio/*,video/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, setReadingMedia)} />
                    </label>
                    {readingMedia.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {readingMedia.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                            <span className="text-sm truncate max-w-[200px] font-medium flex items-center gap-2">
                              {m.type === 'video' ? <Video className="w-4 h-4 text-indigo-500" /> : <Music className="w-4 h-4 text-indigo-500" />}
                              {m.name}
                            </span>
                            <button onClick={() => setReadingMedia(prev => prev.filter(x => x.id !== m.id))} className="text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <RichTextEditor
                      value={readingContent}
                      onChange={setReadingContent}
                      placeholder="Dán văn bản tiếng Anh vào đây. Bạn có thể bôi đen để highlight từ vựng..."
                    />
                    {stripHtml(readingContent).trim() && (
                      <button
                        onClick={() => speak(stripHtml(readingContent), 'reading-main')}
                        className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all z-10"
                      >
                        {audioLoading === 'reading-main' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                        Đọc mẫu
                      </button>
                    )}
                  </div>
                  <button onClick={analyzePassage} disabled={loading || !stripHtml(readingContent).trim()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />} Trích xuất từ vựng
                  </button>
                </div>
              </section>
            </div>

            {/* Results Side */}
            <div className="lg:col-span-5 space-y-6">
              {/* Preview Extraction Result */}
              {extractedWords.length > 0 ? (
                <section className="bg-white rounded-3xl shadow-xl border border-indigo-200 p-6 animate-in slide-in-from-right-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-800"><Sparkles className="w-5 h-5" /> Tìm thấy {extractedWords.length} từ</h2>
                    <button onClick={savePassage} className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 shadow-md flex items-center gap-2"><Save className="w-4 h-4" /> Lưu bài học</button>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={previewWordInput}
                      onChange={e => setPreviewWordInput(e.target.value)}
                      placeholder="Thêm từ thủ công..."
                      className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 text-sm"
                      onKeyPress={e => e.key === 'Enter' && handleAddWordToExtracted()}
                    />
                    <button
                      onClick={handleAddWordToExtracted}
                      disabled={previewWordLoading || !previewWordInput.trim()}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[70px] shadow-sm"
                    >
                      {previewWordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thêm'}
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {extractedWords.map((w, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 group relative transition-all">
                        {editingExtractedIndex === idx ? (
                          <div className="space-y-2">
                            <input value={editExtractedData.word} onChange={e => setEditExtractedData({ ...editExtractedData, word: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none focus:border-indigo-400" placeholder="Từ vựng" />
                            <div className="flex gap-2">
                              <input value={editExtractedData.ipa} onChange={e => setEditExtractedData({ ...editExtractedData, ipa: e.target.value })} className="w-1/2 px-2 py-1.5 text-sm border rounded-lg outline-none focus:border-indigo-400" placeholder="Phiên âm" />
                              <input value={editExtractedData.type} onChange={e => setEditExtractedData({ ...editExtractedData, type: e.target.value })} className="w-1/2 px-2 py-1.5 text-sm border rounded-lg outline-none focus:border-indigo-400" placeholder="Loại từ" />
                            </div>
                            <textarea value={editExtractedData.definition} onChange={e => setEditExtractedData({ ...editExtractedData, definition: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none focus:border-indigo-400 resize-none" placeholder="Nghĩa tiếng Việt" rows="2" />

                            {/* Phần chỉnh sửa ví dụ (Preview) */}
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Ví dụ ({editExtractedData.examples?.length || 0})</p>
                              {editExtractedData.examples?.map((ex, exIdx) => (
                                <div key={exIdx} className="flex items-start gap-2 bg-white p-2 rounded border border-slate-100">
                                  <div className="flex-grow">
                                    <p className="text-xs font-semibold text-slate-800 italic">"{ex.en}"</p>
                                    <p className="text-xs text-slate-500">{ex.vi}</p>
                                  </div>
                                  <button onClick={() => {
                                    const newEx = editExtractedData.examples.filter((_, i) => i !== exIdx);
                                    setEditExtractedData({ ...editExtractedData, examples: newEx });
                                  }} className="text-slate-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                              <div className="flex flex-col gap-1 mt-2">
                                <input value={editExEn} onChange={e => setEditExEn(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded outline-none focus:border-indigo-400" placeholder="Thêm ví dụ tiếng Anh mới..." />
                                <input value={editExVi} onChange={e => setEditExVi(e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded outline-none focus:border-indigo-400" placeholder="Nghĩa tiếng Việt..." />
                                <button onClick={() => {
                                  if (editExEn && editExVi) {
                                    setEditExtractedData({
                                      ...editExtractedData,
                                      examples: [...(editExtractedData.examples || []), { en: editExEn, vi: editExVi }]
                                    });
                                    setEditExEn(''); setEditExVi('');
                                  }
                                }} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-900 mt-1 self-start">+ Thêm ví dụ</button>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-3 pt-2">
                              <button onClick={() => {
                                const newExtracted = [...extractedWords];

                                // Tự động gộp ví dụ đang gõ dở
                                let finalData = { ...editExtractedData };
                                if (editExEn.trim() && editExVi.trim()) {
                                  finalData.examples = [...(finalData.examples || []), { en: editExEn.trim(), vi: editExVi.trim() }];
                                }

                                newExtracted[idx] = finalData;
                                setExtractedWords(newExtracted);
                                setEditingExtractedIndex(null);
                                setEditExEn(''); setEditExVi('');
                              }} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">Lưu</button>
                              <button onClick={() => setEditingExtractedIndex(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300">Hủy</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => addToReviewFromPassage(w, e)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-white rounded-lg shadow-sm border border-slate-100" title="Thêm vào lịch ôn tập"><CalendarClock className="w-3 h-3" /></button>
                              <button onClick={() => { setEditingExtractedIndex(idx); setEditExtractedData(w); setEditExEn(''); setEditExVi(''); }} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-100" title="Chỉnh sửa"><Edit className="w-3 h-3" /></button>
                              <button onClick={() => setExtractedWords(extractedWords.filter((_, i) => i !== idx))} className="p-1.5 text-slate-400 hover:text-red-500 bg-white rounded-lg shadow-sm border border-slate-100" title="Xóa"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            <div className="flex flex-col pr-14">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="font-bold text-slate-800">{w.word}</span>
                                <span className="text-[10px] bg-white border px-1 rounded text-slate-500 uppercase">{w.type}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-indigo-600 font-mono">{w.ipa}</span>
                                <button onClick={() => speak(w.word, `prev-word-${idx}`)} className="text-indigo-400 hover:text-indigo-600">
                                  {audioLoading === `prev-word-${idx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 size={12} className="w-3 h-3" />}
                                </button>
                              </div>
                              <span className="text-sm text-slate-600 mb-2">{w.definition}</span>
                              {w.examples && w.examples.length > 0 && (
                                <div className="space-y-2 mt-1">
                                  {w.examples.map((ex, exIdx) => (
                                    <div key={exIdx} className="bg-white p-2 rounded-lg border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                                      <button onClick={() => speak(ex.en, `prev-word-ex-${idx}-${exIdx}`)} className="mt-0.5 text-indigo-400 hover:text-indigo-600 shrink-0">
                                        {audioLoading === `prev-word-ex-${idx}-${exIdx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 size={12} className="w-3 h-3" />}
                                      </button>
                                      <div>
                                        <p className="italic font-semibold text-slate-800 mb-1">"{ex.en}"</p>
                                        <p>{ex.vi}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <BookOpen className="w-12 h-12 mb-4 opacity-50" />
                  <p>Dán bài đọc và nhấn trích xuất để phân tích từ vựng</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== PASSAGE DETAIL VIEW ===================== */}
        {activeTab === 'reading' && selectedPassageId && getSelectedPassage() && (
          <div className="animate-in slide-in-from-bottom-8 duration-300">
            <button onClick={() => setSelectedPassageId(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold transition-colors">
              <ArrowLeft className="w-5 h-5" /> Quay lại
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Passage Content Left */}
              <div className="lg:col-span-7 space-y-6">
                <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                  {isEditingPassage ? (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="flex items-center gap-2 text-indigo-600 mb-4">
                        <Edit className="w-5 h-5" />
                        <h2 className="text-lg font-bold">Chỉnh sửa bài học</h2>
                      </div>
                      <input
                        value={editPassageTitle}
                        onChange={(e) => setEditPassageTitle(e.target.value)}
                        placeholder="Tiêu đề bài học..."
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xl text-slate-800"
                      />

                      <div className="flex flex-col gap-2 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors w-fit">
                          <Paperclip className="w-4 h-4" /> Đính kèm Audio / Video
                          <input type="file" accept="audio/*,video/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, setEditPassageMedia)} />
                        </label>
                        {editPassageMedia.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2">
                            {editPassageMedia.map(m => (
                              <div key={m.id} className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                                <span className="text-sm truncate max-w-[200px] font-medium flex items-center gap-2">
                                  {m.type === 'video' ? <Video className="w-4 h-4 text-indigo-500" /> : <Music className="w-4 h-4 text-indigo-500" />}
                                  {m.name}
                                </span>
                                <button onClick={() => setEditPassageMedia(prev => prev.filter(x => x.id !== m.id))} className="text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <RichTextEditor
                        value={editPassageContent}
                        onChange={setEditPassageContent}
                        placeholder="Nội dung bài học..."
                      />
                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          onClick={() => setIsEditingPassage(false)}
                          className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={savePassageEdit}
                          className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md"
                        >
                          <Save className="w-4 h-4" /> Lưu thay đổi
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-6">
                        <h1 className="text-2xl font-black text-slate-800 pr-4">{getSelectedPassage().title}</h1>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={startEditingPassage}
                            className="p-3 bg-slate-50 text-slate-500 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Chỉnh sửa bài học"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => speak(stripHtml(getSelectedPassage().content), `passage-${selectedPassageId}`)}
                            className="p-3 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                            title="Đọc văn bản"
                          >
                            {audioLoading === `passage-${selectedPassageId}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Hiển thị Media đính kèm với nút tua nhanh/lùi */}
                      {getSelectedPassage().media && getSelectedPassage().media.length > 0 && (
                        <div className="mb-6 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                          <h3 className="font-bold text-indigo-800 text-sm mb-3 flex items-center gap-2"><Paperclip className="w-4 h-4" /> File đính kèm</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {getSelectedPassage().media.map(m => (
                              <CustomMediaPlayer key={m.id} media={m} />
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap font-medium passage-content"
                        dangerouslySetInnerHTML={{ __html: getSelectedPassage().content }}
                      />
                    </>
                  )}
                </section>
              </div>

              {/* Passage Vocab Right */}
              <div className="lg:col-span-5 space-y-6">
                <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Plus className="w-4 h-4 text-indigo-500" /> Thêm từ mới vào bài này
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={passageWordInput}
                      onChange={e => setPassageWordInput(e.target.value)}
                      placeholder="Nhập từ..."
                      className="flex-grow px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 text-sm"
                      onKeyPress={e => e.key === 'Enter' && handleAddWordToPassage(selectedPassageId)}
                    />
                    <button
                      onClick={() => handleAddWordToPassage(selectedPassageId)}
                      disabled={passageWordLoading || !passageWordInput.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                    >
                      {passageWordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tra AI'}
                    </button>
                  </div>
                </section>

                <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
                    <span>Từ vựng của bài ({getSelectedPassage().words?.length || 0})</span>
                  </h3>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {(!getSelectedPassage().words || getSelectedPassage().words.length === 0) ? (
                      <p className="text-center text-slate-400 py-10 text-sm">Chưa có từ vựng nào trong bài này.</p>
                    ) : (
                      getSelectedPassage().words.map((w, idx) => (
                        <div key={idx} className="group p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all relative">
                          {editingPassageWordIndex === idx ? (
                            <div className="space-y-3">
                              <input value={editPassageWordData.word} onChange={e => setEditPassageWordData({ ...editPassageWordData, word: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-indigo-400" placeholder="Từ vựng" />
                              <div className="flex gap-2">
                                <input value={editPassageWordData.ipa} onChange={e => setEditPassageWordData({ ...editPassageWordData, ipa: e.target.value })} className="w-1/2 px-3 py-2 text-sm border rounded-lg outline-none focus:border-indigo-400" placeholder="Phiên âm" />
                                <input value={editPassageWordData.type} onChange={e => setEditPassageWordData({ ...editPassageWordData, type: e.target.value })} className="w-1/2 px-3 py-2 text-sm border rounded-lg outline-none focus:border-indigo-400" placeholder="Loại từ" />
                              </div>
                              <textarea value={editPassageWordData.definition} onChange={e => setEditPassageWordData({ ...editPassageWordData, definition: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-indigo-400 resize-none" placeholder="Định nghĩa" rows="2" />

                              {/* Phần chỉnh sửa ví dụ (Detail) */}
                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Ví dụ ({editPassageWordData.examples?.length || 0})</p>
                                {editPassageWordData.examples?.map((ex, exIdx) => (
                                  <div key={exIdx} className="flex items-start gap-2 bg-white p-2 rounded border border-slate-100">
                                    <div className="flex-grow">
                                      <p className="text-xs font-semibold text-slate-800 italic">"{ex.en}"</p>
                                      <p className="text-xs text-slate-500">{ex.vi}</p>
                                    </div>
                                    <button onClick={() => {
                                      const newEx = editPassageWordData.examples.filter((_, i) => i !== exIdx);
                                      setEditPassageWordData({ ...editPassageWordData, examples: newEx });
                                    }} className="text-slate-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                                  </div>
                                ))}
                                <div className="flex flex-col gap-2 mt-2">
                                  <input value={editExEn} onChange={e => setEditExEn(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-400" placeholder="Thêm ví dụ tiếng Anh mới..." />
                                  <input value={editExVi} onChange={e => setEditExVi(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-indigo-400" placeholder="Nghĩa tiếng Việt..." />
                                  <button onClick={() => {
                                    if (editExEn && editExVi) {
                                      setEditPassageWordData({
                                        ...editPassageWordData,
                                        examples: [...(editPassageWordData.examples || []), { en: editExEn, vi: editExVi }]
                                      });
                                      setEditExEn(''); setEditExVi('');
                                    }
                                  }} className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 self-start">+ Thêm ví dụ</button>
                                </div>
                              </div>

                              <div className="flex gap-2 mt-2">
                                <button onClick={() => saveEditPassageWord(selectedPassageId)} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700">Lưu thay đổi</button>
                                <button onClick={() => setEditingPassageWordIndex(null)} className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-300">Hủy</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => addToReviewFromPassage(w, e)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 bg-white rounded-lg shadow-sm border border-slate-100"
                                  title="Thêm vào lịch ôn tập"
                                >
                                  <CalendarClock className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setEditingPassageWordIndex(idx); setEditPassageWordData(w); setEditExEn(''); setEditExVi(''); }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-100"
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeWordFromPassage(selectedPassageId, idx)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 bg-white rounded-lg shadow-sm border border-slate-100"
                                  title="Xóa"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mb-1 pr-24">
                                <span className="font-bold text-lg text-slate-800">{w.word}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-white rounded border font-bold uppercase text-slate-500">{w.type}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-xs text-indigo-600 font-mono">{w.ipa}</p>
                                <button onClick={() => speak(w.word, `p-word-${selectedPassageId}-${idx}`)} className="text-indigo-400 hover:text-indigo-600">
                                  {audioLoading === `p-word-${selectedPassageId}-${idx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 size={12} className="w-3 h-3" />}
                                </button>
                              </div>
                              <p className="text-sm text-slate-700 font-medium mb-3">{w.definition}</p>
                              {w.examples && w.examples.length > 0 && (
                                <div className="space-y-2">
                                  {w.examples.map((ex, exIdx) => (
                                    <div key={exIdx} className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                                      <button onClick={() => speak(ex.en, `p-word-ex-${selectedPassageId}-${idx}-${exIdx}`)} className="mt-0.5 text-indigo-400 hover:text-indigo-600 shrink-0">
                                        {audioLoading === `p-word-ex-${selectedPassageId}-${idx}-${exIdx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 size={12} className="w-3 h-3" />}
                                      </button>
                                      <div>
                                        <p className="italic font-semibold text-slate-800 mb-1">"{ex.en}"</p>
                                        <p>{ex.vi}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: NGỮ PHÁP (GRAMMAR WORKSHOP) ===================== */}
        {activeTab === 'grammar' && (
          <div className="animate-in fade-in duration-300">
            {!selectedGrammarId && !isAddingGrammar && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black flex items-center gap-2 text-slate-800">
                    <Library className="w-6 h-6 text-indigo-600" /> Kho Ngữ Pháp
                  </h2>
                  <button
                    onClick={() => setIsAddingGrammar(true)}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Thêm cấu trúc
                  </button>
                </div>

                {grammarList.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                    <Library className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Bạn chưa có bài ngữ pháp nào.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {grammarList.map(g => {
                      const colorTheme = PASTEL_COLORS.find(c => c.id === g.color) || PASTEL_COLORS[0];
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGrammarId(g.id)}
                          className={`p-6 rounded-3xl border-2 hover:shadow-md transition-all cursor-pointer group flex flex-col h-[250px] ${colorTheme.bg} ${colorTheme.border}`}
                        >
                          <div className="mb-4 flex-grow">
                            <h3 className={`text-xl font-bold mb-2 line-clamp-2 ${colorTheme.text} group-hover:underline`}>{g.title}</h3>
                            <div
                              className="text-sm opacity-70 line-clamp-4"
                              dangerouslySetInnerHTML={{ __html: stripHtml(g.content) }}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-900/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                              {new Date(g.createdAt).toLocaleDateString()}
                            </span>
                            <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {isAddingGrammar && (
              <div className="max-w-4xl mx-auto space-y-6">
                <button onClick={() => setIsAddingGrammar(false)} className="mb-2 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Hủy soạn thảo
                </button>
                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                  <h2 className="text-2xl font-black text-indigo-600 flex items-center gap-2 mb-6">
                    <Edit className="w-6 h-6" /> {editingGrammarId ? 'Sửa bài học' : 'Soạn bài ngữ pháp'}
                  </h2>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Tiêu đề cấu trúc</label>
                    <input
                      value={grammarTitle}
                      onChange={e => setGrammarTitle(e.target.value)}
                      placeholder="Ví dụ: Thì hiện tại đơn, Câu điều kiện loại 1..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-lg"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Màu sắc chủ đề</label>
                    <div className="flex flex-wrap gap-3">
                      {PASTEL_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setGrammarColor(c.id)}
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${grammarColor === c.id ? `ring-2 ring-offset-2 ring-indigo-400 scale-110 border-white ${c.bg}` : `border-transparent hover:scale-105 ${c.bg}`}`}
                          title={`Màu ${c.id}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nội dung chi tiết</label>
                    <RichTextEditor
                      value={grammarContent}
                      onChange={setGrammarContent}
                      placeholder="Giải thích cách dùng, công thức, và các lưu ý quan trọng..."
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={saveGrammar}
                      disabled={!grammarTitle.trim()}
                      className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" /> Lưu bài học
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedGrammarId && !isAddingGrammar && (
              <div className="max-w-4xl mx-auto">
                <button onClick={() => setSelectedGrammarId(null)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Quay lại kho ngữ pháp
                </button>

                {(() => {
                  const g = grammarList.find(x => x.id === selectedGrammarId);
                  if (!g) return null;
                  const colorTheme = PASTEL_COLORS.find(c => c.id === g.color) || PASTEL_COLORS[0];

                  return (
                    <div className={`rounded-[3rem] p-8 md:p-14 border-4 border-white shadow-xl ${colorTheme.bg}`}>
                      <div className="flex justify-between items-start mb-8 border-b border-slate-900/10 pb-8">
                        <h1 className={`text-4xl md:text-5xl font-black tracking-tight ${colorTheme.text}`}>{g.title}</h1>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => startEditGrammar(g.id)} className="p-3 bg-white/50 text-slate-600 hover:text-indigo-600 rounded-full transition-colors" title="Chỉnh sửa">
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Bạn có chắc chắn muốn xóa bài ngữ pháp này?")) {
                                db.run("DELETE FROM grammar WHERE id = ?", [g.id]);
                                sync(db); refresh(db); setSelectedGrammarId(null);
                              }
                            }}
                            className="p-3 bg-white/50 text-slate-600 hover:text-red-500 rounded-full transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div
                        className={`prose prose-lg max-w-none passage-content ${colorTheme.text}`}
                        dangerouslySetInnerHTML={{ __html: g.content }}
                      />
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Review Modal */}
      {reviewModalWordId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CalendarClock className="w-6 h-6 text-indigo-600" /> Lên lịch ôn tập
              </h3>
              <button onClick={() => setReviewModalWordId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Từ vựng <strong className="text-indigo-600">"{vocabList.find(w => w.id === reviewModalWordId)?.word}"</strong> sẽ được tự động chuyển sang tab "Ôn tập" sau:
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[3, 5, 7, 15, 30].map(days => (
                <button
                  key={days}
                  onClick={() => confirmLearned(days)}
                  className="py-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl font-bold transition-colors border border-indigo-100"
                >
                  {days} ngày
                </button>
              ))}
              <button
                onClick={() => confirmLearned(null)}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors border border-slate-200"
              >
                Không nhắc lại
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* Placeholder support for contenteditable */
        [contenteditable].custom-editor:empty:before {
          content: attr(placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
        
        .passage-content mark {
          background-color: #fef08a;
          padding: 0.1em 0.3em;
          border-radius: 0.3em;
        }
      `}</style>
    </div>
  );
};

export default App;