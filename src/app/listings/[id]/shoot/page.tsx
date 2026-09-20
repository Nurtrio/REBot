"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ROOM_COACH, ROOM_ORDER } from "@/data/seed";
import { guideForChip } from "@/lib/shoot-guides";
import { useAppStore } from "@/store/app-store";
import type { PhotoFlag, RoomType } from "@/types";

type MotionState = "unknown" | "needs_permission" | "live" | "mock";
type CamState = "idle" | "pending" | "live" | "mock" | "denied";

function isIOSPermissionAPI(): boolean {
  if (typeof window === "undefined") return false;
  const DOE = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      })
    | undefined;
  return typeof DOE?.requestPermission === "function";
}

function grabFrame(
  video: HTMLVideoElement | null,
  cameraMode: CamState,
  room: string,
  chip: string
): string | undefined {
  const canvas = document.createElement("canvas");
  const w = 1280;
  const h = 960;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  if (cameraMode === "live" && video && video.readyState >= 2) {
    const vw = video.videoWidth || w;
    const vh = video.videoHeight || h;
    const scale = Math.max(w / vw, h / vh);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (vw - sw) / 2;
    const sy = (vh - sh) / 2;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#3a342c");
    g.addColorStop(0.5, "#1c1a17");
    g.addColorStop(1, "#0e0d0c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, w - 96, h - 96);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "500 28px system-ui, sans-serif";
    ctx.fillText(room, 64, h - 88);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "400 20px system-ui, sans-serif";
    ctx.fillText(chip.slice(0, 48), 64, h - 52);
  }

  try {
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return undefined;
  }
}

async function attachStream(
  video: HTMLVideoElement,
  stream: MediaStream
): Promise<void> {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    // iOS sometimes needs a second play after metadata
    await new Promise<void>((r) => {
      video.onloadedmetadata = () => {
        void video.play().finally(() => r());
      };
    });
  }
}

