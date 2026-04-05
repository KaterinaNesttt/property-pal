import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

interface ProfileAvatarEditorProps {
  avatar: string | null;
  scale: number;
  x: number;
  y: number;
  onSave: (patch: { avatar: string | null; avatarScale: number; avatarX: number; avatarY: number }) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const ProfileAvatarEditor = ({ avatar, scale, x, y, onSave }: ProfileAvatarEditorProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragOriginRef = useRef<{ x: number; y: number; pointerX: number; pointerY: number } | null>(null);
  const pinchOriginRef = useRef<{ distance: number; scale: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState({ avatar, scale, x, y });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setDraft({ avatar, scale, x, y });
    setHasChanges(false);
  }, [avatar, scale, x, y]);

  const previewStyle = useMemo(
    () => ({
      transform: `translate(${draft.x}px, ${draft.y}px) scale(${draft.scale})`,
      transformOrigin: "center center",
    }),
    [draft],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraft({
        avatar: typeof reader.result === "string" ? reader.result : null,
        scale: 1,
        x: 0,
        y: 0,
      });
      setHasChanges(true);
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

    setDraft((current) => ({
      ...current,
      x: origin.x + point.x - origin.pointerX,
      y: origin.y + point.y - origin.pointerY,
    }));
    setHasChanges(true);
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
    setDraft((current) => ({ ...current, scale: nextScale }));
    setHasChanges(true);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!draft.avatar) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 1) {
      dragOriginRef.current = { x: draft.x, y: draft.y, pointerX: point.x, pointerY: point.y };
      setDragging(true);
    }

    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      pinchOriginRef.current = {
        distance: distance(points[0], points[1]),
        scale: draft.scale,
      };
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draft.avatar || !pointersRef.current.has(event.pointerId)) {
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
        {draft.avatar ? (
          <>
            <img
              alt="Avatar preview"
              className="absolute inset-0 h-full w-full select-none object-cover"
              draggable={false}
              src={draft.avatar}
              style={previewStyle}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,6,23,0.85)_46%)]" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
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

      <div className="flex gap-2">
        <button className="glass-button flex-1" onClick={() => inputRef.current?.click()} type="button">
          Змінити фото
        </button>
        {draft.avatar ? (
          <button
            className="glass-button text-rose-200"
            onClick={() => {
              setDraft({ avatar: null, scale: 1, x: 0, y: 0 });
              setHasChanges(true);
            }}
            type="button"
          >
            Видалити
          </button>
        ) : null}
      </div>

      {hasChanges ? (
        <div className="flex gap-2">
          <button
            className="glass-button flex-1 bg-cyan-400/15 text-white"
            onClick={() => {
              onSave({
                avatar: draft.avatar,
                avatarScale: draft.scale,
                avatarX: draft.x,
                avatarY: draft.y,
              });
              setHasChanges(false);
            }}
            type="button"
          >
            Застосувати
          </button>
          <button
            className="glass-button text-slate-400"
            onClick={() => {
              setDraft({ avatar, scale, x, y });
              setHasChanges(false);
            }}
            type="button"
          >
            Скасувати
          </button>
        </div>
      ) : null}

      <p className="text-center text-xs text-slate-400">
        Перетягни фото для позиціювання. На тачскріні масштабуй двома пальцями.
      </p>

      <input accept="image/*" className="hidden" onChange={handleFileChange} ref={inputRef} type="file" />
    </div>
  );
};

export default ProfileAvatarEditor;
