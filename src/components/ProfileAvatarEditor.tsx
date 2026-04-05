import { ChangeEvent, PointerEvent, useMemo, useRef, useState } from "react";

interface ProfileAvatarEditorProps {
  avatar: string | null;
  scale: number;
  x: number;
  y: number;
  onChange: (patch: { avatar?: string | null; avatarScale?: number; avatarX?: number; avatarY?: number }) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const ProfileAvatarEditor = ({ avatar, scale, x, y, onChange }: ProfileAvatarEditorProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragOriginRef = useRef<{ x: number; y: number; pointerX: number; pointerY: number } | null>(null);
  const pinchOriginRef = useRef<{ distance: number; scale: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const previewStyle = useMemo(
    () => ({
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      transformOrigin: "center center",
    }),
    [scale, x, y],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        avatar: typeof reader.result === "string" ? reader.result : null,
        avatarScale: 1,
        avatarX: 0,
        avatarY: 0,
      });
    };
    reader.readAsDataURL(file);
  };

  const updateSinglePointerDrag = (pointerId: number, point: { x: number; y: number }) => {
    const pointers = pointersRef.current;
    if (pointers.size !== 1) {
      return;
    }

    const origin = dragOriginRef.current;
    if (!origin || !pointers.has(pointerId)) {
      return;
    }

    onChange({
      avatarX: origin.x + point.x - origin.pointerX,
      avatarY: origin.y + point.y - origin.pointerY,
    });
  };

  const updatePinch = () => {
    const points = [...pointersRef.current.values()];
    if (points.length !== 2) {
      return;
    }

    const start = pinchOriginRef.current;
    if (!start) {
      return;
    }

    const nextScale = clamp((distance(points[0], points[1]) / start.distance) * start.scale, 1, 3);
    onChange({ avatarScale: nextScale });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!avatar) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 1) {
      dragOriginRef.current = { x, y, pointerX: point.x, pointerY: point.y };
      setDragging(true);
    }

    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      pinchOriginRef.current = {
        distance: distance(points[0], points[1]),
        scale,
      };
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!avatar || !pointersRef.current.has(event.pointerId)) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 1) {
      updateSinglePointerDrag(event.pointerId, point);
      return;
    }

    if (pointersRef.current.size === 2) {
      updatePinch();
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchOriginRef.current = null;
    }
    if (!pointersRef.current.size) {
      dragOriginRef.current = null;
      setDragging(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative mx-auto h-56 w-56 overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 ${avatar ? "touch-none" : ""} ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {avatar ? (
          <>
            <img
              alt="Avatar preview"
              className="absolute inset-0 h-full w-full select-none object-cover"
              draggable={false}
              src={avatar}
              style={previewStyle}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(2,6,23,0.78)_39%)]" />
            <div className="pointer-events-none absolute inset-6 rounded-full border border-white/30" />
          </>
        ) : (
          <button
            className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-slate-300"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            Додати аватарку
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button className="glass-button" onClick={() => inputRef.current?.click()} type="button">
          Завантажити фото
        </button>
        {avatar ? (
          <button
            className="glass-button text-rose-200"
            onClick={() => onChange({ avatar: null, avatarScale: 1, avatarX: 0, avatarY: 0 })}
            type="button"
          >
            Видалити
          </button>
        ) : null}
      </div>

      <p className="text-center text-xs text-slate-400">
        Перетягни фото для позиціювання. На тачскріні масштабуй двома пальцями.
      </p>

      <input accept="image/*" className="hidden" onChange={handleFileChange} ref={inputRef} type="file" />
    </div>
  );
};

export default ProfileAvatarEditor;
