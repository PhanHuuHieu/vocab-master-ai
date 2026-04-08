import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from './components/toast/ToastProvider.jsx';
import ThemePresetSelector from './components/theme/ThemePresetSelector.jsx';
import { useThemePreset } from './theme/ThemePresetProvider.jsx';
import { DEFAULT_THEME_PRESET_NAME } from './theme/themePresets';
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
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Eraser,
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
  Database,
  Headphones,
  Gamepad2,
  Heart,
  LogIn,
  UserPlus,
  LogOut,
  Settings
} from 'lucide-react';

const CurriculumTab = lazy(() => import('./components/CurriculumTab'));
const DangerActionModal = lazy(() => import('./components/DangerActionModal'));

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_ORG_ID = import.meta.env.VITE_GROQ_ORG_ID || 'org_01knm1vfzde9fsfatqgnf95t6v';
const TTS_API_BASE_URL = 'http://127.0.0.1:8001';
const QWEN_TTS_MODEL_FALLBACKS = [
  { value: 'Qwen/Qwen3-TTS-0.6B', label: 'Qwen3-TTS 0.6B (fast)' },
  { value: 'Qwen/Qwen3-TTS-4B', label: 'Qwen3-TTS 4B (balanced)' },
  { value: 'Qwen/Qwen3-TTS-8B', label: 'Qwen3-TTS 8B (high quality)' }
];
const VOICE_PREVIEW_SAMPLE_TEXT = 'Hello! This is your selected voice model. Xin chao, day la giong ban vua chon.';

const WORD_TYPE_OPTIONS = [
  'Noun',
  'Verb',
  'Adjective',
  'Adverb',
  'Pronoun',
  'Preposition',
  'Conjunction',
  'Interjection',
  'Determiner',
  'Modal Verb',
  'Phrasal Verb',
  'Idiom'
];

const GAME_SETTINGS_STORAGE_KEY = 'gameDifficultySettings_v1';
const GAME_BEST_COMBO_STORAGE_KEY = 'gameBestComboByType_v1';
const SQL_CONNECTION_CONFIG_STORAGE_KEY = 'sqlServerConnectionConfig_v1';
const AUTH_SESSION_STORAGE_KEY = 'vocabMasterAuthSession_v1';
const SETTINGS_PREFERENCES_STORAGE_KEY = 'vocabMasterSettingsPreferences_v1';
const READING_CREATE_DRAFT_STORAGE_KEY = 'readingCreateDraft_v1';