export default function ShootPage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useAppStore((s) => s.getListing(id));
  const addPhoto = useAppStore((s) => s.addPhoto);
  const photos = useAppStore((s) => s.getPhotos(id));

  const [room, setRoom] = useState<RoomType>("living");
  const [chipIdx, setChipIdx] = useState(0);
  const [levelDeg, setLevelDeg] = useState(0);
  const [cameraMode, setCameraMode] = useState<CamState>("idle");
  const [motion, setMotion] = useState<MotionState>("unknown");
  const [flash, setFlash] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const levelDegRef = useRef(0);
  const motionLiveRef = useRef(false);
  const orientHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(
    null
  );
  const driftIvRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const coach = ROOM_COACH[room];
  const chip = coach.chips[chipIdx % coach.chips.length];
  const guide = useMemo(() => guideForChip(chip), [chip]);
  const isLevel = Math.abs(levelDeg) < 1.2;

  const stopDrift = useCallback(() => {
    if (driftIvRef.current) {
      clearInterval(driftIvRef.current);
      driftIvRef.current = null;
    }
  }, []);

  const startDrift = useCallback(() => {
    if (driftIvRef.current) return;
    driftIvRef.current = setInterval(() => {
      if (motionLiveRef.current) return;
      setLevelDeg((d) => {
        const next =
          Math.abs(d) > 8 ? d * 0.92 : Math.sin(Date.now() / 1800) * 3.2;
        levelDegRef.current = next;
        return next;
      });
    }, 80);
  }, []);

  const bindOrientation = useCallback(() => {
    if (orientHandlerRef.current) {
      window.removeEventListener(
        "deviceorientation",
        orientHandlerRef.current
      );
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null && e.beta == null) return;
      motionLiveRef.current = true;
      stopDrift();
      setMotion("live");
      // Portrait iPhone: gamma is left/right horizon tilt
      const g = e.gamma ?? 0;
      const next = Math.max(-18, Math.min(18, g));
      levelDegRef.current = next;
      setLevelDeg(next);
    };
    orientHandlerRef.current = onOrient;
    window.addEventListener("deviceorientation", onOrient, true);
  }, [stopDrift]);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setStandalone(mq.matches || nav.standalone === true);

    if (isIOSPermissionAPI()) {
      setMotion("needs_permission");
      startDrift();
    } else if ("DeviceOrientationEvent" in window) {
      bindOrientation();
      startDrift();
      setMotion("mock");
    } else {
      setMotion("mock");
      startDrift();
    }

    return () => {
      stopDrift();
      if (orientHandlerRef.current) {
        window.removeEventListener(
          "deviceorientation",
          orientHandlerRef.current,
          true
        );
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [bindOrientation, startDrift, stopDrift]);

  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMode("mock");
      return false;
    }
    setCameraMode("pending");
    const attempts: MediaStreamConstraints[] = [
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      {
        audio: false,
        video: { facingMode: "environment" },
      },
      { audio: false, video: true },
    ];

    let lastErr: unknown;
    setCamError(null);
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) await attachStream(video, stream);
        setCameraMode("live");
        setCamError(null);
        return true;
      } catch (e) {
        lastErr = e;
      }
    }
    const err = lastErr as DOMException | Error | undefined;
    const name = err && "name" in err ? String(err.name) : "Error";
    const msg = err && "message" in err ? String(err.message) : "getUserMedia failed";
    const hint =
      name === "NotAllowedError"
        ? "Permission denied — Settings → Safari → Camera"
        : name === "NotFoundError"
          ? "No camera found on this device"
          : name === "NotReadableError"
            ? "Camera in use by another app"
            : name === "SecurityError"
              ? "Needs HTTPS / Safari (not an in-app browser)"
              : `${name}: ${msg}`;
    console.warn("camera start failed", name, msg);
    setCamError(hint);
    setCameraMode("denied");
    return false;
  }, []);

  const enableMotion = useCallback(async (): Promise<boolean> => {
    const DOE = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    try {
      if (DOE.requestPermission) {
        const res = await DOE.requestPermission();
        if (res !== "granted") {
          setMotion("mock");
          startDrift();
          return false;
        }
      }
      bindOrientation();
      setMotion("live");
      return true;
    } catch {
      setMotion("mock");
      startDrift();
      return false;
    }
  }, [bindOrientation, startDrift]);

  /** One user gesture — required on iOS Safari for sensors (+ reliable cam). */
  const enableIPhoneCapture = useCallback(async () => {
    await enableMotion();
    await startCamera();
  }, [enableMotion, startCamera]);

  // Non-iOS: auto-start camera; iOS waits for tap
  useEffect(() => {
    if (isIOSPermissionAPI()) return;
    void startCamera();
  }, [startCamera]);

  const capture = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    const deg = levelDegRef.current;
    const flags: PhotoFlag[] =
      Math.abs(deg) < 1.2 ? ["level_ok"] : ["needs_level"];

    const dataUrl = grabFrame(videoRef.current, cameraMode, room, chip);
    addPhoto(id, room, chip, { flags, dataUrl });
    setChipIdx((i) => i + 1);
  }, [addPhoto, id, room, chip, cameraMode]);

  if (!listing) {
    return (
      <main className="px-4 py-8 text-sm text-muted">Listing not found.</main>
    );
  }

  const needsGate =
    motion === "needs_permission" ||
    cameraMode === "idle" ||
    cameraMode === "denied";

  const showVideo = cameraMode === "live" || cameraMode === "pending";

  return (
    <main
      className="fw-shoot-screen fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] flex-col bg-ink text-paper"
      data-standalone={standalone ? "1" : "0"}
    >
      {/* Top chrome — safe area */}
      <div
        className="flex items-center justify-between px-3"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
          paddingBottom: "0.5rem",
        }}
      >
        <Link
          href={`/listings/${id}`}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm active:bg-white/20"
          aria-label="Back"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">
            Shoot
          </p>
          <p className="max-w-[12rem] truncate text-xs text-white/80">
            {listing.address}
          </p>
        </div>
        <Link
          href={`/listings/${id}/review`}
          className="min-h-11 rounded-full bg-white/10 px-3 py-2 text-xs active:bg-white/20"
        >
          Roll ({photos.length})
        </Link>
      </div>

      <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 pb-2 [-webkit-overflow-scrolling:touch]">
        {ROOM_ORDER.map((r) => {
          const active = r === room;
          return (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRoom(r);
                setChipIdx(0);
              }}
              className={`min-h-9 shrink-0 rounded-full px-3 py-2 text-xs capitalize ${
                active ? "bg-paper text-ink" : "bg-white/10 text-white/70"
              }`}
            >
              {ROOM_COACH[r].label}
            </button>
          );
        })}
      </div>

      <div className="relative mx-0 flex-1 overflow-hidden bg-[#12110f] sm:mx-3 sm:rounded-fw">
        {/* Always mount video so ref exists before permission grant */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
            showVideo && cameraMode === "live" ? "opacity-100" : "opacity-0"
          }`}
        />

        {cameraMode !== "live" ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3a342c] via-[#1c1a17] to-[#0e0d0c]">
            <div className="absolute inset-8 border border-white/10" />
            <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] uppercase tracking-[0.16em] text-white/35">
              {cameraMode === "denied"
                ? "Camera blocked · check Safari settings"
                : cameraMode === "pending"
                  ? "Starting camera…"
                  : "Camera preview"}
            </p>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="absolute left-4 right-4 h-px origin-center transition-colors duration-75"
            style={{
              transform: `rotate(${levelDeg}deg)`,
              background: isLevel
                ? "rgba(45,106,79,0.95)"
                : "rgba(255,255,255,0.45)",
            }}
          />
          <div
            className={`absolute h-2.5 w-2.5 rounded-full border-2 transition-colors duration-75 ${
              isLevel
                ? "border-level bg-level"
                : "border-white/70 bg-transparent"
            }`}
            style={{ transform: `translateY(${levelDeg * 1.2}px)` }}
          />
          <span
            className={`absolute top-[42%] rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              isLevel ? "bg-level text-white" : "bg-black/40 text-white/70"
            }`}
          >
            {isLevel ? "Level" : "Leveler"}
          </span>
        </div>

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          key={guide.kind + chip}
        >
          {guide.paths.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="white"
              strokeWidth="0.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {(guide.dashed ?? []).map((d) => (
            <path
              key={`d-${d}`}
              d={d}
              fill="none"
              stroke="white"
              strokeWidth="0.45"
              strokeDasharray="1.5 1.2"
              strokeLinecap="round"
              opacity="0.7"
            />
          ))}
        </svg>

        {needsGate ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/45 px-6 backdrop-blur-[2px]">
            <p className="max-w-[16rem] text-center text-sm leading-snug text-white/90">
              {cameraMode === "denied"
                ? camError ??
                  "Allow Camera in Settings → Safari, then tap retry."
                : "iPhone needs a tap to unlock the camera and leveler."}
            </p>
            <button
              type="button"
              onClick={() => void enableIPhoneCapture()}
              className="min-h-12 rounded-full bg-paper px-6 text-sm font-medium text-ink active:scale-[0.98]"
            >
              {cameraMode === "denied"
                ? "Retry camera & leveler"
                : "Enable camera & leveler"}
            </button>
          </div>
        ) : null}

        {flash ? (
          <div className="pointer-events-none absolute inset-0 bg-white/80" />
        ) : null}
      </div>

      <div className="px-4 py-2">
        <button
          type="button"
          onClick={() => setChipIdx((i) => i + 1)}
          className="w-full rounded-fw border border-white/15 bg-white/10 px-4 py-3 text-left active:bg-white/15"
        >
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
            Coach · {guide.kind} · tap for next
          </p>
          <p className="mt-1 font-display text-lg leading-snug text-paper">
            {chip}
          </p>
        </button>
      </div>

      {/* Shutter row — home indicator safe area */}
      <div
        className="flex items-center justify-center gap-8 px-4 pt-1"
        style={{
          paddingBottom:
            "max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
        }}
      >
        <Link
          href={`/listings/${id}/review`}
          className="flex min-h-11 w-16 items-center justify-center text-center text-xs text-white/50"
        >
          Review
        </Link>
        <button
          type="button"
          onClick={capture}
          aria-label="Capture"
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/80 bg-paper shadow-fw active:scale-95"
        >
          <span className="h-14 w-14 rounded-full bg-paper ring-2 ring-ink/20" />
        </button>
        <div className="flex min-h-11 w-16 items-center justify-center text-center text-xs text-white/50">
          {cameraMode === "live"
            ? motion === "live"
              ? "Live"
              : "Cam"
            : cameraMode === "mock" || cameraMode === "denied"
              ? "Mock"
              : "…"}
        </div>
      </div>
    </main>
  );
}
