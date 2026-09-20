"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ROOM_COACH, ROOM_ORDER } from "@/data/seed";
import { useAppStore } from "@/store/app-store";
import type { RoomType } from "@/types";

export default function ShootPage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useAppStore((s) => s.getListing(id));
  const addPhoto = useAppStore((s) => s.addPhoto);
  const photos = useAppStore((s) => s.getPhotos(id));

  const [room, setRoom] = useState<RoomType>("living");
  const [chipIdx, setChipIdx] = useState(0);
  const [levelDeg, setLevelDeg] = useState(0);
  const [cameraMode, setCameraMode] = useState<"live" | "mock" | "pending">(
    "pending"
  );
  const [flash, setFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const coach = ROOM_COACH[room];
  const chip = coach.chips[chipIdx % coach.chips.length];
  const isLevel = Math.abs(levelDeg) < 1.2;

  // Device orientation / mock drift for leveler
  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      // gamma ≈ left-right tilt for portrait
      const g = e.gamma ?? 0;
      setLevelDeg(Math.max(-15, Math.min(15, g)));
    };

    if (
      typeof window !== "undefined" &&
      "DeviceOrientationEvent" in window
    ) {
      window.addEventListener("deviceorientation", onOrient);
    }

    // Gentle mock drift when no motion events (desktop / denied)
    const iv = setInterval(() => {
      setLevelDeg((d) => {
        // only drift if roughly idle
        if (Math.abs(d) > 8) return d * 0.92;
        return Math.sin(Date.now() / 1800) * 3.2;
      });
    }, 80);

    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function startCam() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMode("mock");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraMode("live");
      } catch {
        setCameraMode("mock");
      }
    }
    startCam();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    addPhoto(id, room, chip);
    setChipIdx((i) => i + 1);
  }, [addPhoto, id, room, chip]);

  if (!listing) {
    return (
      <main className="px-4 py-8 text-sm text-muted">Listing not found.</main>
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col bg-ink text-paper">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-3">
        <Link
          href={`/listings/${id}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm"
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
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs"
        >
          Roll ({photos.length})
        </Link>
      </div>

      {/* Room rail */}
      <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 pb-2">
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
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs capitalize ${
                active
                  ? "bg-paper text-ink"
                  : "bg-white/10 text-white/70"
              }`}
            >
              {ROOM_COACH[r].label}
            </button>
          );
        })}
      </div>

      {/* Camera viewfinder */}
      <div className="relative mx-3 flex-1 overflow-hidden rounded-fw bg-[#12110f]">
        {cameraMode === "live" || cameraMode === "pending" ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover ${
              cameraMode === "pending" ? "opacity-0" : "opacity-100"
            }`}
          />
        ) : null}

        {cameraMode === "mock" ? (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3a342c] via-[#1c1a17] to-[#0e0d0c]">
            <div className="absolute inset-8 border border-white/10" />
            <div className="absolute left-1/2 top-1/2 h-24 w-40 -translate-x-1/2 -translate-y-1/2 border border-dashed border-white/20" />
            <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] uppercase tracking-[0.16em] text-white/35">
              Camera preview · elegant mock
            </p>
          </div>
        ) : null}

        {/* Horizon LEVELER */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="absolute left-4 right-4 h-px origin-center transition-colors"
            style={{
              transform: `rotate(${levelDeg}deg)`,
              background: isLevel
                ? "rgba(45,106,79,0.95)"
                : "rgba(255,255,255,0.45)",
            }}
          />
          <div
            className={`absolute h-2.5 w-2.5 rounded-full border-2 transition-colors ${
              isLevel
                ? "border-level bg-level"
                : "border-white/70 bg-transparent"
            }`}
            style={{ transform: `translateY(${levelDeg * 1.2}px)` }}
          />
          <span
            className={`absolute top-[42%] rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              isLevel
                ? "bg-level text-white"
                : "bg-black/40 text-white/70"
            }`}
          >
            {isLevel ? "Level" : "Leveler"}
          </span>
        </div>

        {/* Corner guide silhouette */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d="M12 28 L12 12 L28 12"
            fill="none"
            stroke="white"
            strokeWidth="0.6"
          />
          <path
            d="M88 28 L88 12 L72 12"
            fill="none"
            stroke="white"
            strokeWidth="0.6"
          />
          <path
            d="M12 72 L12 88 L28 88"
            fill="none"
            stroke="white"
            strokeWidth="0.6"
          />
          <path
            d="M88 72 L88 88 L72 88"
            fill="none"
            stroke="white"
            strokeWidth="0.6"
          />
        </svg>

        {flash ? (
          <div className="absolute inset-0 bg-white/80 transition-opacity" />
        ) : null}
      </div>

      {/* Coach chip */}
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => setChipIdx((i) => i + 1)}
          className="w-full rounded-fw border border-white/15 bg-white/10 px-4 py-3 text-left"
        >
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
            Coach · tap for next
          </p>
          <p className="mt-1 font-display text-lg leading-snug text-paper">
            {chip}
          </p>
        </button>
      </div>

      {/* Shutter */}
      <div className="flex items-center justify-center gap-8 px-4 pb-8 pt-1">
        <Link
          href={`/listings/${id}/review`}
          className="w-16 text-center text-xs text-white/50"
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
        <div className="w-16 text-center text-xs text-white/50">
          {cameraMode === "live" ? "Live" : cameraMode === "mock" ? "Mock" : "…"}
        </div>
      </div>
    </main>
  );
}