const DEFAULT_SETTINGS_PREFERENCES = {
  themeMode: 'system',
  dailyGoal: 10,
  practiceDifficulty: 'Balanced',
  autoShowTranslation: true,
  shuffleReviewQuestions: true,
  autoPlayNextRound: false,
  dailyReminder: false,
  reminderTime: '20:00',
  streakReminder: true,
  achievementNotifications: true,
  soundEffects: true,
  correctAnswerSound: true,
  wrongAnswerSound: true,
  keyboardFeedback: false,
  celebrateLevelUp: true,
  toastNotifications: true,
  animationLevel: 'Full',
  reduceMotion: false,
  highContrastUi: false,
  uiScale: 'Normal',
};

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

      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => seek(-10)}
          className="group flex flex-col items-center gap-1 py-2.5 px-2 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all text-slate-600 hover:text-indigo-700 active:scale-95 shadow-sm"
          title="Lùi 10 giây"
        >
          <RotateCcw size={17} className="group-hover:-rotate-12 transition-transform" />
          <span className="text-[11px] font-extrabold">-10s</span>
        </button>
        <button
          onClick={() => seek(-5)}
          className="group flex flex-col items-center gap-1 py-2.5 px-2 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all text-slate-600 hover:text-indigo-700 active:scale-95 shadow-sm"
          title="Lùi 5 giây"
        >
          <RotateCcw size={17} className="group-hover:-rotate-12 transition-transform" />
          <span className="text-[11px] font-extrabold">-5s</span>
        </button>
        <button
          onClick={() => seek(5)}
          className="group flex flex-col items-center gap-1 py-2.5 px-2 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all text-slate-600 hover:text-indigo-700 active:scale-95 shadow-sm"
          title="Tiến 5 giây"
        >
          <RotateCw size={17} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-extrabold">+5s</span>
        </button>
        <button
          onClick={() => seek(10)}
          className="group flex flex-col items-center gap-1 py-2.5 px-2 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all text-slate-600 hover:text-indigo-700 active:scale-95 shadow-sm"
          title="Tiến 10 giây"
        >
          <RotateCw size={17} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-extrabold">+10s</span>
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
  const imageInputRef = useRef(null);
  const selectedImageRef = useRef(null);
  const imageDragStateRef = useRef({ dragging: false, startX: 0, startWidthPx: 0, img: null, editorWidth: 1 });
  const isTyping = useRef(false);
  const [hasSelectedImage, setHasSelectedImage] = useState(false);

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

  const clearImageSelection = () => {
    if (selectedImageRef.current) {
      selectedImageRef.current.style.outline = 'none';
      selectedImageRef.current.style.outlineOffset = '0px';
      selectedImageRef.current.style.cursor = 'default';
      selectedImageRef.current = null;
    }
    setHasSelectedImage(false);
  };

  const selectImage = (imgEl) => {
    if (selectedImageRef.current && selectedImageRef.current !== imgEl) {
      selectedImageRef.current.style.outline = 'none';
      selectedImageRef.current.style.outlineOffset = '0px';
    }
    selectedImageRef.current = imgEl;
    selectedImageRef.current.style.outline = '2px solid #6366f1';
    selectedImageRef.current.style.outlineOffset = '2px';
    selectedImageRef.current.style.cursor = 'nwse-resize';
    setHasSelectedImage(true);
  };

  const applyImageAlign = (align) => {
    const img = selectedImageRef.current;
    const editor = editorRef.current;
    if (!img || !editor) return;

    img.style.display = 'block';
    if (align === 'left') {
      img.style.marginLeft = '0';
      img.style.marginRight = 'auto';
    } else if (align === 'right') {
      img.style.marginLeft = 'auto';
      img.style.marginRight = '0';
    } else {
      img.style.marginLeft = 'auto';
      img.style.marginRight = 'auto';
    }

    onChange(editor.innerHTML);
  };

  const startImageResizeDrag = (event, imgEl) => {
    const editor = editorRef.current;
    if (!editor || !imgEl) return;

    event.preventDefault();
    event.stopPropagation();
    selectImage(imgEl);

    imageDragStateRef.current = {
      dragging: true,
      startX: event.clientX,
      startWidthPx: imgEl.getBoundingClientRect().width,
      img: imgEl,
      editorWidth: editor.clientWidth || 1
    };
  };

  const handleEditorClick = (event) => {
    const target = event.target;
    if (target && target.tagName === 'IMG') {
      selectImage(target);
      return;
    }
    clearImageSelection();
  };

  const triggerImageUpload = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleInsertImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result;
      if (!src || !editorRef.current) return;

      editorRef.current.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${src}" alt="Uploaded" style="display:block; margin:12px auto; width:60%; max-width:100%; height:auto; border-radius:12px;" />`
      );
      onChange(editorRef.current.innerHTML);
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const resizeSelectedImage = (deltaPercent) => {
    const img = selectedImageRef.current;
    const editor = editorRef.current;
    if (!img || !editor) return;

    const editorWidth = editor.clientWidth || 1;
    const currentPercent = img.style.width?.endsWith('%')
      ? parseFloat(img.style.width)
      : Math.round((img.clientWidth / editorWidth) * 100);
    const nextPercent = Math.min(100, Math.max(10, currentPercent + deltaPercent));

    img.style.width = `${nextPercent}%`;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    onChange(editor.innerHTML);
  };

  const setSelectedImageWidth = (percent) => {
    const img = selectedImageRef.current;
    const editor = editorRef.current;
    if (!img || !editor) return;

    img.style.width = `${percent}%`;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    onChange(editor.innerHTML);
  };

  const handleInput = () => {
    isTyping.current = true;
    onChange(editorRef.current.innerHTML);
  };

  const handleEditorMouseDown = (event) => {
    const target = event.target;
    if (!target || target.tagName !== 'IMG') return;

    const rect = target.getBoundingClientRect();
    const isNearResizeCorner = event.clientX >= rect.right - 18 && event.clientY >= rect.bottom - 18;
    if (isNearResizeCorner) {
      startImageResizeDrag(event, target);
    }
  };

  useEffect(() => {
    const handleMouseMove = (event) => {
      const dragState = imageDragStateRef.current;
      if (!dragState.dragging || !dragState.img || !editorRef.current) return;

      const nextWidthPx = Math.min(
        dragState.editorWidth,
        Math.max(60, dragState.startWidthPx + (event.clientX - dragState.startX))
      );
      const nextPercent = Math.min(100, Math.max(10, (nextWidthPx / dragState.editorWidth) * 100));

      dragState.img.style.width = `${nextPercent}%`;
      dragState.img.style.maxWidth = '100%';
      dragState.img.style.height = 'auto';
      onChange(editorRef.current.innerHTML);
    };

    const handleMouseUp = () => {
      if (imageDragStateRef.current.dragging) {
        imageDragStateRef.current.dragging = false;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onChange]);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-inner">
      <div className="flex gap-1 p-2 bg-white border-b border-slate-200 flex-wrap items-center">
        <button onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="In đậm"><Bold size={16} /></button>
        <button onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="In nghiêng"><Italic size={16} /></button>
        <button onClick={() => execCmd('underline')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Gạch chân"><Underline size={16} /></button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button onClick={() => execCmd('justifyLeft')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Căn trái"><AlignLeft size={16} /></button>
        <button onClick={() => execCmd('justifyCenter')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Căn giữa"><AlignCenter size={16} /></button>
        <button onClick={() => execCmd('justifyRight')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Căn phải"><AlignRight size={16} /></button>
        <button onClick={() => execCmd('justifyFull')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Căn đều"><AlignJustify size={16} /></button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button onClick={() => execCmd('backColor', '#fef08a')} className="p-2 hover:bg-yellow-100 text-yellow-600 rounded-lg transition-colors" title="Highlight Vàng"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#a7f3d0')} className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors" title="Highlight Xanh lá"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#fbcfe8')} className="p-2 hover:bg-pink-100 text-pink-600 rounded-lg transition-colors" title="Highlight Hồng"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#bfdbfe')} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Highlight Xanh dương"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#fed7aa')} className="p-2 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors" title="Highlight Cam"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', '#e9d5ff')} className="p-2 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors" title="Highlight Tím"><Highlighter size={16} /></button>
        <button onClick={() => execCmd('backColor', 'transparent')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors ml-1 border-l pl-3 border-slate-200" title="Xóa Highlight"><Eraser size={16} /></button>
        <div className="w-px h-5 bg-slate-300 mx-1"></div>
        <button onClick={triggerImageUpload} className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors" title="Tải ảnh vào bài">
          <Upload size={16} />
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleInsertImage} />
        {hasSelectedImage && (
          <>
            <button onClick={() => applyImageAlign('left')} className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" title="Căn trái ảnh"><AlignLeft size={14} /></button>
            <button onClick={() => applyImageAlign('center')} className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" title="Căn giữa ảnh"><AlignCenter size={14} /></button>
            <button onClick={() => applyImageAlign('right')} className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" title="Căn phải ảnh"><AlignRight size={14} /></button>
            <button onClick={() => resizeSelectedImage(-10)} className="px-2 py-1 text-xs font-bold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" title="Thu nhỏ ảnh">-10%</button>
            <button onClick={() => resizeSelectedImage(10)} className="px-2 py-1 text-xs font-bold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100" title="Phóng to ảnh">+10%</button>
            {[40, 60, 80, 100].map((size) => (
              <button
                key={size}
                onClick={() => setSelectedImageWidth(size)}
                className="px-2 py-1 text-[11px] font-bold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                title={`Đặt ảnh ${size}%`}
              >
                {size}%
              </button>
            ))}
            <span className="text-[10px] font-semibold text-indigo-600 px-2">Kéo góc phải dưới của ảnh để resize</span>
          </>
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        onMouseDown={handleEditorMouseDown}
        onClick={handleEditorClick}
        onInput={handleInput}
        onBlur={() => {
          handleInput();
          clearImageSelection();
        }}
        className="w-full h-80 px-5 py-4 outline-none overflow-y-auto leading-relaxed text-slate-700 custom-editor"
        placeholder={placeholder}
      />
    </div>
  );
};

const SettingsPanel = ({ icon, title, subtitle, badge, children, tone = 'default' }) => {
  const toneClass = tone === 'danger'
    ? 'border-red-200/70 bg-gradient-to-br from-white to-red-50/65 dark:from-slate-900 dark:to-red-950/30'
    : 'border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/70';

  return (
    <section className={`rounded-3xl border p-5 md:p-7 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_34px_rgba(2,6,23,0.42)] backdrop-blur-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] border border-white/80 dark:border-slate-700/70 shadow-sm">
            {React.createElement(icon, { className: 'w-5 h-5' })}
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
};

const SettingsToggleRow = ({ title, subtitle, checked, onChange, disabled = false }) => (
  <div className={`flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 px-4 py-3.5 bg-white/80 dark:bg-slate-900/65 ${disabled ? 'opacity-60' : ''}`}>
    <div>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${checked ? 'bg-[color:var(--color-primary)] shadow-lg' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-all duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const SettingsSegmentedControl = ({ title, subtitle, value, options, onChange }) => (
  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 px-4 py-3.5 bg-white/80 dark:bg-slate-900/65 space-y-3">
    <div>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
    </div>
    <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 p-1.5 border border-slate-200 dark:border-slate-700">
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] ${active
              ? 'bg-white dark:bg-slate-900 text-[color:var(--color-primary)] shadow border border-[color:var(--color-primary-soft)]'
              : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100'
              }`}
          >
            {optionLabel}
          </button>
        );
      })}
    </div>
  </div>
);

const SettingsStatCard = ({ title, value, icon, helper }) => (
  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 bg-white/90 dark:bg-slate-900/65 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-bold">{title}</p>
      {React.createElement(icon, { className: 'w-4 h-4 text-[color:var(--color-primary)]' })}
    </div>
    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{value}</p>
    {helper && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{helper}</p>}
  </div>
);

const ResetProgressModal = ({
  open,
  onClose,
  onConfirm,
  acknowledged,
  setAcknowledged,
  loading,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/45 backdrop-blur-[3px] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl border border-red-200/70 dark:border-red-900/50 bg-white dark:bg-slate-900 shadow-[0_22px_54px_rgba(15,23,42,0.35)] animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="px-6 md:px-7 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30">
            <AlertCircle className="w-4 h-4" />
            Critical Action
          </div>
          <h3 className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Reset all learning progress?</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">This will remove your streak, XP, level progress, and review history. This action cannot be undone.</p>
        </div>

        <div className="px-6 md:px-7 py-5 space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 bg-slate-50 dark:bg-slate-900/70">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[color:var(--color-danger)] focus:ring-[color:var(--color-danger-soft)]"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">I understand this cannot be undone.</span>
          </label>
        </div>

        <div className="px-6 md:px-7 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!acknowledged || loading}
            className="px-4 py-2 rounded-xl text-white text-sm font-black bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Resetting...' : 'Reset Progress'}
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const toast = useToast();
  const { selectedThemePreset, setSelectedThemePreset, themePresets } = useThemePreset();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vocabList, setVocabList] = useState([]);
  const [passages, setPassages] = useState([]);
  const [grammarList, setGrammarList] = useState([]); // Grammar State
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(null);
  const [error, setError] = useState(null);
  const isSpeechStoppingRef = useRef(false);
  const edgeAudioRef = useRef(null);
  const [ttsVoice, setTtsVoice] = useState('Qwen/Qwen3-TTS-0.6B');
  const [ttsModelOptions, setTtsModelOptions] = useState(QWEN_TTS_MODEL_FALLBACKS);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfReportDate, setPdfReportDate] = useState('');
  const [pdfFileBase, setPdfFileBase] = useState('VocabMaster_Learning');
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('Xem trước báo cáo PDF');
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const aiRequestControllerRef = useRef(null);
  const isAiStoppingRef = useRef(false);
  const gameBubbleSpeakRef = useRef('');
  const gameBubbleTimersRef = useRef([]);
  const gameBubbleLaneCursorRef = useRef(0);
  const gameAnsweredRef = useRef(false);
  const gameMemoryLockRef = useRef(false);

  // Form states - General Vocabulary Search
  const [newWord, setNewWord] = useState('');
  const [searchResultWords, setSearchResultWords] = useState([]);
  const [searchExInputs, setSearchExInputs] = useState({});
  const [editingSearchWordIndex, setEditingSearchWordIndex] = useState(null);
  const [editSearchWordData, setEditSearchWordData] = useState(null);
  const [vocabPanelSearchTerm, setVocabPanelSearchTerm] = useState('');
  const [learnedSearchTerm, setLearnedSearchTerm] = useState('');
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');
  const [customTopics, setCustomTopics] = useState([]);
  const [customLessons, setCustomLessons] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [topicSearchTerm, setTopicSearchTerm] = useState('');
  const [managerWordSearch, setManagerWordSearch] = useState('');
  const [managerDifficultyFilter, setManagerDifficultyFilter] = useState('all');
  const [managerPosFilter, setManagerPosFilter] = useState('all');
  const [topicForm, setTopicForm] = useState({
    title: '',
    icon: '📘',
    description: '',
    difficulty: 'easy',
    colorTheme: 'blue'
  });
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    difficulty: 'easy',
    estimatedDuration: 5,
    sortOrder: 1
  });
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [wordForm, setWordForm] = useState({
    word: '',
    meaning: '',
    phonetic: '',
    example: '',
    difficulty: 'easy',
    partOfSpeech: 'noun',
    imageEmoji: '📘',
    synonym: '',
    antonym: '',
    note: '',
    tags: '',
    audioText: ''
  });
  const [editingWordId, setEditingWordId] = useState(null);
  const [managerAutoFillLoading, setManagerAutoFillLoading] = useState(false);
  const [managerImportMode, setManagerImportMode] = useState('merge');
  const [managerImportJson, setManagerImportJson] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: 'Xác nhận xóa',
    message: '',
    itemName: '',
    itemType: '',
    warningLevel: 'normal',
    confirmText: 'Xóa',
    cancelText: 'Hủy',
    loading: false,
    error: '',
    showTypeToConfirm: false,
    typeToConfirmText: 'DELETE',
    confirmInput: '',
    consequenceList: [],
    icon: null,
    disableClose: false,
  });
  const [reviewModalWordId, setReviewModalWordId] = useState(null);
  const [navVisibleCount, setNavVisibleCount] = useState(7);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const navHostRef = useRef(null);
  const moreMenuRef = useRef(null);
  const moreMenuCloseTimerRef = useRef(null);
  const confirmActionRef = useRef(null);
  const connectSqlServerRef = useRef(null);
  const didAutoConnectSqlRef = useRef(false);

  // Dashboard filter state
  const [dashboardFilter, setDashboardFilter] = useState('all');
  const [isDashboardFilterMenuOpen, setIsDashboardFilterMenuOpen] = useState(false);
  const dashboardFilterMenuRef = useRef(null);

  // Selection states
  const [selectedPassageId, setSelectedPassageId] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState(null);
  const [selectedGrammarId, setSelectedGrammarId] = useState(null);

  // Specific passage word add state
  const [passageWordInput, setPassageWordInput] = useState('');
  const [passageWordLoading, setPassageWordLoading] = useState(false);
  const [passageWordSuggestions, setPassageWordSuggestions] = useState([]);
  const [pendingPassageAiWords, setPendingPassageAiWords] = useState([]);

  // States for editing extracted words (Preview)
  const [previewWordInput, setPreviewWordInput] = useState('');
  const [previewWordLoading, setPreviewWordLoading] = useState(false);
  const [previewWordSuggestions, setPreviewWordSuggestions] = useState([]);
  const [pendingExtractedAiWords, setPendingExtractedAiWords] = useState([]);
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
  const [isEditingSelectedWord, setIsEditingSelectedWord] = useState(false);
  const [editSelectedWordData, setEditSelectedWordData] = useState(null);

  // Passage states
  const [readingTitle, setReadingTitle] = useState('');
  const [readingContent, setReadingContent] = useState('');
  const [readingMedia, setReadingMedia] = useState([]);
  const [readingPage, setReadingPage] = useState('library');
  const [extractedWords, setExtractedWords] = useState([]);
  const [readingQuestions, setReadingQuestions] = useState([]);
  const [readingQuestionDraft, setReadingQuestionDraft] = useState({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });
  const [editPassageQuestions, setEditPassageQuestions] = useState([]);
  const [editQuestionDraft, setEditQuestionDraft] = useState({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });
  const [passageQuestionAnswers, setPassageQuestionAnswers] = useState({});
  const [passageQuestionFeedback, setPassageQuestionFeedback] = useState({});

  // Curriculum states
  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState(null);
  const [dragDayInfo, setDragDayInfo] = useState(null);
  const [curriculumExportScope, setCurriculumExportScope] = useState('all');
  const [curriculumDayVocabSearch, setCurriculumDayVocabSearch] = useState({});
  const [newCurriculumTitle, setNewCurriculumTitle] = useState('');
  const [newCurriculumDescription, setNewCurriculumDescription] = useState('');
  const [newCurriculumDayLabel, setNewCurriculumDayLabel] = useState('Day 1');
  const [newCurriculumDayTitle, setNewCurriculumDayTitle] = useState('');

  // Dictation states
  const [dictationMode, setDictationMode] = useState('custom');
  const [dictationCustomText, setDictationCustomText] = useState('');
  const [dictationPassageId, setDictationPassageId] = useState('');
  const [dictationCurrentSentence, setDictationCurrentSentence] = useState('');
  const [dictationCurrentSource, setDictationCurrentSource] = useState('');
  const [dictationAnswer, setDictationAnswer] = useState('');
  const [dictationResult, setDictationResult] = useState(null);
  const [dictationHintLevel, setDictationHintLevel] = useState(0);
  const [dictationShowAnswer, setDictationShowAnswer] = useState(false);
  const [dictationHistory, setDictationHistory] = useState([]);

  // Game states
  const [gameType, setGameType] = useState('mcq');
  const [gameMode, setGameMode] = useState('random');
  const [gameSearchTerm, setGameSearchTerm] = useState('');
  const [gameSelectedWordIds, setGameSelectedWordIds] = useState([]);
  const [gameQuestionCount, setGameQuestionCount] = useState(10);
  const [gameInitialLives, setGameInitialLives] = useState(3);
  const [gameBubbleSpeed, setGameBubbleSpeed] = useState(1);
  const [gameComboRamp, setGameComboRamp] = useState(2);
  const [gameBestComboByType, setGameBestComboByType] = useState({});
  const [gameQuestions, setGameQuestions] = useState([]);
  const [gameCurrentIndex, setGameCurrentIndex] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [gameComboStreak, setGameComboStreak] = useState(0);
  const [gameComboMultiplier, setGameComboMultiplier] = useState(1);
  const [gameRunBestCombo, setGameRunBestCombo] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameAnswered, setGameAnswered] = useState(false);
  const [gameSelectedOption, setGameSelectedOption] = useState('');
  const [gameTextAnswer, setGameTextAnswer] = useState('');
  const [gameFillDataMap, setGameFillDataMap] = useState({});
  const [gameFillLoading, setGameFillLoading] = useState(false);
  const [gameBubbleEntities, setGameBubbleEntities] = useState([]);
  const [gameBubbleTimeoutHits, setGameBubbleTimeoutHits] = useState(0);
  const [gameMemoryCards, setGameMemoryCards] = useState([]);
  const [gameMemoryFlipped, setGameMemoryFlipped] = useState([]);
  const [gameMemoryMatched, setGameMemoryMatched] = useState([]);
  const [gameMemoryMoves, setGameMemoryMoves] = useState(0);

  // Edit passage states
  const [isEditingPassage, setIsEditingPassage] = useState(false);
  const [editPassageTitle, setEditPassageTitle] = useState('');
  const [editPassageContent, setEditPassageContent] = useState('');
  const [editPassageMedia, setEditPassageMedia] = useState([]);

  // --- Data Backup & Restore ---
  const [sqlConnHost, setSqlConnHost] = useState('localhost');
  const [sqlConnPort, setSqlConnPort] = useState('1433');
  const [sqlConnUsername, setSqlConnUsername] = useState('sa');
  const [sqlConnPassword, setSqlConnPassword] = useState('123456');
  const [sqlConnDatabase, setSqlConnDatabase] = useState('VocabMasterDB');
  const [sqlConnectLoading, setSqlConnectLoading] = useState(false);
  const [sqlModeSwitchLoading, setSqlModeSwitchLoading] = useState(false);
  const [sqlConnectResult, setSqlConnectResult] = useState(null);
  const [sqlConnectError, setSqlConnectError] = useState('');
  const [sqlSyncStatus, setSqlSyncStatus] = useState('');
  const [isSqlConfigLoaded, setIsSqlConfigLoaded] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authForgotEmail, setAuthForgotEmail] = useState('');
  const [authForgotNewPassword, setAuthForgotNewPassword] = useState('');
  const [changeCurrentPassword, setChangeCurrentPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [settingsPreferences, setSettingsPreferences] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_PREFERENCES_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS_PREFERENCES };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS_PREFERENCES,
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
      };
    } catch {
      return { ...DEFAULT_SETTINGS_PREFERENCES };
    }
  });
  const [isResetProgressModalOpen, setIsResetProgressModalOpen] = useState(false);
  const [resetProgressAcknowledged, setResetProgressAcknowledged] = useState(false);
  const [isResetProgressProcessing, setIsResetProgressProcessing] = useState(false);

  const activeThemePreset = themePresets[selectedThemePreset] || themePresets[DEFAULT_THEME_PRESET_NAME];
  const learnedWordsCount = vocabList.filter((item) => item.isLearned).length;
  const reviewDueCount = vocabList.filter((item) => item.isLearned && item.nextReviewDate && item.nextReviewDate <= Date.now()).length;
  const masteryPercent = vocabList.length ? Math.round((learnedWordsCount / vocabList.length) * 100) : 0;
  const estimatedXp = (learnedWordsCount * 15) + (dictationHistory.length * 5);
  const estimatedLevel = Math.max(1, Math.floor(estimatedXp / 250) + 1);

  const isTauriRuntime = () => {
    return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
  };

  const getSqlAuthConnection = () => {
    if (!isTauriRuntime()) {
      throw new Error('Đăng nhập SQL chỉ dùng được trong bản Tauri app.');
    }

    const host = sqlConnHost.trim();
    const username = sqlConnUsername.trim();
    const password = sqlConnPassword;
    const database = sqlConnDatabase.trim();
    const port = Number(sqlConnPort);

    if (!host || !username || !database || !password) {
      throw new Error('Vui lòng nhập đầy đủ cấu hình kết nối SQL Server.');
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('Port SQL không hợp lệ (1-65535).');
    }

    return {
      host,
      port,
      username,
      password,
      database,
    };
  };

  const deleteItemOnSqlNow = async (entityType, entityId) => {
    if (!isTauriRuntime()) return;
    if (!sqlConnectResult?.is_connected) return;

    const numericId = Number(entityId);
    if (!Number.isFinite(numericId) || numericId <= 0) return;

    try {
      const conn = getSqlAuthConnection();
      if (entityType === 'vocab') {
        await invoke('delete_vocabulary_item_sql', { ...conn, vocabId: numericId });
      } else if (entityType === 'passage') {
        await invoke('delete_passage_sql', { ...conn, passageId: numericId });
      } else if (entityType === 'grammar') {
        await invoke('delete_grammar_sql', { ...conn, grammarId: numericId });
      }
    } catch (err) {
      const message = typeof err === 'string' ? err : (err?.message || 'Xóa dữ liệu SQL thất bại.');
      setSqlConnectError(message);
      throw new Error(message);
    }
  };

  const normalizeAuthUser = (user, fallback = {}) => {
    return {
      userId: user?.userId ?? user?.user_id ?? fallback.userId ?? Date.now(),
      fullName: user?.fullName ?? user?.full_name ?? fallback.fullName ?? '',
      email: user?.email ?? fallback.email ?? ''
    };
  };

  const handleRegister = async () => {
    const fullName = authFullName.trim();
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();

    if (!fullName || !email || !password) {
      setAuthError('Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
      setAuthInfo('');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('');

    try {
      const conn = getSqlAuthConnection();
      const result = await invoke('register_user_sql', {
        ...conn,
        fullName,
        email,
        passwordPlain: password,
      });

      const user = normalizeAuthUser(result, { fullName, email });
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(user));
      setCurrentUser(user);
      setAuthPassword('');
      setAuthInfo('Tạo tài khoản thành công.');
    } catch (err) {
      setAuthError(String(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();

    if (!email || !password) {
      setAuthError('Vui lòng nhập email và mật khẩu.');
      setAuthInfo('');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('');

    try {
      const conn = getSqlAuthConnection();
      const result = await invoke('login_user_sql', {
        ...conn,
        email,
        passwordPlain: password,
      });

      const user = normalizeAuthUser(result, { email });
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(user));
      setCurrentUser(user);
      setAuthPassword('');
    } catch (err) {
      setAuthError(String(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = authForgotEmail.trim().toLowerCase();
    const newPassword = authForgotNewPassword.trim();

    if (!email || !newPassword) {
      setAuthError('Vui lòng nhập email và mật khẩu mới để đặt lại.');
      setAuthInfo('');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('');

    try {
      const conn = getSqlAuthConnection();
      const result = await invoke('forgot_password_sql', {
        ...conn,
        email,
        newPasswordPlain: newPassword,
      });

      const message = result?.message || 'Đặt lại mật khẩu thành công.';
      setAuthInfo(message);
      setAuthForgotNewPassword('');
    } catch (err) {
      setAuthError(String(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const email = String(currentUser?.email || '').trim().toLowerCase();
    const currentPassword = changeCurrentPassword.trim();
    const newPassword = changeNewPassword.trim();

    if (!email || !currentPassword || !newPassword) {
      setAuthError('Vui lòng nhập đủ mật khẩu cũ và mật khẩu mới.');
      setAuthInfo('');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('');

    try {
      const conn = getSqlAuthConnection();
      const result = await invoke('change_password_sql', {
        ...conn,
        email,
        currentPasswordPlain: currentPassword,
        newPasswordPlain: newPassword,
      });

      const message = result?.message || 'Đổi mật khẩu thành công.';
      setAuthInfo(message);
      setChangeCurrentPassword('');
      setChangeNewPassword('');
      setShowChangePassword(false);
    } catch (err) {
      setAuthError(String(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setAuthPassword('');
    setChangeCurrentPassword('');
    setChangeNewPassword('');
    setShowChangePassword(false);
    setAuthInfo('');
    setAuthError('');
    setActiveTab('dashboard');
  };

  const openTab = (tabId) => {
    setActiveTab(tabId);
    setSelectedPassageId(null);
    setSelectedWordId(null);
    setSelectedGrammarId(null);
    setIsAddingGrammar(false);
    setIsMoreMenuOpen(false);
    if (tabId === 'reading') {
      setReadingPage('library');
    }
  };

  const openMoreMenu = () => {
    if (moreMenuCloseTimerRef.current) {
      clearTimeout(moreMenuCloseTimerRef.current);
      moreMenuCloseTimerRef.current = null;
    }
    setIsMoreMenuOpen(true);
  };

  const closeMoreMenuWithDelay = () => {
    if (moreMenuCloseTimerRef.current) {
      clearTimeout(moreMenuCloseTimerRef.current);
    }
    moreMenuCloseTimerRef.current = setTimeout(() => {
      setIsMoreMenuOpen(false);
      moreMenuCloseTimerRef.current = null;
    }, 220);
  };

  const connectSqlServer = async () => {
    if (!isTauriRuntime()) {
      setSqlConnectError('Chức năng kết nối SQL Server chỉ dùng được trong bản Tauri app.');
      setSqlConnectResult(null);
      return;
    }

    setSqlConnectLoading(true);
    setSqlConnectError('');
    setSqlConnectResult(null);

    try {
      const portNum = Number(sqlConnPort);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error('Port không hợp lệ (1-65535).');
      }

      await invoke('set_storage_mode', {
        host: sqlConnHost,
        port: portNum,
        username: sqlConnUsername,
        password: sqlConnPassword,
        database: sqlConnDatabase,
        modeName: 'SQLServer'
      });

      const result = await invoke('connect_sql_server', {
        host: sqlConnHost,
        port: portNum,
        username: sqlConnUsername,
        password: sqlConnPassword,
        database: sqlConnDatabase
      });

      const loadCustomManagerFromTables = async () => {
        const tableData = await invoke('load_custom_manager_data_from_sql', {
          host: sqlConnHost,
          port: portNum,
          username: sqlConnUsername,
          password: sqlConnPassword,
          database: sqlConnDatabase
        });

        const topics = Array.isArray(tableData?.customTopics) ? tableData.customTopics : [];
        const lessons = Array.isArray(tableData?.customLessons) ? tableData.customLessons : [];
        const words = Array.isArray(tableData?.customWords) ? tableData.customWords : [];

        setCustomTopics(topics);
        setCustomLessons(lessons);
        setCustomWords(words);

        return { topics, lessons, words };
      };

      const fullDataJson = await invoke('load_full_app_data_from_sql', {
        host: sqlConnHost,
        port: portNum,
        username: sqlConnUsername,
        password: sqlConnPassword,
        database: sqlConnDatabase
      });

      if (typeof fullDataJson === 'string' && fullDataJson.trim()) {
        try {
          const parsed = JSON.parse(fullDataJson);
          const nextVocab = Array.isArray(parsed?.vocabList) ? parsed.vocabList : [];
          const nextPassages = Array.isArray(parsed?.passages) ? parsed.passages : [];
          const nextGrammar = Array.isArray(parsed?.grammarList) ? parsed.grammarList : [];
          const nextCurriculum = Array.isArray(parsed?.curriculumList) ? parsed.curriculumList : [];
          const nextTopics = Array.isArray(parsed?.customTopics) ? parsed.customTopics : null;
          const nextLessons = Array.isArray(parsed?.customLessons) ? parsed.customLessons : null;
          const nextWords = Array.isArray(parsed?.customWords) ? parsed.customWords : null;

          setVocabList(nextVocab);
          setPassages(nextPassages);
          setGrammarList(nextGrammar);
          setCurriculumList(nextCurriculum);

          let finalTopics = nextTopics || [];
          let finalLessons = nextLessons || [];
          let finalWords = nextWords || [];

          if (!nextTopics || !nextLessons || !nextWords) {
            const tablePayload = await loadCustomManagerFromTables();
            finalTopics = tablePayload.topics;
            finalLessons = tablePayload.lessons;
            finalWords = tablePayload.words;
          } else {
            setCustomTopics(finalTopics);
            setCustomLessons(finalLessons);
            setCustomWords(finalWords);
          }

          setSqlSyncStatus(`Đã nạp SQL: ${nextVocab.length} từ, ${nextPassages.length} bài đọc, ${nextGrammar.length} ngữ pháp, ${nextCurriculum.length} giáo trình, ${finalTopics.length} topic custom, ${finalLessons.length} lesson custom, ${finalWords.length} word custom.`);
        } catch {
          const sqlVocabList = await invoke('load_vocabulary_from_sql', {
            host: sqlConnHost,
            port: portNum,
            username: sqlConnUsername,
            password: sqlConnPassword,
            database: sqlConnDatabase
          });
          const tablePayload = await loadCustomManagerFromTables();
          if (Array.isArray(sqlVocabList)) {
            setVocabList(sqlVocabList);
            setSqlSyncStatus(`Không đọc được dữ liệu tổng. Đã nạp fallback ${sqlVocabList.length} từ, ${tablePayload.topics.length} topic, ${tablePayload.lessons.length} lesson, ${tablePayload.words.length} word từ SQL Server.`);
          }
        }
      } else {
        const sqlVocabList = await invoke('load_vocabulary_from_sql', {
          host: sqlConnHost,
          port: portNum,
          username: sqlConnUsername,
          password: sqlConnPassword,
          database: sqlConnDatabase
        });
        const tablePayload = await loadCustomManagerFromTables();
        if (Array.isArray(sqlVocabList)) {
          setVocabList(sqlVocabList);
          setSqlSyncStatus(`Chưa có dữ liệu tổng. Đã nạp fallback ${sqlVocabList.length} từ, ${tablePayload.topics.length} topic, ${tablePayload.lessons.length} lesson, ${tablePayload.words.length} word từ SQL Server.`);
        }
      }

      // Mark SQL as connected only after initial SQL data hydration is done.
      // This prevents the auto-sync effect from pushing empty in-memory state on startup.
      setSqlConnectResult(result);
    } catch (error) {
      const message = typeof error === 'string' ? error : (error?.message || 'Kết nối SQL Server thất bại.');
      setSqlConnectError(message);
      setSqlSyncStatus('');
    } finally {
      setSqlConnectLoading(false);
    }
  };

  connectSqlServerRef.current = connectSqlServer;

  const switchStorageMode = async () => {
    if (!isTauriRuntime()) {
      setSqlConnectError('Chức năng chuyển mode chỉ dùng được trong bản Tauri app.');
      return;
    }

    setSqlModeSwitchLoading(true);
    setSqlConnectError('');

    try {
      const portNum = Number(sqlConnPort);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error('Port không hợp lệ (1-65535).');
      }

      await invoke('set_storage_mode', {
        host: sqlConnHost,
        port: portNum,
        username: sqlConnUsername,
        password: sqlConnPassword,
        database: sqlConnDatabase,
        modeName: 'SQLServer'
      });

      setSqlSyncStatus('Đã bật SQLServer mode.');
      await connectSqlServer();
    } catch (error) {
      const message = typeof error === 'string' ? error : (error?.message || 'Chuyển mode thất bại.');
      setSqlConnectError(message);
    } finally {
      setSqlModeSwitchLoading(false);
    }
  };

  const exportData = async () => {
    const dataToExport = { vocabList, passages, grammarList, curriculumList, customTopics, customLessons, customWords };
    const fileName = `VocabMaster_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    const jsonText = JSON.stringify(dataToExport, null, 2);

    if (isTauriRuntime()) {
      try {
        const savedPath = await invoke('save_backup_file', {
          fileName,
          dataJson: jsonText
        });
        alert(`Đã sao lưu thành công tại:\n${savedPath}`);
      } catch (error) {
        const message = typeof error === 'string' ? error : (error?.message || 'Sao lưu thất bại trong Tauri.');
        setError(message);
      }
      return;
    }

    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
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
        if (importedData.curriculumList) setCurriculumList(importedData.curriculumList);
        if (importedData.customTopics) setCustomTopics(importedData.customTopics);
        if (importedData.customLessons) setCustomLessons(importedData.customLessons);
        if (importedData.customWords) setCustomWords(importedData.customWords);
        alert("Tuyệt vời! Đã phục hồi toàn bộ dữ liệu học tập thành công.");
      } catch {
        alert("Lỗi: File sao lưu không hợp lệ. Vui lòng chọn đúng file JSON của VocabMaster.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const buildLearningReportMarkup = (generatedAt) => {
    const unlearnedWords = vocabList.filter(item => !item.isLearned);
    const allPassages = [...passages].sort((a, b) => b.id - a.id);

    if (unlearnedWords.length === 0 && allPassages.length === 0) {
      return null;
    }

    const escapeHtml = (value) => {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const vocabRows = unlearnedWords.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.word)}</td>
        <td>${escapeHtml(item.ipa)}</td>
        <td>${escapeHtml(item.type)}</td>
        <td>${escapeHtml(item.definition)}</td>
      </tr>
    `).join('');

    const passageRows = allPassages.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${item.words?.length || 0}</td>
        <td>${escapeHtml(stripHtml(item.content || '').replace(/\s+/g, ' ').trim().slice(0, 260))}</td>
      </tr>
    `).join('');

    return `
      <div style="width: 760px; padding: 24px; background: #ffffff; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif;">
        <h1 style="font-size: 28px; margin: 0 0 4px;">VocabMaster - Báo cáo học tập</h1>
        <p style="font-size: 12px; color: #475569; margin: 0 0 16px;">Ngày xuất: ${escapeHtml(generatedAt)}</p>

        <h2 style="background: #e0e7ff; color: #3730a3; border-left: 6px solid #4f46e5; padding: 10px 12px; font-size: 16px; margin: 0 0 10px;">Từ vựng chưa học (${unlearnedWords.length})</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
          <thead>
            <tr style="background: #4f46e5; color: #ffffff;">
              <th style="padding: 8px; border: 1px solid #d1d5db; width: 36px;">#</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">Word</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">IPA</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">Type</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">Definition</th>
            </tr>
          </thead>
          <tbody>${vocabRows}</tbody>
        </table>

        <h2 style="background: #ccfbf1; color: #115e59; border-left: 6px solid #0f766e; padding: 10px 12px; font-size: 16px; margin: 0 0 10px;">Bài đọc (${allPassages.length})</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #0f766e; color: #ffffff;">
              <th style="padding: 8px; border: 1px solid #d1d5db; width: 36px;">#</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">Title</th>
              <th style="padding: 8px; border: 1px solid #d1d5db; width: 60px;">Words</th>
              <th style="padding: 8px; border: 1px solid #d1d5db;">Preview</th>
            </tr>
          </thead>
          <tbody>${passageRows}</tbody>
        </table>
      </div>
    `;
  };

  const exportLearningPdf = async () => {
    const generatedAt = new Date().toLocaleString('vi-VN');
    const reportMarkup = buildLearningReportMarkup(generatedAt);

    if (!reportMarkup) {
      setError("Không có dữ liệu để xuất PDF.");
      return;
    }

    await openPdfPreviewFromMarkup(reportMarkup, {
      fileBase: 'VocabMaster_Learning',
      previewTitle: 'Xem trước báo cáo PDF'
    });
  };

  const buildCurriculumDayDetailMarkup = (day, index, escapeHtml) => {
    const linkedPassages = (day.passageIds || [])
      .map(id => passages.find(p => p.id === id))
      .filter(Boolean);
    const linkedGrammar = (day.grammarIds || [])
      .map(id => grammarList.find(g => g.id === id))
      .filter(Boolean);

    const vocabMap = new Map();
    (day.vocabIds || []).forEach((id) => {
      const vocabItem = vocabList.find(v => v.id === id);
      if (!vocabItem) return;
      const key = String(vocabItem.word || '').trim().toLowerCase() || `manual-${id}`;
      if (!vocabMap.has(key)) {
        vocabMap.set(key, vocabItem);
      }
    });
    linkedPassages.forEach((p) => {
      (p.words || []).forEach((w) => {
        const key = String(w.word || '').trim().toLowerCase() || `${p.id}-${Math.random()}`;
        if (!vocabMap.has(key)) {
          vocabMap.set(key, w);
        }
      });
    });
    const vocabItems = Array.from(vocabMap.values());

    const vocabTable = vocabItems.length ? `
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px;">
        <thead>
          <tr style="background: #1e3a8a; color: #ffffff;">
            <th style="padding: 6px; border: 1px solid #d1d5db; width: 32px;">#</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Word</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">IPA</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Type</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Nghĩa</th>
            <th style="padding: 6px; border: 1px solid #d1d5db;">Ví dụ</th>
          </tr>
        </thead>
        <tbody>
          ${vocabItems.map((w, vocabIndex) => {
      const examplesText = Array.isArray(w.examples) && w.examples.length
        ? w.examples.map(ex => `${ex.en || ''} - ${ex.vi || ''}`).join(' | ')
        : 'Khong co';
      return `
              <tr>
                <td style="padding: 6px; border: 1px solid #d1d5db; text-align: center;">${vocabIndex + 1}</td>
                <td style="padding: 6px; border: 1px solid #d1d5db;">${escapeHtml(w.word || '')}</td>
                <td style="padding: 6px; border: 1px solid #d1d5db;">${escapeHtml(w.ipa || '')}</td>
                <td style="padding: 6px; border: 1px solid #d1d5db;">${escapeHtml(w.type || '')}</td>
                <td style="padding: 6px; border: 1px solid #d1d5db;">${escapeHtml(getDisplayDefinition(w))}</td>
                <td style="padding: 6px; border: 1px solid #d1d5db;">${escapeHtml(examplesText)}</td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    ` : '<p style="margin: 6px 0 0; color: #64748b;">Chua co tu vung tu bai doc lien ket.</p>';

    const passageMarkup = linkedPassages.length
      ? linkedPassages.map((p, pIdx) => `
          <article style="margin-top: 8px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
            <h4 style="margin: 0 0 6px; color: #0f172a;">Bai doc ${pIdx + 1}: ${escapeHtml(p.title || 'Khong tieu de')}</h4>
            <div style="color: #334155; line-height: 1.5;">${p.content || ''}</div>
          </article>
        `).join('')
      : '<p style="margin: 6px 0 0; color: #64748b;">Chua lien ket bai doc.</p>';

    const grammarMarkup = linkedGrammar.length
      ? linkedGrammar.map((g, gIdx) => `
          <article style="margin-top: 8px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
            <h4 style="margin: 0 0 6px; color: #0f172a;">Ngu phap ${gIdx + 1}: ${escapeHtml(g.title || 'Khong tieu de')}</h4>
            <div style="color: #334155; line-height: 1.5;">${g.content || ''}</div>
          </article>
        `).join('')
      : '<p style="margin: 6px 0 0; color: #64748b;">Chua lien ket ngu phap.</p>';

    return `
      <section style="border: 1px solid #dbeafe; border-radius: 12px; padding: 12px; margin-bottom: 12px; background: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <h3 style="margin: 0; font-size: 16px; color: #1e3a8a;">${escapeHtml(day.dayLabel || `Day ${index + 1}`)} - ${escapeHtml(day.title || 'Chua dat tieu de')}</h3>
          <span style="font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 999px; background: ${day.done ? '#dcfce7' : '#e2e8f0'}; color: ${day.done ? '#166534' : '#334155'};">
            ${day.done ? 'DONE' : 'IN PROGRESS'}
          </span>
        </div>
        <p style="margin: 8px 0 0; color: #334155;"><strong>Muc tieu:</strong> ${escapeHtml(day.objective || 'Chua co')}</p>
        <p style="margin: 8px 0 0; color: #334155;"><strong>Ghi chu:</strong> ${escapeHtml(day.notes || 'Chua co')}</p>

        <div style="margin-top: 10px;">
          <p style="margin: 0; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase;">Toan bo tu vung (dinh nghia + vi du)</p>
          ${vocabTable}
        </div>

        <div style="margin-top: 10px;">
          <p style="margin: 0; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase;">Toan bo bai doc</p>
          ${passageMarkup}
        </div>

        <div style="margin-top: 10px;">
          <p style="margin: 0; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase;">Toan bo ngu phap</p>
          ${grammarMarkup}
        </div>
      </section>
    `;
  };

  const buildCurriculumReportMarkup = (course, generatedAt) => {
    if (!course) return null;

    const escapeHtml = (value) => {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const { doneDays, totalDays, percent } = getCurriculumProgress(course);

    const dayBlocks = (course.days || []).map((day, index) => buildCurriculumDayDetailMarkup(day, index, escapeHtml)).join('');

    return `
      <div style="width: 760px; padding: 24px; background: #ffffff; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif;">
        <h1 style="font-size: 28px; margin: 0 0 4px;">Giáo trình - ${escapeHtml(course.title)}</h1>
        <p style="font-size: 12px; color: #475569; margin: 0 0 8px;">Ngày xuất: ${escapeHtml(generatedAt)}</p>
        <p style="font-size: 12px; color: #475569; margin: 0 0 16px;">Tiến độ khóa: ${doneDays}/${totalDays} ngày (${percent}%)</p>
        <p style="margin: 0 0 16px; color: #334155;">${escapeHtml(course.description || 'Không có mô tả')}</p>
        ${dayBlocks || '<p style="color: #64748b;">Khóa học chưa có day nào.</p>'}
      </div>
    `;
  };

  const buildCurriculumDayReportMarkup = (course, day, generatedAt) => {
    if (!course || !day) return null;

    const escapeHtml = (value) => {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    return `
      <div style="width: 760px; padding: 24px; background: #ffffff; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif;">
        <h1 style="font-size: 28px; margin: 0 0 4px;">Giáo trình - ${escapeHtml(course.title)}</h1>
        <p style="font-size: 12px; color: #475569; margin: 0 0 8px;">Ngày xuất: ${escapeHtml(generatedAt)}</p>
        <p style="font-size: 12px; color: #475569; margin: 0 0 16px;">Xuất riêng: ${escapeHtml(day.dayLabel || 'Day')}</p>
        ${buildCurriculumDayDetailMarkup(day, 0, escapeHtml)}
      </div>
    `;
  };

  const openPdfPreviewFromMarkup = async (reportMarkup, options = {}) => {
    const { fileBase = 'VocabMaster_PDF', previewTitle = 'Xem trước báo cáo PDF' } = options;

    let tempNode = null;
    setIsPdfLoading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      tempNode = document.createElement('div');
      tempNode.style.position = 'fixed';
      tempNode.style.left = '-10000px';
      tempNode.style.top = '0';
      tempNode.style.zIndex = '-1';
      tempNode.innerHTML = reportMarkup;
      document.body.appendChild(tempNode);

      const canvas = await html2canvas(tempNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      document.body.removeChild(tempNode);

      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const previewUrl = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return previewUrl;
      });
      setPdfReportDate(new Date().toISOString().slice(0, 10));
      setPdfFileBase(fileBase);
      setPdfPreviewTitle(previewTitle);
      setIsPdfPreviewOpen(true);
      setError(null);
    } catch (err) {
      console.error('PDF preview error:', err);
      const detail = err?.message ? ` (${err.message})` : '';
      setError(`Lỗi hiển thị API PDF. Vui lòng thử lại.${detail}`);
    } finally {
      if (tempNode && tempNode.parentNode) {
        tempNode.parentNode.removeChild(tempNode);
      }
      setIsPdfLoading(false);
    }
  };

  const exportCurriculumPdf = async (courseId) => {
    const course = curriculumList.find(c => c.id === courseId);
    if (!course) {
      setError('Không tìm thấy khóa học để xuất PDF.');
      return;
    }

    const generatedAt = new Date().toLocaleString('vi-VN');
    const reportMarkup = buildCurriculumReportMarkup(course, generatedAt);
    if (!reportMarkup) {
      setError('Không có dữ liệu giáo trình để xuất PDF.');
      return;
    }

    const safeTitle = String(course.title || 'Curriculum').replace(/[^a-zA-Z0-9_-]+/g, '_');
    await openPdfPreviewFromMarkup(reportMarkup, {
      fileBase: `VocabMaster_Curriculum_${safeTitle}`,
      previewTitle: `Xem trước giáo trình PDF - ${course.title}`
    });
  };

  const exportCurriculumDayPdf = async (courseId, dayId) => {
    const course = curriculumList.find(c => c.id === courseId);
    const day = course?.days?.find(d => d.id === dayId);
    if (!course || !day) {
      setError('Không tìm thấy Day để xuất PDF.');
      return;
    }

    const generatedAt = new Date().toLocaleString('vi-VN');
    const reportMarkup = buildCurriculumDayReportMarkup(course, day, generatedAt);
    if (!reportMarkup) {
      setError('Không có dữ liệu Day để xuất PDF.');
      return;
    }

    const safeTitle = String(course.title || 'Curriculum').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const safeDay = String(day.dayLabel || 'Day').replace(/[^a-zA-Z0-9_-]+/g, '_');
    await openPdfPreviewFromMarkup(reportMarkup, {
      fileBase: `VocabMaster_Curriculum_${safeTitle}_${safeDay}`,
      previewTitle: `Xem trước giáo trình PDF - ${course.title} - ${day.dayLabel || 'Day'}`
    });
  };

  const exportCurriculumByScope = async (courseId) => {
    const course = curriculumList.find(c => c.id === courseId);
    if (!course) return;

    if (curriculumExportScope === 'all') {
      await exportCurriculumPdf(courseId);
      return;
    }

    await exportCurriculumDayPdf(courseId, Number(curriculumExportScope));
  };

  const closePdfPreview = () => {
    setIsPdfPreviewOpen(false);
    setPdfPreviewTitle('Xem trước báo cáo PDF');
    setPdfFileBase('VocabMaster_Learning');
    setPdfPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return '';
    });
  };

  const downloadPreviewPdf = () => {
    if (!pdfPreviewUrl) return;

    const link = document.createElement('a');
    link.href = pdfPreviewUrl;
    link.download = `${pdfFileBase || 'VocabMaster_PDF'}_${pdfReportDate || new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    closePdfPreview();
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  useEffect(() => {
    const loadAppData = async () => {
      try {
        const savedVocab = await getData('vocabList');
        const savedPassages = await getData('passages');
        const savedGrammar = await getData('grammarList');
        const savedCurriculum = await getData('curriculumList');
        const savedCustomTopics = await getData('customTopics');
        const savedCustomLessons = await getData('customLessons');
        const savedCustomWords = await getData('customWords');
        if (savedVocab) setVocabList(savedVocab);
        if (savedPassages) setPassages(savedPassages);
        if (savedGrammar) setGrammarList(savedGrammar);
        if (savedCurriculum) setCurriculumList(savedCurriculum);
        if (savedCustomTopics) setCustomTopics(savedCustomTopics);
        if (savedCustomLessons) setCustomLessons(savedCustomLessons);
        if (savedCustomWords) setCustomWords(savedCustomWords);
      } catch (e) {
        console.error("Lỗi khi nạp dữ liệu từ IndexedDB:", e);
      }
    };
    loadAppData();
  }, []);

  useEffect(() => {
    return () => {
      if (moreMenuCloseTimerRef.current) {
        clearTimeout(moreMenuCloseTimerRef.current);
      }

      if (aiRequestControllerRef.current) {
        aiRequestControllerRef.current.abort();
      }

      if (edgeAudioRef.current) {
        edgeAudioRef.current.pause();
        edgeAudioRef.current = null;
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const savedVoice = localStorage.getItem('ttsVoice');
    if (savedVoice) {
      setTtsVoice(savedVoice);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ttsVoice', ttsVoice);
  }, [ttsVoice]);

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed && parsed.email) {
          setCurrentUser(parsed);
        }
      }
    } catch {
      // ignore invalid auth session
    }
  }, []);

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(READING_CREATE_DRAFT_STORAGE_KEY);
      if (!rawDraft) return;
      const parsed = JSON.parse(rawDraft);

      if (typeof parsed?.readingTitle === 'string') setReadingTitle(parsed.readingTitle);
      if (typeof parsed?.readingContent === 'string') setReadingContent(parsed.readingContent);
      if (Array.isArray(parsed?.extractedWords)) setExtractedWords(parsed.extractedWords);
      if (Array.isArray(parsed?.readingQuestions)) setReadingQuestions(parsed.readingQuestions);
      if (Array.isArray(parsed?.pendingExtractedAiWords)) setPendingExtractedAiWords(parsed.pendingExtractedAiWords);
    } catch {
      // ignore invalid reading draft
    }
  }, []);

  useEffect(() => {
    try {
      const hasDraft = Boolean(
        String(readingTitle || '').trim()
        || stripHtml(readingContent || '').trim()
        || extractedWords.length > 0
        || readingQuestions.length > 0
        || pendingExtractedAiWords.length > 0
      );

      if (!hasDraft) {
        localStorage.removeItem(READING_CREATE_DRAFT_STORAGE_KEY);
        return;
      }

      localStorage.setItem(
        READING_CREATE_DRAFT_STORAGE_KEY,
        JSON.stringify({
          readingTitle,
          readingContent,
          extractedWords,
          readingQuestions,
          pendingExtractedAiWords,
        })
      );
    } catch {
      // ignore localStorage issues
    }
  }, [readingTitle, readingContent, extractedWords, readingQuestions, pendingExtractedAiWords]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SQL_CONNECTION_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.host === 'string') setSqlConnHost(parsed.host);
        if (typeof parsed?.port === 'string') setSqlConnPort(parsed.port);
        if (typeof parsed?.username === 'string') setSqlConnUsername(parsed.username);
        if (typeof parsed?.password === 'string') setSqlConnPassword(parsed.password);
        if (typeof parsed?.database === 'string') setSqlConnDatabase(parsed.database);
      }
    } catch {
      // ignore invalid saved connection config
    } finally {
      setIsSqlConfigLoaded(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      SQL_CONNECTION_CONFIG_STORAGE_KEY,
      JSON.stringify({
        host: sqlConnHost,
        port: sqlConnPort,
        username: sqlConnUsername,
        password: sqlConnPassword,
        database: sqlConnDatabase
      })
    );
  }, [sqlConnHost, sqlConnPort, sqlConnUsername, sqlConnPassword, sqlConnDatabase]);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    if (!isSqlConfigLoaded) return;
    if (didAutoConnectSqlRef.current) return;
    if (sqlConnectLoading) return;

    const host = String(sqlConnHost || '').trim();
    const username = String(sqlConnUsername || '').trim();
    const password = String(sqlConnPassword || '');
    const database = String(sqlConnDatabase || '').trim();
    const portNum = Number(sqlConnPort);

    if (!host || !username || !password || !database || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return;
    }

    didAutoConnectSqlRef.current = true;
    connectSqlServerRef.current?.();
  }, [isSqlConfigLoaded, sqlConnHost, sqlConnPort, sqlConnUsername, sqlConnPassword, sqlConnDatabase, sqlConnectLoading]);

  useEffect(() => {
    try {
      const rawSettings = localStorage.getItem(GAME_SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (Number.isFinite(parsed?.initialLives)) setGameInitialLives(Math.max(1, Math.min(7, Number(parsed.initialLives))));
        if (Number.isFinite(parsed?.bubbleSpeed)) setGameBubbleSpeed(Math.max(0.6, Math.min(1.8, Number(parsed.bubbleSpeed))));
        if (Number.isFinite(parsed?.comboRamp)) setGameComboRamp(Math.max(1, Math.min(4, Number(parsed.comboRamp))));
      }

      const rawBest = localStorage.getItem(GAME_BEST_COMBO_STORAGE_KEY);
      if (rawBest) {
        const parsedBest = JSON.parse(rawBest);
        if (parsedBest && typeof parsedBest === 'object') {
          setGameBestComboByType(parsedBest);
        }
      }
    } catch {
      // Ignore invalid local settings.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      GAME_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        initialLives: gameInitialLives,
        bubbleSpeed: gameBubbleSpeed,
        comboRamp: gameComboRamp
      })
    );
  }, [gameInitialLives, gameBubbleSpeed, gameComboRamp]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_PREFERENCES_STORAGE_KEY, JSON.stringify(settingsPreferences));
  }, [settingsPreferences]);

  useEffect(() => {
    const root = document.documentElement;
    const mode = settingsPreferences.themeMode;
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    const applyAppearance = () => {
      const prefersDark = mediaQuery ? mediaQuery.matches : false;
      const shouldUseDark = mode === 'dark' || (mode === 'system' && prefersDark);

      root.dataset.appearanceMode = mode;
      root.dataset.appearanceResolved = shouldUseDark ? 'dark' : 'light';
      root.classList.toggle('dark', shouldUseDark);
      root.style.colorScheme = shouldUseDark ? 'dark' : 'light';

      const scale = settingsPreferences.uiScale === 'Large'
        ? '1.05'
        : settingsPreferences.uiScale === 'Comfortable'
          ? '1.02'
          : '1';
      root.style.setProperty('--ui-scale', scale);
      root.style.setProperty('--motion-scale', settingsPreferences.reduceMotion ? '0.45' : '1');
      root.classList.toggle('reduced-motion-ui', Boolean(settingsPreferences.reduceMotion));
    };

    applyAppearance();

    if (mode === 'system' && mediaQuery) {
      const handleChange = () => applyAppearance();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    return undefined;
  }, [settingsPreferences.themeMode, settingsPreferences.uiScale, settingsPreferences.reduceMotion]);

  useEffect(() => {
    let mounted = true;

    const fetchTtsModels = async () => {
      try {
        const response = await fetch(`${TTS_API_BASE_URL}/models`);
        if (!response.ok) throw new Error('Models API failed');
        const data = await response.json();
        const apiModels = Array.isArray(data?.models) ? data.models : [];
        if (!apiModels.length || !mounted) return;

        const mapped = apiModels.map((modelName) => ({ value: modelName, label: modelName }));
        setTtsModelOptions(mapped);

        setTtsVoice((prev) => (apiModels.includes(prev) ? prev : apiModels[0]));
      } catch {
        if (!mounted) return;
        setTtsModelOptions(QWEN_TTS_MODEL_FALLBACKS);
      }
    };

    fetchTtsModels();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Save Data to IndexedDB ---
  useEffect(() => {
    const updateVisibleTabs = () => {
      const width = navHostRef.current?.offsetWidth || window.innerWidth;
      let nextCount = 9;
      if (width < 560) nextCount = 2;
      else if (width < 760) nextCount = 3;
      else if (width < 940) nextCount = 4;
      else if (width < 1120) nextCount = 5;
      else if (width < 1280) nextCount = 6;
      else if (width < 1440) nextCount = 7;
      else if (width < 1600) nextCount = 8;
      setNavVisibleCount(nextCount);
    };

    updateVisibleTabs();
    window.addEventListener('resize', updateVisibleTabs);
    return () => window.removeEventListener('resize', updateVisibleTabs);
  }, []);

  useEffect(() => {
    if (!isMoreMenuOpen) return;

    const handleOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (!isDashboardFilterMenuOpen) return;

    const handleOutsideClick = (event) => {
      if (dashboardFilterMenuRef.current && !dashboardFilterMenuRef.current.contains(event.target)) {
        setIsDashboardFilterMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDashboardFilterMenuOpen]);

  useEffect(() => {
    const saveToDB = async () => {
      try {
        await saveData('vocabList', vocabList);
        await saveData('passages', passages);
        await saveData('grammarList', grammarList);
        await saveData('curriculumList', curriculumList);
        await saveData('customTopics', customTopics);
        await saveData('customLessons', customLessons);
        await saveData('customWords', customWords);
      } catch {
        setError("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra dung lượng trình duyệt.");
      }
    };
    // Debounce saving slightly to avoid too many writes
    const timer = setTimeout(() => {
      saveToDB();
    }, 500);
    return () => clearTimeout(timer);
  }, [vocabList, passages, grammarList, curriculumList, customTopics, customLessons, customWords]);

  const saveLocalSnapshotNow = async ({
    nextVocabList = vocabList,
    nextPassages = passages,
    nextGrammarList = grammarList,
    nextCurriculumList = curriculumList,
    nextCustomTopics = customTopics,
    nextCustomLessons = customLessons,
    nextCustomWords = customWords,
  } = {}) => {
    try {
      await saveData('vocabList', nextVocabList);
      await saveData('passages', nextPassages);
      await saveData('grammarList', nextGrammarList);
      await saveData('curriculumList', nextCurriculumList);
      await saveData('customTopics', nextCustomTopics);
      await saveData('customLessons', nextCustomLessons);
      await saveData('customWords', nextCustomWords);
      return true;
    } catch {
      setError('Lỗi khi lưu dữ liệu local. Vui lòng kiểm tra dung lượng thiết bị.');
      return false;
    }
  };

  // --- Auto Sync Full App Data to SQL Server when SQL mode is active ---
  useEffect(() => {
    if (!isTauriRuntime()) return;
    if (!sqlConnectResult?.is_connected) return;

    const host = String(sqlConnHost || '').trim();
    const username = String(sqlConnUsername || '').trim();
    const database = String(sqlConnDatabase || '').trim();
    const portNum = Number(sqlConnPort);

    if (!host || !username || !database || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const fullDataPayload = JSON.stringify({
          vocabList,
          passages,
          grammarList,
          curriculumList,
          customTopics,
          customLessons,
          customWords
        });

        const result = await invoke('sync_full_app_data_to_sql', {
          host,
          port: portNum,
          username,
          password: sqlConnPassword,
          database,
          fullDataJson: fullDataPayload
        });
        setSqlSyncStatus(`Đã đồng bộ toàn bộ dữ liệu lên SQL Server (${result?.payload_bytes ?? fullDataPayload.length} bytes).`);
      } catch (error) {
        const message = typeof error === 'string' ? error : (error?.message || 'Đồng bộ SQL thất bại.');
        setSqlConnectError(message);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [vocabList, passages, grammarList, curriculumList, customTopics, customLessons, customWords, sqlConnectResult, sqlConnHost, sqlConnPort, sqlConnUsername, sqlConnPassword, sqlConnDatabase]);

  const syncFullDataToSQLNow = async ({
    nextVocabList = vocabList,
    nextPassages = passages,
    nextGrammarList = grammarList,
    nextCurriculumList = curriculumList,
    nextCustomTopics = customTopics,
    nextCustomLessons = customLessons,
    nextCustomWords = customWords,
    statusMessage,
  } = {}) => {
    if (!isTauriRuntime()) return false;
    if (!sqlConnectResult?.is_connected) return false;

    const host = String(sqlConnHost || '').trim();
    const username = String(sqlConnUsername || '').trim();
    const database = String(sqlConnDatabase || '').trim();
    const portNum = Number(sqlConnPort);

    if (!host || !username || !database || !Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return false;
    }

    try {
      const fullDataPayload = JSON.stringify({
        vocabList: nextVocabList,
        passages: nextPassages,
        grammarList: nextGrammarList,
        curriculumList: nextCurriculumList,
        customTopics: nextCustomTopics,
        customLessons: nextCustomLessons,
        customWords: nextCustomWords
      });

      const result = await invoke('sync_full_app_data_to_sql', {
        host,
        port: portNum,
        username,
        password: sqlConnPassword,
        database,
        fullDataJson: fullDataPayload
      });

      setSqlSyncStatus(statusMessage || `Đã đồng bộ toàn bộ dữ liệu lên SQL Server (${result?.payload_bytes ?? fullDataPayload.length} bytes).`);
      return true;
    } catch (error) {
      const message = typeof error === 'string' ? error : (error?.message || 'Đồng bộ SQL thất bại.');
      setSqlConnectError(message);
      return false;
    }
  };

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

  const dashboardFilterOptions = [
    { value: 'all', label: 'Tất cả thời gian' },
    { value: 'day', label: 'Thêm Hôm nay' },
    { value: 'week', label: 'Tuần này' },
    { value: 'month', label: 'Tháng này' },
    { value: 'quarter', label: 'Quý này' },
    { value: 'year', label: 'Năm này' }
  ];

  const currentDashboardFilterLabel =
    dashboardFilterOptions.find((item) => item.value === dashboardFilter)?.label || 'Tất cả thời gian';

  const getDifficultyConfig = (level) => {
    switch (level) {
      case 3: return { label: 'Khó', color: 'bg-red-100 text-red-700 border-red-200' };
      case 2: return { label: 'Vừa', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default: return { label: 'Dễ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
  };

  const isVietnameseText = (text) => {
    const value = String(text || '').trim();
    if (!value) return false;
    return /[aăâbcdđeêghiklmnoôơpqrstuưvxyáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(value);
  };

  const getDisplayDefinition = (entry) => {
    if (!entry) return '';
    const def = String(entry.definition || '').trim();
    if (isVietnameseText(def)) return def;

    const viFromExample = Array.isArray(entry.examples)
      ? (entry.examples.find(ex => isVietnameseText(ex?.vi))?.vi || '')
      : '';

    return viFromExample || (isVietnameseText(def) ? def : 'Chua co nghia tieng Viet. Bam Sua ket qua hoac tra lai AI.');
  };

  const normalizeKeywordList = (rawValue) => {
    const readObjectValue = (obj) => {
      if (!obj || typeof obj !== 'object') return '';
      return String(obj.phrase || obj.text || obj.word || obj.value || obj.collocation || obj.antonym || '').trim();
    };

    const toKeywordArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val
          .map(item => (typeof item === 'string' ? item.trim() : readObjectValue(item)))
          .filter(Boolean);
      }
      if (typeof val === 'string') {
        return val
          .split(/[\n,;|]/)
          .map(item => item.trim())
          .filter(Boolean);
      }
      if (typeof val === 'object') {
        const byValues = Object.values(val)
          .map(item => (typeof item === 'string' ? item.trim() : readObjectValue(item)))
          .filter(Boolean);
        return byValues;
      }
      return [];
    };

    const unique = [];
    const seen = new Set();
    toKeywordArray(rawValue).forEach((item) => {
      const key = item.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });
    return unique;
  };

  const getTypeBadgeClass = (wordType) => {
    const normalized = String(wordType || '').toLowerCase();
    if (normalized.includes('verb')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (normalized.includes('noun')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (normalized.includes('adjective')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (normalized.includes('adverb')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (normalized.includes('pronoun')) return 'bg-sky-100 text-sky-700 border-sky-200';
    if (normalized.includes('preposition')) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (normalized.includes('conjunction')) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const createEmptyQuestionDraft = () => ({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  const normalizeQuestionItem = (rawQuestion) => {
    if (!rawQuestion || typeof rawQuestion !== 'object') return null;

    const rawType = String(rawQuestion.type || '').toLowerCase();
    const options = Array.isArray(rawQuestion.options)
      ? rawQuestion.options.map(opt => String(opt || '').trim()).filter(Boolean)
      : [];

    const type = rawType === 'fill' || rawType === 'fill_blank' || rawType === 'fill-blank'
      ? 'fill'
      : 'mcq';

    const question = String(rawQuestion.question || rawQuestion.prompt || '').trim();
    if (!question) return null;

    let correctAnswer = String(rawQuestion.correctAnswer || rawQuestion.answer || rawQuestion.correct || '').trim();
    if (type === 'mcq' && /^\d+$/.test(correctAnswer)) {
      const idx = Number(correctAnswer);
      if (options[idx]) correctAnswer = options[idx];
    }

    if (type === 'mcq') {
      if (options.length < 2) return null;
      if (!correctAnswer || !options.includes(correctAnswer)) return null;
    } else if (!correctAnswer) {
      return null;
    }

    return {
      id: Date.now() + Math.random(),
      type,
      question,
      options: type === 'mcq' ? options : [],
      correctAnswer
    };
  };

  const handleQuestionDraftOptionChange = (setter, idx, value) => {
    setter(prev => {
      const nextOptions = [...prev.options];
      nextOptions[idx] = value;
      return { ...prev, options: nextOptions };
    });
  };

  const addQuestionFromDraft = (draft, setList, setDraft) => {
    const candidate = normalizeQuestionItem(draft);
    if (!candidate) {
      setError('Câu hỏi chưa hợp lệ. Trắc nghiệm cần >= 2 đáp án và đáp án đúng; điền từ cần đáp án đúng.');
      return;
    }

    setList(prev => [...prev, candidate]);
    setDraft(createEmptyQuestionDraft());
    setError(null);
  };

  const removeQuestionAtIndex = (idx, setList) => {
    setList(prev => prev.filter((_, i) => i !== idx));
  };

  const parseCsvLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current.trim());
    return cells;
  };

  const parseCsvQuestions = (csvText) => {
    const lines = String(csvText || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const header = parseCsvLine(lines[0]).map(h => h.toLowerCase());
    const getCell = (row, key) => {
      const idx = header.indexOf(key);
      return idx >= 0 ? String(row[idx] || '').trim() : '';
    };

    return lines.slice(1).map((line) => {
      const row = parseCsvLine(line);
      const type = getCell(row, 'type') || 'mcq';
      const question = getCell(row, 'question') || getCell(row, 'prompt');
      const correctAnswer = getCell(row, 'correctanswer') || getCell(row, 'answer') || getCell(row, 'correct');
      const options = [
        getCell(row, 'option1'),
        getCell(row, 'option2'),
        getCell(row, 'option3'),
        getCell(row, 'option4')
      ].filter(Boolean);

      return {
        type,
        question,
        options,
        correctAnswer
      };
    });
  };

  const downloadQuestionTemplate = async (format = 'csv') => {
    const rows = [
      {
        type: 'mcq',
        question: 'What is the synonym of rapid?',
        option1: 'slow',
        option2: 'quick',
        option3: 'heavy',
        option4: 'small',
        correctAnswer: 'quick'
      },
      {
        type: 'fill',
        question: 'She ____ to school every day.',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        correctAnswer: 'goes'
      }
    ];

    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ questions: rows }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'question-template.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Questions');
      XLSX.writeFile(wb, 'question-template.xlsx');
      return;
    }

    const csvHeader = ['type', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer'];
    const escapeCsv = (val) => {
      const str = String(val || '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const csvRows = [
      csvHeader.join(','),
      ...rows.map(row => csvHeader.map(key => escapeCsv(row[key])).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'question-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleQuestionFileUpload = async (event, setList) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const lowerName = file.name.toLowerCase();
      let rawQuestions = [];

      if (lowerName.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(String(text || '{}'));
        rawQuestions = Array.isArray(parsed)
          ? parsed
          : (Array.isArray(parsed.questions) ? parsed.questions : []);
      } else if (lowerName.endsWith('.csv')) {
        const text = await file.text();
        rawQuestions = parseCsvQuestions(text);
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        rawQuestions = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      } else {
        setError('Định dạng file chưa hỗ trợ. Vui lòng dùng .json, .csv, .xlsx hoặc .xls');
        event.target.value = '';
        return;
      }

      const normalized = rawQuestions
        .map(normalizeQuestionItem)
        .filter(Boolean);

      if (!normalized.length) {
        setError('File câu hỏi không hợp lệ hoặc không có câu hỏi dùng được.');
      } else {
        setList(prev => [...prev, ...normalized]);
        setError(null);
      }
    } catch {
      setError('Không đọc được file câu hỏi. Vui lòng kiểm tra đúng format mẫu.');
    } finally {
      event.target.value = '';
    }
  };

  const normalizeAnswerForCompare = (value) => String(value || '').trim().toLowerCase();

  const checkPassageQuestionAnswer = (question) => {
    const userAnswer = passageQuestionAnswers[question.id] || '';
    if (!normalizeAnswerForCompare(userAnswer)) {
      setError('Vui lòng chọn hoặc nhập đáp án trước khi kiểm tra.');
      return;
    }

    const isCorrect = normalizeAnswerForCompare(userAnswer) === normalizeAnswerForCompare(question.correctAnswer);
    setPassageQuestionFeedback(prev => ({
      ...prev,
      [question.id]: { checked: true, isCorrect }
    }));
    setError(null);
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

  const speak = async (text, id, options = {}) => {
    if (!text?.trim()) return;

    if (audioLoading === id) {
      if (edgeAudioRef.current) {
        edgeAudioRef.current.pause();
        edgeAudioRef.current.currentTime = 0;
        edgeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        isSpeechStoppingRef.current = true;
        window.speechSynthesis.cancel();
      }
      setAudioLoading(null);
      return;
    }

    if (audioLoading) return;
    setAudioLoading(id);
    setError(null);

    try {
      const modelName = String(options?.modelOverride || ttsVoice || '').trim();
      const response = await fetch(`${TTS_API_BASE_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model: modelName || ttsVoice,
          response_format: 'wav'
        })
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `TTS API failed with status ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      edgeAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        edgeAudioRef.current = null;
        setAudioLoading(null);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        edgeAudioRef.current = null;
        setError("Không thể phát âm thanh lúc này.");
        setAudioLoading(null);
      };

      await audio.play();
    } catch (err) {
      const errorMessage = String(err || '');
      if (
        errorMessage.toLowerCase().includes('tts api') ||
        errorMessage.toLowerCase().includes('connection') ||
        errorMessage.toLowerCase().includes('failed')
      ) {
        setError("Khong ket noi duoc FastAPI TTS (localhost:8001). Hay chay server qwen-tts truoc khi nghe.");
      } else {
        setError("Không thể phát âm thanh lúc này.");
      }
      setAudioLoading(null);
    }
  };

  const playVoicePreview = async (voiceModel = ttsVoice) => {
    await speak(VOICE_PREVIEW_SAMPLE_TEXT, 'settings-voice-preview', { modelOverride: voiceModel });
  };

  const stopAISearch = () => {
    if (aiRequestControllerRef.current) {
      isAiStoppingRef.current = true;
      aiRequestControllerRef.current.abort();
    }
    setLoading(false);
    setPreviewWordLoading(false);
    setPassageWordLoading(false);
  };

  const callGemini = async (prompt, signal) => {
    let retries = 0;
    const delays = [1000, 2000, 4000];

    const parseJsonContent = (rawText) => {
      const text = String(rawText || '').trim();
      if (!text) return {};

      try {
        return JSON.parse(text);
      } catch {
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        const candidates = [firstBrace, firstBracket].filter(idx => idx >= 0);
        if (!candidates.length) {
          throw new Error('Groq khong tra ve JSON hop le.');
        }

        const start = Math.min(...candidates);
        const trimmed = text.slice(start);
        const lastBrace = trimmed.lastIndexOf('}');
        const lastBracket = trimmed.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);
        if (end < 0) {
          throw new Error('Groq khong tra ve JSON hop le.');
        }

        return JSON.parse(trimmed.slice(0, end + 1));
      }
    };

    const waitWithSignal = (ms) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, ms);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            const abortErr = new Error('Request aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          }, { once: true });
        }
      });
    };

    while (retries < 5) {
      try {
        if (!GROQ_API_KEY) {
          throw new Error('Thieu VITE_GROQ_API_KEY. Hay tao file .env voi key Groq (gsk_...).');
        }

        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`
        };

        if (GROQ_ORG_ID) {
          headers['Groq-Organization'] = GROQ_ORG_ID;
        }

        const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers,
          signal,
          body: JSON.stringify({
            model: GROQ_MODEL,
            response_format: { type: 'json_object' },
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content: 'Ban la tro ly tu vung. Luon tra ve JSON hop le, khong markdown, khong giai thich them.'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        });
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`Groq API request failed (${response.status}): ${detail}`);
        }
        const result = await response.json();
        const content = result?.choices?.[0]?.message?.content || '{}';
        return parseJsonContent(content);
      } catch (err) {
        if (err?.name === 'AbortError') {
          throw err;
        }
        retries++;
        if (retries === 5) throw err;
        await waitWithSignal(delays[retries - 1]);
      }
    }
  };

  const normalizeWordEntry = (rawEntry) => {
    if (!rawEntry || typeof rawEntry !== 'object') return null;

    const normalizedExamples = Array.isArray(rawEntry.examples)
      ? rawEntry.examples
        .filter(ex => ex && typeof ex === 'object')
        .map(ex => ({
          en: String(ex.en || '').trim(),
          vi: String(ex.vi || '').trim()
        }))
        .filter(ex => ex.en || ex.vi)
      : [];

    const normalizedWord = String(rawEntry.word || '').trim();
    const rawType = String(rawEntry.type || '').trim();
    const matchedType = WORD_TYPE_OPTIONS.find(opt => opt.toLowerCase() === rawType.toLowerCase());
    const normalizedType = matchedType || rawType;
    const rawDefinition = String(rawEntry.definitionVi || rawEntry.meaningVi || rawEntry.definition || '').trim();
    const viDefinitionFromExamples = normalizedExamples.find(ex => isVietnameseText(ex.vi))?.vi || '';
    const normalizedDefinition = isVietnameseText(rawDefinition)
      ? rawDefinition
      : (viDefinitionFromExamples || rawDefinition);
    const normalizedAntonyms = normalizeKeywordList(
      rawEntry.antonyms || rawEntry.antonym || rawEntry.opposites || rawEntry.opposite || rawEntry.oppositeWords
    );
    const normalizedCollocations = normalizeKeywordList(
      rawEntry.collocations || rawEntry.collocation || rawEntry.relatedCollocations || rawEntry.relatedPhrases
    );
    const hasLexicalContent = Boolean(
      normalizedWord && (
        normalizedDefinition
        || normalizedExamples.length > 0
        || normalizedAntonyms.length > 0
        || normalizedCollocations.length > 0
      )
    );

    const resolvedValid = typeof rawEntry.isValid === 'boolean' ? rawEntry.isValid : hasLexicalContent;

    return {
      ...rawEntry,
      word: normalizedWord,
      ipa: String(rawEntry.ipa || '').trim(),
      type: normalizedType || (resolvedValid ? 'Noun' : ''),
      definition: normalizedDefinition,
      suggestions: Array.isArray(rawEntry.suggestions) ? rawEntry.suggestions : [],
      antonyms: normalizedAntonyms,
      collocations: normalizedCollocations,
      examples: normalizedExamples,
      isValid: resolvedValid
    };
  };

  const normalizeWordList = (entries) => {
    if (!Array.isArray(entries)) return [];
    return entries
      .map(normalizeWordEntry)
      .filter(Boolean);
  };

  const extractWordResults = (rawData) => {
    const isLexicalObject = (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      return Boolean(
        value.word
        || value.isValid !== undefined
        || value.definition
        || value.definitionVi
        || value.type
        || value.suggestions
      );
    };

    const isLexicalArray = (value) => {
      return Array.isArray(value) && value.some((item) => isLexicalObject(item));
    };

    if (Array.isArray(rawData)) return rawData;
    if (!rawData || typeof rawData !== 'object') return [];
    if (Array.isArray(rawData.results)) return rawData.results;
    if (Array.isArray(rawData.items)) return rawData.items;
    if (Array.isArray(rawData.words)) return rawData.words;
    if (isLexicalArray(rawData.data)) return rawData.data;
    if (isLexicalArray(rawData.entries)) return rawData.entries;

    const nestedObjects = Object.values(rawData).filter((value) => value && typeof value === 'object' && !Array.isArray(value));
    const lexicalCandidates = nestedObjects.filter((value) => isLexicalObject(value));
    if (lexicalCandidates.length > 0) return lexicalCandidates;

    const nestedArrays = Object.values(rawData).find((value) => isLexicalArray(value));
    if (Array.isArray(nestedArrays)) return nestedArrays;

    if (isLexicalObject(rawData)) {
      return [rawData];
    }
    return [];
  };

  const splitLookupWords = (inputValue) => {
    return String(inputValue || '')
      .split(/[\n,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const hasUsableWordPayload = (entry, fallbackWord = '') => {
    if (!entry || typeof entry !== 'object') return false;
    if (entry.isValid === false) return false;

    const word = String(entry.word || fallbackWord || '').trim();
    if (!word) return false;

    const definition = String(entry.definition || '').trim();
    const examplesCount = Array.isArray(entry.examples) ? entry.examples.length : 0;
    const antonymsCount = Array.isArray(entry.antonyms) ? entry.antonyms.length : 0;
    const collocationsCount = Array.isArray(entry.collocations) ? entry.collocations.length : 0;

    return Boolean(definition || examplesCount > 0 || antonymsCount > 0 || collocationsCount > 0);
  };

  const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase();

  const lookupWordsWithAI = async (requestedWords, signal) => {
    if (!Array.isArray(requestedWords) || requestedWords.length === 0) return [];

    const prompt = `
      Phân tích danh sách từ vựng tiếng Anh sau (theo đúng thứ tự): ${JSON.stringify(requestedWords)}.
      Trả về MẢNG JSON với SỐ PHẦN TỬ CHÍNH XÁC = ${requestedWords.length}, giữ ĐÚNG THỨ TỰ từng từ đầu vào.
      Mỗi phần tử đại diện cho 1 từ và có cấu trúc:
      [
        {
          "isValid": boolean,
          "suggestions": ["sug1", "sug2"],
          "word": "từ_đúng_chính_tả",
          "ipa": "phiên âm IPA",
          "type": "loại từ (Noun, Verb...)",
          "definitionVi": "nghĩa tiếng Việt",
          "antonyms": ["từ trái nghĩa 1", "từ trái nghĩa 2"],
          "collocations": ["cụm từ liên quan 1", "cụm từ liên quan 2"],
          "examples": [{"en": "English sentence", "vi": "nghĩa tiếng Việt"}]
        }
      ]
      Nếu không có antonyms hoặc collocations thì trả về mảng rỗng [].
      Nếu từ không hợp lệ thì vẫn phải trả phần tử tương ứng với isValid=false và suggestions.
    `;

    const data = await callGemini(prompt, signal);
    const normalized = normalizeWordList(extractWordResults(data));
    const enriched = await enrichWordsForVietnameseAndRelations(normalized, signal);
    const keyedCandidates = new Map(
      enriched
        .filter((item) => normalizeLookupKey(item.word))
        .map((item) => [normalizeLookupKey(item.word), item])
    );

    const unmatchedByIndex = [...enriched];
    return requestedWords.map((inputWord, index) => {
      const keyMatched = keyedCandidates.get(normalizeLookupKey(inputWord));
      let candidate = keyMatched || null;

      if (!candidate) {
        candidate = unmatchedByIndex[index] || unmatchedByIndex.find((item) => !keyedCandidates.has(normalizeLookupKey(item.word))) || null;
      }

      if (!candidate) {
        return {
          isValid: false,
          suggestions: [],
          word: inputWord,
          ipa: '',
          type: 'Noun',
          definition: '',
          antonyms: [],
          collocations: [],
          examples: []
        };
      }

      const candidateWord = String(candidate.word || '').trim() || inputWord;
      const isExactMatch = normalizeLookupKey(candidateWord) === normalizeLookupKey(inputWord);

      if (!candidate.isValid || !isExactMatch) {
        const fallbackSuggestions = !isExactMatch && candidateWord ? [candidateWord] : [];
        const suggestionList = normalizeKeywordList(
          (Array.isArray(candidate.suggestions) ? candidate.suggestions : []).concat(fallbackSuggestions)
        );

        return {
          isValid: false,
          suggestions: suggestionList,
          word: inputWord,
          ipa: '',
          type: '',
          definition: '',
          antonyms: [],
          collocations: [],
          examples: []
        };
      }

      return {
        ...candidate,
        word: candidateWord
      };
    });
  };

  const enrichWordsForVietnameseAndRelations = async (wordEntries, signal) => {
    const normalizedList = normalizeWordList(wordEntries);
    const toEnhance = normalizedList.filter(item => {
      if (!item?.word) return false;
      const hasViDefinition = isVietnameseText(item.definition);
      const hasAntonyms = (item.antonyms || []).length > 0;
      const hasCollocations = (item.collocations || []).length > 0;
      return !hasViDefinition || !hasAntonyms || !hasCollocations;
    });

    if (toEnhance.length === 0) return normalizedList;

    const compactPayload = toEnhance.map(item => ({
      word: item.word,
      ipa: item.ipa,
      type: item.type,
      definition: item.definition,
      antonyms: item.antonyms || [],
      collocations: item.collocations || []
    }));

    const enrichPrompt = `
      Bạn là trợ lý từ điển tiếng Anh sang tiếng Việt.
      Dựa trên dữ liệu sau: ${JSON.stringify(compactPayload)}
      Hãy trả về JSON mảng, mỗi phần tử giữ nguyên "word" và có cấu trúc:
      [
        {
          "word": "string",
          "definitionVi": "nghĩa tiếng Việt tự nhiên, ngắn gọn",
          "antonyms": ["từ trái nghĩa 1", "từ trái nghĩa 2"],
          "collocations": ["cụm từ tự nhiên 1", "cụm từ tự nhiên 2"]
        }
      ]
      Bắt buộc dùng tiếng Việt cho definitionVi. Nếu thiếu dữ liệu thì trả [] cho antonyms/collocations.
    `;

    try {
      const enrichedRaw = await callGemini(enrichPrompt, signal);
      const enrichedList = normalizeWordList(extractWordResults(enrichedRaw));
      const enrichMap = new Map(enrichedList.map(item => [String(item.word || '').toLowerCase(), item]));

      return normalizedList.map(item => {
        const enhanced = enrichMap.get(String(item.word || '').toLowerCase());
        if (!enhanced) return item;
        const viDefinition = isVietnameseText(item.definition)
          ? item.definition
          : (isVietnameseText(enhanced.definition) ? enhanced.definition : item.definition);
        return {
          ...item,
          definition: viDefinition,
          antonyms: (item.antonyms || []).length > 0 ? item.antonyms : (enhanced.antonyms || []),
          collocations: (item.collocations || []).length > 0 ? item.collocations : (enhanced.collocations || [])
        };
      });
    } catch {
      return normalizedList;
    }
  };

  const generateWordInfo = async (wordToSearch = newWord) => {
    const requestedWords = splitLookupWords(wordToSearch);
    if (requestedWords.length === 0) return;

    const normalizedLookupText = requestedWords.join(', ');

    setLoading(true);
    setError(null);
    setSearchResultWords([]);
    setSearchExInputs({});
    setEditingSearchWordIndex(null);
    setEditSearchWordData(null);
    setNewWord(normalizedLookupText);

    const controller = new AbortController();
    aiRequestControllerRef.current = controller;
    isAiStoppingRef.current = false;

    try {
      const alignedResults = await lookupWordsWithAI(requestedWords, controller.signal);
      setSearchResultWords(alignedResults);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError("Lỗi tra cứu AI. Vui lòng thử lại.");
    } finally {
      if (aiRequestControllerRef.current === controller) {
        aiRequestControllerRef.current = null;
      }
      isAiStoppingRef.current = false;
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
        "definitionVi": "nghĩa tiếng Việt",
        "antonyms": ["antonym_1", "antonym_2"],
        "collocations": ["collocation_1", "collocation_2"],
        "examples": [{"en": "English sentence", "vi": "nghĩa tiếng Việt"}]
      }
    `;

    const controller = new AbortController();
    aiRequestControllerRef.current = controller;
    isAiStoppingRef.current = false;

    try {
      const data = await callGemini(prompt, controller.signal);
      const newResults = [...searchResultWords];
      const normalized = (await enrichWordsForVietnameseAndRelations(normalizeWordList(extractWordResults(data)), controller.signal))[0] || null;
      newResults[index] = normalized || newResults[index];
      setSearchResultWords(newResults);
      if (editingSearchWordIndex === index) {
        setEditingSearchWordIndex(null);
        setEditSearchWordData(null);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError("Lỗi tra cứu AI cho từ " + correctedWord);
    } finally {
      if (aiRequestControllerRef.current === controller) {
        aiRequestControllerRef.current = null;
      }
      isAiStoppingRef.current = false;
      setLoading(false);
    }
  };

  const handleSearchExChange = (idx, field, value) => {
    setSearchExInputs(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), [field]: value }
    }));
  };

  const startSearchWordEdit = (idx) => {
    const currentWord = searchResultWords[idx];
    if (!currentWord?.isValid) return;

    setEditingSearchWordIndex(idx);
    setEditSearchWordData({
      ...currentWord,
      word: currentWord.word || '',
      ipa: currentWord.ipa || '',
      type: currentWord.type || 'Noun',
      definition: currentWord.definition || ''
    });
    setError(null);
  };

  const cancelSearchWordEdit = () => {
    setEditingSearchWordIndex(null);
    setEditSearchWordData(null);
  };

  const saveSearchWordEdit = (idx) => {
    if (editingSearchWordIndex !== idx || !editSearchWordData) return;

    const normalizedWord = editSearchWordData.word.trim();
    const normalizedDefinition = editSearchWordData.definition.trim();

    if (!normalizedWord || !normalizedDefinition) {
      setError('Vui lòng nhập đủ từ vựng và nghĩa tiếng Việt trước khi lưu chỉnh sửa.');
      return;
    }

    const newResults = [...searchResultWords];
    newResults[idx] = {
      ...newResults[idx],
      ...editSearchWordData,
      isValid: true,
      word: normalizedWord,
      ipa: editSearchWordData.ipa.trim(),
      type: editSearchWordData.type.trim() || 'Noun',
      definition: normalizedDefinition,
      examples: Array.isArray(editSearchWordData.examples) ? editSearchWordData.examples : (newResults[idx].examples || [])
    };

    setSearchResultWords(newResults);
    setEditingSearchWordIndex(null);
    setEditSearchWordData(null);
    setError(null);
  };

  const removeSearchWord = (idx) => {
    const newResults = searchResultWords.filter((_, i) => i !== idx);
    setSearchResultWords(newResults);
    if (editingSearchWordIndex === idx) {
      setEditingSearchWordIndex(null);
      setEditSearchWordData(null);
    } else if (editingSearchWordIndex !== null && idx < editingSearchWordIndex) {
      setEditingSearchWordIndex(editingSearchWordIndex - 1);
    }
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

    if (editingSearchWordIndex === idx) {
      setEditingSearchWordIndex(null);
      setEditSearchWordData(null);
    } else if (editingSearchWordIndex !== null && idx < editingSearchWordIndex) {
      setEditingSearchWordIndex(editingSearchWordIndex - 1);
    }

    if (newResults.length === 0) {
      setNewWord('');
      setSearchExInputs({});
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
      setEditingSearchWordIndex(null);
      setEditSearchWordData(null);
    } else if (skippedWords.length > 0 && newWordsToAdd.length === 0) {
      setSearchResultWords([]);
      setNewWord('');
      setEditingSearchWordIndex(null);
      setEditSearchWordData(null);
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
      media: readingMedia,
      questions: readingQuestions
    };

    const nextPassages = [newPassage, ...passages];
    setPassages(nextPassages);
    setReadingContent('');
    setReadingTitle('');
    setExtractedWords([]);
    setPendingExtractedAiWords([]);
    setReadingMedia([]);
    setReadingQuestions([]);
    setReadingQuestionDraft(createEmptyQuestionDraft());
    setSelectedPassageId(newPassage.id);
    setPassageQuestionAnswers({});
    setPassageQuestionFeedback({});
    setError(null);

    try {
      localStorage.removeItem(READING_CREATE_DRAFT_STORAGE_KEY);
    } catch {
      // ignore localStorage issues
    }

    void saveLocalSnapshotNow({ nextPassages });

    void syncFullDataToSQLNow({
      nextPassages,
      statusMessage: 'Đã lưu bài đọc và đồng bộ SQL Server.'
    });
  };

  const handleAddWordToExtracted = async () => {
    if (!previewWordInput.trim()) return;
    setPreviewWordLoading(true);
    setError(null);
    setPreviewWordSuggestions([]);
    const inputWords = splitLookupWords(previewWordInput);

    const controller = new AbortController();
    aiRequestControllerRef.current = controller;
    isAiStoppingRef.current = false;

    try {
      const results = await lookupWordsWithAI(inputWords, controller.signal);
      const accepted = [];
      const invalidHints = [];
      const invalidSuggestions = [];

      results.forEach((item, idx) => {
        const fallbackWord = inputWords[idx] || '';
        const resolved = item ? { ...item, word: String(item.word || '').trim() || fallbackWord } : null;
        const canAccept = resolved && (resolved.isValid || hasUsableWordPayload(resolved, fallbackWord));
        if (canAccept) {
          accepted.push({ ...resolved, isValid: true, difficulty: 1, id: Date.now() + idx });
        } else {
          const suggestions = Array.isArray(resolved?.suggestions)
            ? resolved.suggestions.map((s) => String(s || '').trim()).filter(Boolean)
            : [];
          invalidHints.push(`${fallbackWord}: ${suggestions.join(', ') || 'Không có'}`);
          invalidSuggestions.push({ word: fallbackWord, suggestions });
        }
      });

      if (accepted.length > 0) {
        setPendingExtractedAiWords((prev) => [...accepted, ...prev]);
        setPreviewWordInput('');
        setPreviewWordSuggestions(invalidSuggestions);
        if (invalidHints.length > 0) {
          setError(`Không tìm thấy một số từ: ${invalidHints.join(' | ')}`);
        }
      } else {
        setPreviewWordSuggestions(invalidSuggestions);
        setError(`Không tìm thấy từ. Gợi ý: ${invalidHints.join(' | ') || 'Không có'}`);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError("Lỗi khi thêm từ vào kết quả trích xuất.");
    } finally {
      if (aiRequestControllerRef.current === controller) {
        aiRequestControllerRef.current = null;
      }
      isAiStoppingRef.current = false;
      setPreviewWordLoading(false);
    }
  };

  const handleAddWordToPassage = async () => {
    if (!passageWordInput.trim()) return;
    setPassageWordLoading(true);
    setError(null);
    setPassageWordSuggestions([]);
    const inputWords = splitLookupWords(passageWordInput);

    const controller = new AbortController();
    aiRequestControllerRef.current = controller;
    isAiStoppingRef.current = false;

    try {
      const results = await lookupWordsWithAI(inputWords, controller.signal);
      const accepted = [];
      const invalidHints = [];
      const invalidSuggestions = [];

      results.forEach((item, idx) => {
        const fallbackWord = inputWords[idx] || '';
        const resolved = item ? { ...item, word: String(item.word || '').trim() || fallbackWord } : null;
        const canAccept = resolved && (resolved.isValid || hasUsableWordPayload(resolved, fallbackWord));
        if (canAccept) {
          accepted.push({ ...resolved, isValid: true, difficulty: 1, id: Date.now() + idx });
        } else {
          const suggestions = Array.isArray(resolved?.suggestions)
            ? resolved.suggestions.map((s) => String(s || '').trim()).filter(Boolean)
            : [];
          invalidHints.push(`${fallbackWord}: ${suggestions.join(', ') || 'Không có'}`);
          invalidSuggestions.push({ word: fallbackWord, suggestions });
        }
      });

      if (accepted.length > 0) {
        setPendingPassageAiWords((prev) => [...accepted, ...prev]);
        setPassageWordInput('');
        setPassageWordSuggestions(invalidSuggestions);
        if (invalidHints.length > 0) {
          setError(`Không tìm thấy một số từ: ${invalidHints.join(' | ')}`);
        }
      } else {
        setPassageWordSuggestions(invalidSuggestions);
        setError(`Không tìm thấy từ. Gợi ý: ${invalidHints.join(' | ') || 'Không có'}`);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError("Lỗi khi thêm từ vào bài đọc.");
    } finally {
      if (aiRequestControllerRef.current === controller) {
        aiRequestControllerRef.current = null;
      }
      isAiStoppingRef.current = false;
      setPassageWordLoading(false);
    }
  };

  const savePendingExtractedWord = (wordId) => {
    const target = pendingExtractedAiWords.find((item) => item.id === wordId);
    if (!target) return;
    setExtractedWords((prev) => [{ ...target }, ...prev]);
    setPendingExtractedAiWords((prev) => prev.filter((item) => item.id !== wordId));
  };

  const discardPendingExtractedWord = (wordId) => {
    setPendingExtractedAiWords((prev) => prev.filter((item) => item.id !== wordId));
  };

  const savePendingPassageWord = (passageId, wordId) => {
    const target = pendingPassageAiWords.find((item) => item.id === wordId);
    if (!target) return;

    const nextPassages = passages.map((p) => {
      if (p.id === passageId) {
        return { ...p, words: [{ ...target }, ...(p.words || [])] };
      }
      return p;
    });

    setPassages(nextPassages);
    setPendingPassageAiWords((prev) => prev.filter((item) => item.id !== wordId));

    void saveLocalSnapshotNow({ nextPassages });

    void syncFullDataToSQLNow({
      nextPassages,
      statusMessage: 'Đã lưu từ vào bài đọc và đồng bộ SQL Server.'
    });
  };

  const discardPendingPassageWord = (wordId) => {
    setPendingPassageAiWords((prev) => prev.filter((item) => item.id !== wordId));
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

  const startEditSelectedWord = () => {
    const currentWord = getSelectedWord();
    if (!currentWord) return;

    setEditSelectedWordData({
      word: currentWord.word || '',
      ipa: currentWord.ipa || '',
      type: currentWord.type || 'Noun',
      definition: currentWord.definition || ''
    });
    setIsEditingSelectedWord(true);
    setError(null);
  };

  const cancelEditSelectedWord = () => {
    setIsEditingSelectedWord(false);
    setEditSelectedWordData(null);
  };

  const saveSelectedWordEdit = () => {
    if (!selectedWordId || !editSelectedWordData) return;

    const normalizedWord = editSelectedWordData.word.trim();
    const normalizedDefinition = editSelectedWordData.definition.trim();

    if (!normalizedWord || !normalizedDefinition) {
      setError('Vui lòng nhập đầy đủ từ vựng và nghĩa tiếng Việt trước khi lưu.');
      return;
    }

    const isDuplicate = vocabList.some(
      w => w.id !== selectedWordId && w.word.toLowerCase() === normalizedWord.toLowerCase()
    );

    if (isDuplicate) {
      setError(`Từ "${normalizedWord}" đã tồn tại trong kho từ vựng.`);
      return;
    }

    setVocabList(vocabList.map(w => {
      if (w.id !== selectedWordId) return w;
      return {
        ...w,
        word: normalizedWord,
        ipa: editSelectedWordData.ipa.trim(),
        type: editSelectedWordData.type.trim() || 'Noun',
        definition: normalizedDefinition
      };
    }));

    setIsEditingSelectedWord(false);
    setEditSelectedWordData(null);
    setError(null);
  };

  const deleteSelectedVocabulary = (wordId) => {
    const targetWord = vocabList.find((item) => item.id === wordId);
    openDeleteConfirm({
      title: 'Delete this word?',
      message: `"${targetWord?.word || 'This word'}" will be permanently removed from this lesson.`,
      itemType: 'Word',
      itemName: targetWord?.word || '',
      warningLevel: 'normal',
      consequenceList: [
        'Removed from learning sessions',
        'Removed from review queue if present',
        'Stats linked to this word may be lost',
      ],
      confirmText: 'Delete Word',
      onConfirm: async () => {
        setVocabList(prev => prev.filter(v => v.id !== wordId));
        if (selectedWordId === wordId) {
          setSelectedWordId(null);
        }
        await deleteItemOnSqlNow('vocab', wordId);
        return 'Word deleted successfully';
      }
    });
  };

  const openPassage = (id) => {
    setSelectedPassageId(id);
    setActiveTab('reading');
    setReadingPage('library');
    setSelectedWordId(null);
    setSelectedGrammarId(null);
    setIsEditingPassage(false);
    setPassageQuestionAnswers({});
    setPassageQuestionFeedback({});
  };

  const startEditingPassage = () => {
    const p = getSelectedPassage();
    if (p) {
      setEditPassageTitle(p.title);
      setEditPassageContent(p.content);
      setEditPassageMedia(p.media || []);
      setEditPassageQuestions(p.questions || []);
      setEditQuestionDraft(createEmptyQuestionDraft());
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
        return {
          ...p,
          title: editPassageTitle.trim(),
          content: editPassageContent,
          media: editPassageMedia,
          questions: editPassageQuestions
        };
      }
      return p;
    }));
    setIsEditingPassage(false);
    setEditQuestionDraft(createEmptyQuestionDraft());
    setError(null);
  };

  const deletePassage = (id, event) => {
    if (event) {
      event.stopPropagation();
    }

    const targetPassage = passages.find((item) => item.id === id);
    openDeleteConfirm({
      title: 'Delete this reading?',
      message: `"${targetPassage?.title || 'This reading'}" will be permanently removed.`,
      itemType: 'Reading',
      itemName: targetPassage?.title || '',
      warningLevel: 'danger',
      consequenceList: [
        'Reading content will be removed',
        'Linked reading media will be removed',
        'Curriculum links to this reading may be affected',
      ],
      confirmText: 'Delete Reading',
      onConfirm: async () => {
        setPassages(prev => prev.filter(p => p.id !== id));
        if (selectedPassageId === id) {
          setSelectedPassageId(null);
          setIsEditingPassage(false);
        }
        await deleteItemOnSqlNow('passage', id);
        return 'Reading deleted successfully';
      }
    });
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
    const targetGrammar = grammarList.find((item) => item.id === id);
    openDeleteConfirm({
      title: 'Delete this grammar?',
      message: `"${targetGrammar?.title || 'This grammar'}" will be permanently removed.`,
      itemType: 'Grammar',
      itemName: targetGrammar?.title || '',
      warningLevel: 'danger',
      consequenceList: [
        'Grammar article will be removed',
        'Related curriculum references may be removed',
      ],
      confirmText: 'Delete Grammar',
      onConfirm: async () => {
        setGrammarList(grammarList.filter(g => g.id !== id));
        setSelectedGrammarId(null);
        await deleteItemOnSqlNow('grammar', id);
        return 'Grammar deleted successfully';
      }
    });
  };

  const displayedVocab = filterDataByTime(vocabList);
  const displayedPassages = filterDataByTime(passages);

  const now = Date.now();
  const learningVocabList = displayedVocab.filter(item => !item.isLearned);
  const learnedVocabList = displayedVocab.filter(item => item.isLearned && (!item.nextReviewDate || item.nextReviewDate > now));
  const reviewVocabList = displayedVocab.filter(item => item.isLearned && item.nextReviewDate && item.nextReviewDate <= now);

  const filteredLearnedVocabList = learnedVocabList.filter(item =>
    item.word.toLowerCase().includes(learnedSearchTerm.toLowerCase()) ||
    getDisplayDefinition(item).toLowerCase().includes(learnedSearchTerm.toLowerCase())
  );

  const filteredReviewVocabList = reviewVocabList.filter(item =>
    item.word.toLowerCase().includes(reviewSearchTerm.toLowerCase()) ||
    getDisplayDefinition(item).toLowerCase().includes(reviewSearchTerm.toLowerCase())
  );

  const vocabPanelKeyword = vocabPanelSearchTerm.trim().toLowerCase();

  const filteredAddedVocabList = learningVocabList.filter((item) => {
    if (!vocabPanelKeyword) return true;
    return (
      item.word.toLowerCase().includes(vocabPanelKeyword)
      || getDisplayDefinition(item).toLowerCase().includes(vocabPanelKeyword)
      || String(item.type || '').toLowerCase().includes(vocabPanelKeyword)
    );
  });

  const filteredLearnedPanelVocabList = displayedVocab.filter((item) => {
    if (!item.isLearned) return false;
    if (!vocabPanelKeyword) return true;
    return (
      item.word.toLowerCase().includes(vocabPanelKeyword)
      || getDisplayDefinition(item).toLowerCase().includes(vocabPanelKeyword)
      || String(item.type || '').toLowerCase().includes(vocabPanelKeyword)
    );
  });

  const getVocabCreatedTimestamp = (item) => {
    const createdAtTs = item?.createdAt ? new Date(item.createdAt).getTime() : NaN;
    if (Number.isFinite(createdAtTs) && createdAtTs > 0) return createdAtTs;
    const idTs = Number(item?.id);
    if (Number.isFinite(idTs) && idTs > 0) return idTs;
    return 0;
  };

  const learnedPanelPreviewVocabList = [...filteredLearnedPanelVocabList]
    .sort((a, b) => getVocabCreatedTimestamp(a) - getVocabCreatedTimestamp(b))
    .slice(0, 5);

  const managerDifficultyOptions = ['easy', 'medium', 'hard'];
  const managerPartOfSpeechOptions = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'sentence'];

  const selectedTopic = customTopics.find((item) => item.id === selectedTopicId) || null;
  const selectedLesson = customLessons.find((item) => item.id === selectedLessonId) || null;
  const lessonsInSelectedTopic = customLessons
    .filter((lesson) => lesson.topicId === selectedTopicId)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  const wordsInSelectedLesson = customWords.filter((word) => word.lessonId === selectedLessonId);

  const filteredTopics = customTopics.filter((topic) => {
    const keyword = topicSearchTerm.trim().toLowerCase();
    if (!keyword) return true;
    return (
      String(topic.title || '').toLowerCase().includes(keyword)
      || String(topic.description || '').toLowerCase().includes(keyword)
    );
  });

  const filteredManagerWords = wordsInSelectedLesson.filter((word) => {
    const keyword = managerWordSearch.trim().toLowerCase();
    if (managerDifficultyFilter !== 'all' && word.difficulty !== managerDifficultyFilter) return false;
    if (managerPosFilter !== 'all' && word.partOfSpeech !== managerPosFilter) return false;
    if (!keyword) return true;
    return (
      String(word.word || '').toLowerCase().includes(keyword)
      || String(word.meaning || '').toLowerCase().includes(keyword)
      || String(word.example || '').toLowerCase().includes(keyword)
    );
  });

  const showManagerToast = (message) => {
    toast.success(message, { dedupeKey: `manager-${message}` });
  };

  const showActionToast = (message, type = 'success') => {
    const typed = typeof toast[type] === 'function' ? toast[type] : toast.info;
    typed(message, { dedupeKey: `action-${type}-${message}` });
  };

  const openDeleteConfirm = ({
    title,
    message,
    itemName = '',
    itemType = '',
    warningLevel = 'normal',
    confirmText = 'Xóa',
    cancelText = 'Hủy',
    showTypeToConfirm = false,
    typeToConfirmText = 'DELETE',
    consequenceList = [],
    icon = null,
    disableClose,
    onConfirm,
  }) => {
    confirmActionRef.current = onConfirm;
    setConfirmModal({
      open: true,
      title: title || 'Xác nhận xóa',
      message: message || 'Bạn có chắc chắn muốn xóa mục này?',
      itemName,
      itemType,
      warningLevel,
      confirmText,
      cancelText,
      loading: false,
      error: '',
      showTypeToConfirm,
      typeToConfirmText,
      confirmInput: '',
      consequenceList,
      icon,
      disableClose: typeof disableClose === 'boolean' ? disableClose : warningLevel === 'critical',
    });
  };

  const closeDeleteConfirm = () => {
    if (confirmModal.loading) return;
    setConfirmModal((prev) => ({ ...prev, open: false }));
    confirmActionRef.current = null;
  };

  const handleConfirmDelete = async () => {
    const action = confirmActionRef.current;
    if (typeof action !== 'function') {
      closeDeleteConfirm();
      return;
    }

    setConfirmModal((prev) => {
      if (prev.showTypeToConfirm && String(prev.confirmInput).trim() !== String(prev.typeToConfirmText).trim()) {
        return {
          ...prev,
          error: `Vui lòng nhập chính xác "${prev.typeToConfirmText}" để tiếp tục.`
        };
      }
      return { ...prev, loading: true, error: '' };
    });

    if (typeof action === 'function') {
      try {
        const result = await action();
        const successText = typeof result === 'string' && result.trim()
          ? result
          : 'Thao tác đã được thực hiện thành công.';
        showActionToast(successText, 'success');
        setConfirmModal((prev) => ({ ...prev, open: false, loading: false, error: '' }));
        confirmActionRef.current = null;
      } catch (err) {
        const message = typeof err === 'string' ? err : (err?.message || 'Failed to process this action. Please try again.');
        setConfirmModal((prev) => ({ ...prev, loading: false, error: message }));
        showActionToast(message, 'error');
      }
    }
  };

  const generateManagerWordFields = (word, example, meaningPool = []) => {
    const cleanedWord = String(word || '').trim();
    const cleanedExample = String(example || '').trim();
    const scrambled = cleanedWord
      ? cleanedWord.split('').sort(() => Math.random() - 0.5).join('')
      : '';
    const escapedWord = cleanedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fillBlankSentence = cleanedExample
      ? cleanedExample.replace(new RegExp(escapedWord, 'i'), '_____')
      : `I use ${cleanedWord} every day.`.replace(new RegExp(escapedWord, 'i'), '_____');

    const optionPool = Array.from(new Set([
      ...meaningPool.filter(Boolean),
      String(meaningPool[0] || '').trim()
    ].filter(Boolean)));

    return {
      scrambled,
      fillBlankSentence,
      options: optionPool.slice(0, 4)
    };
  };

  const normalizeManagerTags = useCallback((rawTags) => {
    const normalizedRaw = Array.isArray(rawTags)
      ? rawTags.join(',')
      : String(rawTags || '');

    const byHash = normalizedRaw.includes('#')
      ? [...normalizedRaw.matchAll(/#([^#]+)/g)].map((match) => match[1] || '')
      : [normalizedRaw];

    return Array.from(new Set(
      byHash
        .flatMap((chunk) => String(chunk || '').split(/[\n,;|]+/))
        .map((item) => item.replace(/^#+/, '').trim().replace(/\s{2,}/g, ' '))
        .filter(Boolean)
    ));
  }, []);

  const managerWordToVocab = useCallback((wordObj) => {
    const difficultyLevel = wordObj.difficulty === 'hard' ? 3 : (wordObj.difficulty === 'medium' ? 2 : 1);
    const tags = normalizeManagerTags(wordObj.tags);

    return {
      id: wordObj.id,
      word: wordObj.word,
      ipa: wordObj.phonetic,
      type: wordObj.partOfSpeech,
      definition: wordObj.meaning,
      difficulty: difficultyLevel,
      isLearned: false,
      nextReviewDate: null,
      examples: wordObj.example ? [{ en: wordObj.example, vi: '' }] : [],
      antonyms: wordObj.antonym ? [wordObj.antonym] : [],
      collocations: tags
    };
  }, [normalizeManagerTags]);

  useEffect(() => {
    if (!customWords.length) return;

    const customIds = new Set(customWords.map((item) => item.id));
    const mappedWords = customWords.map((item) => managerWordToVocab(item));

    setVocabList((prev) => {
      const nonCustom = prev.filter((item) => !customIds.has(item.id));
      return [...mappedWords, ...nonCustom];
    });
  }, [customWords, managerWordToVocab]);

  const createOrUpdateTopic = () => {
    const title = String(topicForm.title || '').trim();
    if (!title) {
      setError('Topic name không được để trống.');
      return;
    }

    const duplicate = customTopics.some((topic) => {
      if (editingTopicId && topic.id === editingTopicId) return false;
      return String(topic.title || '').trim().toLowerCase() === title.toLowerCase();
    });
    if (duplicate) {
      setError('Tên topic đã tồn tại (không phân biệt hoa thường).');
      return;
    }

    const nowIso = new Date().toISOString();
    if (editingTopicId) {
      setCustomTopics((prev) => prev.map((topic) => (
        topic.id === editingTopicId
          ? {
            ...topic,
            title,
            icon: String(topicForm.icon || '📘').trim() || '📘',
            description: String(topicForm.description || '').trim(),
            difficulty: topicForm.difficulty,
            colorTheme: topicForm.colorTheme,
            updatedAt: nowIso
          }
          : topic
      )));
      showManagerToast('Cập nhật topic thành công');
    } else {
      const topicId = Date.now();
      const topic = {
        id: topicId,
        title,
        icon: String(topicForm.icon || '📘').trim() || '📘',
        description: String(topicForm.description || '').trim(),
        difficulty: topicForm.difficulty,
        colorTheme: topicForm.colorTheme,
        unlocked: true,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      setCustomTopics((prev) => [topic, ...prev]);
      setSelectedTopicId(topicId);
      showManagerToast('Tạo topic thành công');
    }

    setTopicForm({ title: '', icon: '📘', description: '', difficulty: 'easy', colorTheme: 'blue' });
    setEditingTopicId(null);
    setError(null);
  };

  const beginEditTopic = (topic) => {
    setEditingTopicId(topic.id);
    setTopicForm({
      title: topic.title || '',
      icon: topic.icon || '📘',
      description: topic.description || '',
      difficulty: topic.difficulty || 'easy',
      colorTheme: topic.colorTheme || 'blue'
    });
  };

  const deleteTopic = (topicId) => {
    const targetTopic = customTopics.find((item) => item.id === topicId);
    const lessonsInTopic = customLessons.filter((lesson) => lesson.topicId === topicId);
    const lessonIds = lessonsInTopic.map((lesson) => lesson.id);
    const wordsInTopicCount = customWords.filter((word) => lessonIds.includes(word.lessonId)).length;

    openDeleteConfirm({
      title: 'Delete this topic?',
      message: `"${targetTopic?.title || 'This topic'}" including ${lessonsInTopic.length} lessons and ${wordsInTopicCount} words will be permanently deleted.`,
      itemType: 'Topic',
      itemName: targetTopic?.title || '',
      warningLevel: 'critical',
      showTypeToConfirm: true,
      typeToConfirmText: String(targetTopic?.title || 'DELETE'),
      consequenceList: [
        'All lessons in this topic will be deleted',
        'All words in those lessons will be deleted',
        'Related progress, stats, and review items may be removed',
      ],
      confirmText: 'Delete Topic',
      onConfirm: () => {
        const wordIds = customWords.filter((word) => lessonIds.includes(word.lessonId)).map((word) => word.id);

        setCustomTopics((prev) => prev.filter((topic) => topic.id !== topicId));
        setCustomLessons((prev) => prev.filter((lesson) => lesson.topicId !== topicId));
        setCustomWords((prev) => prev.filter((word) => !wordIds.includes(word.id)));
        setVocabList((prev) => prev.filter((item) => !wordIds.includes(item.id)));
        if (selectedTopicId === topicId) {
          setSelectedTopicId(null);
          setSelectedLessonId(null);
        }
        showManagerToast('Đã xóa topic');
        return 'Topic deleted successfully';
      }
    });
  };

  const createOrUpdateLesson = () => {
    if (!selectedTopicId) {
      setError('Vui lòng chọn topic trước khi thêm lesson.');
      return;
    }

    const title = String(lessonForm.title || '').trim();
    if (!title) {
      setError('Lesson name không được để trống.');
      return;
    }

    const duplicate = customLessons.some((lesson) => {
      if (lesson.topicId !== selectedTopicId) return false;
      if (editingLessonId && lesson.id === editingLessonId) return false;
      return String(lesson.title || '').trim().toLowerCase() === title.toLowerCase();
    });
    if (duplicate) {
      setError('Tên lesson đã tồn tại trong topic này.');
      return;
    }

    const nowIso = new Date().toISOString();
    if (editingLessonId) {
      setCustomLessons((prev) => prev.map((lesson) => (
        lesson.id === editingLessonId
          ? {
            ...lesson,
            title,
            description: String(lessonForm.description || '').trim(),
            difficulty: lessonForm.difficulty,
            estimatedDuration: Number(lessonForm.estimatedDuration) || 5,
            sortOrder: Number(lessonForm.sortOrder) || 1,
            updatedAt: nowIso
          }
          : lesson
      )));
      showManagerToast('Cập nhật lesson thành công');
    } else {
      const lessonId = Date.now() + Math.floor(Math.random() * 1000);
      const lesson = {
        id: lessonId,
        topicId: selectedTopicId,
        title,
        description: String(lessonForm.description || '').trim(),
        difficulty: lessonForm.difficulty,
        estimatedDuration: Number(lessonForm.estimatedDuration) || 5,
        sortOrder: Number(lessonForm.sortOrder) || 1,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      setCustomLessons((prev) => [...prev, lesson]);
      setSelectedLessonId(lessonId);
      showManagerToast('Thêm lesson thành công');
    }

    setLessonForm({ title: '', description: '', difficulty: 'easy', estimatedDuration: 5, sortOrder: 1 });
    setEditingLessonId(null);
    setError(null);
  };

  const beginEditLesson = (lesson) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title || '',
      description: lesson.description || '',
      difficulty: lesson.difficulty || 'easy',
      estimatedDuration: Number(lesson.estimatedDuration || 5),
      sortOrder: Number(lesson.sortOrder || 1)
    });
  };

  const deleteLesson = (lessonId) => {
    const targetLesson = customLessons.find((item) => item.id === lessonId);
    const wordCount = customWords.filter((word) => word.lessonId === lessonId).length;

    openDeleteConfirm({
      title: 'Delete this lesson?',
      message: `"${targetLesson?.title || 'This lesson'}" and all ${wordCount} words inside it will be permanently deleted.`,
      itemType: 'Lesson',
      itemName: targetLesson?.title || '',
      warningLevel: 'danger',
      consequenceList: [
        'All words in this lesson will be deleted',
        'Review items linked to these words may be removed',
        'Progress in this lesson may reset',
      ],
      confirmText: 'Delete Lesson',
      onConfirm: () => {
        const wordIds = customWords.filter((word) => word.lessonId === lessonId).map((word) => word.id);
        setCustomLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
        setCustomWords((prev) => prev.filter((word) => word.lessonId !== lessonId));
        setVocabList((prev) => prev.filter((item) => !wordIds.includes(item.id)));
        if (selectedLessonId === lessonId) {
          setSelectedLessonId(null);
        }
        showManagerToast('Đã xóa lesson');
        return 'Lesson deleted successfully';
      }
    });
  };

  const normalizeManagerPartOfSpeech = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'noun';
    if (managerPartOfSpeechOptions.includes(raw)) return raw;

    if (raw.includes('adj')) return 'adjective';
    if (raw.includes('adv')) return 'adverb';
    if (raw.includes('verb')) return 'verb';
    if (raw.includes('phrase')) return 'phrase';
    if (raw.includes('sentence')) return 'sentence';
    return 'noun';
  };

  const autoFillWordFormFromGroq = async () => {
    const keyword = String(wordForm.word || '').trim();
    if (!keyword) {
      setError('Nhap English word truoc khi tra cuu Groq.');
      return;
    }

    if (!GROQ_API_KEY) {
      setError('Thieu VITE_GROQ_API_KEY trong file .env de dung Groq auto-fill.');
      return;
    }

    try {
      setManagerAutoFillLoading(true);
      setError(null);
      const topicTitle = customTopics.find((item) => item.id === selectedTopicId)?.title || '';
      const lessonTitle = customLessons.find((item) => item.id === selectedLessonId)?.title || '';
      const prompt = `Tra cuu tu vung tieng Anh "${keyword}" va tra ve duy nhat 1 JSON object voi cac key: word, meaning, phonetic, example, difficulty, partOfSpeech, synonym, antonym, tags, note, imageEmoji, audioText.\nYeu cau:\n- meaning: nghia tieng Viet ngan gon.\n- phonetic: IPA co dau / /.\n- example: 1 cau vi du tieng Anh don gian.\n- difficulty chi duoc: easy|medium|hard.\n- partOfSpeech chi duoc: noun|verb|adjective|adverb|phrase|sentence.\n- tags: mang chuoi ngan (2-4 tag).\n- note: meo nho ngan gon bang tieng Viet.\n- imageEmoji: 1 emoji phu hop.\n- audioText: tu can doc.\nNgu canh hoc tap: topic="${topicTitle}", lesson="${lessonTitle}".`;

      const aiData = await callGemini(prompt);
      const difficulty = String(aiData?.difficulty || '').trim().toLowerCase();
      const normalizedDifficulty = managerDifficultyOptions.includes(difficulty) ? difficulty : 'easy';
      const tagsValue = Array.isArray(aiData?.tags)
        ? aiData.tags.map((item) => String(item || '').trim()).filter(Boolean).join(', ')
        : String(aiData?.tags || '').trim();

      setWordForm((prev) => ({
        ...prev,
        word: String(aiData?.word || '').trim() || prev.word,
        meaning: String(aiData?.meaning || '').trim() || prev.meaning,
        phonetic: String(aiData?.phonetic || '').trim() || prev.phonetic || `/${keyword}/`,
        example: String(aiData?.example || '').trim() || prev.example,
        difficulty: normalizedDifficulty,
        partOfSpeech: normalizeManagerPartOfSpeech(aiData?.partOfSpeech),
        synonym: String(aiData?.synonym || '').trim() || prev.synonym,
        antonym: String(aiData?.antonym || '').trim() || prev.antonym,
        note: String(aiData?.note || '').trim() || prev.note,
        tags: tagsValue || prev.tags,
        imageEmoji: String(aiData?.imageEmoji || '').trim() || prev.imageEmoji || '📘',
        audioText: String(aiData?.audioText || '').trim() || prev.audioText || keyword
      }));

      showManagerToast('Da goi y du lieu bang Groq. Ban co the sua lai truoc khi luu.');
    } catch (err) {
      setError(`Khong the auto-fill tu Groq: ${String(err?.message || err)}`);
    } finally {
      setManagerAutoFillLoading(false);
    }
  };

  const createOrUpdateWord = (override = null) => {
    if (!selectedTopicId || !selectedLessonId) {
      setError('Vui lòng chọn topic và lesson trước khi thêm từ.');
      return;
    }

    const payload = override || wordForm;
    const word = String(payload.word || '').trim();
    const meaning = String(payload.meaning || '').trim();
    const phonetic = String(payload.phonetic || '').trim();
    const example = String(payload.example || '').trim();

    if (!word || !meaning || !phonetic || !example) {
      setError('Cần nhập đủ Word, Meaning, Phonetic và Example.');
      return;
    }

    const nowIso = new Date().toISOString();
    const tags = normalizeManagerTags(payload.tags);
    const core = {
      topicId: selectedTopicId,
      lessonId: selectedLessonId,
      word,
      meaning,
      phonetic,
      example,
      imageEmoji: String(payload.imageEmoji || '📘').trim() || '📘',
      audioText: String(payload.audioText || '').trim() || word,
      difficulty: payload.difficulty || 'easy',
      partOfSpeech: payload.partOfSpeech || 'noun',
      synonym: String(payload.synonym || '').trim(),
      antonym: String(payload.antonym || '').trim(),
      note: String(payload.note || '').trim(),
      tags,
    };

    const generated = generateManagerWordFields(word, example, [meaning, ...customWords.map((item) => item.meaning).filter(Boolean)]);

    if (editingWordId) {
      const updated = {
        ...core,
        ...generated,
        id: editingWordId,
        createdAt: customWords.find((item) => item.id === editingWordId)?.createdAt || nowIso,
        updatedAt: nowIso,
        correctCount: customWords.find((item) => item.id === editingWordId)?.correctCount || 0,
        wrongCount: customWords.find((item) => item.id === editingWordId)?.wrongCount || 0,
        reviewScore: customWords.find((item) => item.id === editingWordId)?.reviewScore || 0,
        lastReviewed: customWords.find((item) => item.id === editingWordId)?.lastReviewed || null,
        nextReviewAt: customWords.find((item) => item.id === editingWordId)?.nextReviewAt || null,
      };
      setCustomWords((prev) => prev.map((item) => item.id === editingWordId ? updated : item));
      setVocabList((prev) => prev.map((item) => item.id === editingWordId ? managerWordToVocab(updated) : item));
      showManagerToast('Cập nhật từ thành công');
    } else {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const newWord = {
        ...core,
        ...generated,
        id,
        createdAt: nowIso,
        updatedAt: nowIso,
        correctCount: 0,
        wrongCount: 0,
        reviewScore: 0,
        lastReviewed: null,
        nextReviewAt: null,
      };
      setCustomWords((prev) => [newWord, ...prev]);
      setVocabList((prev) => [managerWordToVocab(newWord), ...prev.filter((item) => item.id !== id)]);
      showManagerToast('Thêm từ thành công');
    }

    setWordForm({
      word: '', meaning: '', phonetic: '', example: '', difficulty: 'easy', partOfSpeech: 'noun',
      imageEmoji: '📘', synonym: '', antonym: '', note: '', tags: '', audioText: ''
    });
    setEditingWordId(null);
    setError(null);
  };

  const beginEditWord = (word) => {
    setEditingWordId(word.id);
    setWordForm({
      word: word.word || '',
      meaning: word.meaning || '',
      phonetic: word.phonetic || '',
      example: word.example || '',
      difficulty: word.difficulty || 'easy',
      partOfSpeech: word.partOfSpeech || 'noun',
      imageEmoji: word.imageEmoji || '📘',
      synonym: word.synonym || '',
      antonym: word.antonym || '',
      note: word.note || '',
      tags: Array.isArray(word.tags) ? word.tags.join(', ') : String(word.tags || ''),
      audioText: word.audioText || ''
    });
  };

  const deleteWord = (wordId) => {
    const targetWord = customWords.find((item) => item.id === wordId);
    const lesson = customLessons.find((item) => item.id === targetWord?.lessonId);
    const topic = customTopics.find((item) => item.id === targetWord?.topicId);

    openDeleteConfirm({
      title: 'Delete this word?',
      message: `"${targetWord?.word || 'This word'}" will be permanently removed from this lesson.`,
      itemType: 'Word',
      itemName: `${targetWord?.word || ''}${lesson?.title ? ` | ${lesson.title}` : ''}${topic?.title ? ` | ${topic.title}` : ''}`,
      warningLevel: 'normal',
      consequenceList: [
        'Removed from learning sessions',
        'Removed from review queue if present',
        'Stats linked to this word may be lost',
      ],
      confirmText: 'Delete Word',
      onConfirm: () => {
        setCustomWords((prev) => prev.filter((word) => word.id !== wordId));
        setVocabList((prev) => prev.filter((item) => item.id !== wordId));
        if (selectedWordId === wordId) setSelectedWordId(null);
        showManagerToast('Đã xóa từ');
        return 'Word deleted successfully';
      }
    });
  };

  const bulkDeleteWordsInSelectedLesson = () => {
    if (!selectedLessonId) {
      setError('Vui lòng chọn lesson để xóa hàng loạt.');
      return;
    }

    const lesson = customLessons.find((item) => item.id === selectedLessonId);
    const targetWords = customWords.filter((word) => word.lessonId === selectedLessonId);
    const targetIds = targetWords.map((word) => word.id);

    if (!targetIds.length) {
      setError('Lesson này chưa có từ để xóa.');
      return;
    }

    openDeleteConfirm({
      title: 'Delete bulk data?',
      message: `This will delete all ${targetIds.length} words in lesson "${lesson?.title || ''}".`,
      itemType: 'Bulk Delete',
      itemName: lesson?.title || '',
      warningLevel: 'danger',
      consequenceList: [
        'All words in this lesson will be deleted',
        'Review items linked to these words may be removed',
      ],
      confirmText: 'Delete All Words',
      onConfirm: () => {
        setCustomWords((prev) => prev.filter((word) => word.lessonId !== selectedLessonId));
        setVocabList((prev) => prev.filter((item) => !targetIds.includes(item.id)));
        return 'Bulk data deleted successfully';
      }
    });
  };

  const clearReviewQueue = () => {
    const queued = vocabList.filter((item) => item.isLearned && item.nextReviewDate && item.nextReviewDate <= Date.now()).length;

    openDeleteConfirm({
      title: 'Clear review queue?',
      message: 'This will clear review due dates for all queued review items.',
      itemType: 'Review Queue',
      itemName: `${queued} queued words`,
      warningLevel: 'danger',
      consequenceList: [
        'Words in review queue will be removed from due list',
        'Learned status is preserved',
      ],
      confirmText: 'Clear Queue',
      onConfirm: () => {
        setVocabList((prev) => prev.map((item) => (
          item.isLearned ? { ...item, nextReviewDate: null } : item
        )));
        setCustomWords((prev) => prev.map((item) => ({ ...item, nextReviewAt: null, lastReviewed: null })));
        return 'Review queue cleared';
      }
    });
  };

  const updateSettingsPreference = (key, value) => {
    setSettingsPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const performResetLearningProgress = () => {
    setVocabList((prev) => prev.map((item) => ({ ...item, isLearned: false, nextReviewDate: null })));
    setCustomWords((prev) => prev.map((item) => ({
      ...item,
      correctCount: 0,
      wrongCount: 0,
      reviewScore: 0,
      lastReviewed: null,
      nextReviewAt: null,
    })));
    setDictationHistory([]);
    setGameBestComboByType({});
    localStorage.removeItem(GAME_BEST_COMBO_STORAGE_KEY);
  };

  const confirmResetLearningProgressFromSettings = async () => {
    if (!resetProgressAcknowledged || isResetProgressProcessing) return;

    setIsResetProgressProcessing(true);
    try {
      performResetLearningProgress();
      setIsResetProgressModalOpen(false);
      setResetProgressAcknowledged(false);
      toast.success('Learning progress has been reset.', {
        title: 'Progress reset',
        dedupeKey: 'settings-reset-progress',
      });
    } catch {
      toast.error('Unable to reset progress right now. Please try again.');
    } finally {
      setIsResetProgressProcessing(false);
    }
  };

  const clearCustomVocabularyFromSettings = () => {
    const topicCount = customTopics.length;
    const lessonCount = customLessons.length;
    const wordCount = customWords.length;

    openDeleteConfirm({
      title: 'Delete custom vocabulary?',
      message: 'This will remove all custom topics, lessons, and words created in Content Studio.',
      itemType: 'Custom Vocabulary',
      itemName: `${wordCount} words`,
      warningLevel: 'critical',
      showTypeToConfirm: true,
      typeToConfirmText: 'DELETE',
      consequenceList: [
        `${topicCount} topic(s) will be deleted`,
        `${lessonCount} lesson(s) will be deleted`,
        `${wordCount} word(s) will be removed from app data`,
      ],
      confirmText: 'Delete Custom Data',
      onConfirm: () => {
        const customWordIdSet = new Set(customWords.map((item) => item.id));
        setCustomTopics([]);
        setCustomLessons([]);
        setCustomWords([]);
        setVocabList((prev) => prev.filter((item) => !customWordIdSet.has(item.id)));
        setSelectedTopicId(null);
        setSelectedLessonId(null);
        return 'Custom vocabulary deleted';
      },
    });
  };

  const restoreDefaultSettingsFromPanel = () => {
    setSettingsPreferences({ ...DEFAULT_SETTINGS_PREFERENCES });
    setSelectedThemePreset(DEFAULT_THEME_PRESET_NAME);
    toast.success('Settings restored to defaults.', {
      title: 'Defaults restored',
      dedupeKey: 'settings-restore-default',
    });
  };

  const clearAllLocalData = () => {
    openDeleteConfirm({
      title: 'Delete all local data?',
      message: 'This will erase all topics, lessons, vocabulary, stats, streaks, and saved progress from this device.',
      itemType: 'All Local Data',
      warningLevel: 'critical',
      showTypeToConfirm: true,
      typeToConfirmText: 'DELETE',
      consequenceList: [
        'All local learning content will be removed',
        'All local progress and review history will be reset',
        'This action cannot be undone',
      ],
      confirmText: 'Delete All Data',
      onConfirm: async () => {
        setVocabList([]);
        setPassages([]);
        setGrammarList([]);
        setCurriculumList([]);
        setCustomTopics([]);
        setCustomLessons([]);
        setCustomWords([]);
        setSelectedTopicId(null);
        setSelectedLessonId(null);
        setSelectedWordId(null);
        setSelectedPassageId(null);
        setSelectedGrammarId(null);
        setDictationHistory([]);
        setGameBestComboByType({});
        localStorage.removeItem(GAME_BEST_COMBO_STORAGE_KEY);
        if (!isTauriRuntime()) {
          await Promise.all([
            saveData('vocabList', []),
            saveData('passages', []),
            saveData('grammarList', []),
            saveData('curriculumList', []),
            saveData('customTopics', []),
            saveData('customLessons', []),
            saveData('customWords', []),
          ]);
        }
        return 'All local data cleared';
      }
    });
  };

  const exportManagerData = (scope = 'all') => {
    const payload = {
      customTopics,
      customLessons,
      customWords
    };

    let exportPayload = payload;
    if (scope === 'topic' && selectedTopicId) {
      const topics = customTopics.filter((topic) => topic.id === selectedTopicId);
      const lessons = customLessons.filter((lesson) => lesson.topicId === selectedTopicId);
      const lessonIds = lessons.map((lesson) => lesson.id);
      const words = customWords.filter((word) => lessonIds.includes(word.lessonId));
      exportPayload = { customTopics: topics, customLessons: lessons, customWords: words };
    }
    if (scope === 'lesson' && selectedLessonId) {
      const lesson = customLessons.find((item) => item.id === selectedLessonId);
      const topic = customTopics.find((item) => item.id === lesson?.topicId);
      const words = customWords.filter((word) => word.lessonId === selectedLessonId);
      exportPayload = { customTopics: topic ? [topic] : [], customLessons: lesson ? [lesson] : [], customWords: words };
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custom_vocab_${scope}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showManagerToast('Export JSON thành công');
  };

  const importManagerPayload = (rawData, mode = managerImportMode) => {
    let parsed;
    try {
      parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    } catch {
      setError('JSON import không hợp lệ.');
      return;
    }

    const incomingTopics = Array.isArray(parsed?.customTopics) ? parsed.customTopics : (Array.isArray(parsed?.topics) ? parsed.topics : []);
    const incomingLessons = Array.isArray(parsed?.customLessons) ? parsed.customLessons : (Array.isArray(parsed?.lessons) ? parsed.lessons : []);
    const incomingWords = Array.isArray(parsed?.customWords) ? parsed.customWords : (Array.isArray(parsed?.words) ? parsed.words : []);

    if (mode === 'replace') {
      setCustomTopics(incomingTopics);
      setCustomLessons(incomingLessons);
      setCustomWords(incomingWords);
      const incomingIds = new Set(incomingWords.map((item) => item.id));
      setVocabList((prev) => [...incomingWords.map((item) => managerWordToVocab(item)), ...prev.filter((item) => !incomingIds.has(item.id))]);
      showManagerToast(`Import replace: ${incomingTopics.length} topic, ${incomingLessons.length} lesson, ${incomingWords.length} word`);
      return;
    }

    if (mode === 'new-topic') {
      const firstTopic = incomingTopics[0] || {
        id: Date.now(),
        title: `Imported Topic ${new Date().toISOString().slice(11, 19)}`,
        icon: '📘',
        description: 'Imported',
        difficulty: 'easy',
        colorTheme: 'blue',
        unlocked: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newTopicId = Date.now() + Math.floor(Math.random() * 1000);
      const mappedTopic = { ...firstTopic, id: newTopicId, updatedAt: new Date().toISOString() };
      const sourceLessonIds = incomingLessons.filter((lesson) => lesson.topicId === firstTopic.id).map((lesson) => lesson.id);

      const mappedLessons = incomingLessons
        .filter((lesson) => sourceLessonIds.includes(lesson.id))
        .map((lesson, idx) => ({ ...lesson, id: newTopicId + idx + 1, topicId: newTopicId, updatedAt: new Date().toISOString() }));

      const lessonIdMap = new Map(mappedLessons.map((lesson, idx) => [sourceLessonIds[idx], lesson.id]));

      const mappedWords = incomingWords
        .filter((word) => sourceLessonIds.includes(word.lessonId))
        .map((word, idx) => ({
          ...word,
          id: Date.now() + idx + Math.floor(Math.random() * 100000),
          topicId: newTopicId,
          lessonId: lessonIdMap.get(word.lessonId),
          updatedAt: new Date().toISOString()
        }));

      setCustomTopics((prev) => [mappedTopic, ...prev]);
      setCustomLessons((prev) => [...mappedLessons, ...prev]);
      setCustomWords((prev) => [...mappedWords, ...prev]);
      setVocabList((prev) => [...mappedWords.map((item) => managerWordToVocab(item)), ...prev]);
      showManagerToast(`Import thành topic mới: ${mappedWords.length} từ`);
      return;
    }

    // merge
    const existingTopicIds = new Set(customTopics.map((item) => item.id));
    const existingLessonIds = new Set(customLessons.map((item) => item.id));
    const existingWordIds = new Set(customWords.map((item) => item.id));

    const mergedTopics = incomingTopics.map((topic, idx) => (
      existingTopicIds.has(topic.id) ? { ...topic, id: Date.now() + idx + 1000 } : topic
    ));

    const topicIdMap = new Map();
    mergedTopics.forEach((topic, idx) => {
      topicIdMap.set(incomingTopics[idx]?.id, topic.id);
    });

    const mergedLessons = incomingLessons.map((lesson, idx) => {
      const mappedTopicId = topicIdMap.get(lesson.topicId) || lesson.topicId;
      const nextId = existingLessonIds.has(lesson.id) ? Date.now() + idx + 5000 : lesson.id;
      return { ...lesson, id: nextId, topicId: mappedTopicId };
    });

    const lessonIdMap = new Map();
    mergedLessons.forEach((lesson, idx) => {
      lessonIdMap.set(incomingLessons[idx]?.id, lesson.id);
    });

    const mergedWords = incomingWords.map((word, idx) => ({
      ...word,
      id: existingWordIds.has(word.id) ? Date.now() + idx + 9000 : word.id,
      topicId: topicIdMap.get(word.topicId) || word.topicId,
      lessonId: lessonIdMap.get(word.lessonId) || word.lessonId,
      updatedAt: new Date().toISOString()
    }));

    setCustomTopics((prev) => [...mergedTopics, ...prev]);
    setCustomLessons((prev) => [...mergedLessons, ...prev]);
    setCustomWords((prev) => [...mergedWords, ...prev]);
    setVocabList((prev) => [...mergedWords.map((item) => managerWordToVocab(item)), ...prev.filter((item) => !mergedWords.some((word) => word.id === item.id))]);
    showManagerToast(`Merge thành công: +${mergedTopics.length} topic, +${mergedLessons.length} lesson, +${mergedWords.length} word`);
  };

  const getSelectedWordStatus = () => {
    const w = getSelectedWord();
    if (!w) return { isLearnedNow: false, isReviewing: false };
    const isReviewing = w.isLearned && w.nextReviewDate && w.nextReviewDate <= now;
    const isLearnedNow = w.isLearned && (!w.nextReviewDate || w.nextReviewDate > now);
    return { isLearnedNow, isReviewing };
  };

  const getSelectedCurriculum = () => curriculumList.find(c => c.id === selectedCurriculumId);

  const createCurriculum = () => {
    if (!newCurriculumTitle.trim()) {
      setError('Vui lòng nhập tên khóa học.');
      return;
    }

    const course = {
      id: Date.now(),
      title: newCurriculumTitle.trim(),
      description: newCurriculumDescription.trim(),
      days: [],
      createdAt: Date.now()
    };

    setCurriculumList(prev => [course, ...prev]);
    setSelectedCurriculumId(course.id);
    setNewCurriculumTitle('');
    setNewCurriculumDescription('');
    setError(null);
  };

  const removeCurriculum = (courseId) => {
    const targetCourse = curriculumList.find((item) => item.id === courseId);
    openDeleteConfirm({
      title: 'Delete this course?',
      message: `"${targetCourse?.title || 'This course'}" will be removed from curriculum.`,
      itemType: 'Curriculum',
      itemName: targetCourse?.title || '',
      warningLevel: 'danger',
      consequenceList: [
        'All curriculum days in this course will be deleted',
        'Associated planning progress in this course will be reset',
      ],
      confirmText: 'Delete Course',
      onConfirm: () => {
        setCurriculumList(prev => prev.filter(c => c.id !== courseId));
        if (selectedCurriculumId === courseId) {
          setSelectedCurriculumId(null);
        }
        return 'Course deleted successfully';
      }
    });
  };

  const addDayToCurriculum = (courseId) => {
    if (!newCurriculumDayLabel.trim()) {
      setError('Vui lòng nhập nhãn ngày học, ví dụ Day 1.');
      return;
    }

    const newDay = {
      id: Date.now() + Math.random(),
      dayLabel: newCurriculumDayLabel.trim(),
      title: newCurriculumDayTitle.trim(),
      done: false,
      objective: '',
      notes: '',
      vocabIds: [],
      passageIds: [],
      grammarIds: []
    };

    setCurriculumList(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      return { ...course, days: [...course.days, newDay] };
    }));

    const dayMatch = newCurriculumDayLabel.trim().match(/(\d+)/);
    const nextDayNumber = dayMatch ? Number(dayMatch[1]) + 1 : null;
    setNewCurriculumDayLabel(nextDayNumber ? `Day ${nextDayNumber}` : 'Day 1');
    setNewCurriculumDayTitle('');
    setError(null);
  };

  const updateCurriculumField = (courseId, field, value) => {
    setCurriculumList(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      return { ...course, [field]: value };
    }));
  };

  const updateCurriculumDayField = (courseId, dayId, field, value) => {
    setCurriculumList(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      return {
        ...course,
        days: course.days.map(day => day.id === dayId ? { ...day, [field]: value } : day)
      };
    }));
  };

  const toggleCurriculumDayLink = (courseId, dayId, field, itemId) => {
    setCurriculumList(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      return {
        ...course,
        days: course.days.map(day => {
          if (day.id !== dayId) return day;
          const currentIds = Array.isArray(day[field]) ? day[field] : [];
          const exists = currentIds.includes(itemId);
          return {
            ...day,
            [field]: exists ? currentIds.filter(id => id !== itemId) : [...currentIds, itemId]
          };
        })
      };
    }));
  };

  const removeCurriculumDay = (courseId, dayId) => {
    setCurriculumList(prev => prev.map(course => {
      if (course.id !== courseId) return course;
      return { ...course, days: course.days.filter(day => day.id !== dayId) };
    }));
  };

  const getCurriculumDayVocabSearch = (dayId) => curriculumDayVocabSearch[dayId] || '';

  useEffect(() => {
    setCurriculumExportScope('all');
  }, [selectedCurriculumId]);

  const getCurriculumProgress = (course) => {
    const totalDays = course?.days?.length || 0;
    const doneDays = (course?.days || []).filter(day => day.done).length;
    const percent = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;
    return { totalDays, doneDays, percent };
  };

  const handleDayDragStart = (courseId, dayId) => {
    setDragDayInfo({ courseId, dayId });
  };

  const handleDayDrop = (courseId, targetDayId) => {
    if (!dragDayInfo || dragDayInfo.courseId !== courseId || dragDayInfo.dayId === targetDayId) {
      setDragDayInfo(null);
      return;
    }

    setCurriculumList(prev => prev.map(course => {
      if (course.id !== courseId) return course;

      const fromIndex = course.days.findIndex(day => day.id === dragDayInfo.dayId);
      const toIndex = course.days.findIndex(day => day.id === targetDayId);
      if (fromIndex < 0 || toIndex < 0) return course;

      const reordered = [...course.days];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return { ...course, days: reordered };
    }));

    setDragDayInfo(null);
  };

  const normalizeDictationText = (text) => {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const splitTextToSentences = (rawText) => {
    const text = String(rawText || '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    return text
      .split(/(?<=[.!?])\s+/)
      .map(item => item.trim())
      .filter(item => item.length >= 8);
  };

  const getDictationSentencePool = () => {
    if (dictationMode === 'custom') {
      return splitTextToSentences(dictationCustomText).map(item => ({ sentence: item, source: 'Van ban tuy chon' }));
    }

    if (dictationMode === 'passage') {
      const selectedPassage = passages.find(item => String(item.id) === String(dictationPassageId));
      const passageText = stripHtml(selectedPassage?.content || '');
      return splitTextToSentences(passageText).map(item => ({ sentence: item, source: selectedPassage?.title || 'Bai doc' }));
    }

    const fromVocabExamples = vocabList.flatMap(item =>
      (item.examples || [])
        .map(ex => String(ex?.en || '').trim())
        .filter(Boolean)
        .map(sentence => ({ sentence, source: `Vi du: ${item.word}` }))
    );
    return fromVocabExamples.filter(item => item.sentence.length >= 8);
  };

  const pickDictationSentence = () => {
    const pool = getDictationSentencePool();
    if (!pool.length) {
      setError('Nguon du lieu nghe chep dang trong. Hay nhap doan van hoac chon bai doc.');
      return null;
    }

    const next = pool[Math.floor(Math.random() * pool.length)];
    setDictationCurrentSentence(next.sentence);
    setDictationCurrentSource(next.source);
    setDictationAnswer('');
    setDictationResult(null);
    setDictationHintLevel(0);
    setDictationShowAnswer(false);
    setError(null);
    return next;
  };

  const playCurrentDictation = async (repeat = 1) => {
    const current = dictationCurrentSentence || pickDictationSentence()?.sentence;
    if (!current) return;

    const mergedText = repeat > 1
      ? Array.from({ length: repeat }, () => current).join('. ')
      : current;
    await speak(mergedText, 'dictation-main');
  };

  const checkDictationAnswer = () => {
    const expected = normalizeDictationText(dictationCurrentSentence);
    const actual = normalizeDictationText(dictationAnswer);

    if (!expected) {
      setError('Chua co cau de kiem tra. Hay bam Lay cau ngau nhien truoc.');
      return;
    }

    const expectedTokens = expected.split(' ').filter(Boolean);
    const actualTokens = actual.split(' ').filter(Boolean);
    const maxLength = Math.max(expectedTokens.length, 1);
    let matched = 0;
    const missing = [];
    const wrong = [];

    for (let i = 0; i < expectedTokens.length; i++) {
      if (actualTokens[i] === expectedTokens[i]) {
        matched += 1;
      } else {
        missing.push(expectedTokens[i]);
        if (actualTokens[i]) wrong.push(actualTokens[i]);
      }
    }

    const extra = actualTokens.slice(expectedTokens.length);
    const accuracy = Math.round((matched / maxLength) * 100);
    const result = {
      accuracy,
      matched,
      total: expectedTokens.length,
      missing: Array.from(new Set(missing)).slice(0, 8),
      wrong: Array.from(new Set([...wrong, ...extra])).slice(0, 8)
    };

    setDictationResult(result);
    setDictationHistory(prev => [result, ...prev].slice(0, 10));
  };

  const buildDictationHint = () => {
    if (!dictationCurrentSentence) return '';
    const words = dictationCurrentSentence.split(/\s+/).filter(Boolean);
    if (dictationHintLevel <= 0) return '';
    if (dictationHintLevel >= 3) return dictationCurrentSentence;

    const revealCount = dictationHintLevel;
    return words.map((word) => {
      const clean = word.replace(/[^a-zA-Z']/g, '');
      if (!clean) return word;
      const prefix = clean.slice(0, Math.min(revealCount, clean.length));
      return `${prefix}${'_'.repeat(Math.max(clean.length - revealCount, 0))}`;
    }).join(' ');
  };

  useEffect(() => {
    setDictationCurrentSentence('');
    setDictationCurrentSource('');
    setDictationAnswer('');
    setDictationResult(null);
    setDictationHintLevel(0);
    setDictationShowAnswer(false);
  }, [dictationMode, dictationPassageId]);

  const shuffleArray = (arr) => {
    const copied = [...arr];
    for (let i = copied.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copied[i], copied[j]] = [copied[j], copied[i]];
    }
    return copied;
  };

  const normalizeSimpleWord = (value) => String(value || '').toLowerCase().trim().replace(/[^a-z0-9'-]/g, '');

  const playGameFeedbackSound = (isCorrect) => {
    try {
      const AudioContextRef = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextRef) return;

      const ctx = new AudioContextRef();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isCorrect ? 'triangle' : 'sawtooth';
      const startFreq = isCorrect ? 720 : 230;
      const endFreq = isCorrect ? 980 : 145;
      const duration = isCorrect ? 0.2 : 0.24;

      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
      osc.onended = () => {
        ctx.close();
      };
    } catch {
      // Silent fallback when Web Audio is unavailable.
    }
  };

  const clearGameBubbleTimers = () => {
    gameBubbleTimersRef.current.forEach(timerId => clearTimeout(timerId));
    gameBubbleTimersRef.current = [];
  };

  const getComboMultiplier = (streak) => {
    const ramp = Math.max(1, Number(gameComboRamp) || 1);
    return Math.min(8, 1 + Math.floor(Math.max(streak - 1, 0) / ramp));
  };

  const registerGameCorrect = (baseScore = 1) => {
    const nextStreak = gameComboStreak + 1;
    const nextMultiplier = getComboMultiplier(nextStreak);
    setGameComboStreak(nextStreak);
    setGameComboMultiplier(nextMultiplier);
    setGameRunBestCombo(prev => Math.max(prev, nextMultiplier));
    setGameBestComboByType(prev => {
      const currentBest = Number(prev?.[gameType] || 1);
      if (nextMultiplier <= currentBest) return prev;

      const updated = { ...prev, [gameType]: nextMultiplier };
      localStorage.setItem(GAME_BEST_COMBO_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setGameScore(prev => prev + (baseScore * nextMultiplier));
  };

  const registerGameMiss = (scorePenalty = 0) => {
    setGameComboStreak(0);
    setGameComboMultiplier(1);
    setGameLives(prev => {
      const next = Math.max(0, prev - 1);
      if (next <= 0) {
        setGameOver(true);
        setGameStarted(false);
        clearGameBubbleTimers();
      }
      return next;
    });

    if (scorePenalty > 0) {
      setGameScore(prev => Math.max(0, prev - scorePenalty));
    }
  };

  const buildNormalizedGamePool = (sourceWords) => {
    return sourceWords
      .filter(w => w?.word && getDisplayDefinition(w))
      .map(w => ({
        id: w.id,
        word: String(w.word || '').trim(),
        ipa: String(w.ipa || '').trim(),
        type: String(w.type || ''),
        definition: String(getDisplayDefinition(w) || '').trim()
      }))
      .filter(w => w.word && w.definition);
  };

  const scrambleWord = (word) => {
    const letters = String(word || '').split('');
    if (letters.length <= 2) return word;

    let result = word;
    let guard = 0;
    while (normalizeSimpleWord(result) === normalizeSimpleWord(word) && guard < 8) {
      result = shuffleArray(letters).join('');
      guard += 1;
    }
    return result;
  };

  const buildGameQuestions = (sourceWords, count, type) => {
    const normalizedPool = buildNormalizedGamePool(sourceWords);
    if (normalizedPool.length < 2) return [];

    const picked = shuffleArray(normalizedPool).slice(0, Math.min(count, normalizedPool.length));

    if (type === 'unscramble') {
      return picked.map((item) => ({
        id: item.id,
        word: item.word,
        ipa: item.ipa,
        type: item.type,
        hint: item.definition,
        scrambled: scrambleWord(item.word),
        correct: item.word
      }));
    }

    if (type === 'fill') {
      return picked.map((item) => ({
        id: item.id,
        word: item.word,
        ipa: item.ipa,
        type: item.type,
        hint: item.definition,
        correct: item.word
      }));
    }

    if (type === 'bubble') {
      return picked.map((item) => {
        const distractorWords = shuffleArray(
          normalizedPool
            .filter(candidate => candidate.word !== item.word)
            .map(candidate => candidate.word)
            .filter(Boolean)
        ).slice(0, 5);

        return {
          id: item.id,
          word: item.word,
          ipa: item.ipa,
          type: item.type,
          hint: item.definition,
          correct: item.word,
          options: shuffleArray([item.word, ...distractorWords]).slice(0, Math.max(2, Math.min(6, distractorWords.length + 1)))
        };
      });
    }

    return picked.map((item) => {
      const distractors = shuffleArray(
        normalizedPool
          .filter(candidate => candidate.word !== item.word)
          .map(candidate => candidate.definition)
          .filter(Boolean)
      );

      const options = shuffleArray([
        item.definition,
        ...distractors.filter(def => def !== item.definition).slice(0, 3)
      ]);

      return {
        id: item.id,
        word: item.word,
        ipa: item.ipa,
        type: item.type,
        correct: item.definition,
        options
      };
    });
  };

  const buildMemoryCards = (sourceWords, count) => {
    const normalizedPool = buildNormalizedGamePool(sourceWords);
    const pairCount = Math.min(Math.max(2, count), Math.min(8, normalizedPool.length));
    if (pairCount < 2) return [];

    const picked = shuffleArray(normalizedPool).slice(0, pairCount);
    const cards = picked.flatMap((item) => ([
      { id: `w-${item.id}`, pairId: item.id, type: 'word', text: item.word },
      { id: `d-${item.id}`, pairId: item.id, type: 'definition', text: item.definition }
    ]));

    return shuffleArray(cards);
  };

  const resetGameProgress = () => {
    clearGameBubbleTimers();
    setGameQuestions([]);
    setGameCurrentIndex(0);
    setGameScore(0);
    setGameLives(gameInitialLives);
    setGameComboStreak(0);
    setGameComboMultiplier(1);
    setGameRunBestCombo(1);
    setGameOver(false);
    setGameStarted(false);
    setGameAnswered(false);
    setGameSelectedOption('');
    setGameTextAnswer('');
    setGameFillLoading(false);
    setGameBubbleEntities([]);
    setGameBubbleTimeoutHits(0);
    setGameMemoryCards([]);
    setGameMemoryFlipped([]);
    setGameMemoryMatched([]);
    setGameMemoryMoves(0);
    gameBubbleSpeakRef.current = '';
    gameBubbleLaneCursorRef.current = 0;
    gameAnsweredRef.current = false;
    gameMemoryLockRef.current = false;
  };

  const toggleGameWordSelection = (wordId) => {
    setGameSelectedWordIds(prev => (
      prev.includes(wordId) ? prev.filter(id => id !== wordId) : [...prev, wordId]
    ));
  };

  const startGameSession = () => {
    const basePool = gameMode === 'selected'
      ? vocabList.filter(w => gameSelectedWordIds.includes(w.id))
      : vocabList;

    if (!basePool.length) {
      setError(gameMode === 'selected'
        ? 'Vui lòng chọn ít nhất 1 từ để bắt đầu trò chơi.'
        : 'Chưa có từ vựng để tạo trò chơi.');
      return;
    }

    if (gameType === 'memory') {
      const cards = buildMemoryCards(basePool, Number(gameQuestionCount) || 6);
      if (cards.length < 4) {
        setError('Can it nhat 2 cap tu-nghia hop le de choi Memory.');
        return;
      }

      setGameMemoryCards(cards);
      setGameMemoryFlipped([]);
      setGameMemoryMatched([]);
      setGameMemoryMoves(0);
      setGameStarted(true);
      setGameAnswered(false);
      setGameSelectedOption('');
      setGameTextAnswer('');
      setGameScore(0);
      setGameLives(gameInitialLives);
      setGameComboStreak(0);
      setGameComboMultiplier(1);
      setGameRunBestCombo(1);
      setGameOver(false);
      setError(null);
      return;
    }

    const questions = buildGameQuestions(basePool, Number(gameQuestionCount) || 10, gameType);
    if (questions.length < 2) {
      setError('Cần ít nhất 2 từ có nghĩa hợp lệ để chơi trò chơi.');
      return;
    }

    setGameQuestions(questions);
    setGameCurrentIndex(0);
    setGameScore(0);
    setGameLives(gameInitialLives);
    setGameComboStreak(0);
    setGameComboMultiplier(1);
    setGameRunBestCombo(1);
    setGameOver(false);
    setGameStarted(true);
    setGameAnswered(false);
    setGameSelectedOption('');
    setGameTextAnswer('');
    setGameBubbleEntities([]);
    setGameBubbleTimeoutHits(0);
    gameBubbleLaneCursorRef.current = 0;
    setError(null);
  };

  const answerGameQuestion = (option) => {
    if (!gameStarted || gameAnswered) return;
    const current = gameQuestions[gameCurrentIndex];
    if (!current) return;

    const isCorrect = option === current.correct;

    setGameSelectedOption(option);
    setGameAnswered(true);
    if (isCorrect) {
      registerGameCorrect(1);
    } else {
      registerGameMiss(0);
    }
    playGameFeedbackSound(isCorrect);
  };

  const submitTextGameAnswer = () => {
    if (!gameStarted || gameAnswered) return;
    const current = gameQuestions[gameCurrentIndex];
    if (!current) return;

    const typed = normalizeSimpleWord(gameTextAnswer);
    if (!typed) {
      setError('Hay nhap cau tra loi truoc khi kiem tra.');
      return;
    }

    let expected = normalizeSimpleWord(current.correct);
    if (gameType === 'fill') {
      const fillData = gameFillDataMap[current.id];
      expected = normalizeSimpleWord(fillData?.answer || current.word);
    }

    const isCorrect = typed === expected;

    setGameSelectedOption(gameTextAnswer);
    setGameAnswered(true);
    if (isCorrect) {
      registerGameCorrect(1);
    } else {
      registerGameMiss(0);
    }
    playGameFeedbackSound(isCorrect);
  };

  const nextGameQuestion = () => {
    if (!gameAnswered) return;
    clearGameBubbleTimers();
    setGameCurrentIndex(prev => prev + 1);
    setGameAnswered(false);
    setGameSelectedOption('');
    setGameTextAnswer('');
    setGameBubbleEntities([]);
    setGameBubbleTimeoutHits(0);
    gameBubbleLaneCursorRef.current = 0;
  };

  const handleBubbleHit = (bubble) => {
    if (!bubble || gameAnswered) return;

    setGameBubbleEntities(prev => prev.filter(item => item.id !== bubble.id));

    if (bubble.isCorrect) {
      answerGameQuestion(bubble.text);
      clearGameBubbleTimers();
      return;
    }

    registerGameMiss(1);
    playGameFeedbackSound(false);
  };

  const fetchFillSentence = async (question) => {
    if (!question || gameFillLoading || gameFillDataMap[question.id]) return;

    setGameFillLoading(true);
    try {
      const payload = await callGemini(
        `Tao 1 cau tieng Anh ngan co chua tu "${question.word}" va 1 ban dich tieng Viet. Tra ve JSON duy nhat theo schema {"sentence":"...","answer":"${question.word}","vi":"..."}. sentence phai thay tu do bang "____". answer phai dung chinh xac "${question.word}".`,
        undefined
      );

      const rawSentence = String(payload?.sentence || '').trim();
      const rawAnswer = String(payload?.answer || question.word).trim() || question.word;
      const rawVi = String(payload?.vi || '').trim();
      const safeAnswer = rawAnswer || question.word;
      const escaped = safeAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      let sentence = rawSentence;
      if (!sentence.includes('____')) {
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        sentence = sentence ? sentence.replace(regex, '____') : '';
      }
      if (!sentence.includes('____')) {
        sentence = `I use ____ every day.`;
      }

      setGameFillDataMap(prev => ({
        ...prev,
        [question.id]: {
          sentence,
          answer: safeAnswer,
          vi: rawVi
        }
      }));
    } catch {
      setGameFillDataMap(prev => ({
        ...prev,
        [question.id]: {
          sentence: `I use ____ every day.`,
          answer: question.word,
          vi: ''
        }
      }));
    } finally {
      setGameFillLoading(false);
    }
  };

  const flipMemoryCard = (card) => {
    if (!card || gameMemoryLockRef.current) return;
    if (gameMemoryFlipped.includes(card.id) || gameMemoryMatched.includes(card.pairId)) return;

    const nextFlipped = [...gameMemoryFlipped, card.id];
    setGameMemoryFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    setGameMemoryMoves(prev => prev + 1);
    gameMemoryLockRef.current = true;

    const firstCard = gameMemoryCards.find(item => item.id === nextFlipped[0]);
    const secondCard = gameMemoryCards.find(item => item.id === nextFlipped[1]);
    const isPair = firstCard && secondCard && firstCard.pairId === secondCard.pairId;

    if (isPair) {
      playGameFeedbackSound(true);
      setGameMemoryMatched(prev => {
        const updated = [...prev, firstCard.pairId];
        if (updated.length === Math.floor(gameMemoryCards.length / 2)) {
          setGameScore(updated.length);
          setGameStarted(false);
        }
        return updated;
      });
      setGameMemoryFlipped([]);
      gameMemoryLockRef.current = false;
      return;
    }

    playGameFeedbackSound(false);

    setTimeout(() => {
      setGameMemoryFlipped([]);
      gameMemoryLockRef.current = false;
    }, 700);
  };

  useEffect(() => {
    if (!gameStarted || gameType !== 'bubble') return;
    const current = gameQuestions[gameCurrentIndex];
    if (!current) return;
    const speakKey = `${current.id}-${gameCurrentIndex}`;
    if (gameBubbleSpeakRef.current === speakKey) return;

    gameBubbleSpeakRef.current = speakKey;
    speak(current.word, `bubble-${speakKey}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameType, gameCurrentIndex, gameQuestions]);

  useEffect(() => {
    if (!gameStarted || gameType !== 'fill') return;
    const current = gameQuestions[gameCurrentIndex];
    if (!current || gameFillDataMap[current.id]) return;
    fetchFillSentence(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameType, gameCurrentIndex, gameQuestions, gameFillDataMap]);

  useEffect(() => {
    gameAnsweredRef.current = gameAnswered;
  }, [gameAnswered]);

  useEffect(() => {
    if (!gameStarted || gameType !== 'bubble' || gameAnswered) return;
    const current = gameQuestions[gameCurrentIndex];
    if (!current || !Array.isArray(current.options) || !current.options.length) return;

    clearGameBubbleTimers();
    setGameBubbleEntities([]);
    setGameBubbleTimeoutHits(0);
    gameBubbleLaneCursorRef.current = 0;

    const laneAnchors = [8, 30, 52, 74];

    const spawnBubble = () => {
      const text = current.options[Math.floor(Math.random() * current.options.length)];
      const isCorrect = text === current.correct;
      const laneIndex = gameBubbleLaneCursorRef.current % laneAnchors.length;
      gameBubbleLaneCursorRef.current += 1;

      const bubble = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        isCorrect,
        laneLeft: laneAnchors[laneIndex],
        durationSec: (4.1 + (laneIndex * 0.3) + (Math.random() * 1.4)) / Math.max(0.6, Number(gameBubbleSpeed) || 1),
        sizePx: 92 + Math.floor(Math.random() * 26)
      };

      setGameBubbleEntities(prev => [...prev.slice(-15), bubble]);

      const timeoutId = setTimeout(() => {
        setGameBubbleEntities(prev => prev.filter(item => item.id !== bubble.id));
        if (bubble.isCorrect && !gameAnsweredRef.current) {
          registerGameMiss(1);
          setGameBubbleTimeoutHits(prev => prev + 1);
          playGameFeedbackSound(false);
        }
      }, bubble.durationSec * 1000);

      gameBubbleTimersRef.current.push(timeoutId);
    };

    spawnBubble();
    const spawnInterval = Math.max(280, Math.round(620 / Math.max(0.6, Number(gameBubbleSpeed) || 1)));
    const intervalId = setInterval(spawnBubble, spawnInterval);

    return () => {
      clearInterval(intervalId);
      clearGameBubbleTimers();
      setGameBubbleEntities([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameType, gameCurrentIndex, gameQuestions, gameAnswered, gameBubbleSpeed]);

  useEffect(() => {
    resetGameProgress();
    return () => {
      clearGameBubbleTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-800">Vocab Master</h1>
            <p className="text-slate-500 mt-1">Đăng nhập hoặc tạo tài khoản để tiếp tục.</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); setAuthInfo(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${authMode === 'login' ? 'bg-white text-indigo-600' : 'text-slate-500'}`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); setAuthInfo(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${authMode === 'register' ? 'bg-white text-indigo-600' : 'text-slate-500'}`}
            >
              Đăng ký
            </button>
          </div>

          {authMode === 'register' && (
            <input
              value={authFullName}
              onChange={(e) => setAuthFullName(e.target.value)}
              placeholder="Họ và tên"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
            />
          )}

          <input
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <input
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Mật khẩu"
            type="password"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
          />

          {authError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              {authError}
            </div>
          )}

          {authInfo && (
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
              {authInfo}
            </div>
          )}

          {authMode === 'login' && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Quên mật khẩu</h3>
              <input
                value={authForgotEmail}
                onChange={(e) => setAuthForgotEmail(e.target.value)}
                placeholder="Email đã đăng ký"
                type="email"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                value={authForgotNewPassword}
                onChange={(e) => setAuthForgotNewPassword(e.target.value)}
                placeholder="Mật khẩu mới"
                type="password"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={handleForgotPassword}
                disabled={authLoading}
                className="w-full py-2 bg-slate-700 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-70"
              >
                {authLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </div>
          )}

          <button
            onClick={authMode === 'register' ? handleRegister : handleLogin}
            disabled={authLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authMode === 'register' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />)}
            {authLoading ? 'Đang xử lý...' : (authMode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập')}
          </button>
        </div>
      </div>
    );
  }

  const navTabs = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'vocabulary', label: 'Từ vựng', icon: <Languages className="w-4 h-4" /> },
    { id: 'topics', label: 'Chủ đề', icon: <Library className="w-4 h-4" /> },
    { id: 'reading', label: 'Bài đọc', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'dictation', label: 'Nghe chép', icon: <Headphones className="w-4 h-4" /> },
    { id: 'grammar', label: 'Ngữ pháp', icon: <Library className="w-4 h-4" /> },
    { id: 'review', label: 'Ôn tập', icon: <RefreshCw className="w-4 h-4" />, count: reviewVocabList.length },
    { id: 'learned', label: 'Đã học', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'curriculum', label: 'Giáo trình', icon: <FileText className="w-4 h-4" /> },
    { id: 'game', label: 'Trò chơi', icon: <Gamepad2 className="w-4 h-4" /> }
  ];
  const safeVisibleCount = Math.max(1, Math.min(navVisibleCount, navTabs.length));
  const visibleTabs = navTabs.slice(0, safeVisibleCount);
  const hiddenTabs = navTabs.slice(safeVisibleCount);
  const isHiddenTabActive = hiddenTabs.some((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full px-4 md:px-8 py-2">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0">
              <img src="/ico2.ico" alt="Cat Learn EL logo" className="w-6 h-6 object-contain" />
            </div>

            <nav className="flex-1 min-w-0 bg-slate-100/70 p-1 rounded-xl">
              <div ref={navHostRef} className="flex items-center gap-1">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => openTab(tab.id)}
                    className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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

                {hiddenTabs.length > 0 && (
                  <div
                    ref={moreMenuRef}
                    className="relative ml-auto shrink-0"
                    onMouseEnter={openMoreMenu}
                    onMouseLeave={closeMoreMenuWithDelay}
                  >
                    <button
                      onMouseEnter={openMoreMenu}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 border ${isMoreMenuOpen || isHiddenTabActive ? 'bg-white text-indigo-600 border-indigo-200 shadow-sm' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                    >
                      Thêm <ChevronDown className="w-4 h-4" />
                    </button>

                    {isMoreMenuOpen && (
                      <div
                        className="absolute right-0 top-11 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50"
                        onMouseEnter={openMoreMenu}
                        onMouseLeave={closeMoreMenuWithDelay}
                      >
                        {hiddenTabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => openTab(tab.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                          >
                            <span className="flex items-center gap-2">
                              {tab.icon}
                              {tab.label}
                            </span>
                            {tab.count > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {tab.count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
              <button
                onClick={() => openTab('settings')}
                className={`p-2 rounded-xl border transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                title="Cài đặt"
                aria-label="Cài đặt"
              >
                <Settings className="w-4 h-4" />
              </button>

              <div className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 max-w-40 truncate">
                {currentUser.fullName || currentUser.full_name || currentUser.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full p-4 md:p-8">
        {authInfo && currentUser && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
            {authInfo}
          </div>
        )}

        {authError && currentUser && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
            {authError}
          </div>
        )}

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
            <button onClick={() => { setSelectedWordId(null); cancelEditSelectedWord(); }} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold transition-colors">
              <ArrowLeft className="w-5 h-5" /> Quay lại
            </button>
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 md:p-12">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
                <div>
                  {isEditingSelectedWord ? (
                    <div className="space-y-3 w-full md:min-w-[480px]">
                      <input
                        value={editSelectedWordData?.word || ''}
                        onChange={(e) => setEditSelectedWordData({ ...editSelectedWordData, word: e.target.value })}
                        className="w-full px-4 py-3 text-2xl md:text-3xl font-black text-slate-800 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Từ vựng"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={editSelectedWordData?.ipa || ''}
                          onChange={(e) => setEditSelectedWordData({ ...editSelectedWordData, ipa: e.target.value })}
                          className="w-full px-4 py-3 text-lg font-mono text-indigo-600 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Phiên âm IPA"
                        />
                        <select
                          value={editSelectedWordData?.type || 'Noun'}
                          onChange={(e) => setEditSelectedWordData({ ...editSelectedWordData, type: e.target.value })}
                          className="w-full px-4 py-3 text-sm font-bold text-slate-700 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          {WORD_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['Noun', 'Verb', 'Adjective', 'Adverb'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setEditSelectedWordData({ ...editSelectedWordData, type: tag })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${(editSelectedWordData?.type || '').toLowerCase() === tag.toLowerCase() ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-3">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-800">{getSelectedWord().word}</h1>
                        <span className={`px-3 py-1 text-sm font-bold rounded-lg uppercase border ${getTypeBadgeClass(getSelectedWord().type)}`}>{getSelectedWord().type}</span>
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
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4">
                    {isEditingSelectedWord ? (
                      <>
                        <button
                          onClick={saveSelectedWordEdit}
                          className="px-5 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors font-bold"
                        >
                          Lưu chỉnh sửa
                        </button>
                        <button
                          onClick={cancelEditSelectedWord}
                          className="px-5 py-3 bg-slate-200 text-slate-700 rounded-2xl hover:bg-slate-300 transition-colors font-bold"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startEditSelectedWord}
                        className="p-3 rounded-2xl transition-colors text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                        title="Chỉnh sửa từ vựng"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
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
                      onClick={() => deleteSelectedVocabulary(selectedWordId)}
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
                {isEditingSelectedWord ? (
                  <textarea
                    value={editSelectedWordData?.definition || ''}
                    onChange={(e) => setEditSelectedWordData({ ...editSelectedWordData, definition: e.target.value })}
                    className="w-full px-4 py-3 text-lg text-slate-700 font-medium border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={3}
                    placeholder="Nghĩa tiếng Việt"
                  />
                ) : (
                  <p className="text-2xl text-slate-700 font-medium leading-relaxed">{getDisplayDefinition(getSelectedWord())}</p>
                )}
              </div>

              {!isEditingSelectedWord && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Từ trái nghĩa</h4>
                    <div className="flex flex-wrap gap-2">
                      {(getSelectedWord().antonyms || []).length > 0 ? (getSelectedWord().antonyms || []).map((item, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-semibold">{item}</span>
                      )) : <span className="text-xs text-slate-400">Chưa có dữ liệu</span>}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Collocation liên quan</h4>
                    <div className="flex flex-wrap gap-2">
                      {(getSelectedWord().collocations || []).length > 0 ? (getSelectedWord().collocations || []).map((item, idx) => (
                        <span key={idx} className="px-2 py-1 text-xs rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold">{item}</span>
                      )) : <span className="text-xs text-slate-400">Chưa có dữ liệu</span>}
                    </div>
                  </div>
                </div>
              )}

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
        {activeTab === 'settings' && !selectedWordId && (
          <div
            className="space-y-6 animate-in fade-in duration-300"
            style={{
              fontSize: settingsPreferences.uiScale === 'Large'
                ? '1.04rem'
                : settingsPreferences.uiScale === 'Comfortable'
                  ? '1.01rem'
                  : '1rem',
            }}
          >
            <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-br from-white via-slate-50/70 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8 shadow-[0_12px_35px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_45px_rgba(2,6,23,0.45)]">
              <div className="pointer-events-none absolute inset-0 opacity-90" style={{ backgroundImage: 'radial-gradient(circle at 8% -10%, color-mix(in srgb, var(--color-primary-soft) 58%, transparent 42%) 0%, transparent 36%), radial-gradient(circle at 100% 110%, color-mix(in srgb, var(--color-accent-soft) 54%, transparent 46%) 0%, transparent 45%)' }} />
              <div className="relative flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3.5">
                  <div className="h-12 w-12 rounded-2xl border border-white/80 dark:border-slate-700/80 bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] shadow-sm flex items-center justify-center">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">Settings</h2>
                    <p className="mt-1 text-sm md:text-base text-slate-600 dark:text-slate-300">Personalize your learning experience and customize the app to match your style.</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-[color:var(--color-accent)]" />
                  Saved automatically
                </span>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/80 p-6 md:p-8 shadow-[0_14px_38px_rgba(15,23,42,0.1)] dark:shadow-[0_20px_46px_rgba(2,6,23,0.5)]">
              <div className="absolute inset-0 opacity-95" style={{ backgroundImage: `radial-gradient(circle at 82% 0%, color-mix(in srgb, ${activeThemePreset.colors.primary} 15%, transparent 85%) 0%, transparent 52%), radial-gradient(circle at -10% 110%, color-mix(in srgb, ${activeThemePreset.colors.accent} 16%, transparent 84%) 0%, transparent 46%)` }} />
              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] font-black text-slate-500 dark:text-slate-400">Current Theme</p>
                  <h3 className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">{activeThemePreset.name}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-md">{activeThemePreset.description}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Changes are applied instantly across the app</p>
                  <div className="mt-4 flex items-center gap-2">
                    {[activeThemePreset.colors.primary, activeThemePreset.colors.accent, activeThemePreset.colors.success, activeThemePreset.colors.reward, activeThemePreset.colors.danger].map((color) => (
                      <span key={color} className="h-6 w-6 rounded-full border border-white/90 shadow-md" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/80 dark:border-slate-700/80 p-4 bg-white/75 dark:bg-slate-900/65 backdrop-blur-sm">
                  <div className="rounded-2xl border border-white/80 dark:border-slate-700/70 p-4" style={{ backgroundImage: `linear-gradient(150deg, color-mix(in srgb, ${activeThemePreset.colors.primarySoft} 70%, #ffffff 30%) 0%, color-mix(in srgb, ${activeThemePreset.colors.accentSoft} 75%, #ffffff 25%) 100%)` }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeThemePreset.colors.primary }} />
                        <span className="h-1.5 w-16 rounded-full bg-slate-300/80 dark:bg-slate-500/60" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-full text-[10px] font-black text-white" style={{ backgroundColor: activeThemePreset.colors.accent }}>XP +20</span>
                        <span className="px-2 py-1 rounded-full text-[10px] font-black text-white" style={{ backgroundColor: activeThemePreset.colors.reward }}>Streak 7</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <button className="px-3 py-1.5 text-xs font-black text-white rounded-xl" style={{ backgroundColor: activeThemePreset.colors.primary }}>Practice</button>
                      <button className="px-3 py-1.5 text-xs font-bold rounded-xl" style={{ backgroundColor: activeThemePreset.colors.accentSoft, color: activeThemePreset.colors.accent }}>Review</button>
                    </div>

                    <div className="h-2.5 rounded-full bg-white/70 dark:bg-slate-800/75 overflow-hidden mb-3">
                      <div className="h-full rounded-full" style={{ width: '74%', backgroundImage: `linear-gradient(90deg, ${activeThemePreset.colors.primary} 0%, ${activeThemePreset.colors.accent} 100%)` }} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="h-9 rounded-xl border border-white/80 dark:border-slate-700/70" style={{ backgroundColor: activeThemePreset.colors.successSoft }} />
                      <div className="h-9 rounded-xl border border-white/80 dark:border-slate-700/70" style={{ backgroundColor: activeThemePreset.colors.rewardSoft }} />
                    </div>

                    <div className="space-y-2">
                      <div className="h-2 rounded-full bg-slate-300/75 dark:bg-slate-500/60 w-[85%]" />
                      <div className="h-2 rounded-full bg-slate-300/70 dark:bg-slate-500/50 w-[66%]" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <SettingsPanel
              icon={Palette}
              title="Appearance"
              subtitle="Choose how the app looks across your device."
              badge="Personalize"
            >
              <SettingsSegmentedControl
                title="Theme Mode"
                subtitle="Light, dark, or follow your system preference."
                value={settingsPreferences.themeMode}
                options={[
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                  { label: 'System', value: 'system' },
                ]}
                onChange={(next) => updateSettingsPreference('themeMode', next)}
              />
            </SettingsPanel>

            <ThemePresetSelector />

            <SettingsPanel
              icon={Gauge}
              title="Learning Experience"
              subtitle="Fine-tune how practice rounds feel day to day."
            >
              <SettingsSegmentedControl
                title="Daily Goal"
                subtitle="Set a realistic target for each day."
                value={String(settingsPreferences.dailyGoal)}
                options={['5', '10', '20', '30']}
                onChange={(next) => updateSettingsPreference('dailyGoal', Number(next))}
              />
              <SettingsSegmentedControl
                title="Practice Difficulty"
                subtitle="Adjust challenge level for quiz and review."
                value={settingsPreferences.practiceDifficulty}
                options={['Easy', 'Balanced', 'Challenging']}
                onChange={(next) => updateSettingsPreference('practiceDifficulty', next)}
              />
              <SettingsToggleRow
                title="Auto-show Translation"
                subtitle="Display translation immediately after each answer."
                checked={settingsPreferences.autoShowTranslation}
                onChange={(next) => updateSettingsPreference('autoShowTranslation', next)}
              />
              <SettingsToggleRow
                title="Shuffle Review Questions"
                subtitle="Randomize order in review mode for better retention."
                checked={settingsPreferences.shuffleReviewQuestions}
                onChange={(next) => updateSettingsPreference('shuffleReviewQuestions', next)}
              />
              <SettingsToggleRow
                title="Auto-play Next Round"
                subtitle="Move to the next prompt automatically after each answer."
                checked={settingsPreferences.autoPlayNextRound}
                onChange={(next) => updateSettingsPreference('autoPlayNextRound', next)}
              />
            </SettingsPanel>

            <SettingsPanel
              icon={CalendarClock}
              title="Notifications & Reminders"
              subtitle="Keep your streak stable with the right nudges."
            >
              <SettingsToggleRow
                title="Daily Reminder"
                subtitle="Receive a daily reminder to complete your goal."
                checked={settingsPreferences.dailyReminder}
                onChange={(next) => updateSettingsPreference('dailyReminder', next)}
              />
              <div className={`rounded-2xl border border-slate-200/80 dark:border-slate-700/80 px-4 py-3.5 bg-white/80 dark:bg-slate-900/65 ${settingsPreferences.dailyReminder ? '' : 'opacity-60'}`}>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Reminder Time</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">Choose when daily reminder should appear.</p>
                <input
                  type="time"
                  value={settingsPreferences.reminderTime}
                  onChange={(event) => updateSettingsPreference('reminderTime', event.target.value)}
                  disabled={!settingsPreferences.dailyReminder}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
                />
              </div>
              <SettingsToggleRow
                title="Streak Reminder"
                subtitle="Notify before your streak expires."
                checked={settingsPreferences.streakReminder}
                onChange={(next) => updateSettingsPreference('streakReminder', next)}
              />
              <SettingsToggleRow
                title="Achievement Notifications"
                subtitle="Show celebration alerts for milestones."
                checked={settingsPreferences.achievementNotifications}
                onChange={(next) => updateSettingsPreference('achievementNotifications', next)}
              />
            </SettingsPanel>

            <SettingsPanel
              icon={Headphones}
              title="Audio & Feedback"
              subtitle="Tune voice and interaction feedback for your sessions."
            >
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 bg-white/80 dark:bg-slate-900/65">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Voice Model</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Choose model TTS used across the app.</p>
                <div className="max-w-2xl flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Volume2 className="w-4 h-4 text-[color:var(--color-primary)] shrink-0" />
                  <select
                    value={ttsVoice}
                    onChange={(e) => {
                      const nextVoice = e.target.value;
                      setTtsVoice(nextVoice);
                      void playVoicePreview(nextVoice);
                    }}
                    className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-full"
                    title="Choose qwen tts model"
                  >
                    {ttsModelOptions.map((voice) => (
                      <option key={voice.value} value={voice.value}>{voice.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => void playVoicePreview(ttsVoice)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)] transition-colors"
                    title="Nghe giọng mẫu"
                  >
                    {audioLoading === 'settings-voice-preview' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                    Nghe thử
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Đổi giọng sẽ tự phát mẫu, hoặc bấm "Nghe thử" để phát lại.</p>
              </div>
              <SettingsToggleRow title="Sound Effects" subtitle="Enable UI sounds during practice." checked={settingsPreferences.soundEffects} onChange={(next) => updateSettingsPreference('soundEffects', next)} />
              <SettingsToggleRow title="Correct Answer Sound" subtitle="Play success sound when answer is correct." checked={settingsPreferences.correctAnswerSound} onChange={(next) => updateSettingsPreference('correctAnswerSound', next)} />
              <SettingsToggleRow title="Wrong Answer Sound" subtitle="Play subtle feedback for incorrect answers." checked={settingsPreferences.wrongAnswerSound} onChange={(next) => updateSettingsPreference('wrongAnswerSound', next)} />
              <SettingsToggleRow title="Keyboard Click Feedback" subtitle="Enable keypress feedback in typing activities." checked={settingsPreferences.keyboardFeedback} onChange={(next) => updateSettingsPreference('keyboardFeedback', next)} />
              <SettingsToggleRow title="Celebrate Level Up" subtitle="Show celebration effects for level progression." checked={settingsPreferences.celebrateLevelUp} onChange={(next) => updateSettingsPreference('celebrateLevelUp', next)} />
              <SettingsToggleRow title="Toast Notifications" subtitle="Display in-app toasts for progress and actions." checked={settingsPreferences.toastNotifications} onChange={(next) => updateSettingsPreference('toastNotifications', next)} />
            </SettingsPanel>

            <SettingsPanel
              icon={Heart}
              title="Accessibility & Motion"
              subtitle="Improve comfort and readability while studying longer."
            >
              <SettingsSegmentedControl
                title="Animation Level"
                subtitle="Set motion intensity for UI transitions."
                value={settingsPreferences.animationLevel}
                options={['Full', 'Reduced', 'Minimal']}
                onChange={(next) => updateSettingsPreference('animationLevel', next)}
              />
              <SettingsToggleRow
                title="Reduce Motion"
                subtitle="Limit motion effects for smoother focus."
                checked={settingsPreferences.reduceMotion}
                onChange={(next) => updateSettingsPreference('reduceMotion', next)}
              />
              <SettingsToggleRow
                title="High Contrast UI"
                subtitle="Increase contrast for stronger visual separation."
                checked={settingsPreferences.highContrastUi}
                onChange={(next) => updateSettingsPreference('highContrastUi', next)}
              />
              <SettingsSegmentedControl
                title="Larger UI Scale"
                subtitle="Adjust overall UI density and text comfort."
                value={settingsPreferences.uiScale}
                options={['Normal', 'Comfortable', 'Large']}
                onChange={(next) => updateSettingsPreference('uiScale', next)}
              />
            </SettingsPanel>

            <SettingsPanel
              icon={Database}
              title="Data & Progress"
              subtitle="Track current status and manage backup actions."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                <SettingsStatCard title="Current Streak" value={`${reviewDueCount}`} icon={CalendarClock} helper="Due reviews waiting" />
                <SettingsStatCard title="Level" value={`${estimatedLevel}`} icon={Gauge} helper="Estimated from XP" />
                <SettingsStatCard title="XP" value={`${estimatedXp}`} icon={Sparkles} helper="Learning + dictation" />
                <SettingsStatCard title="Words Learned" value={`${learnedWordsCount}`} icon={CheckCircle} helper={`Out of ${vocabList.length} words`} />
                <SettingsStatCard title="Review Mastery" value={`${masteryPercent}%`} icon={Library} helper="Completion confidence" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button onClick={exportData} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold hover:border-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)] transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Export Progress
                </button>
                <label className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold hover:border-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)] transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" /> Import Backup
                  <input type="file" accept=".json" className="hidden" onChange={importData} />
                </label>
                <button onClick={exportLearningPdf} disabled={isPdfLoading} className="px-4 py-3 rounded-xl text-white font-bold bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {isPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {isPdfLoading ? 'Generating...' : 'Preview PDF'}
                </button>
                <button
                  onClick={() => toast.info('Cached audio has been cleared from this session.', { dedupeKey: 'audio-cache-clear' })}
                  className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Clear Cached Audio
                </button>
              </div>
            </SettingsPanel>

            <SettingsPanel
              icon={Settings}
              title="Account"
              subtitle="Manage your current account session and credentials."
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {currentUser.fullName || currentUser.full_name || currentUser.email}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setShowChangePassword((prev) => !prev);
                      setAuthError('');
                      setAuthInfo('');
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </div>

              {showChangePassword && (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/65 space-y-3 max-w-xl">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Update Password</h4>
                  <input
                    value={changeCurrentPassword}
                    onChange={(e) => setChangeCurrentPassword(e.target.value)}
                    type="password"
                    placeholder="Current password"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] bg-white dark:bg-slate-800"
                  />
                  <input
                    value={changeNewPassword}
                    onChange={(e) => setChangeNewPassword(e.target.value)}
                    type="password"
                    placeholder="New password"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] bg-white dark:bg-slate-800"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleChangePassword}
                      disabled={authLoading}
                      className="px-4 py-2 bg-[color:var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[color:var(--color-primary-hover)] transition-colors disabled:opacity-70"
                    >
                      {authLoading ? 'Processing...' : 'Update'}
                    </button>
                    <button
                      onClick={() => {
                        setShowChangePassword(false);
                        setChangeCurrentPassword('');
                        setChangeNewPassword('');
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </SettingsPanel>

            <SettingsPanel
              icon={Database}
              title="SQL Server Connection"
              subtitle="Connect app data directly to your SQL Server database."
            >
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={switchStorageMode}
                  disabled={sqlModeSwitchLoading || sqlConnectLoading}
                  className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  Enable SQL Server Mode
                </button>
                <button
                  onClick={connectSqlServer}
                  disabled={sqlConnectLoading || sqlModeSwitchLoading}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-60 transition-colors flex items-center gap-2"
                >
                  {(sqlConnectLoading || sqlModeSwitchLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {sqlConnectLoading ? 'Connecting...' : (sqlModeSwitchLoading ? 'Switching mode...' : 'Connect DB')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  value={sqlConnHost}
                  onChange={(e) => setSqlConnHost(e.target.value)}
                  placeholder="Host"
                  className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] bg-white dark:bg-slate-800"
                />
                <input
                  value={sqlConnPort}
                  onChange={(e) => setSqlConnPort(e.target.value)}
                  placeholder="Port"
                  className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] bg-white dark:bg-slate-800"
                />
                <input
                  value={sqlConnUsername}
                  onChange={(e) => setSqlConnUsername(e.target.value)}
                  placeholder="Username"
                  className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] bg-white dark:bg-slate-800"
                />
                <input
                  type="password"
                  value={sqlConnPassword}
                  onChange={(e) => setSqlConnPassword(e.target.value)}
                  placeholder="Password"
                  className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] bg-white dark:bg-slate-800"
                />
                <input
                  value={sqlConnDatabase}
                  onChange={(e) => setSqlConnDatabase(e.target.value)}
                  placeholder="Database"
                  className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] bg-white dark:bg-slate-800"
                />
              </div>

              {sqlConnectError && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                  {sqlConnectError}
                </div>
              )}

              {sqlConnectResult && (
                <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  <p className="font-bold mb-1">Connected: {sqlConnectResult.server} / {sqlConnectResult.database}</p>
                  <p className="font-medium mb-1">Mode active: SQLServer</p>
                  <p>
                    Vocabulary: <span className="font-bold">{sqlConnectResult.vocabulary_count}</span> | Passage: <span className="font-bold">{sqlConnectResult.passage_count}</span> | Grammar: <span className="font-bold">{sqlConnectResult.grammar_count}</span> | Course: <span className="font-bold">{sqlConnectResult.curriculum_course_count}</span> | Day: <span className="font-bold">{sqlConnectResult.curriculum_day_count}</span>
                  </p>
                </div>
              )}

              {sqlSyncStatus && (
                <div className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium">
                  {sqlSyncStatus}
                </div>
              )}
            </SettingsPanel>

            <SettingsPanel
              icon={AlertCircle}
              title="Danger Zone"
              subtitle="These actions are irreversible. Please review carefully before continuing."
              tone="danger"
            >
              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-red-200/70 dark:border-red-900/50 p-4 bg-white/85 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">Reset Learning Progress</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Remove streak, XP, level, and review history.</p>
                    </div>
                    <button
                      onClick={() => {
                        setResetProgressAcknowledged(false);
                        setIsResetProgressModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl border border-red-300 text-red-700 dark:text-red-300 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100/70 dark:hover:bg-red-900/35 font-bold text-sm transition-colors"
                    >
                      Reset Learning Progress
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-200/70 dark:border-red-900/50 p-4 bg-white/85 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">Delete Custom Vocabulary</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Delete custom topics, lessons, and words from Content Studio.</p>
                    </div>
                    <button
                      onClick={clearCustomVocabularyFromSettings}
                      className="px-4 py-2 rounded-xl border border-red-300 text-red-700 dark:text-red-300 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100/70 dark:hover:bg-red-900/35 font-bold text-sm transition-colors"
                    >
                      Delete Custom Vocabulary
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-200/70 dark:border-red-900/50 p-4 bg-white/85 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">Restore Default Settings</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Reset preferences and return to the Default color preset.</p>
                    </div>
                    <button
                      onClick={restoreDefaultSettingsFromPanel}
                      className="px-4 py-2 rounded-xl border border-amber-300 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/25 hover:bg-amber-100 dark:hover:bg-amber-900/35 font-bold text-sm transition-colors"
                    >
                      Restore Default Settings
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-200/70 dark:border-red-900/50 p-4 bg-white/85 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">Clear All Local Data</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Remove all local vocabulary, readings, grammar, and progress.</p>
                    </div>
                    <button
                      onClick={clearAllLocalData}
                      className="px-4 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 font-black text-sm transition-colors"
                    >
                      Clear All Data
                    </button>
                  </div>
                </div>

                <button
                  onClick={clearReviewQueue}
                  className="self-start px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition-colors"
                >
                  Clear Review Queue
                </button>
              </div>
            </SettingsPanel>
          </div>
        )}

        {activeTab === 'dashboard' && !selectedWordId && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] font-black text-slate-500 dark:text-slate-400">Home Dashboard</p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">Welcome back{currentUser?.fullName ? `, ${currentUser.fullName.split(' ')[0]}` : ''}</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-1">Keep your streak alive and level up your English one session at a time.</p>
              </div>
              <div ref={dashboardFilterMenuRef} className="relative">
                <button
                  onClick={() => setIsDashboardFilterMenuOpen((prev) => !prev)}
                  className={`min-w-[220px] px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm transition-all flex items-center justify-between gap-3 ${isDashboardFilterMenuOpen ? 'border-[color:var(--color-primary-soft)] shadow-[0_8px_18px_color-mix(in_srgb,var(--color-primary)_16%,transparent_84%)]' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-base leading-none tracking-tight font-bold text-slate-700 dark:text-slate-200 truncate">{currentDashboardFilterLabel}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${isDashboardFilterMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDashboardFilterMenuOpen && (
                  <div className="absolute right-0 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50">
                    {dashboardFilterOptions.map((option) => {
                      const isActive = dashboardFilter === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            setDashboardFilter(option.value);
                            setIsDashboardFilterMenuOpen(false);
                          }}
                          className={`w-full px-3.5 py-2.5 text-left text-sm font-semibold flex items-center justify-between transition-colors ${isActive ? 'bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          <span>{option.label}</span>
                          {isActive && <CheckCircle className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/85 dark:bg-slate-900/75 p-6 md:p-8 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_44px_rgba(2,6,23,0.5)]">
              <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 85% 10%, color-mix(in srgb, ${activeThemePreset.colors.primary} 18%, transparent 82%) 0%, transparent 56%), radial-gradient(circle at 10% 110%, color-mix(in srgb, ${activeThemePreset.colors.accent} 18%, transparent 82%) 0%, transparent 46%)` }} />
              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div>
                  <p className="text-xs uppercase tracking-widest font-black text-slate-500 dark:text-slate-400">Ready for today's session?</p>
                  <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 mt-2">Day {Math.max(1, reviewDueCount)} streak momentum</h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-300">You're {Math.max(1, 250 - (estimatedXp % 250 || 250))} XP away from Level {estimatedLevel + 1}. Keep it going.</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{displayedPassages.length} reading passages available for today's session.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => openTab('vocabulary')} className="px-4 py-2.5 rounded-xl text-sm font-black text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)] transition-colors shadow-md">Continue Learning</button>
                    <button onClick={() => openTab('review')} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-[color:var(--color-primary-soft)]">Start Quick Review</button>
                    <button onClick={() => openTab('game')} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-[color:var(--color-accent-soft)] bg-[color:var(--color-accent-soft)]/65 text-[color:var(--color-accent)]">Daily Challenge</button>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/70 dark:border-slate-700/70 p-4 bg-white/70 dark:bg-slate-900/65">
                  <div className="rounded-2xl p-4 border border-white/80 dark:border-slate-700/70" style={{ backgroundImage: `linear-gradient(140deg, color-mix(in srgb, ${activeThemePreset.colors.primarySoft} 76%, #ffffff 24%) 0%, color-mix(in srgb, ${activeThemePreset.colors.accentSoft} 76%, #ffffff 24%) 100%)` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-white" style={{ backgroundColor: activeThemePreset.colors.reward }}>Streak +{Math.max(1, reviewDueCount)}</span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-white" style={{ backgroundColor: activeThemePreset.colors.accent }}>XP +12</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/75 dark:bg-slate-800/70 overflow-hidden mb-3">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(((estimatedXp % 250) / 250) * 100) || 8)}%`, backgroundImage: `linear-gradient(90deg, ${activeThemePreset.colors.primary} 0%, ${activeThemePreset.colors.accent} 100%)` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl p-3 border border-white/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60">
                        <p className="text-[10px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">Words</p>
                        <p className="text-lg font-black text-slate-800 dark:text-slate-100">{learnedVocabList.length}</p>
                      </div>
                      <div className="rounded-xl p-3 border border-white/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/60">
                        <p className="text-[10px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">Mastery</p>
                        <p className="text-lg font-black text-slate-800 dark:text-slate-100">{masteryPercent}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Tổng hợp nội dung</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Danh sách nhanh các từ vựng, bài đọc và ngữ pháp gần đây.</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {displayedVocab.length} từ · {displayedPassages.length} bài đọc · {grammarList.length} ngữ pháp
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><Type className="w-4 h-4 text-[color:var(--color-primary)]" /> Từ vựng</h4>
                    <button onClick={() => openTab('vocabulary')} className="text-xs font-bold text-[color:var(--color-primary)] hover:underline">Xem thêm</button>
                  </div>
                  <div className="space-y-2">
                    {displayedVocab.slice(0, 5).map((item) => (
                      <button key={item.id} onClick={() => setSelectedWordId(item.id)} className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 hover:border-[color:var(--color-primary-soft)] transition-colors">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.word}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{getDisplayDefinition(item)}</p>
                      </button>
                    ))}
                    {displayedVocab.length === 0 && <p className="text-xs text-slate-400">Chưa có từ vựng nào.</p>}
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><BookOpen className="w-4 h-4 text-[color:var(--color-accent)]" /> Bài đọc</h4>
                    <button onClick={() => openTab('reading')} className="text-xs font-bold text-[color:var(--color-accent)] hover:underline">Xem thêm</button>
                  </div>
                  <div className="space-y-2">
                    {displayedPassages.slice(0, 5).map((item) => (
                      <button key={item.id} onClick={() => openPassage(item.id)} className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 hover:border-[color:var(--color-accent-soft)] transition-colors">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.words?.length || 0} từ vựng</p>
                      </button>
                    ))}
                    {displayedPassages.length === 0 && <p className="text-xs text-slate-400">Chưa có bài đọc nào.</p>}
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><Library className="w-4 h-4 text-[color:var(--color-reward)]" /> Ngữ pháp</h4>
                    <button onClick={() => openTab('grammar')} className="text-xs font-bold text-[color:var(--color-reward)] hover:underline">Xem thêm</button>
                  </div>
                  <div className="space-y-2">
                    {grammarList.slice(0, 5).map((item) => (
                      <button key={item.id} onClick={() => { setSelectedGrammarId(item.id); openTab('grammar'); }} className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 hover:border-[color:var(--color-reward-soft)] transition-colors">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Bài ngữ pháp</p>
                      </button>
                    ))}
                    {grammarList.length === 0 && <p className="text-xs text-slate-400">Chưa có bài ngữ pháp nào.</p>}
                  </div>
                </article>
              </div>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { label: 'Current Streak', value: `${Math.max(1, reviewDueCount)} days`, helper: `${Math.max(1, 7 - (reviewDueCount % 7 || 0))} to weekly badge`, icon: CalendarClock, tint: 'bg-[color:var(--color-reward-soft)] text-[color:var(--color-reward)] border-[color:var(--color-reward-soft)]' },
                { label: 'Level', value: `${estimatedLevel}`, helper: `${Math.max(1, 250 - (estimatedXp % 250 || 250))} XP to next`, icon: Gauge, tint: 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-accent-soft)]' },
                { label: 'Total XP', value: `${estimatedXp}`, helper: '+12 today', icon: Sparkles, tint: 'bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] border-[color:var(--color-primary-soft)]' },
                { label: 'Words Learned', value: `${learnedVocabList.length}`, helper: `${learningVocabList.length} in progress`, icon: Type, tint: 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-soft)]' },
                { label: 'Review Accuracy', value: `${Math.max(45, Math.min(99, masteryPercent))}%`, helper: 'steady progress', icon: CheckCircle, tint: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700' },
              ].map((item) => (
                <article key={item.label} className={`rounded-2xl border p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${item.tint}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] uppercase tracking-wider font-black">{item.label}</p>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{item.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.helper}</p>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-8 space-y-5">
                <article className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Continue Learning</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Pick up where you left off and keep momentum.</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]/60">Learn Mode</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedLesson?.title || selectedTopic?.title || 'Travel Vocabulary'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{learnedVocabList.length} of {Math.max(learnedVocabList.length + learningVocabList.length, 20)} words completed</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-[11px] font-black border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300">~5 min</span>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(((learnedVocabList.length || 1) / Math.max(1, learnedVocabList.length + learningVocabList.length)) * 100))}%`, backgroundImage: `linear-gradient(90deg, ${activeThemePreset.colors.primary} 0%, ${activeThemePreset.colors.accent} 100%)` }} />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => openTab('vocabulary')} className="px-4 py-2.5 rounded-xl text-sm font-black text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)] transition-colors">Resume Lesson</button>
                    <button onClick={() => openTab('topics')} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[color:var(--color-primary-soft)]">Change Topic</button>
                  </div>
                </article>

                <article className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-[color:var(--color-reward-soft)]/45 dark:from-slate-900 dark:to-slate-900 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Daily Challenge</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Beat 3 rounds without mistakes and claim bonus reward.</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-black text-white" style={{ backgroundColor: activeThemePreset.colors.reward }}>+50 XP</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Progress: 1 / 3 rounds</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Resets in 12h</p>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-slate-200/70 dark:bg-slate-700/70 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: '35%', backgroundImage: `linear-gradient(90deg, ${activeThemePreset.colors.reward} 0%, ${activeThemePreset.colors.accent} 100%)` }} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => openTab('game')} className="px-4 py-2.5 rounded-xl text-sm font-black text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900">Start Challenge</button>
                    <button onClick={() => openTab('dashboard')} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">View Rewards</button>
                  </div>
                </article>
              </div>

              <div className="xl:col-span-4 space-y-4">
                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-1">XP Progress</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{estimatedXp % 250 || 0} / 250 XP to Level {estimatedLevel + 1}</p>
                  <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(8, Math.round(((estimatedXp % 250) / 250) * 100))}%`, backgroundImage: `linear-gradient(90deg, ${activeThemePreset.colors.primary} 0%, ${activeThemePreset.colors.accent} 100%)` }} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{Math.max(1, 250 - (estimatedXp % 250 || 250))} XP remaining</p>
                </article>

                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">Streak</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-black" style={{ color: activeThemePreset.colors.reward }}>{Math.max(1, reviewDueCount)} days</p>
                    <span className="px-2 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: activeThemePreset.colors.rewardSoft, color: activeThemePreset.colors.reward }}>On Fire</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 mt-3">
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <span key={idx} className="h-3 rounded-full" style={{ backgroundColor: idx < Math.min(7, Math.max(2, reviewDueCount)) ? activeThemePreset.colors.reward : 'rgba(148,163,184,0.25)' }} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">You studied every day this week.</p>
                </article>

                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Daily Goal</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{Math.min(learningVocabList.length, Number(settingsPreferences.dailyGoal) || 10)} / {Number(settingsPreferences.dailyGoal) || 10} completed</p>
                  <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((Math.min(learningVocabList.length, Number(settingsPreferences.dailyGoal) || 10) / (Number(settingsPreferences.dailyGoal) || 10)) * 100))}%`, backgroundColor: activeThemePreset.colors.success }} />
                  </div>
                  <button onClick={() => openTab('review')} className="mt-3 w-full px-3 py-2 rounded-xl text-sm font-bold border border-[color:var(--color-success-soft)] text-[color:var(--color-success)] bg-[color:var(--color-success-soft)]/55">Finish Goal</button>
                </article>

                <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Start Review', tab: 'review', icon: RefreshCw },
                      { label: 'Memory Match', tab: 'game', icon: Gamepad2 },
                      { label: 'Dictation', tab: 'dictation', icon: Headphones },
                      { label: 'Add Vocab', tab: 'vocabulary', icon: Plus },
                      { label: 'Typing Race', tab: 'game', icon: Type },
                      { label: 'Reading', tab: 'reading', icon: BookOpen },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => openTab(action.tab)}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)] transition-all duration-200 flex items-center gap-2"
                      >
                        <action.icon className="w-3.5 h-3.5" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Review Focus</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Words and patterns that need more attention</p>
                </div>
                <button onClick={() => openTab('review')} className="px-3.5 py-2 rounded-xl text-sm font-bold text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)]">Review Now</button>
              </div>
              {(reviewVocabList.slice(0, 6).length === 0) ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-4 text-sm text-slate-500 dark:text-slate-400">
                  No weak words yet - great job keeping up.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {reviewVocabList.slice(0, 6).map((item) => {
                    const wrongCount = Number(item.wrongCount || 0);
                    const mastery = Math.max(8, Math.min(92, 100 - (wrongCount * 14 + 20)));
                    return (
                      <div key={item.id} className="rounded-2xl border border-rose-200/70 dark:border-rose-900/50 bg-rose-50/45 dark:bg-rose-950/15 p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="font-black text-slate-800 dark:text-slate-100 truncate">{item.word}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${getTypeBadgeClass(item.type)}`}>{item.type}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Missed {Math.max(1, wrongCount)} times · Reviewed yesterday</p>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
                          <div className="h-full rounded-full" style={{ width: `${mastery}%`, backgroundColor: activeThemePreset.colors.danger }} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openTab('review')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">Practice Again</button>
                          <button onClick={() => setSelectedWordId(item.id)} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[color:var(--color-primary)]">Review Now</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-8 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Vocabulary Mastery</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Track your current vocabulary growth and topic progress.</p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/70 dark:bg-slate-800/45">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {[
                      { label: 'New', value: Math.max(0, vocabList.length - learnedVocabList.length - reviewVocabList.length), color: activeThemePreset.colors.accentSoft },
                      { label: 'Learning', value: learningVocabList.length, color: activeThemePreset.colors.primarySoft },
                      { label: 'Familiar', value: reviewVocabList.length, color: activeThemePreset.colors.rewardSoft },
                      { label: 'Mastered', value: learnedVocabList.length, color: activeThemePreset.colors.successSoft },
                    ].map((seg) => (
                      <div key={seg.label} className="rounded-xl border border-white/80 dark:border-slate-700/70 px-3 py-2" style={{ backgroundColor: seg.color }}>
                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-600">{seg.label}</p>
                        <p className="text-xl font-black text-slate-800">{seg.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                    {(() => {
                      const total = Math.max(1, vocabList.length);
                      const segments = [
                        { value: Math.max(0, vocabList.length - learnedVocabList.length - reviewVocabList.length), color: activeThemePreset.colors.accent },
                        { value: learningVocabList.length, color: activeThemePreset.colors.primary },
                        { value: reviewVocabList.length, color: activeThemePreset.colors.reward },
                        { value: learnedVocabList.length, color: activeThemePreset.colors.success },
                      ];
                      return segments.map((segment, idx) => (
                        <span key={idx} style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }} />
                      ));
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(customTopics.slice(0, 4).length ? customTopics.slice(0, 4).map((topic) => {
                    const topicWords = customWords.filter((w) => w.topicId === topic.id).length;
                    const topicLearned = customWords.filter((w) => w.topicId === topic.id && (w.correctCount || 0) >= 2).length;
                    const percent = topicWords ? Math.round((topicLearned / topicWords) * 100) : 0;
                    return {
                      id: topic.id,
                      title: topic.title,
                      words: topicWords,
                      percent,
                      last: topic.updatedAt ? 'Recently updated' : 'Recently practiced',
                    };
                  }) : [
                    { id: 'travel', title: 'Travel', words: 20, percent: 62, last: 'Yesterday' },
                    { id: 'food', title: 'Food', words: 16, percent: 48, last: '2 days ago' },
                    { id: 'work', title: 'Work', words: 12, percent: 40, last: 'This week' },
                    { id: 'daily', title: 'Daily Life', words: 10, percent: 32, last: 'Today' },
                  ]).map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => openTab('topics')}
                      className="text-left rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-[color:var(--color-primary-soft)] hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{topic.title}</p>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{topic.words} words</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <span className="h-full block rounded-full" style={{ width: `${topic.percent}%`, backgroundImage: `linear-gradient(90deg, ${activeThemePreset.colors.primary} 0%, ${activeThemePreset.colors.success} 100%)` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{topic.percent}% complete · {topic.last}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="xl:col-span-4 space-y-5">
                <article className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-3">Achievements</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { title: '7-Day Streak', unlocked: reviewDueCount >= 7 },
                      { title: 'First 100 XP', unlocked: estimatedXp >= 100 },
                      { title: '50 Words', unlocked: learnedVocabList.length >= 50 },
                      { title: 'Perfect Quiz', unlocked: masteryPercent >= 90 },
                      { title: 'Dictation Pro', unlocked: dictationHistory.length >= 5 },
                      { title: 'Daily Winner', unlocked: learningVocabList.length >= (Number(settingsPreferences.dailyGoal) || 10) },
                    ].map((achievement) => (
                      <div key={achievement.title} className={`rounded-xl border p-2.5 ${achievement.unlocked ? 'border-[color:var(--color-reward-soft)] bg-[color:var(--color-reward-soft)]/55 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 opacity-75'}`}>
                        <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">{achievement.title}</p>
                        <p className="text-[10px] mt-1 text-slate-500 dark:text-slate-400">{achievement.unlocked ? 'Unlocked' : 'Locked'}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">Consistency</h3>
                  <div className="grid grid-cols-7 gap-1.5 mb-3">
                    {Array.from({ length: 28 }).map((_, idx) => {
                      const val = (idx * 17 + learnedVocabList.length + reviewDueCount) % 4;
                      const bg = val === 0 ? 'rgba(148,163,184,0.24)' : val === 1 ? activeThemePreset.colors.primarySoft : val === 2 ? activeThemePreset.colors.accentSoft : activeThemePreset.colors.successSoft;
                      return <span key={idx} className="h-3 rounded-[6px]" style={{ backgroundColor: bg }} />;
                    })}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">You studied {Math.min(21, Math.max(8, learnedVocabList.length + reviewDueCount))} of the last 21 days.</p>
                </article>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-[color:var(--color-primary-soft)]/45 dark:from-slate-900 dark:to-slate-900 p-5 md:p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">Small daily wins build real fluency.</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">A few focused minutes today keeps your momentum strong.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openTab('game')} className="px-4 py-2.5 rounded-xl text-sm font-black text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)]">Start 5-Minute Session</button>
                  <button onClick={() => openTab('review')} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">Review Mistakes</button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ===================== TAB: GIÁO TRÌNH ===================== */}
        {activeTab === 'curriculum' && (
          <Suspense fallback={<div className="bg-white border border-slate-200 rounded-3xl p-8 text-slate-500">Dang tai giao trinh...</div>}>
            <CurriculumTab
              curriculumList={curriculumList}
              selectedCurriculumId={selectedCurriculumId}
              setSelectedCurriculumId={setSelectedCurriculumId}
              newCurriculumTitle={newCurriculumTitle}
              setNewCurriculumTitle={setNewCurriculumTitle}
              newCurriculumDescription={newCurriculumDescription}
              setNewCurriculumDescription={setNewCurriculumDescription}
              createCurriculum={createCurriculum}
              getCurriculumProgress={getCurriculumProgress}
              removeCurriculum={removeCurriculum}
              selectedCourse={getSelectedCurriculum()}
              updateCurriculumField={updateCurriculumField}
              curriculumExportScope={curriculumExportScope}
              setCurriculumExportScope={setCurriculumExportScope}
              exportCurriculumByScope={exportCurriculumByScope}
              isPdfLoading={isPdfLoading}
              newCurriculumDayLabel={newCurriculumDayLabel}
              setNewCurriculumDayLabel={setNewCurriculumDayLabel}
              newCurriculumDayTitle={newCurriculumDayTitle}
              setNewCurriculumDayTitle={setNewCurriculumDayTitle}
              addDayToCurriculum={addDayToCurriculum}
              dragDayInfo={dragDayInfo}
              handleDayDragStart={handleDayDragStart}
              setDragDayInfo={setDragDayInfo}
              handleDayDrop={handleDayDrop}
              updateCurriculumDayField={updateCurriculumDayField}
              exportCurriculumDayPdf={exportCurriculumDayPdf}
              removeCurriculumDay={removeCurriculumDay}
              getCurriculumDayVocabSearch={getCurriculumDayVocabSearch}
              setCurriculumDayVocabSearch={setCurriculumDayVocabSearch}
              vocabList={vocabList}
              getDisplayDefinition={getDisplayDefinition}
              toggleCurriculumDayLink={toggleCurriculumDayLink}
              passages={passages}
              grammarList={grammarList}
            />
          </Suspense>
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${getTypeBadgeClass(item.type)}`}>{item.type}</span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{getDisplayDefinition(item)}</p>
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

        {activeTab === 'topics' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-4 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-black text-slate-800">Content Studio - Custom Vocab Manager</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => exportManagerData('all')} className="px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Export All</button>
                  <button onClick={() => exportManagerData('topic')} className="px-3 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Export Topic</button>
                  <button onClick={() => exportManagerData('lesson')} className="px-3 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Export Lesson</button>
                  <label className="px-3 py-2 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 cursor-pointer">
                    Import File
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => importManagerPayload(String(reader.result || ''), managerImportMode);
                        reader.readAsText(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <aside className="xl:col-span-3 border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-3">
                  <input value={topicSearchTerm} onChange={(e) => setTopicSearchTerm(e.target.value)} placeholder="Search topic..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-300" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={topicForm.title} onChange={(e) => setTopicForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Topic name" className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white" />
                    <input value={topicForm.icon} onChange={(e) => setTopicForm((prev) => ({ ...prev, icon: e.target.value }))} placeholder="Emoji" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white" />
                    <select value={topicForm.difficulty} onChange={(e) => setTopicForm((prev) => ({ ...prev, difficulty: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                      {managerDifficultyOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <textarea value={topicForm.description} onChange={(e) => setTopicForm((prev) => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Description" className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white resize-none" />
                    <select value={topicForm.colorTheme} onChange={(e) => setTopicForm((prev) => ({ ...prev, colorTheme: e.target.value }))} className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                      {['blue', 'green', 'purple', 'orange'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={createOrUpdateTopic} className="flex-1 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editingTopicId ? 'Update Topic' : 'Add Topic'}</button>
                    {editingTopicId && <button onClick={() => { setEditingTopicId(null); setTopicForm({ title: '', icon: '📘', description: '', difficulty: 'easy', colorTheme: 'blue' }); }} className="px-3 py-2 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Cancel</button>}
                  </div>
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {filteredTopics.map((topic) => {
                      const topicWordCount = customWords.filter((word) => word.topicId === topic.id).length;
                      return (
                        <div key={topic.id} className={`p-3 rounded-xl border cursor-pointer ${selectedTopicId === topic.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'}`} onClick={() => { setSelectedTopicId(topic.id); setSelectedLessonId(null); }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{topic.icon || '📘'} {topic.title}</p>
                              <p className="text-xs text-slate-500">{topic.difficulty} - {topicWordCount} words</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); beginEditTopic(topic); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                <section className="xl:col-span-4 border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-3">
                  <h3 className="font-bold text-slate-800">Lessons {selectedTopic ? `- ${selectedTopic.title}` : ''}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={lessonForm.title} onChange={(e) => setLessonForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Lesson name" className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white" />
                    <textarea value={lessonForm.description} onChange={(e) => setLessonForm((prev) => ({ ...prev, description: e.target.value }))} rows={2} placeholder="Lesson description" className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white resize-none" />
                    <select value={lessonForm.difficulty} onChange={(e) => setLessonForm((prev) => ({ ...prev, difficulty: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">{managerDifficultyOptions.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                    <input type="number" min={1} value={lessonForm.estimatedDuration} onChange={(e) => setLessonForm((prev) => ({ ...prev, estimatedDuration: Number(e.target.value) || 5 }))} placeholder="Duration" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white" />
                    <input type="number" min={1} value={lessonForm.sortOrder} onChange={(e) => setLessonForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 1 }))} placeholder="Sort" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white" />
                    <button onClick={createOrUpdateLesson} className="px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editingLessonId ? 'Update Lesson' : 'Add Lesson'}</button>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {lessonsInSelectedTopic.map((lesson) => {
                      const wordCount = customWords.filter((word) => word.lessonId === lesson.id).length;
                      return (
                        <div key={lesson.id} className={`p-3 rounded-xl border cursor-pointer ${selectedLessonId === lesson.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'}`} onClick={() => setSelectedLessonId(lesson.id)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{lesson.title}</p>
                              <p className="text-xs text-slate-500">{wordCount} words - {lesson.estimatedDuration || 5} min</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); beginEditLesson(lesson); }} className="p-1 text-slate-400 hover:text-indigo-600"><Edit className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.id); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="xl:col-span-5 border border-slate-200 rounded-2xl p-3 bg-white space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={managerWordSearch} onChange={(e) => setManagerWordSearch(e.target.value)} placeholder="Search word..." className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <select value={managerDifficultyFilter} onChange={(e) => setManagerDifficultyFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"><option value="all">All difficulty</option>{managerDifficultyOptions.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                    <select value={managerPosFilter} onChange={(e) => setManagerPosFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"><option value="all">All POS</option>{managerPartOfSpeechOptions.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input value={wordForm.word} onChange={(e) => setWordForm((prev) => ({ ...prev, word: e.target.value }))} placeholder="English word *" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <input value={wordForm.meaning} onChange={(e) => setWordForm((prev) => ({ ...prev, meaning: e.target.value }))} placeholder="Vietnamese meaning *" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <button
                      onClick={autoFillWordFormFromGroq}
                      disabled={managerAutoFillLoading}
                      className="col-span-2 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
                    >
                      {managerAutoFillLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {managerAutoFillLoading ? 'Searching...' : 'Search'}
                    </button>
                    <input value={wordForm.phonetic} onChange={(e) => setWordForm((prev) => ({ ...prev, phonetic: e.target.value }))} placeholder="Phonetic / IPA *" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <input value={wordForm.example} onChange={(e) => setWordForm((prev) => ({ ...prev, example: e.target.value }))} placeholder="Example sentence *" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <select value={wordForm.difficulty} onChange={(e) => setWordForm((prev) => ({ ...prev, difficulty: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50">{managerDifficultyOptions.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                    <select value={wordForm.partOfSpeech} onChange={(e) => setWordForm((prev) => ({ ...prev, partOfSpeech: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50">{managerPartOfSpeechOptions.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                    <input value={wordForm.imageEmoji} onChange={(e) => setWordForm((prev) => ({ ...prev, imageEmoji: e.target.value }))} placeholder="Emoji" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <input value={wordForm.audioText} onChange={(e) => setWordForm((prev) => ({ ...prev, audioText: e.target.value }))} placeholder="Audio text" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <input value={wordForm.synonym} onChange={(e) => setWordForm((prev) => ({ ...prev, synonym: e.target.value }))} placeholder="Synonym" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <input value={wordForm.antonym} onChange={(e) => setWordForm((prev) => ({ ...prev, antonym: e.target.value }))} placeholder="Antonym" className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <input value={wordForm.tags} onChange={(e) => setWordForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags: food, daily" className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50" />
                    <textarea value={wordForm.note} onChange={(e) => setWordForm((prev) => ({ ...prev, note: e.target.value }))} rows={2} placeholder="Memory tip / note" className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 resize-none" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => createOrUpdateWord()} className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{editingWordId ? 'Update Word' : 'Add Word'}</button>
                    {editingWordId && <button onClick={() => { setEditingWordId(null); setWordForm({ word: '', meaning: '', phonetic: '', example: '', difficulty: 'easy', partOfSpeech: 'noun', imageEmoji: '📘', synonym: '', antonym: '', note: '', tags: '', audioText: '' }); }} className="px-4 py-2 text-xs font-bold bg-slate-200 text-slate-700 rounded-lg">Cancel</button>}
                    <button onClick={bulkDeleteWordsInSelectedLesson} className="px-4 py-2 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200">Bulk Delete Lesson Words</button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={managerImportMode} onChange={(e) => setManagerImportMode(e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50">
                      <option value="merge">Merge with existing</option>
                      <option value="replace">Replace all data</option>
                      <option value="new-topic">Import only as new topic</option>
                    </select>
                    <input value={managerImportJson} onChange={(e) => setManagerImportJson(e.target.value)} placeholder="Paste JSON payload..." className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50" />
                    <button onClick={() => importManagerPayload(managerImportJson, managerImportMode)} className="px-3 py-2 text-xs font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-900">Import JSON</button>
                  </div>

                </section>
              </div>

              <section className="mt-4 border border-slate-200 rounded-2xl p-3 bg-slate-50">
                <div className="flex items-center justify-between px-1 mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lesson Word List</p>
                  <span className="text-xs text-slate-400">{filteredManagerWords.length} words</span>
                </div>
                <div className="max-h-[52vh] overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredManagerWords.map((word) => (
                    <div key={word.id} className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-slate-800 text-base leading-tight truncate">{word.imageEmoji || '📘'} {word.word}</p>
                            <span className="shrink-0 px-2 py-0.5 text-[10px] rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">{word.partOfSpeech}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                            <span className="font-medium">{word.meaning}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500">{word.phonetic || '/-/'}</span>
                          </div>
                          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 leading-relaxed line-clamp-2">{word.example || 'No example yet.'}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="px-2 py-0.5 text-[10px] rounded bg-amber-50 text-amber-700 border border-amber-200">{word.difficulty}</span>
                            <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-50 text-emerald-700 border border-emerald-200">correct {word.correctCount || 0}</span>
                            <span className="px-2 py-0.5 text-[10px] rounded bg-rose-50 text-rose-700 border border-rose-200">wrong {word.wrongCount || 0}</span>
                          </div>
                          {normalizeManagerTags(word.tags).length > 0 && (
                            <div className="pt-1">
                              <div className="flex flex-wrap gap-1.5">
                                {normalizeManagerTags(word.tags).map((tag) => (
                                  <span key={`${word.id}-${tag}`} className="inline-block px-2 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600 border border-slate-200">#{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => speak(word.audioText || word.word, `manager-word-${word.id}`)} className="p-1.5 rounded-md bg-white border border-slate-200 text-indigo-500 hover:text-indigo-700 hover:border-indigo-200" title="Play audio"><Volume2 className="w-3 h-3" /></button>
                          <button onClick={() => beginEditWord(word)} className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200" title="Edit"><Edit className="w-3 h-3" /></button>
                          <button onClick={() => deleteWord(word.id)} className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-rose-200" title="Delete"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredManagerWords.length === 0 && (
                    <p className="text-sm text-slate-400 py-8 text-center col-span-full">Chưa có từ nào trong lesson đang chọn.</p>
                  )}
                </div>
              </section>
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${getTypeBadgeClass(item.type)}`}>{item.type}</span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{getDisplayDefinition(item)}</p>
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
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-300">
            {(() => {
              const lookupWordsForDisplay = splitLookupWords(newWord);
              return (
                <section className="xl:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
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
                      onClick={() => (loading ? stopAISearch() : generateWordInfo())}
                      disabled={!loading && !newWord.trim()}
                      className={`px-5 py-4 text-white rounded-2xl font-bold disabled:opacity-50 transition-all active:scale-95 shadow-md shrink-0 flex items-center justify-center min-w-[68px] ${loading ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      title={loading ? 'Dừng' : 'Tìm kiếm AI'}
                    >
                      {loading ? 'Dừng' : <Search className="w-5 h-5" />}
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
                              <p className="text-amber-700 text-sm font-semibold mb-2">Không tìm thấy từ "{wordObj.word || lookupWordsForDisplay[idx] || ''}". Bạn có ý định tìm:</p>
                              <div className="flex flex-wrap gap-2">
                                {wordObj.suggestions?.map((s, sIdx) => (
                                  <button key={sIdx} onClick={() => reSearchSingleWord(idx, s)} className="px-3 py-1 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 text-sm font-medium transition-colors">{s}</button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => removeSearchWord(idx)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                              </button>

                              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 pr-10">
                                <div className="flex items-center gap-4">
                                  <div>
                                    <div className="flex items-center gap-3 mb-2">
                                      {editingSearchWordIndex === idx ? (
                                        <>
                                          <input
                                            value={editSearchWordData?.word || ''}
                                            onChange={(e) => setEditSearchWordData({ ...editSearchWordData, word: e.target.value })}
                                            className="px-3 py-2 text-2xl font-black text-slate-800 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Từ vựng"
                                          />
                                          <select
                                            value={editSearchWordData?.type || 'Noun'}
                                            onChange={(e) => setEditSearchWordData({ ...editSearchWordData, type: e.target.value })}
                                            className="px-3 py-2 text-xs font-bold uppercase text-slate-700 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                          >
                                            {WORD_TYPE_OPTIONS.map((opt) => (
                                              <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                          </select>
                                        </>
                                      ) : (
                                        <>
                                          <h3 className="text-3xl font-black text-slate-800">{wordObj.word}</h3>
                                          <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase border ${getTypeBadgeClass(wordObj.type)}`}>{wordObj.type}</span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {editingSearchWordIndex === idx ? (
                                        <>
                                          <input
                                            value={editSearchWordData?.ipa || ''}
                                            onChange={(e) => setEditSearchWordData({ ...editSearchWordData, ipa: e.target.value })}
                                            className="px-3 py-2 text-sm font-mono text-indigo-600 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Phiên âm IPA"
                                          />
                                          <div className="flex gap-2">
                                            {['Noun', 'Verb', 'Adjective', 'Adverb'].map((tag) => (
                                              <button
                                                key={tag}
                                                onClick={() => setEditSearchWordData({ ...editSearchWordData, type: tag })}
                                                className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors ${(editSearchWordData?.type || '').toLowerCase() === tag.toLowerCase() ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'}`}
                                              >
                                                {tag}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      ) : (
                                        <p className="text-xl font-mono text-indigo-600">{wordObj.ipa}</p>
                                      )}
                                      <button onClick={() => speak(wordObj.word, `preview-general-${idx}`)} className="p-2 bg-white rounded-full shadow-sm hover:text-indigo-600 transition-colors">
                                        {audioLoading === `preview-general-${idx}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {editingSearchWordIndex === idx ? (
                                    <>
                                      <button onClick={() => saveSearchWordEdit(idx)} className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors">
                                        <Save className="w-4 h-4" /> Lưu sửa
                                      </button>
                                      <button onClick={cancelSearchWordEdit} className="px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors">
                                        Hủy
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button onClick={() => startSearchWordEdit(idx)} className="flex items-center gap-2 px-4 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                                        <Edit className="w-4 h-4" /> Sửa kết quả
                                      </button>
                                      <button onClick={() => saveSingleSearchedWord(idx)} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 active:scale-95 shadow-md transition-colors">
                                        <Save className="w-5 h-5" /> Lưu từ này
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Định nghĩa</label>
                                  {editingSearchWordIndex === idx ? (
                                    <textarea
                                      value={editSearchWordData?.definition || ''}
                                      onChange={(e) => setEditSearchWordData({ ...editSearchWordData, definition: e.target.value })}
                                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                      rows={3}
                                      placeholder="Nghĩa tiếng Việt"
                                    />
                                  ) : (
                                    <p className="text-xl text-slate-700 font-medium">{getDisplayDefinition(wordObj)}</p>
                                  )}

                                  <div className="mt-4 space-y-3">
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Từ trái nghĩa</p>
                                      <div className="flex flex-wrap gap-2">
                                        {(wordObj.antonyms || []).length > 0 ? (wordObj.antonyms || []).map((item, itemIdx) => (
                                          <span key={itemIdx} className="px-2 py-1 text-[11px] rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-semibold">{item}</span>
                                        )) : <span className="text-xs text-slate-400">Chưa có dữ liệu</span>}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Collocation liên quan</p>
                                      <div className="flex flex-wrap gap-2">
                                        {(wordObj.collocations || []).length > 0 ? (wordObj.collocations || []).map((item, itemIdx) => (
                                          <span key={itemIdx} className="px-2 py-1 text-[11px] rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold">{item}</span>
                                        )) : <span className="text-xs text-slate-400">Chưa có dữ liệu</span>}
                                      </div>
                                    </div>
                                  </div>

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
                                    <button onClick={() => {
                                      const en = searchExInputs[idx]?.en?.trim();
                                      const vi = searchExInputs[idx]?.vi?.trim();
                                      if (!en || !vi) {
                                        setError("Vui lòng nhập đủ ví dụ tiếng Anh và nghĩa tiếng Việt.");
                                        return;
                                      }
                                      const newResults = [...searchResultWords];
                                      const currentExamples = newResults[idx]?.examples || [];
                                      newResults[idx] = {
                                        ...newResults[idx],
                                        examples: [...currentExamples, { en, vi }]
                                      };
                                      setSearchResultWords(newResults);
                                      setSearchExInputs(prev => ({
                                        ...prev,
                                        [idx]: { en: '', vi: '' }
                                      }));
                                      setError(null);
                                    }} className="w-full py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors">
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
              );
            })()}

            <aside className="xl:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col min-h-[560px]">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Languages className="w-5 h-5 text-[color:var(--color-primary)]" /> Từ vựng đã thêm ({filteredAddedVocabList.length})
                </h3>
                <button
                  onClick={() => openTab('review')}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[color:var(--color-primary-soft)] bg-[color:var(--color-primary-soft)]/50 text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-soft)] transition-colors"
                >
                  Ôn tập nhanh
                </button>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={vocabPanelSearchTerm}
                  onChange={(e) => setVocabPanelSearchTerm(e.target.value)}
                  placeholder="Tìm từ đã thêm..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] text-sm"
                />
              </div>

              <div className="space-y-5 overflow-y-auto custom-scrollbar pr-1 flex-1">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Nhóm đã thêm ({filteredAddedVocabList.length})</p>
                  </div>
                  {filteredAddedVocabList.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
                      <p className="text-sm font-semibold text-slate-500">Không có từ nào trong nhóm đã thêm.</p>
                    </div>
                  ) : (
                    filteredAddedVocabList.map((item) => {
                      const diffConfig = getDifficultyConfig(item.difficulty || 1);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedWordId(item.id)}
                          className="group p-3.5 rounded-2xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-[color:var(--color-primary-soft)]/40 border-[color:var(--color-primary-soft)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <div className="flex items-center gap-1 min-w-0">
                                  <p className="font-black text-slate-800 truncate">{item.word}</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speak(item.word, `vocab-panel-added-${item.id}`);
                                    }}
                                    className="p-1 rounded-md text-[color:var(--color-primary)] hover:bg-white/80"
                                    title="Phát âm"
                                  >
                                    {audioLoading === `vocab-panel-added-${item.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                                  </button>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${getTypeBadgeClass(item.type)}`}>{item.type}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${diffConfig.color}`}>{diffConfig.label}</span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">{getDisplayDefinition(item)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReviewModal(item.id, e);
                                }}
                                className="p-1.5 rounded-lg bg-white/85 border border-slate-200 text-[color:var(--color-success)] hover:bg-white"
                                title="Đánh dấu đã học"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSelectedVocabulary(item.id);
                                }}
                                className="p-1.5 rounded-lg bg-white/85 border border-slate-200 text-[color:var(--color-danger)] hover:bg-white"
                                title="Xóa từ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Nhóm đã học ({filteredLearnedPanelVocabList.length})</p>
                    <button
                      onClick={() => openTab('learned')}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[color:var(--color-success-soft)] bg-[color:var(--color-success-soft)]/55 text-[color:var(--color-success)] hover:bg-[color:var(--color-success-soft)] transition-colors"
                    >
                      Xem thêm
                    </button>
                  </div>
                  {filteredLearnedPanelVocabList.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center">
                      <p className="text-sm font-semibold text-slate-500">Chưa có từ nào trong nhóm đã học.</p>
                    </div>
                  ) : (
                    learnedPanelPreviewVocabList.map((item) => {
                      const diffConfig = getDifficultyConfig(item.difficulty || 1);
                      const isReviewDue = item.nextReviewDate && item.nextReviewDate <= Date.now();
                      const statusClass = isReviewDue
                        ? 'bg-[color:var(--color-reward-soft)]/65 border-[color:var(--color-reward-soft)]'
                        : 'bg-[color:var(--color-success-soft)]/55 border-[color:var(--color-success-soft)]';

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedWordId(item.id)}
                          className={`group p-3.5 rounded-2xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${statusClass}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <div className="flex items-center gap-1 min-w-0">
                                  <p className="font-black text-slate-800 truncate">{item.word}</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speak(item.word, `vocab-panel-learned-${item.id}`);
                                    }}
                                    className="p-1 rounded-md text-[color:var(--color-primary)] hover:bg-white/80"
                                    title="Phát âm"
                                  >
                                    {audioLoading === `vocab-panel-learned-${item.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                                  </button>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${getTypeBadgeClass(item.type)}`}>{item.type}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase whitespace-nowrap ${diffConfig.color}`}>{diffConfig.label}</span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">{getDisplayDefinition(item)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  undoLearned(item.id, e);
                                }}
                                className="p-1.5 rounded-lg bg-white/85 border border-slate-200 text-[color:var(--color-warning)] hover:bg-white"
                                title="Chuyển về đã thêm"
                              >
                                <Undo className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSelectedVocabulary(item.id);
                                }}
                                className="p-1.5 rounded-lg bg-white/85 border border-slate-200 text-[color:var(--color-danger)] hover:bg-white"
                                title="Xóa từ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ===================== TAB: NGHE CHEP CHINH TA ===================== */}
        {activeTab === 'dictation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
            <section className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-600" /> Nghe chep chinh ta
              </h2>

              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'custom', label: 'Tuy chon' },
                  { id: 'passage', label: 'Bai doc' },
                  { id: 'vocab', label: 'Vi du tu' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setDictationMode(mode.id)}
                    className={`py-2 text-xs rounded-lg font-bold transition-colors ${dictationMode === mode.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {dictationMode === 'custom' && (
                <textarea
                  value={dictationCustomText}
                  onChange={(e) => setDictationCustomText(e.target.value)}
                  rows={6}
                  placeholder="Dan doan van ban tieng Anh de luyen nghe chep. Moi cau nen co dau cham, dau hoi hoac dau cham than."
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              )}

              {dictationMode === 'passage' && (
                <select
                  value={dictationPassageId}
                  onChange={(e) => setDictationPassageId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Chon bai doc de tao cau nghe chep</option>
                  {passages.map(p => <option key={p.id} value={String(p.id)}>{p.title}</option>)}
                </select>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => pickDictationSentence()}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Lay cau ngau nhien
                </button>
                <button
                  onClick={() => playCurrentDictation(1)}
                  disabled={!dictationCurrentSentence}
                  className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 disabled:opacity-50 transition-colors"
                >
                  Nghe cau
                </button>
                <button
                  onClick={() => playCurrentDictation(2)}
                  disabled={!dictationCurrentSentence}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 disabled:opacity-50 transition-colors"
                >
                  Nghe lai 2 lan
                </button>
                <button
                  onClick={() => setDictationHintLevel(prev => Math.min(prev + 1, 3))}
                  disabled={!dictationCurrentSentence}
                  className="px-4 py-2.5 bg-amber-100 text-amber-800 rounded-xl font-bold hover:bg-amber-200 disabled:opacity-50 transition-colors"
                >
                  Goi y +
                </button>
              </div>

              {dictationCurrentSource && (
                <p className="text-xs text-slate-500">Nguon cau: <span className="font-bold text-slate-700">{dictationCurrentSource}</span></p>
              )}

              {dictationHintLevel > 0 && dictationCurrentSentence && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1">Goi y muc {dictationHintLevel}</p>
                  <p className="text-sm text-amber-900 font-medium">{buildDictationHint()}</p>
                </div>
              )}
            </section>

            <section className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-black text-slate-800">Ban nghe duoc gi?</h3>
                <button
                  onClick={() => setDictationShowAnswer(prev => !prev)}
                  disabled={!dictationCurrentSentence}
                  className="px-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  {dictationShowAnswer ? 'An dap an' : 'Hien dap an'}
                </button>
              </div>

              <textarea
                value={dictationAnswer}
                onChange={(e) => setDictationAnswer(e.target.value)}
                rows={8}
                placeholder="Nghe va go lai cau ban vua nghe..."
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={checkDictationAnswer}
                  disabled={!dictationCurrentSentence || !dictationAnswer.trim()}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Cham diem
                </button>
                <button
                  onClick={() => {
                    setDictationAnswer('');
                    setDictationResult(null);
                    setDictationShowAnswer(false);
                  }}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                >
                  Xoa bai lam
                </button>
                <button
                  onClick={() => pickDictationSentence()}
                  className="px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-200 transition-colors"
                >
                  Cau moi
                </button>
              </div>

              {dictationResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                    <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Do chinh xac</p>
                    <p className="text-2xl font-black text-emerald-800 mt-1">{dictationResult.accuracy}%</p>
                  </div>
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 md:col-span-2">
                    <p className="text-xs uppercase tracking-widest text-amber-700 font-bold">Can chu y</p>
                    <p className="text-sm text-amber-900 mt-1">
                      {dictationResult.missing.length > 0 ? `Thieu: ${dictationResult.missing.join(', ')}` : 'Khong thieu tu nao.'}
                      {dictationResult.wrong.length > 0 ? ` Sai/du: ${dictationResult.wrong.join(', ')}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {dictationShowAnswer && dictationCurrentSentence && (
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50">
                  <p className="text-xs uppercase tracking-widest text-indigo-700 font-bold mb-1">Dap an chuan</p>
                  <p className="text-sm text-indigo-900 leading-relaxed">{dictationCurrentSentence}</p>
                </div>
              )}

              {dictationHistory.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">5 lan cham gan nhat</p>
                  <div className="flex flex-wrap gap-2">
                    {dictationHistory.slice(0, 5).map((item, idx) => (
                      <span key={idx} className={`px-2.5 py-1 text-xs rounded-lg border font-bold ${item.accuracy >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : item.accuracy >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        Lan {idx + 1}: {item.accuracy}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================== TAB: KHO BÀI ĐỌC ===================== */}
        {activeTab === 'reading' && !selectedPassageId && readingPage === 'library' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/80 p-6 md:p-8 shadow-[0_14px_34px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_44px_rgba(2,6,23,0.45)]">
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 88% 10%, color-mix(in srgb, ${activeThemePreset.colors.primary} 16%, transparent 84%) 0%, transparent 50%), radial-gradient(circle at 10% 100%, color-mix(in srgb, ${activeThemePreset.colors.accent} 14%, transparent 86%) 0%, transparent 42%)` }} />
              <div className="relative flex items-center justify-between gap-3 mb-5 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] font-black text-slate-500 dark:text-slate-400">Reading Library</p>
                  <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-slate-900 dark:text-slate-100 mt-1">
                    <BookOpen className="w-6 h-6 text-[color:var(--color-primary)]" /> Tất cả bài đọc ({passages.length})
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Xây thư viện bài đọc rõ ràng, dễ xem lại, dễ ôn từ theo ngữ cảnh.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold border border-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] bg-[color:var(--color-primary-soft)]/55">
                    {passages.length} bài học
                  </span>
                  <button
                    onClick={() => setReadingPage('create')}
                    className="px-5 py-2.5 rounded-xl font-black text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)] transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" /> Thêm bài đọc
                  </button>
                </div>
              </div>

              {passages.length === 0 ? (
                <div className="relative text-center py-14 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-900/65 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-600 dark:text-slate-300 font-bold">Chưa có bài đọc nào.</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tạo bài đọc đầu tiên để bắt đầu luyện đọc và trích xuất từ vựng.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {passages.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => openPassage(p.id)}
                      className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 cursor-pointer group flex flex-col min-h-[230px] hover:-translate-y-0.5 hover:shadow-lg hover:border-[color:var(--color-primary-soft)] transition-all duration-200"
                    >
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300">Reading</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-primary-soft)] border border-[color:var(--color-primary-soft)]" />
                      </div>

                      <div className="flex-grow min-w-0">
                        <p className="text-lg md:text-xl font-black mb-2 line-clamp-2 text-slate-900 dark:text-slate-100 group-hover:text-[color:var(--color-primary)] transition-colors">{p.title}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-4">{stripHtml(p.content || '') || 'Bài đọc chưa có nội dung chi tiết.'}</p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          {new Date(Number(p.createdAt) || Number(p.id) || Date.now()).toLocaleDateString()} · {p.words?.length || 0} từ
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => deletePassage(p.id, e)}
                            className="p-2 rounded-lg text-slate-400 hover:text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger-soft)]/55 transition-colors"
                            title="Xóa bài đọc"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[color:var(--color-primary)]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================== TAB: THÊM BÀI ĐỌC ===================== */}
        {activeTab === 'reading' && !selectedPassageId && readingPage === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
            {/* Input Side */}
            <div className="lg:col-span-7 space-y-6">
              <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-[color:var(--color-primary)]" /> Phân tích bài đọc mới</h2>
                  <button
                    onClick={() => setReadingPage('library')}
                    className="px-3 py-2 text-xs font-bold text-[color:var(--color-primary)] bg-[color:var(--color-primary-soft)]/55 rounded-lg hover:bg-[color:var(--color-primary-soft)] transition-colors"
                  >
                    Về kho bài đọc
                  </button>
                </div>
                <div className="space-y-4">
                  <input value={readingTitle} onChange={(e) => setReadingTitle(e.target.value)} placeholder="Nhập tiêu đề bài học..." className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary-soft)] font-medium text-slate-800 dark:text-slate-100" />

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
                        className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-[color:var(--color-primary)] text-white rounded-xl font-bold shadow-lg hover:bg-[color:var(--color-primary-hover)] transition-all z-10"
                      >
                        {audioLoading === 'reading-main' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                        {audioLoading === 'reading-main' ? 'Dừng' : 'Đọc mẫu'}
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-800">Câu hỏi luyện tập ({readingQuestions.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-100 rounded-lg cursor-pointer hover:bg-indigo-200 transition-colors">
                          <Upload className="w-3 h-3" /> Upload JSON/CSV/Excel
                          <input
                            type="file"
                            accept="application/json,.json,text/csv,.csv,.xlsx,.xls"
                            className="hidden"
                            onChange={(e) => handleQuestionFileUpload(e, setReadingQuestions)}
                          />
                        </label>
                        <button onClick={() => downloadQuestionTemplate('csv')} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Template CSV</button>
                        <button onClick={() => downloadQuestionTemplate('xlsx')} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Template Excel</button>
                        <button onClick={() => downloadQuestionTemplate('json')} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Template JSON</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <select
                        value={readingQuestionDraft.type}
                        onChange={(e) => setReadingQuestionDraft(prev => ({ ...prev, type: e.target.value, correctAnswer: '' }))}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="mcq">Trắc nghiệm</option>
                        <option value="fill">Điền từ</option>
                      </select>
                      <input
                        value={readingQuestionDraft.question}
                        onChange={(e) => setReadingQuestionDraft(prev => ({ ...prev, question: e.target.value }))}
                        placeholder={readingQuestionDraft.type === 'fill' ? 'Nhập câu hỏi điền từ (VD: I ____ to school.)' : 'Nhập câu hỏi trắc nghiệm...'}
                        className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>

                    {readingQuestionDraft.type === 'mcq' ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[0, 1, 2, 3].map((optIdx) => (
                            <input
                              key={optIdx}
                              value={readingQuestionDraft.options[optIdx]}
                              onChange={(e) => handleQuestionDraftOptionChange(setReadingQuestionDraft, optIdx, e.target.value)}
                              placeholder={`Đáp án ${optIdx + 1}`}
                              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                          ))}
                        </div>
                        <select
                          value={readingQuestionDraft.correctAnswer}
                          onChange={(e) => setReadingQuestionDraft(prev => ({ ...prev, correctAnswer: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          <option value="">Chọn đáp án đúng</option>
                          {readingQuestionDraft.options.filter(Boolean).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <input
                        value={readingQuestionDraft.correctAnswer}
                        onChange={(e) => setReadingQuestionDraft(prev => ({ ...prev, correctAnswer: e.target.value }))}
                        placeholder="Đáp án đúng cho câu điền từ"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => addQuestionFromDraft(readingQuestionDraft, setReadingQuestions, setReadingQuestionDraft)}
                        className="px-4 py-2 text-sm font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors"
                      >
                        + Thêm câu hỏi
                      </button>
                      <button
                        onClick={() => setReadingQuestionDraft(createEmptyQuestionDraft())}
                        className="px-4 py-2 text-sm font-bold bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                      >
                        Xóa form
                      </button>
                    </div>

                    {readingQuestions.length > 0 && (
                      <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                        {readingQuestions.map((q, qIdx) => (
                          <div key={q.id || qIdx} className="flex items-start justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg">
                            <div>
                              <p className="text-xs font-bold text-indigo-700 uppercase">{q.type === 'mcq' ? 'Trắc nghiệm' : 'Điền từ'}</p>
                              <p className="text-sm text-slate-700">{q.question}</p>
                            </div>
                            <button
                              onClick={() => removeQuestionAtIndex(qIdx, setReadingQuestions)}
                              className="p-1 text-slate-400 hover:text-red-500"
                              title="Xóa câu hỏi"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={savePassage} disabled={!readingTitle.trim() || !stripHtml(readingContent).trim()} className="w-full py-4 bg-[color:var(--color-success)] text-white rounded-2xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transition-colors">
                    <Save className="w-5 h-5" /> Lưu bài học
                  </button>
                </div>
              </section>
            </div>

            {/* Results Side */}
            <div className="lg:col-span-5 space-y-6">
              <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-right-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2"><Sparkles className="w-5 h-5 text-[color:var(--color-accent)]" /> Từ vựng trong bài ({extractedWords.length})</h2>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={previewWordInput}
                    onChange={e => {
                      setPreviewWordInput(e.target.value);
                      if (previewWordSuggestions.length > 0) {
                        setPreviewWordSuggestions([]);
                      }
                    }}
                    placeholder="Thêm từ thủ công..."
                    className="flex-grow px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-[color:var(--color-primary)] text-sm text-slate-800 dark:text-slate-100"
                    onKeyPress={e => e.key === 'Enter' && handleAddWordToExtracted()}
                  />
                  <button
                    onClick={() => (previewWordLoading ? stopAISearch() : handleAddWordToExtracted())}
                    disabled={!previewWordLoading && !previewWordInput.trim()}
                    className={`px-3 py-2 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center min-w-[70px] shadow-sm ${previewWordLoading ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)]'}`}
                  >
                    {previewWordLoading ? 'Dừng' : 'Thêm'}
                  </button>
                </div>

                {previewWordSuggestions.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Gợi ý từ đúng</p>
                    <div className="space-y-2">
                      {previewWordSuggestions.map((entry, idx) => (
                        <div key={`${entry.word}-${idx}`} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-amber-900">{entry.word}:</span>
                          {entry.suggestions.length > 0 ? entry.suggestions.map((suggestion) => (
                            <button
                              key={`${entry.word}-${suggestion}`}
                              onClick={() => setPreviewWordInput(suggestion)}
                              className="px-2 py-1 rounded-lg text-xs font-bold border border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                            >
                              {suggestion}
                            </button>
                          )) : <span className="text-xs text-amber-700/80">Không có gợi ý</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingExtractedAiWords.length > 0 && (
                  <div className="mb-4 space-y-3">
                    {pendingExtractedAiWords.map((word, idx) => (
                      <div key={word.id} className="border border-indigo-100 bg-indigo-50/40 rounded-3xl p-5 md:p-6 animate-in zoom-in-95">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-5">
                          <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{word.word}</h3>
                              <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase border ${getTypeBadgeClass(word.type)}`}>{word.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-base md:text-lg font-mono text-indigo-600">{word.ipa}</p>
                              <button onClick={() => speak(word.word, `reading-preview-${idx}`)} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm hover:text-indigo-600 transition-colors">
                                {audioLoading === `reading-preview-${idx}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => savePendingExtractedWord(word.id)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                            >
                              <Save className="w-4 h-4" /> Lưu từ này
                            </button>
                            <button
                              onClick={() => discardPendingExtractedWord(word.id)}
                              className="px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              Bỏ qua
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Định nghĩa</label>
                            <p className="text-lg text-slate-700 dark:text-slate-200 font-medium">{getDisplayDefinition(word)}</p>

                            <div className="mt-4 space-y-3">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Từ trái nghĩa</p>
                                <div className="flex flex-wrap gap-2">
                                  {(word.antonyms || []).length > 0 ? (word.antonyms || []).map((item, itemIdx) => (
                                    <span key={itemIdx} className="px-2 py-1 text-[11px] rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-semibold">{item}</span>
                                  )) : <span className="text-xs text-slate-400">Chưa có dữ liệu</span>}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Collocation liên quan</p>
                                <div className="flex flex-wrap gap-2">
                                  {(word.collocations || []).length > 0 ? (word.collocations || []).map((item, itemIdx) => (
                                    <span key={itemIdx} className="px-2 py-1 text-[11px] rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold">{item}</span>
                                  )) : <span className="text-xs text-slate-400">Chưa có dữ liệu</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ví dụ ({word.examples?.length || 0})</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                              {(word.examples || []).slice(0, 3).map((ex, exIdx) => (
                                <div key={exIdx} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-slate-800 dark:text-slate-100 font-semibold italic text-sm mb-1">"{ex.en}"</p>
                                  <p className="text-slate-500 dark:text-slate-300 text-xs">{ex.vi}</p>
                                </div>
                              ))}
                              {(!word.examples || word.examples.length === 0) && (
                                <p className="text-slate-400 italic text-sm">Chưa có ví dụ nào.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {extractedWords.map((w, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 group relative transition-all">
                      {editingExtractedIndex === idx ? (
                        <div className="space-y-2">
                          <input value={editExtractedData.word} onChange={e => setEditExtractedData({ ...editExtractedData, word: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-lg outline-none focus:border-indigo-400" placeholder="Từ vựng" />
                          <div className="flex gap-2">
                            <input value={editExtractedData.ipa} onChange={e => setEditExtractedData({ ...editExtractedData, ipa: e.target.value })} className="w-1/2 px-2 py-1.5 text-sm border rounded-lg outline-none focus:border-indigo-400" placeholder="Phiên âm" />
                            <select value={editExtractedData.type || 'Noun'} onChange={e => setEditExtractedData({ ...editExtractedData, type: e.target.value })} className="w-1/2 px-2 py-1.5 text-sm border rounded-lg outline-none focus:border-indigo-400 bg-white">
                              {WORD_TYPE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
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
                              <span className={`text-[10px] px-1 rounded uppercase border ${getTypeBadgeClass(w.type)}`}>{w.type}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-indigo-600 font-mono">{w.ipa}</span>
                              <button onClick={() => speak(w.word, `prev-word-${idx}`)} className="text-indigo-400 hover:text-indigo-600">
                                {audioLoading === `prev-word-${idx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 size={12} className="w-3 h-3" />}
                              </button>
                            </div>
                            <span className="text-sm text-slate-600 mb-2">{getDisplayDefinition(w)}</span>
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
                  {extractedWords.length === 0 && (
                    <p className="text-center text-slate-400 py-8 text-sm">Chưa có từ vựng nào. Nhập từ ở ô trên để thêm ngay vào bài đọc.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ===================== PASSAGE DETAIL VIEW ===================== */}
        {activeTab === 'reading' && selectedPassageId && getSelectedPassage() && (
          <div className="animate-in slide-in-from-bottom-8 duration-300">
            <button onClick={() => { setSelectedPassageId(null); setReadingPage('library'); }} className="mb-6 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[color:var(--color-primary)] font-semibold transition-colors">
              <ArrowLeft className="w-5 h-5" /> Quay lại
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Passage Content Left */}
              <div className="lg:col-span-7 space-y-6">
                <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
                  {isEditingPassage ? (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="flex items-center gap-2 text-[color:var(--color-primary)] mb-4">
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

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-800">Câu hỏi luyện tập ({editPassageQuestions.length})</h3>
                          <div className="flex flex-wrap gap-2">
                            <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-100 rounded-lg cursor-pointer hover:bg-indigo-200 transition-colors">
                              <Upload className="w-3 h-3" /> Upload JSON/CSV/Excel
                              <input
                                type="file"
                                accept="application/json,.json,text/csv,.csv,.xlsx,.xls"
                                className="hidden"
                                onChange={(e) => handleQuestionFileUpload(e, setEditPassageQuestions)}
                              />
                            </label>
                            <button onClick={() => downloadQuestionTemplate('csv')} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Template CSV</button>
                            <button onClick={() => downloadQuestionTemplate('xlsx')} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Template Excel</button>
                            <button onClick={() => downloadQuestionTemplate('json')} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Template JSON</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <select
                            value={editQuestionDraft.type}
                            onChange={(e) => setEditQuestionDraft(prev => ({ ...prev, type: e.target.value, correctAnswer: '' }))}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            <option value="mcq">Trắc nghiệm</option>
                            <option value="fill">Điền từ</option>
                          </select>
                          <input
                            value={editQuestionDraft.question}
                            onChange={(e) => setEditQuestionDraft(prev => ({ ...prev, question: e.target.value }))}
                            placeholder={editQuestionDraft.type === 'fill' ? 'Nhập câu hỏi điền từ (VD: I ____ to school.)' : 'Nhập câu hỏi trắc nghiệm...'}
                            className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>

                        {editQuestionDraft.type === 'mcq' ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {[0, 1, 2, 3].map((optIdx) => (
                                <input
                                  key={optIdx}
                                  value={editQuestionDraft.options[optIdx]}
                                  onChange={(e) => handleQuestionDraftOptionChange(setEditQuestionDraft, optIdx, e.target.value)}
                                  placeholder={`Đáp án ${optIdx + 1}`}
                                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                              ))}
                            </div>
                            <select
                              value={editQuestionDraft.correctAnswer}
                              onChange={(e) => setEditQuestionDraft(prev => ({ ...prev, correctAnswer: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                              <option value="">Chọn đáp án đúng</option>
                              {editQuestionDraft.options.filter(Boolean).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <input
                            value={editQuestionDraft.correctAnswer}
                            onChange={(e) => setEditQuestionDraft(prev => ({ ...prev, correctAnswer: e.target.value }))}
                            placeholder="Đáp án đúng cho câu điền từ"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => addQuestionFromDraft(editQuestionDraft, setEditPassageQuestions, setEditQuestionDraft)}
                            className="px-4 py-2 text-sm font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors"
                          >
                            + Thêm câu hỏi
                          </button>
                          <button
                            onClick={() => setEditQuestionDraft(createEmptyQuestionDraft())}
                            className="px-4 py-2 text-sm font-bold bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                          >
                            Xóa form
                          </button>
                        </div>

                        {editPassageQuestions.length > 0 && (
                          <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                            {editPassageQuestions.map((q, qIdx) => (
                              <div key={q.id || qIdx} className="flex items-start justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg">
                                <div>
                                  <p className="text-xs font-bold text-indigo-700 uppercase">{q.type === 'mcq' ? 'Trắc nghiệm' : 'Điền từ'}</p>
                                  <p className="text-sm text-slate-700">{q.question}</p>
                                </div>
                                <button
                                  onClick={() => removeQuestionAtIndex(qIdx, setEditPassageQuestions)}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                  title="Xóa câu hỏi"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

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
                        <div className="pr-4 flex-1">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-3">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-700">Bài đọc</span>
                          </div>
                          <h1 className="text-3xl md:text-4xl font-black leading-tight text-slate-900 dark:text-slate-100">{getSelectedPassage().title}</h1>
                          <p className="mt-2 text-sm text-slate-500 font-medium">{getSelectedPassage().words?.length || 0} từ vựng trong bài</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={startEditingPassage}
                            className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-full hover:bg-[color:var(--color-primary-soft)]/55 hover:text-[color:var(--color-primary)] transition-colors"
                            title="Chỉnh sửa bài học"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => speak(stripHtml(getSelectedPassage().content), `passage-${selectedPassageId}`)}
                            className="p-3 bg-[color:var(--color-primary-soft)]/60 text-[color:var(--color-primary)] rounded-full hover:opacity-90 transition-colors"
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

                      {Array.isArray(getSelectedPassage().questions) && getSelectedPassage().questions.length > 0 && (
                        <div className="mt-6 p-5 bg-white rounded-2xl border border-indigo-100 shadow-sm">
                          <h3 className="text-lg font-black text-slate-800 mb-4">Luyện tập câu hỏi ({getSelectedPassage().questions.length})</h3>
                          <div className="space-y-4">
                            {getSelectedPassage().questions.map((q, qIdx) => {
                              const qKey = q.id || `legacy-${qIdx}`;
                              const feedback = passageQuestionFeedback[qKey];
                              return (
                                <div key={qKey} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{q.type === 'mcq' ? 'Trắc nghiệm' : 'Điền từ'}</p>
                                    {feedback?.checked && (
                                      <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${feedback.isCorrect ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {feedback.isCorrect ? 'Đúng' : 'Sai'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-semibold text-slate-800 mb-3">{qIdx + 1}. {q.question}</p>

                                  {q.type === 'mcq' ? (
                                    <div className="space-y-2">
                                      {q.options.map((opt, optIdx) => (
                                        <label key={`${qKey}-${optIdx}`} className="flex items-center gap-2 text-sm text-slate-700">
                                          <input
                                            type="radio"
                                            name={`q-${qKey}`}
                                            checked={(passageQuestionAnswers[qKey] || '') === opt}
                                            onChange={() => setPassageQuestionAnswers(prev => ({ ...prev, [qKey]: opt }))}
                                          />
                                          <span>{opt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : (
                                    <input
                                      value={passageQuestionAnswers[qKey] || ''}
                                      onChange={(e) => setPassageQuestionAnswers(prev => ({ ...prev, [qKey]: e.target.value }))}
                                      placeholder="Nhập đáp án của bạn"
                                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                  )}

                                  <div className="mt-3 flex items-center gap-2">
                                    <button
                                      onClick={() => checkPassageQuestionAnswer({ ...q, id: qKey })}
                                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                    >
                                      Kiểm tra đáp án
                                    </button>
                                    {feedback?.checked && !feedback.isCorrect && (
                                      <span className="text-xs text-slate-500">Đáp án đúng: <strong>{q.correctAnswer}</strong></span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
                      onChange={e => {
                        setPassageWordInput(e.target.value);
                        if (passageWordSuggestions.length > 0) {
                          setPassageWordSuggestions([]);
                        }
                      }}
                      placeholder="Nhập từ..."
                      className="flex-grow px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 text-sm"
                      onKeyPress={e => e.key === 'Enter' && handleAddWordToPassage(selectedPassageId)}
                    />
                    <button
                      onClick={() => (passageWordLoading ? stopAISearch() : handleAddWordToPassage(selectedPassageId))}
                      disabled={!passageWordLoading && !passageWordInput.trim()}
                      className={`px-3 py-2 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center min-w-[52px] ${passageWordLoading ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      title={passageWordLoading ? 'Dừng' : 'Tìm kiếm AI'}
                    >
                      {passageWordLoading ? 'Dừng' : <Search className="w-4 h-4" />}
                    </button>
                  </div>

                  {passageWordSuggestions.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Gợi ý từ đúng</p>
                      <div className="space-y-2">
                        {passageWordSuggestions.map((entry, idx) => (
                          <div key={`${entry.word}-${idx}`} className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-amber-900">{entry.word}:</span>
                            {entry.suggestions.length > 0 ? entry.suggestions.map((suggestion) => (
                              <button
                                key={`${entry.word}-${suggestion}`}
                                onClick={() => setPassageWordInput(suggestion)}
                                className="px-2 py-1 rounded-lg text-xs font-bold border border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                              >
                                {suggestion}
                              </button>
                            )) : <span className="text-xs text-amber-700/80">Không có gợi ý</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingPassageAiWords.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {pendingPassageAiWords.map((word, idx) => (
                        <div key={word.id} className="border border-indigo-100 bg-indigo-50/40 rounded-3xl p-5 md:p-6 animate-in zoom-in-95">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-5">
                            <div>
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-2xl font-black text-slate-800">{word.word}</h3>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase border ${getTypeBadgeClass(word.type)}`}>{word.type}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-base md:text-lg font-mono text-indigo-600">{word.ipa}</p>
                                <button onClick={() => speak(word.word, `reading-detail-${idx}`)} className="p-2 bg-white rounded-full shadow-sm hover:text-indigo-600 transition-colors">
                                  {audioLoading === `reading-detail-${idx}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => savePendingPassageWord(selectedPassageId, word.id)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                              >
                                <Save className="w-4 h-4" /> Lưu từ này
                              </button>
                              <button
                                onClick={() => discardPendingPassageWord(word.id)}
                                className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                              >
                                Bỏ qua
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Định nghĩa</label>
                              <p className="text-lg text-slate-700 font-medium">{getDisplayDefinition(word)}</p>

                              <div className="mt-4 space-y-3">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Từ trái nghĩa</p>
                                  <div className="flex flex-wrap gap-2">
                                    {(word.antonyms || []).length > 0 ? (word.antonyms || []).map((item, itemIdx) => (
                                      <span key={itemIdx} className="px-2 py-1 text-[11px] rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-semibold">{item}</span>
                                    )) : <span className="text-xs text-slate-400">Chưa có dữ liệu</span>}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Collocation liên quan</p>
                                  <div className="flex flex-wrap gap-2">
                                    {(word.collocations || []).length > 0 ? (word.collocations || []).map((item, itemIdx) => (
                                      <span key={itemIdx} className="px-2 py-1 text-[11px] rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold">{item}</span>
                                    )) : <span className="text-xs text-slate-400">Chưa có dữ liệu</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ví dụ ({word.examples?.length || 0})</label>
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {(word.examples || []).slice(0, 3).map((ex, exIdx) => (
                                  <div key={exIdx} className="bg-white p-3 rounded-xl border border-slate-100">
                                    <p className="text-slate-800 font-semibold italic text-sm mb-1">"{ex.en}"</p>
                                    <p className="text-slate-500 text-xs">{ex.vi}</p>
                                  </div>
                                ))}
                                {(!word.examples || word.examples.length === 0) && (
                                  <p className="text-slate-400 italic text-sm">Chưa có ví dụ nào.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                                <select value={editPassageWordData.type || 'Noun'} onChange={e => setEditPassageWordData({ ...editPassageWordData, type: e.target.value })} className="w-1/2 px-3 py-2 text-sm border rounded-lg outline-none focus:border-indigo-400 bg-white">
                                  {WORD_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
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
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${getTypeBadgeClass(w.type)}`}>{w.type}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-xs text-indigo-600 font-mono">{w.ipa}</p>
                                <button onClick={() => speak(w.word, `p-word-${selectedPassageId}-${idx}`)} className="text-indigo-400 hover:text-indigo-600">
                                  {audioLoading === `p-word-${selectedPassageId}-${idx}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 size={12} className="w-3 h-3" />}
                                </button>
                              </div>
                              <p className="text-sm text-slate-700 font-medium mb-3">{getDisplayDefinition(w)}</p>
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

        {/* ===================== TAB: TRO CHOI ON TU ===================== */}
        {activeTab === 'game' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
            <section className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-indigo-600" /> Trò chơi ôn từ mới
              </h2>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loại trò chơi</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { id: 'mcq', label: 'Trắc nghiệm nghĩa' },
                    { id: 'unscramble', label: 'Sắp xếp chữ cái' },
                    { id: 'fill', label: 'Điền từ còn thiếu' },
                    { id: 'bubble', label: 'Bắn bong bóng từ' },
                    { id: 'memory', label: 'Lật thẻ đôi', full: true }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setGameType(type.id)}
                      className={`py-2 text-xs rounded-lg font-bold transition-colors border ${type.full ? 'col-span-2' : ''} ${gameType === type.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setGameMode('random')}
                  className={`py-2 text-xs rounded-lg font-bold transition-colors ${gameMode === 'random' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Chọn ngẫu nhiên
                </button>
                <button
                  onClick={() => setGameMode('selected')}
                  className={`py-2 text-xs rounded-lg font-bold transition-colors ${gameMode === 'selected' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Chọn từ cụ thể
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số câu</label>
                <input
                  type="number"
                  min={2}
                  max={Math.max(vocabList.length, 2)}
                  value={gameQuestionCount}
                  onChange={(e) => setGameQuestionCount(Math.max(2, Number(e.target.value) || 2))}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Độ khó</p>

                <label className="flex items-center justify-between gap-3 text-xs text-slate-700">
                  <span>Mạng ban đầu</span>
                  <select
                    value={gameInitialLives}
                    onChange={(e) => setGameInitialLives(Math.max(1, Math.min(7, Number(e.target.value) || 3)))}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map(v => <option key={v} value={v}>{v} mạng</option>)}
                  </select>
                </label>

                <label className="flex items-center justify-between gap-3 text-xs text-slate-700">
                  <span>Tốc độ Bubble</span>
                  <select
                    value={gameBubbleSpeed}
                    onChange={(e) => setGameBubbleSpeed(Number(e.target.value) || 1)}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value={0.8}>Chậm</option>
                    <option value={1}>Bình thường</option>
                    <option value={1.25}>Nhanh</option>
                    <option value={1.5}>Rất nhanh</option>
                  </select>
                </label>

                <label className="flex items-center justify-between gap-3 text-xs text-slate-700">
                  <span>Tăng multiplier</span>
                  <select
                    value={gameComboRamp}
                    onChange={(e) => setGameComboRamp(Math.max(1, Math.min(4, Number(e.target.value) || 2)))}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value={1}>Rất nhanh</option>
                    <option value={2}>Chuẩn</option>
                    <option value={3}>Chậm</option>
                    <option value={4}>Rất chậm</option>
                  </select>
                </label>

                <p className="text-[11px] text-slate-500">Best combo {gameType}: <strong className="text-indigo-700">x{Math.max(1, Number(gameBestComboByType?.[gameType] || 1))}</strong></p>
              </div>

              {gameMode === 'selected' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                  <input
                    value={gameSearchTerm}
                    onChange={(e) => setGameSearchTerm(e.target.value)}
                    placeholder="Tìm từ để thêm vào trò chơi..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <p className="text-xs text-slate-500">Đã chọn: <span className="font-bold text-indigo-700">{gameSelectedWordIds.length}</span> từ</p>
                  <div className="max-h-56 overflow-y-auto custom-scrollbar pr-1 space-y-1">
                    {vocabList
                      .filter(w => {
                        const kw = gameSearchTerm.trim().toLowerCase();
                        if (!kw) return true;
                        return String(w.word || '').toLowerCase().includes(kw) || String(getDisplayDefinition(w) || '').toLowerCase().includes(kw);
                      })
                      .slice(0, 80)
                      .map(w => (
                        <label key={w.id} className="flex items-center gap-2 text-xs text-slate-700 bg-white rounded-lg border border-slate-200 px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={gameSelectedWordIds.includes(w.id)}
                            onChange={() => toggleGameWordSelection(w.id)}
                          />
                          <span className="truncate"><strong>{w.word}</strong> - {getDisplayDefinition(w)}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={startGameSession}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Bắt đầu chơi
                </button>
                <button
                  onClick={resetGameProgress}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                >
                  Reset
                </button>
              </div>
            </section>

            <section className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
              {(() => {
                const memoryDone = gameMemoryCards.length > 0 && gameMemoryMatched.length === Math.floor(gameMemoryCards.length / 2);

                if (gameType === 'memory') {
                  if (!gameStarted && !memoryDone) {
                    return (
                      <div className="h-full min-h-[320px] flex items-center justify-center text-center text-slate-400">
                        <div>
                          <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                          <p>Bấm Bắt đầu chơi để tạo bộ thẻ từ và nghĩa.</p>
                        </div>
                      </div>
                    );
                  }

                  if (memoryDone) {
                    return (
                      <div className="min-h-[320px] flex flex-col items-center justify-center text-center">
                        <p className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-2">Memory hoàn thành</p>
                        <h3 className="text-3xl font-black text-indigo-700 mb-2">Số lượt mở: {gameMemoryMoves}</h3>
                        <p className="text-slate-600 mb-6">Bạn đã ghép đúng toàn bộ cặp từ - nghĩa.</p>
                        <div className="flex gap-2">
                          <button onClick={startGameSession} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Chơi lại</button>
                          <button onClick={resetGameProgress} className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300">Thoát</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Lượt mở: {gameMemoryMoves}</p>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Đã ghép: {gameMemoryMatched.length}/{Math.floor(gameMemoryCards.length / 2)}</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {gameMemoryCards.map(card => {
                          const isOpen = gameMemoryFlipped.includes(card.id) || gameMemoryMatched.includes(card.pairId);
                          return (
                            <button
                              key={card.id}
                              onClick={() => flipMemoryCard(card)}
                              className={`min-h-[88px] rounded-2xl border p-3 text-sm font-bold transition-all ${isOpen ? 'bg-indigo-50 border-indigo-200 text-slate-700' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'}`}
                            >
                              {isOpen ? card.text : '?'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (gameOver) {
                  return (
                    <div className="min-h-[320px] flex flex-col items-center justify-center text-center">
                      <p className="text-sm uppercase tracking-widest text-rose-500 font-bold mb-2">Game Over</p>
                      <h3 className="text-3xl font-black text-slate-800 mb-2">Hết mạng</h3>
                      <p className="text-slate-600 mb-1">Điểm cuối: <strong>{gameScore}</strong></p>
                      <p className="text-slate-500 text-sm mb-1">Combo cao nhất lượt này: <strong>x{Math.max(1, gameRunBestCombo)}</strong></p>
                      <p className="text-slate-500 text-sm mb-6">Best combo {gameType}: <strong>x{Math.max(1, Number(gameBestComboByType?.[gameType] || 1))}</strong></p>
                      <div className="flex gap-2">
                        <button onClick={startGameSession} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Chơi lại</button>
                        <button onClick={resetGameProgress} className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300">Thoát</button>
                      </div>
                    </div>
                  );
                }

                if (!gameStarted) {
                  return (
                    <div className="h-full min-h-[320px] flex items-center justify-center text-center text-slate-400">
                      <div>
                        <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>Chọn chế độ và bấm Bắt đầu chơi để ôn từ vựng.</p>
                      </div>
                    </div>
                  );
                }

                if (gameCurrentIndex >= gameQuestions.length) {
                  return (
                    <div className="min-h-[320px] flex flex-col items-center justify-center text-center">
                      <p className="text-sm uppercase tracking-widest text-slate-500 font-bold mb-2">Hoàn thành</p>
                      <h3 className="text-3xl font-black text-indigo-700 mb-2">Điểm số: {gameScore}/{gameQuestions.length}</h3>
                      <p className="text-slate-600 mb-6">Bạn có thể chơi lại với bộ câu hỏi mới.</p>
                      <div className="flex gap-2">
                        <button onClick={startGameSession} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Chơi lại</button>
                        <button onClick={resetGameProgress} className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300">Thoát</button>
                      </div>
                    </div>
                  );
                }

                const current = gameQuestions[gameCurrentIndex];
                if (!current) {
                  return (
                    <div className="h-full min-h-[320px] flex items-center justify-center text-center text-slate-400">
                      <div>
                        <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>Dang tai cau hoi. Vui long bam Bat dau choi lai.</p>
                      </div>
                    </div>
                  );
                }
                const fillData = gameFillDataMap[current?.id];
                const isAnswerHiddenGame = gameType === 'fill' || gameType === 'bubble' || gameType === 'unscramble';

                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Câu {gameCurrentIndex + 1}/{gameQuestions.length}</p>
                      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1" title={`Mạng: ${gameLives}`}>
                          {Array.from({ length: Math.max(1, gameInitialLives) }).map((_, idx) => (
                            <Heart
                              key={`life-${idx}`}
                              className={`w-4 h-4 ${idx < gameLives ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`}
                            />
                          ))}
                        </div>
                        <p className="text-amber-600">Combo: x{gameComboMultiplier}</p>
                        <p className="text-indigo-600">Điểm: {gameScore}</p>
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                      <h3 className="text-3xl font-black text-slate-800 mb-2">
                        {isAnswerHiddenGame
                          ? (gameType === 'fill'
                            ? 'Dien tu con thieu'
                            : (gameType === 'unscramble' ? 'Sap xep chu cai' : 'Nghe va chon dung tu'))
                          : current.word}
                      </h3>
                      {isAnswerHiddenGame ? (
                        <p className="text-sm text-indigo-700 font-semibold">
                          {gameType === 'fill'
                            ? 'Khong hien thi tu dap an truoc khi tra loi.'
                            : (gameType === 'unscramble'
                              ? 'Tu dap an da duoc an. Chi hien chu cai dao vi tri.'
                              : 'Nghe audio va chon bong bong dung.')}
                        </p>
                      ) : (
                        <p className="text-sm text-indigo-700 font-mono">{current.ipa || 'No IPA'} • {current.type || 'Word'}</p>
                      )}
                    </div>

                    {gameType === 'mcq' && (
                      <>
                        <p className="text-sm font-bold text-slate-600">Chọn nghĩa đúng:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {(Array.isArray(current.options) ? current.options : []).map((opt, idx) => {
                            const isCorrect = opt === current.correct;
                            const isSelected = opt === gameSelectedOption;

                            let styleClass = 'border-slate-200 bg-white hover:border-indigo-300';
                            if (gameAnswered && isCorrect) styleClass = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                            if (gameAnswered && isSelected && !isCorrect) styleClass = 'border-rose-300 bg-rose-50 text-rose-800';

                            return (
                              <button
                                key={`${current.id}-${idx}`}
                                disabled={gameAnswered}
                                onClick={() => answerGameQuestion(opt)}
                                className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed ${styleClass}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {gameType === 'unscramble' && (
                      <>
                        <p className="text-sm font-bold text-slate-600">Sắp xếp chữ cái thành từ đúng:</p>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                          <p className="text-3xl font-black tracking-[0.15em] text-indigo-700 uppercase">{current.scrambled}</p>
                          <p className="text-xs mt-2 text-slate-500">Gợi ý nghĩa: {current.hint}</p>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={gameTextAnswer}
                            onChange={(e) => setGameTextAnswer(e.target.value)}
                            disabled={gameAnswered}
                            placeholder="Nhap tu dung..."
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          <button
                            onClick={submitTextGameAnswer}
                            disabled={gameAnswered}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Kiem tra
                          </button>
                        </div>
                      </>
                    )}

                    {gameType === 'fill' && (
                      <>
                        <p className="text-sm font-bold text-slate-600">Điền từ còn thiếu trong câu:</p>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4">
                          {gameFillLoading && !fillData ? (
                            <p className="text-sm text-slate-500">Dang tao cau mau tu dong...</p>
                          ) : (
                            <>
                              <p className="text-lg font-semibold text-slate-800">{fillData?.sentence || 'I use ____ every day.'}</p>
                              {fillData?.vi && <p className="text-xs text-slate-500 mt-2">Nghia: {fillData.vi}</p>}
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={gameTextAnswer}
                            onChange={(e) => setGameTextAnswer(e.target.value)}
                            disabled={gameAnswered}
                            placeholder="Nhap tu con thieu..."
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          <button
                            onClick={submitTextGameAnswer}
                            disabled={gameAnswered}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Kiem tra
                          </button>
                        </div>
                      </>
                    )}

                    {gameType === 'bubble' && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-600">Nghe từ và chạm đúng bong bóng:</p>
                          <button
                            onClick={() => speak(current.word, `bubble-manual-${current.id}-${gameCurrentIndex}`)}
                            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                          >
                            Nghe lại
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>Timeout từ đúng: <strong className="text-rose-600">-{gameBubbleTimeoutHits}</strong> điểm</span>
                          <span>Bấm sai cũng bị trừ điểm.</span>
                        </div>
                        <div className="game-bubble-field min-h-[320px] rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white p-4">
                          {!gameAnswered && gameBubbleEntities.length === 0 && (
                            <p className="text-xs text-slate-400 text-center pt-16">Dang tao bong bong...</p>
                          )}

                          {gameBubbleEntities.map((bubble) => (
                            <button
                              key={bubble.id}
                              disabled={gameAnswered}
                              onClick={() => handleBubbleHit(bubble)}
                              style={{
                                left: `${bubble.laneLeft}%`,
                                width: `${bubble.sizePx}px`,
                                height: `${bubble.sizePx}px`,
                                animationDuration: `${bubble.durationSec}s`
                              }}
                              className="game-bubble arcade-bubble border border-sky-200 bg-white/95 text-slate-700 text-sm font-bold shadow-sm disabled:cursor-not-allowed"
                            >
                              {bubble.text}
                            </button>
                          ))}

                          {gameAnswered && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                              <div className="px-4 py-2 rounded-xl bg-white/85 border border-emerald-200 text-emerald-700 text-sm font-bold shadow-sm">
                                Trung bong bong dung!
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {gameAnswered && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <p className={`text-sm font-bold ${normalizeSimpleWord(gameSelectedOption) === normalizeSimpleWord(current.correct) ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {normalizeSimpleWord(gameSelectedOption) === normalizeSimpleWord(current.correct)
                            ? 'Chính xác!'
                            : `Đáp án đúng: ${current.correct}`}
                        </p>
                        <button
                          onClick={nextGameQuestion}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                        >
                          Câu tiếp
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          </div>
        )}

        {/* ===================== TAB: NGỮ PHÁP (GRAMMAR WORKSHOP) ===================== */}
        {activeTab === 'grammar' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {!selectedGrammarId && !isAddingGrammar && (
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/80 p-5 md:p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
                  <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 85% 12%, color-mix(in srgb, ${activeThemePreset.colors.primary} 14%, transparent 86%) 0%, transparent 48%), radial-gradient(circle at 8% 100%, color-mix(in srgb, ${activeThemePreset.colors.accent} 15%, transparent 85%) 0%, transparent 44%)` }} />
                  <div className="relative flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] font-black text-slate-500 dark:text-slate-400">Grammar Workshop</p>
                      <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-slate-900 dark:text-slate-100 mt-1">
                        <Library className="w-6 h-6 text-[color:var(--color-primary)]" /> Kho Ngữ Pháp
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Xây kho cấu trúc ngữ pháp rõ ràng, dễ xem lại, dễ thực hành.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold border border-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] bg-[color:var(--color-primary-soft)]/55">
                        {grammarList.length} bài học
                      </span>
                      <button
                        onClick={() => setIsAddingGrammar(true)}
                        className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)] transition-colors shadow-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Thêm cấu trúc
                      </button>
                    </div>
                  </div>
                </div>

                {grammarList.length === 0 ? (
                  <div className="text-center py-16 md:py-20 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-[color:var(--color-accent-soft)] bg-[color:var(--color-accent-soft)]/50 flex items-center justify-center">
                      <Library className="w-8 h-8 text-[color:var(--color-accent)]" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 font-bold">Bạn chưa có bài ngữ pháp nào.</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Bắt đầu bằng một cấu trúc nền tảng để học theo lộ trình.</p>
                    <button
                      onClick={() => setIsAddingGrammar(true)}
                      className="mt-5 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)]"
                    >
                      Tạo bài đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {grammarList.map(g => {
                      const colorTheme = PASTEL_COLORS.find(c => c.id === g.color) || PASTEL_COLORS[0];
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGrammarId(g.id)}
                          className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 cursor-pointer group flex flex-col min-h-[230px] hover:-translate-y-0.5 hover:shadow-lg hover:border-[color:var(--color-primary-soft)] transition-all duration-200"
                        >
                          <div className="mb-4 flex items-center justify-between gap-2">
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300">Grammar</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${colorTheme.bg} border ${colorTheme.border}`} />
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-lg md:text-xl font-black mb-2 line-clamp-2 text-slate-900 dark:text-slate-100 group-hover:text-[color:var(--color-primary)] transition-colors">{g.title}</h3>
                            <div
                              className="text-sm text-slate-600 dark:text-slate-300 line-clamp-4"
                              dangerouslySetInnerHTML={{ __html: stripHtml(g.content) }}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                              {new Date(g.createdAt).toLocaleDateString()}
                            </span>
                            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-[color:var(--color-primary)] transition-colors" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {isAddingGrammar && (
              <div className="w-full space-y-6">
                <button onClick={() => setIsAddingGrammar(false)} className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[color:var(--color-primary)] font-semibold transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Hủy soạn thảo
                </button>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Edit className="w-6 h-6 text-[color:var(--color-primary)]" /> {editingGrammarId ? 'Sửa bài học' : 'Soạn bài ngữ pháp'}
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-bold border border-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]/55">Editor Mode</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Tiêu đề cấu trúc</label>
                    <input
                      value={grammarTitle}
                      onChange={e => setGrammarTitle(e.target.value)}
                      placeholder="Ví dụ: Thì hiện tại đơn, Câu điều kiện loại 1..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[color:var(--color-primary-soft)] font-bold text-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Màu sắc chủ đề</label>
                    <div className="flex flex-wrap gap-3">
                      {PASTEL_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setGrammarColor(c.id)}
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${grammarColor === c.id ? `ring-2 ring-offset-2 ring-[color:var(--color-primary)] scale-110 border-white ${c.bg}` : `border-transparent hover:scale-105 ${c.bg}`}`}
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
                      className="px-8 py-3 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-hover)]"
                    >
                      <Save className="w-5 h-5" /> Lưu bài học
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedGrammarId && !isAddingGrammar && (
              <div className="w-full space-y-4">
                <button onClick={() => setSelectedGrammarId(null)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[color:var(--color-primary)] font-semibold transition-colors">
                  <ArrowLeft className="w-5 h-5" /> Quay lại kho ngữ pháp
                </button>

                {(() => {
                  const g = grammarList.find(x => x.id === selectedGrammarId);
                  if (!g) return null;
                  const colorTheme = PASTEL_COLORS.find(c => c.id === g.color) || PASTEL_COLORS[0];

                  return (
                    <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 md:p-10 shadow-[0_16px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_44px_rgba(2,6,23,0.45)]">
                      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: `linear-gradient(130deg, color-mix(in srgb, ${activeThemePreset.colors.primarySoft} 48%, transparent 52%) 0%, transparent 40%, color-mix(in srgb, ${activeThemePreset.colors.accentSoft} 46%, transparent 54%) 100%)` }} />
                      <div className="relative flex justify-between items-start mb-6 border-b border-slate-200 dark:border-slate-700 pb-6 gap-3">
                        <div>
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${colorTheme.border} ${colorTheme.text} ${colorTheme.bg}`}>
                            Grammar Note
                          </span>
                          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 mt-3">{g.title}</h1>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Tạo ngày {new Date(g.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => startEditGrammar(g.id)} className="p-2.5 border border-slate-200 dark:border-slate-700 bg-white/85 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-[color:var(--color-primary)] rounded-xl transition-colors" title="Chỉnh sửa">
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteGrammar(g.id)}
                            className="p-2.5 border border-slate-200 dark:border-slate-700 bg-white/85 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-[color:var(--color-danger)] rounded-xl transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div
                        className="relative prose prose-lg max-w-none passage-content text-slate-700 dark:text-slate-200"
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

      {/* PDF Preview Modal */}
      {isPdfPreviewOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{pdfPreviewTitle}</h3>
                <p className="text-xs text-slate-500">Kiểm tra nội dung trước khi tải xuống</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadPreviewPdf}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Tải xuống
                </button>
                <button onClick={closePdfPreview} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100">
              <iframe title="PDF Preview" src={pdfPreviewUrl} className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}

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

      <ResetProgressModal
        open={isResetProgressModalOpen}
        onClose={() => {
          if (isResetProgressProcessing) return;
          setIsResetProgressModalOpen(false);
          setResetProgressAcknowledged(false);
        }}
        onConfirm={confirmResetLearningProgressFromSettings}
        acknowledged={resetProgressAcknowledged}
        setAcknowledged={setResetProgressAcknowledged}
        loading={isResetProgressProcessing}
      />

      <Suspense fallback={null}>
        <DangerActionModal
          open={confirmModal.open}
          onClose={closeDeleteConfirm}
          onConfirm={handleConfirmDelete}
          title={confirmModal.title}
          message={confirmModal.message}
          itemName={confirmModal.itemName}
          itemType={confirmModal.itemType}
          warningLevel={confirmModal.warningLevel}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          loading={confirmModal.loading}
          error={confirmModal.error}
          showTypeToConfirm={confirmModal.showTypeToConfirm}
          typeToConfirmText={confirmModal.typeToConfirmText}
          confirmInput={confirmModal.confirmInput}
          onConfirmInputChange={(value) => setConfirmModal((prev) => ({ ...prev, confirmInput: value, error: '' }))}
          consequenceList={confirmModal.consequenceList}
          icon={confirmModal.icon}
          disableClose={confirmModal.disableClose}
        />
      </Suspense>

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

        .reduced-motion-ui *,
        .reduced-motion-ui *::before,
        .reduced-motion-ui *::after {
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 90ms !important;
          scroll-behavior: auto !important;
        }
      `}</style>
    </div>
  );
};

export default App;
