import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  X, Plus, Trash2, Upload, Music, Film, FileText,
  Paperclip, Image as ImageIcon, Link2, AlignLeft,
  ChevronUp, ChevronDown, Eye, EyeOff, Loader2,
  CheckCircle2, RefreshCw, ExternalLink, Bold, Italic,
  Underline, List, AlignCenter, AlignLeft as AlignL, Type,
  HelpCircle, GripVertical, Check, Sparkles, Wand2,
} from 'lucide-react';
import {
  STAGES, MATERIAL_TYPE_CONFIG,
  type Stage, type StageMaterialType, type UnitStageMaterial,
} from '@/lib/stages';

// ─── helpers ─────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}
function getEmbedUrl(url: string) {
  const yt = extractYouTubeId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
function getYouTubeThumbnail(url: string) {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

const TYPE_ICONS: Record<StageMaterialType, React.ReactNode> = {
  audio:  <Music className="h-4 w-4 text-green-500" />,
  video:  <Film className="h-4 w-4 text-blue-500" />,
  pdf:    <FileText className="h-4 w-4 text-red-500" />,
  word:   <AlignLeft className="h-4 w-4 text-blue-600" />,
  ppt:    <Paperclip className="h-4 w-4 text-orange-500" />,
  image:  <ImageIcon className="h-4 w-4 text-purple-500" />,
  url:    <Link2 className="h-4 w-4 text-cyan-500" />,
  text:   <AlignLeft className="h-4 w-4 text-gray-500" />,
};

// ─── Rich Text Toolbar ────────────────────────────────────────────────────────
function RichTextEditor({
  value, onChange, placeholder = 'Escribe el contenido aquí...'
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    syncContent();
  };

  const syncContent = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // Sync external value → DOM only on mount
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []); // eslint-disable-line

  const toolbarBtn = (label: string, icon: React.ReactNode, action: () => void) => (
    <button
      type="button"
      title={label}
      onMouseDown={e => { e.preventDefault(); action(); }}
      className="p-1.5 rounded hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
    >
      {icon}
    </button>
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-muted/40 border-b border-border">
        {toolbarBtn('Negrita', <Bold className="h-3.5 w-3.5" />, () => exec('bold'))}
        {toolbarBtn('Cursiva', <Italic className="h-3.5 w-3.5" />, () => exec('italic'))}
        {toolbarBtn('Subrayado', <Underline className="h-3.5 w-3.5" />, () => exec('underline'))}
        <div className="w-px h-4 bg-border mx-1" />
        {toolbarBtn('Lista', <List className="h-3.5 w-3.5" />, () => exec('insertUnorderedList'))}
        {toolbarBtn('Centrar', <AlignCenter className="h-3.5 w-3.5" />, () => exec('justifyCenter'))}
        {toolbarBtn('Izquierda', <AlignL className="h-3.5 w-3.5" />, () => exec('justifyLeft'))}
        <div className="w-px h-4 bg-border mx-1" />
        <select
          onMouseDown={e => e.stopPropagation()}
          onChange={e => exec('fontSize', e.target.value)}
          className="text-xs bg-background border border-border rounded px-1 py-0.5 h-6"
          defaultValue="3"
        >
          <option value="1">Pequeño</option>
          <option value="3">Normal</option>
          <option value="4">Mediano</option>
          <option value="5">Grande</option>
          <option value="6">Muy grande</option>
        </select>
        <select
          onMouseDown={e => e.stopPropagation()}
          onChange={e => { exec('foreColor', e.target.value); }}
          className="text-xs bg-background border border-border rounded px-1 py-0.5 h-6 w-16"
          title="Color de texto"
          defaultValue=""
        >
          <option value="" disabled>Color</option>
          <option value="#000000">Negro</option>
          <option value="#1e40af">Azul</option>
          <option value="#15803d">Verde</option>
          <option value="#dc2626">Rojo</option>
          <option value="#7c3aed">Morado</option>
          <option value="#ea580c">Naranja</option>
          <option value="#6b7280">Gris</option>
        </select>
        {toolbarBtn('Quitar formato', <Type className="h-3.5 w-3.5" />, () => exec('removeFormat'))}
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onBlur={syncContent}
        data-placeholder={placeholder}
        className={cn(
          'min-h-[100px] max-h-[300px] overflow-y-auto p-3 text-sm outline-none focus:ring-1 focus:ring-primary/30',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none'
        )}
      />
    </div>
  );
}

// ─── File Upload Zone ─────────────────────────────────────────────────────────
function FileUploadZone({
  materialType, value, fileName, onChange,
}: {
  materialType: StageMaterialType;
  value: string | null;
  fileName: string | null;
  onChange: (url: string | null, name: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cfg = MATERIAL_TYPE_CONFIG[materialType];

  const upload = useCallback(async (file: File) => {
    setErr(null);
    if (file.size > 200 * 1024 * 1024) { setErr('El archivo es muy grande (máx. 200 MB)'); return; }
    setUploading(true); setProgress(5);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `stages/${materialType}/${Date.now()}_${safe}`;
      const iv = setInterval(() => setProgress(p => Math.min(p + 8, 88)), 400);
      const { data, error } = await supabase.storage
        .from('unit-media')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      clearInterval(iv);
      if (error) { setErr(`Error: ${error.message}`); setUploading(false); return; }
      const { data: u } = supabase.storage.from('unit-media').getPublicUrl(data.path);
      setProgress(100);
      onChange(u.publicUrl, file.name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al subir archivo');
    } finally { setUploading(false); }
  }, [materialType, onChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const handleDelete = async () => {
    if (value) {
      const p = value.split('/unit-media/')[1];
      if (p) await supabase.storage.from('unit-media').remove([decodeURIComponent(p)]);
    }
    onChange(null, null);
  };

  // ── Already uploaded ──
  if (value && !uploading) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
          {materialType === 'image' && (
            <img src={value} alt="" className="w-full max-h-52 object-contain" />
          )}
          {materialType === 'video' && (
            <video src={value} controls className="w-full max-h-52 bg-black" />
          )}
          {materialType === 'audio' && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Music className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">{fileName || 'Audio'}</p>
                  <p className="text-xs text-green-600">Listo para reproducir</p>
                </div>
              </div>
              <audio src={value} controls className="w-full" />
            </div>
          )}
          {['pdf', 'word', 'ppt'].includes(materialType) && (
            <div className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 text-2xl">
                {cfg.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{fileName || 'Archivo'}</p>
                <p className="text-xs text-muted-foreground">{cfg.label} · Subido correctamente ✅</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => window.open(value, '_blank')} className="shrink-0">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button" variant="outline" size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reemplazar archivo
          </Button>
          <Button
            type="button" variant="ghost" size="sm"
            className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" /> Quitar
          </Button>
        </div>
        <input ref={inputRef} type="file" accept={cfg.accept} className="hidden" onChange={handleFileInput} />
      </div>
    );
  }

  // ── Upload zone ──
  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept={cfg.accept} className="hidden" onChange={handleFileInput} />

      {uploading ? (
        <div className="border-2 border-primary/40 border-dashed rounded-xl p-6 text-center bg-primary/5">
          <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-2" />
          <p className="text-sm font-medium text-primary">Subiendo archivo...</p>
          <div className="mt-3 bg-primary/20 rounded-full h-2 max-w-[200px] mx-auto overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
            drag
              ? 'border-primary bg-primary/8 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/40'
          )}
          onClick={() => inputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 text-2xl">
            {cfg.emoji}
          </div>
          <p className="text-sm font-semibold mb-1">
            Arrastra el archivo aquí
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            o haz clic para seleccionar
          </p>
          <Button type="button" size="sm" className="gap-2 pointer-events-none">
            <Upload className="h-3.5 w-3.5" />
            Seleccionar {cfg.label}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2">
            Formatos: {cfg.accept.replace(/\./g, '').toUpperCase()} · Máx. 200 MB
          </p>
        </div>
      )}

      {err && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          ⚠️ {err}
        </div>
      )}
    </div>
  );
}

// ─── Material Card (expanded editor) ─────────────────────────────────────────
function MaterialCard({
  material, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  material: UnitStageMaterial;
  onUpdate: (patch: Partial<UnitStageMaterial>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const cfg = MATERIAL_TYPE_CONFIG[material.material_type];
  const ytThumb = material.external_url ? getYouTubeThumbnail(material.external_url) : null;
  const embedSrc = material.external_url ? getEmbedUrl(material.external_url) : null;
  const [previewEmbed, setPreviewEmbed] = useState(false);

  return (
    <div className="border-2 border-border rounded-2xl bg-card shadow-sm overflow-hidden">
      {/* ── Card Header ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border">
        <span className="text-lg">{cfg.emoji}</span>
        <span className="text-sm font-bold flex-1">{cfg.label}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp} disabled={isFirst}
            className="p-1 rounded hover:bg-background disabled:opacity-30 transition-colors"
            title="Subir"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown} disabled={isLast}
            className="p-1 rounded hover:bg-background disabled:opacity-30 transition-colors"
            title="Bajar"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onUpdate({ is_published: !material.is_published })}
            className={cn(
              'p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors',
              material.is_published
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
            title={material.is_published ? 'Visible · clic para ocultar' : 'Oculto · clic para publicar'}
          >
            {material.is_published
              ? <><Eye className="h-3 w-3" /> Visible</>
              : <><EyeOff className="h-3 w-3" /> Oculto</>
            }
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Card Body ── */}
      <div className="p-4 space-y-4">
        {/* Título */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Título
          </label>
          <Input
            value={material.title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder={`Ej: ${cfg.label} - Lección 1`}
            className="h-9 font-medium"
          />
        </div>

        {/* Archivo / URL / Texto */}
        {cfg.isFile && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Archivo {cfg.label}
            </label>
            <FileUploadZone
              materialType={material.material_type}
              value={material.file_url}
              fileName={material.file_name}
              onChange={(url, name) => onUpdate({ file_url: url, file_name: name })}
            />
          </div>
        )}

        {material.material_type === 'url' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              URL del enlace
            </label>
            <Input
              value={material.external_url || ''}
              onChange={e => onUpdate({ external_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=... o cualquier URL"
              className="h-9"
            />
            {/* YouTube preview */}
            {material.external_url && ytThumb && (
              <div className="mt-2 rounded-xl overflow-hidden border border-border bg-black">
                {!previewEmbed ? (
                  <div className="relative cursor-pointer group" onClick={() => setPreviewEmbed(true)}>
                    <img src={ytThumb} alt="YouTube preview" className="w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                      <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <Film className="h-6 w-6 text-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-3 text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">
                      Clic para reproducir
                    </div>
                  </div>
                ) : embedSrc ? (
                  <iframe src={embedSrc} className="w-full aspect-video" allowFullScreen />
                ) : null}
              </div>
            )}
            {material.external_url && !ytThumb && (
              <div className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground truncate flex-1">{material.external_url}</p>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => window.open(material.external_url!, '_blank')}>
                  <ExternalLink className="h-3 w-3" /> Abrir
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Texto enriquecido */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            {material.material_type === 'text' ? 'Contenido del texto' : 'Descripción / Notas (opcional)'}
          </label>
          <RichTextEditor
            value={material.description || ''}
            onChange={v => onUpdate({ description: v })}
            placeholder={
              material.material_type === 'text'
                ? 'Escribe el contenido aquí. Puedes usar negrita, listas, colores...'
                : 'Descripción o instrucciones para el estudiante (opcional)'
            }
          />
        </div>
      </div>
    </div>
  );
}

// ─── Add material picker ──────────────────────────────────────────────────────
function AddMaterialPicker({ onAdd }: { onAdd: (type: StageMaterialType) => void }) {
  const types: StageMaterialType[] = ['audio', 'video', 'pdf', 'word', 'ppt', 'image', 'url', 'text'];
  return (
    <div className="border-2 border-dashed border-primary/30 rounded-2xl p-4 bg-primary/3">
      <p className="text-xs font-semibold text-center text-muted-foreground mb-3 uppercase tracking-wide">
        ¿Qué tipo de material quieres agregar?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {types.map(type => {
          const cfg = MATERIAL_TYPE_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => onAdd(type)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{cfg.emoji}</span>
              <span className="text-[10px] font-semibold leading-none text-muted-foreground group-hover:text-foreground">{cfg.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quiz Types ──────────────────────────────────────────────────────────────
export type QuizType = 'multiple_choice' | 'multiple_select' | 'true_false' | 'match' | 'organize' | 'rewrite';

export interface QuizOption { id: string; text: string; isCorrect?: boolean; correctAnswer?: string; }
export interface QuizQuestion {
  id: string;
  type: QuizType;
  question: string;
  options: QuizOption[];
  correctAnswer?: string;
  explanation?: string;
}

const QUIZ_TYPE_CONFIG: Record<QuizType, { label: string; emoji: string; desc: string }> = {
  multiple_choice:  { label: 'Opción múltiple',       emoji: '🔘', desc: 'Una sola respuesta correcta' },
  multiple_select:  { label: 'Varios correctos',       emoji: '☑️', desc: 'Puede haber más de una correcta' },
  true_false:       { label: 'Verdadero / Falso',      emoji: '⚖️', desc: 'Solo dos opciones' },
  match:            { label: 'Relacionar (Match)',      emoji: '🔗', desc: 'Conectar columna A con columna B' },
  organize:         { label: 'Organizar palabras',      emoji: '🔀', desc: 'Reordenar palabras o frases' },
  rewrite:          { label: 'Reescribir correctamente', emoji: '✍️', desc: 'Corregir una oración' },
};

function QuizEditor({ questions, onChange, stageLabel }: { questions: QuizQuestion[]; onChange: (q: QuizQuestion[]) => void; stageLabel?: string }) {
  const [activeQ, setActiveQ] = useState<string | null>(null);
  // ── AI Generation ──
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiExercises, setAiExercises] = useState('');
  const [aiType, setAiType] = useState<QuizType>('multiple_choice');
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateWithAI = async () => {
    if (!aiTopic.trim()) { setAiError('Escribe un tema para generar preguntas.'); return; }
    setAiLoading(true); setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('generate-quiz-ai', {
        body: { topic: aiTopic, exercises: aiExercises || undefined, num_questions: aiCount, quiz_type: aiType },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.questions?.length) {
        onChange([...questions, ...data.questions]);
        setShowAiPanel(false);
        setAiTopic('');
        setAiExercises('');
      } else {
        setAiError('No se generaron preguntas. Intenta con otro tema.');
      }
    } catch (e) {
      setAiError(`Error: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    } finally {
      setAiLoading(false);
    }
  };

  const addQuestion = (type: QuizType) => {
    const q: QuizQuestion = {
      id: `q-${Date.now()}`,
      type,
      question: '',
      options: type === 'true_false'
        ? [{ id: 'opt-t', text: 'Verdadero', isCorrect: true }, { id: 'opt-f', text: 'Falso', isCorrect: false }]
        : type === 'rewrite' || type === 'organize'
        ? [{ id: 'opt-1', text: '', isCorrect: true }]
        : [{ id: `opt-${Date.now()}-1`, text: '', isCorrect: true }, { id: `opt-${Date.now()}-2`, text: '', isCorrect: false }],
      explanation: '',
    };
    onChange([...questions, q]);
    setActiveQ(q.id);
  };

  const updateQ = (id: string, patch: Partial<QuizQuestion>) =>
    onChange(questions.map(q => q.id === id ? { ...q, ...patch } : q));

  const deleteQ = (id: string) => {
    onChange(questions.filter(q => q.id !== id));
    if (activeQ === id) setActiveQ(null);
  };

  const addOption = (qId: string) => {
    const q = questions.find(q => q.id === qId);
    if (!q) return;
    updateQ(qId, { options: [...q.options, { id: `opt-${Date.now()}`, text: '', isCorrect: false }] });
  };

  const updateOption = (qId: string, optId: string, patch: Partial<QuizOption>) => {
    const q = questions.find(q => q.id === qId);
    if (!q) return;
    updateQ(qId, { options: q.options.map(o => o.id === optId ? { ...o, ...patch } : o) });
  };

  const setCorrectOption = (qId: string, optId: string, multiSelect: boolean) => {
    const q = questions.find(q => q.id === qId);
    if (!q) return;
    if (multiSelect) {
      updateQ(qId, { options: q.options.map(o => o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o) });
    } else {
      updateQ(qId, { options: q.options.map(o => ({ ...o, isCorrect: o.id === optId })) });
    }
  };

  const deleteOption = (qId: string, optId: string) => {
    const q = questions.find(q => q.id === qId);
    if (!q || q.options.length <= 1) return;
    updateQ(qId, { options: q.options.filter(o => o.id !== optId) });
  };

  return (
    <div className="space-y-3">
      {/* ── AI Generator panel ── */}
      {showAiPanel && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <p className="font-bold text-sm text-violet-900">Generar preguntas con IA</p>
            <button type="button" onClick={() => setShowAiPanel(false)} className="ml-auto p-1 rounded hover:bg-violet-100">
              <X className="h-3.5 w-3.5 text-violet-600" />
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-violet-700 mb-1 block">Tema o título del ejercicio *</label>
              <Input value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                placeholder={`Ej: Present Simple, Vocabulario de colores, ${stageLabel || 'Gramática básica'}...`}
                className="text-sm border-violet-200" />
            </div>
            <div>
              <label className="text-xs font-semibold text-violet-700 mb-1 block">Ejercicios o ejemplos (opcional)</label>
              <textarea value={aiExercises} onChange={e => setAiExercises(e.target.value)}
                placeholder="Pega aquí ejemplos, oraciones, vocabulario o los ejercicios en los que basarte. La IA generará preguntas similares."
                rows={3}
                className="w-full text-xs border border-violet-200 rounded-xl px-3 py-2 bg-white resize-none focus:ring-2 focus:ring-violet-300 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-violet-700 mb-1 block">Tipo de pregunta</label>
                <select value={aiType} onChange={e => setAiType(e.target.value as QuizType)}
                  className="w-full text-xs border border-violet-200 rounded-xl px-2 py-1.5 bg-white focus:ring-2 focus:ring-violet-300 outline-none">
                  {(Object.entries(QUIZ_TYPE_CONFIG) as [QuizType, typeof QUIZ_TYPE_CONFIG[QuizType]][]).map(([t, c]) => (
                    <option key={t} value={t}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-violet-700 mb-1 block">Número de preguntas</label>
                <select value={aiCount} onChange={e => setAiCount(Number(e.target.value))}
                  className="w-full text-xs border border-violet-200 rounded-xl px-2 py-1.5 bg-white focus:ring-2 focus:ring-violet-300 outline-none">
                  {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} preguntas</option>)}
                </select>
              </div>
            </div>
          </div>
          {aiError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{aiError}</p>}
          <Button type="button" onClick={generateWithAI} disabled={aiLoading}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm">
            {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</> : <><Wand2 className="h-4 w-4" /> Generar preguntas con IA</>}
          </Button>
          <p className="text-[10px] text-violet-500 text-center">💡 Para mejores resultados agrega una clave de Gemini AI en los secretos de Supabase (GEMINI_API_KEY)</p>
        </div>
      )}

      {questions.length === 0 && !showAiPanel && (
        <p className="text-xs text-center text-muted-foreground py-3">Sin preguntas aún. Elige un tipo para agregar o usa la IA ✨</p>
      )}

      {questions.map((q, qi) => (
        <div key={q.id} className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
          {/* Question header */}
          <button type="button" onClick={() => setActiveQ(activeQ === q.id ? null : q.id)}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left">
            <span className="text-base">{QUIZ_TYPE_CONFIG[q.type].emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary truncate">{QUIZ_TYPE_CONFIG[q.type].label}</p>
              <p className="text-xs text-muted-foreground truncate">{q.question || 'Sin pregunta aún...'}</p>
            </div>
            <span className="text-xs text-muted-foreground">{qi + 1}/{questions.length}</span>
            <button type="button" onClick={e => { e.stopPropagation(); deleteQ(q.id); }}
              className="p-1 rounded hover:bg-destructive/10 text-destructive ml-1">
              <Trash2 className="h-3 w-3" />
            </button>
            {activeQ === q.id ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
          </button>

          {activeQ === q.id && (
            <div className="p-3 space-y-3">
              {/* Question text */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Pregunta</label>
                <Input value={q.question} onChange={e => updateQ(q.id, { question: e.target.value })}
                  placeholder="¿Cuál es la forma correcta...?" className="text-sm" />
              </div>

              {/* Options */}
              {(q.type === 'multiple_choice' || q.type === 'multiple_select' || q.type === 'true_false') && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Opciones {q.type === 'multiple_select' ? '(marca todas las correctas)' : '(marca la correcta)'}
                  </label>
                  <div className="space-y-1.5">
                    {q.options.map(opt => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => setCorrectOption(q.id, opt.id, q.type === 'multiple_select')}
                          className={`w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${
                            opt.isCorrect ? 'bg-green-500 border-green-500' : 'border-border bg-background'
                          }`}>
                          {opt.isCorrect && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <Input value={opt.text} disabled={q.type === 'true_false'}
                          onChange={e => updateOption(q.id, opt.id, { text: e.target.value })}
                          placeholder={`Opción ${q.options.indexOf(opt) + 1}`}
                          className="text-xs h-8 flex-1" />
                        {q.type !== 'true_false' && (
                          <button type="button" onClick={() => deleteOption(q.id, opt.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive shrink-0">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.type !== 'true_false' && (
                      <Button type="button" variant="outline" size="sm" className="w-full h-7 text-xs gap-1 border-dashed"
                        onClick={() => addOption(q.id)}>
                        <Plus className="h-3 w-3" /> Agregar opción
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Match: pairs */}
              {q.type === 'match' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Pares (A → B)</label>
                  <div className="space-y-1.5">
                    {q.options.map((opt, i) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                        <Input value={opt.text} onChange={e => updateOption(q.id, opt.id, { text: e.target.value })}
                          placeholder="Columna A" className="text-xs h-8 flex-1" />
                        <span className="text-muted-foreground text-sm">→</span>
                        <Input value={opt.correctAnswer || ''}
                          onChange={e => updateOption(q.id, opt.id, { correctAnswer: e.target.value })}
                          placeholder="Columna B" className="text-xs h-8 flex-1" />
                        <button type="button" onClick={() => deleteOption(q.id, opt.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-destructive/60 shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="w-full h-7 text-xs gap-1 border-dashed"
                      onClick={() => addOption(q.id)}><Plus className="h-3 w-3" /> Agregar par</Button>
                  </div>
                </div>
              )}

              {/* Organize / Rewrite */}
              {(q.type === 'organize' || q.type === 'rewrite') && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                    {q.type === 'organize' ? 'Palabras / frase a organizar' : 'Oración incorrecta → corrección'}
                  </label>
                  <div className="space-y-1.5">
                    <Input value={q.options[0]?.text || ''}
                      onChange={e => updateOption(q.id, q.options[0].id, { text: e.target.value })}
                      placeholder={q.type === 'organize' ? 'morning the in wake I up' : 'I goes to school yesterday'}
                      className="text-sm" />
                    <Input value={q.correctAnswer || ''}
                      onChange={e => updateQ(q.id, { correctAnswer: e.target.value })}
                      placeholder={q.type === 'organize' ? 'Respuesta correcta: I wake up in the morning' : 'Respuesta correcta: I went to school yesterday'}
                      className="text-sm" />
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Explicación (opcional)</label>
                <Input value={q.explanation || ''} onChange={e => updateQ(q.id, { explanation: e.target.value })}
                  placeholder="Por qué esta es la respuesta correcta..." className="text-xs" />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add question buttons + AI button */}
      <div className="space-y-2">
        <button type="button" onClick={() => setShowAiPanel(s => !s)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 hover:bg-violet-100 hover:border-violet-500 transition-all text-violet-700 font-bold text-sm">
          <Sparkles className="h-4 w-4" /> ✨ Generar con IA (nuevo)
        </button>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(QUIZ_TYPE_CONFIG) as [QuizType, typeof QUIZ_TYPE_CONFIG[QuizType]][]).map(([type, cfg]) => (
            <button key={type} type="button" onClick={() => addQuestion(type)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group">
              <span className="text-lg">{cfg.emoji}</span>
              <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground leading-tight text-center">{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stage Panel ──────────────────────────────────────────────────────────────
function StagePanel({
  stage, unitId, materials, onMaterialsChange, isExpanded, onToggle,
}: {
  stage: typeof STAGES[0];
  unitId: string;
  materials: UnitStageMaterial[];
  onMaterialsChange: (updated: UnitStageMaterial[]) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const addMaterial = (type: StageMaterialType) => {
    const newMat: UnitStageMaterial = {
      id: `tmp-${Date.now()}`,
      unit_id: unitId,
      stage: stage.id,
      material_type: type,
      title: '',
      description: '',
      file_url: null,
      file_name: null,
      external_url: null,
      sort_order: materials.length,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onMaterialsChange([...materials, newMat]);
    setShowPicker(false);
  };

  const updateMaterial = (id: string, patch: Partial<UnitStageMaterial>) =>
    onMaterialsChange(materials.map(m => m.id === id ? { ...m, ...patch } : m));

  const deleteMaterial = (id: string) =>
    onMaterialsChange(materials.filter(m => m.id !== id));

  const moveMaterial = (id: string, dir: 'up' | 'down') => {
    const i = materials.findIndex(m => m.id === id);
    if (i < 0) return;
    if (dir === 'up' && i === 0) return;
    if (dir === 'down' && i === materials.length - 1) return;
    const arr = [...materials];
    const j = dir === 'up' ? i - 1 : i + 1;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onMaterialsChange(arr);
  };

  return (
    <div className={cn('rounded-2xl border-2 overflow-hidden', stage.bg)}>
      {/* Stage header — click to expand/collapse */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-black/5 transition-colors"
      >
        <span className="text-2xl">{stage.emoji}</span>
        <div className="flex-1">
          <p className={cn('font-bold text-base', stage.color)}>{stage.label}</p>
          <p className="text-xs text-muted-foreground">{stage.desc}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">{materials.length} mat.</Badge>
          <Badge variant="outline" className="text-xs">{quizQuestions.length} quiz</Badge>
        </div>
        {isExpanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>

      {isExpanded && (
        <div className="border-t border-black/10">
          {/* Inner tabs: Materiales / Quiz */}
          <div className="flex border-b border-black/10">
            <button type="button"
              onClick={() => setShowQuiz(false)}
              className={cn('flex-1 py-2.5 text-xs font-bold transition-colors',
                !showQuiz ? `bg-white/80 ${stage.color}` : 'text-muted-foreground hover:bg-black/5')}>
              📁 Materiales
            </button>
            <button type="button"
              onClick={() => setShowQuiz(true)}
              className={cn('flex-1 py-2.5 text-xs font-bold transition-colors',
                showQuiz ? `bg-white/80 ${stage.color}` : 'text-muted-foreground hover:bg-black/5')}>
              📝 Quiz ({quizQuestions.length})
            </button>
          </div>

          {/* Materials pane */}
          {!showQuiz && (
            <div className="px-4 pb-4 space-y-3 pt-4">
              {materials.length === 0 && !showPicker && (
                <p className="text-sm text-center text-muted-foreground py-2">Sin materiales aún — agrégalos usando el botón de abajo</p>
              )}
              {materials.map((mat, idx) => (
                <MaterialCard
                  key={mat.id}
                  material={mat}
                  onUpdate={patch => updateMaterial(mat.id, patch)}
                  onDelete={() => deleteMaterial(mat.id)}
                  onMoveUp={() => moveMaterial(mat.id, 'up')}
                  onMoveDown={() => moveMaterial(mat.id, 'down')}
                  isFirst={idx === 0}
                  isLast={idx === materials.length - 1}
                />
              ))}
              {showPicker && <AddMaterialPicker onAdd={addMaterial} />}
              <Button type="button" variant="outline" size="sm"
                onClick={() => setShowPicker(s => !s)}
                className={cn('w-full h-10 text-sm gap-2 border-dashed', showPicker && 'border-primary/50 text-primary')}>
                {showPicker ? <><X className="h-4 w-4" /> Cancelar</> : <><Plus className="h-4 w-4" /> Agregar material</>}
              </Button>
            </div>
          )}

          {/* Quiz pane */}
          {showQuiz && (
            <div className="px-4 pb-4 pt-4">
              <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} stageLabel={stage.label} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main UnitStagesEditor ─────────────────────────────────────────────────────
interface UnitStagesEditorProps {
  unitId: string;
  unitTitle: string;
  onClose: () => void;
}

export function UnitStagesEditor({ unitId, unitTitle, onClose }: UnitStagesEditorProps) {
  const [materialsByStage, setMaterialsByStage] = useState<Record<Stage, UnitStageMaterial[]>>({
    grammar: [], vocabulary: [], reading: [], listening: [], ai_practice: [],
  });
  const [expandedStage, setExpandedStage] = useState<Stage | null>('grammar'); // first open by default
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { loadMaterials(); }, [unitId]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('unit_stage_materials')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const byStage: Record<Stage, UnitStageMaterial[]> = {
        grammar: [], vocabulary: [], reading: [], listening: [], ai_practice: [],
      };
      (data as UnitStageMaterial[]).forEach(m => {
        if (m.stage in byStage) byStage[m.stage as Stage].push(m);
      });
      setMaterialsByStage(byStage);
    } catch (e) {
      console.error('Error loading materials:', e);
    } finally { setLoading(false); }
  };

  const handleStageChange = (stage: Stage, updated: UnitStageMaterial[]) =>
    setMaterialsByStage(prev => ({ ...prev, [stage]: updated }));

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
      // Delete all existing for this unit
      const { error: delErr } = await supabase
        .from('unit_stage_materials')
        .delete()
        .eq('unit_id', unitId);
      if (delErr) throw delErr;

      const allMaterials: Omit<UnitStageMaterial, 'id' | 'created_at' | 'updated_at'>[] = [];
      STAGES.forEach(({ id: stage }) => {
        materialsByStage[stage].forEach((m, idx) => {
          allMaterials.push({
            unit_id: unitId,
            stage,
            material_type: m.material_type,
            title: m.title || MATERIAL_TYPE_CONFIG[m.material_type].label,
            description: m.description,
            file_url: m.file_url,
            file_name: m.file_name,
            external_url: m.external_url,
            sort_order: idx,
            is_published: m.is_published,
          });
        });
      });

      if (allMaterials.length > 0) {
        const { error: insErr } = await supabase
          .from('unit_stage_materials')
          .insert(allMaterials);
        if (insErr) throw insErr;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadMaterials(); // Refresh with real IDs
    } catch (e) {
      console.error('Error saving:', e);
      setSaveError(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const totalMaterials = STAGES.reduce((acc, s) => acc + materialsByStage[s.id].length, 0);

  if (loading) return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
        <p className="text-muted-foreground">Cargando materiales de la unidad...</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* ── Top bar ── */}
      <div className="border-b border-border bg-card shrink-0 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">✏️ {unitTitle}</h1>
          <p className="text-xs text-muted-foreground">
            Editor de contenido · {totalMaterials} materiales · Al guardar, los estudiantes ven los cambios
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 border border-green-300 rounded-lg px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> ¡Guardado!
            </div>
          )}
          {saveError && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-1.5">
              ⚠️ {saveError}
            </div>
          )}
          <Button
            onClick={save}
            disabled={saving}
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4"
          >
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...</>
              : <><CheckCircle2 className="h-3.5 w-3.5" /> Guardar y Publicar</>
            }
          </Button>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Stages (one open at a time) ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <p className="text-xs text-muted-foreground text-center pb-1">Haz clic en cada Part para expandirla — solo una abierta a la vez</p>
          {STAGES.map((stage) => (
            <StagePanel
              key={stage.id}
              stage={stage}
              unitId={unitId}
              materials={materialsByStage[stage.id]}
              onMaterialsChange={updated => handleStageChange(stage.id, updated)}
              isExpanded={expandedStage === stage.id}
              onToggle={() => setExpandedStage(prev => prev === stage.id ? null : stage.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}