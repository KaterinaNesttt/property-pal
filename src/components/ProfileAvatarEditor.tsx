import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface ProfileAvatarEditorProps {
  avatar: string | null;
  scale: number;
  x: number;
  y: number;
  onSave: (patch: { avatar: string | null; avatarScale: number; avatarX: number; avatarY: number }) => void;
}

const CANVAS_SIZE = 256;
const CIRCLE_RADIUS = 112;
const OUTPUT_SIZE = 512;

const ProfileAvatarEditor = ({ avatar, onSave }: ProfileAvatarEditorProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(avatar);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    if (!imageSrc) {
      setImgLoaded(false);
      imgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const coverSize = CIRCLE_RADIUS * 2;
      const scale = coverSize / Math.min(img.width, img.height);
      setBaseScale(scale);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(true);
    };
    img.src = imageSrc;
    return () => { setImgLoaded(false); };
  }, [imageSrc]);

  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const img = imgRef.current;
    const s = baseScale * zoom;
    const w = img.width * s;
    const h = img.height * s;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dx = cx - w / 2 + offset.x;
    const dy = cy - h / 2 + offset.y;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.drawImage(img, dx, dy, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, w, h);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [imgLoaded, zoom, offset, baseScale]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    });
    setHasChanges(true);
  }, [dragging]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(4, z - e.deltaY * 0.002)));
    setHasChanges(true);
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSave = () => {
    if (!imgRef.current) return;

    const img = imgRef.current;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = OUTPUT_SIZE;
    cropCanvas.height = OUTPUT_SIZE;
    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return;

    const s = baseScale * zoom;
    const w = img.width * s;
    const h = img.height * s;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dx = cx - w / 2 + offset.x;
    const dy = cy - h / 2 + offset.y;

    const srcX = (cx - CIRCLE_RADIUS - dx) / s;
    const srcY = (cy - CIRCLE_RADIUS - dy) / s;
    const srcSize = (CIRCLE_RADIUS * 2) / s;

    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const croppedDataUrl = cropCanvas.toDataURL("image/png", 0.95);

    onSave({
      avatar: croppedDataUrl,
      avatarScale: 1,
      avatarX: 0,
      avatarY: 0,
    });
    setHasChanges(false);
  };

  const handleDelete = () => {
    setImageSrc(null);
    setImgLoaded(false);
    setHasChanges(true);
    onSave({ avatar: null, avatarScale: 1, avatarX: 0, avatarY: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {imageSrc ? (
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className={`rounded-2xl border border-white/10 touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          />
        ) : (
          <button
            className="flex h-64 w-64 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-sm text-slate-400"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            Додати аватарку
          </button>
        )}
      </div>

      {imageSrc && (
        <div className="flex items-center gap-3 px-2">
          <ZoomOut className="h-4 w-4 shrink-0 text-slate-400" />
          <Slider
            value={[zoom]}
            min={0.5}
            max={4}
            step={0.05}
            onValueChange={([v]) => { setZoom(v); setHasChanges(true); }}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" />
        </div>
      )}

      <div className="flex gap-2">
        <button className="glass-button flex-1" onClick={() => inputRef.current?.click()} type="button">
          {imageSrc ? "Змінити фото" : "Завантажити фото"}
        </button>
        {imageSrc && (
          <button className="glass-button text-rose-200" onClick={handleDelete} type="button">
            Видалити
          </button>
        )}
      </div>

      {hasChanges && imageSrc && (
        <div className="flex gap-2">
          <button className="glass-button flex-1 bg-btns/15 text-white" onClick={handleSave} type="button">
            Застосувати
          </button>
          <button
            className="glass-button text-slate-400"
            onClick={() => {
              setImageSrc(avatar);
              setHasChanges(false);
            }}
            type="button"
          >
            Скасувати
          </button>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Перетягни для позиціювання · масштабуй двома пальцями або слайдером
      </p>

      <input accept="image/*" className="hidden" onChange={handleFileChange} ref={inputRef} type="file" />
    </div>
  );
};

export default ProfileAvatarEditor;