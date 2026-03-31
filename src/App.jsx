import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import Login, { PasswordResetScreen } from "./Login";

// ─── Data ─────────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = ["Speeches", "Brainrot", "Other"];

const INITIAL_BRIEF = { deadline: "", quantity: "", looking_for: "", specific_clips: "", notes: "" };
const INITIAL_GUIDELINES = { overview: "", style: "", dos: "", donts: "", notes: "" };
const INITIAL_AGREEMENT = { enabled: false, title: "Clipper Team Agreement", body: "" };

// ─── Email template ────────────────────────────────────────────────────────────

function buildClipEmail({ clipTitle, isRevision, revisionNote, appUrl }) {
  const accentColor = isRevision ? "#f97316" : "#ffffff";
  const label = isRevision ? "Revision Requested" : "Clip Approved";
  const message = isRevision
    ? "Your creator has requested changes to the following clip."
    : "Your creator has approved the following clip. Nice work!";

  const noteBlock = isRevision && revisionNote ? `
    <div style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:16px 18px;margin-top:20px;">
      <div style="font-size:11px;font-weight:700;color:#525252;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Creator's Note</div>
      <div style="font-size:13px;color:#a3a3a3;line-height:1.7;font-style:italic;">&ldquo;${revisionNote.replace(/"/g, "&quot;")}&rdquo;</div>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="margin-bottom:32px;">
      <span style="font-size:16px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;">ClipFlow</span>
    </div>

    <!-- Card -->
    <div style="background:#0a0a0a;border:1px solid #1f1f1f;border-radius:12px;padding:32px;">
      <div style="font-size:11px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">${label}</div>
      <div style="font-size:22px;font-weight:800;color:#e5e5e5;letter-spacing:-0.02em;margin-bottom:10px;">${clipTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      <div style="font-size:13px;color:#737373;line-height:1.6;">${message}</div>
      ${noteBlock}
      <div style="margin-top:28px;">
        <a href="${appUrl}" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;padding:11px 22px;border-radius:7px;font-size:13px;font-weight:800;">Open ClipFlow &rarr;</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:28px;font-size:11px;color:#404040;text-align:center;line-height:1.6;">
      You're receiving this because you're a clipper on this workspace.<br>
      Log in to ClipFlow to view and respond.
    </div>

  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────

const statusConfig = {
  pending:   { label: "Pending",  color: "#f59e0b", bg: "rgba(245,158,11,0.2)",   dot: "#f59e0b",  border: "#f59e0b" },
  finalized: { label: "Approved", color: "#22c55e", bg: "rgba(34,197,94,0.2)",    dot: "#22c55e",  border: "#22c55e" },
  revision:  { label: "Revision", color: "#f97316", bg: "rgba(249,115,22,0.25)",  dot: "#f97316",  border: "#f97316" },
  discard:   { label: "Discard",  color: "#9ca3af", bg: "rgba(107,114,128,0.2)",  dot: "#6b7280",  border: "#6b7280" },
};

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Shared Components ────────────────────────────────────────────────────────

// ─── Skeleton / loading primitives ───────────────────────────────────────────

const SKL_STYLE = `
  @keyframes skelPulse { 0%,100%{opacity:.45} 50%{opacity:.9} }
  @keyframes logoPulse { 0%,100%{opacity:.3} 50%{opacity:1} }
  .skel { background:#1a1a1a; border-radius:5px; animation:skelPulse 1.6s ease-in-out infinite; }
`;

function Skel({ w = "100%", h = 14, r = 5, style = {} }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

function SessionSidebarSkeleton() {
  return (
    <>
      {[80, 65, 75, 55].map((pct, i) => (
        <div key={i} style={{ padding: "10px 20px 12px", borderLeft: "2px solid transparent" }}>
          <Skel w={`${pct}%`} h={9} style={{ marginBottom: 6 }} />
          <Skel w="40%" h={7} style={{ marginBottom: 8 }} />
          <Skel w="100%" h={3} r={99} />
        </div>
      ))}
    </>
  );
}

function ClipGridSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, overflow: "hidden" }}>
          <Skel w="100%" h={96} r={0} style={{ animation: "none", background: "#141414" }} />
          <div style={{ padding: "9px 10px" }}>
            <Skel w="75%" h={9} style={{ marginBottom: 7 }} />
            <Skel w="45%" h={7} style={{ marginBottom: 8 }} />
            <Skel w="55%" h={18} r={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {[85, 70, 90, 60, 78, 65].map((pct, i) => (
        <div key={i} style={{ display: "flex", gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: i < 5 ? "1px solid #2a2a2a" : "none" }}>
          <Skel w={28} h={28} r={99} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skel w={`${pct}%`} h={10} style={{ marginBottom: 8 }} />
            <Skel w="35%" h={8} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamStatsSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[0, 1].map(i => (
        <div key={i} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Skel w={32} h={32} r={99} />
              <Skel w={110} h={12} />
            </div>
            <Skel w={80} h={10} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            {[0,1,2,3].map(j => (
              <div key={j} style={{ background: "#111", borderRadius: 7, padding: "8px 10px" }}>
                <Skel w="50%" h={22} style={{ marginBottom: 6 }} />
                <Skel w="70%" h={8} />
              </div>
            ))}
          </div>
          <Skel w="100%" h={4} r={99} />
        </div>
      ))}
    </div>
  );
}

function LoadError({ onRetry }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0", color: "#9ca3af" }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Couldn't load data</div>
      <button
        onClick={onRetry}
        style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#a3a3a3", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
      >
        Retry
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusConfig[status].dot, display: "inline-block", flexShrink: 0 }} />;
}

function StatusBadge({ status }) {
  const c = statusConfig[status];
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: "2px 9px", borderRadius: 4, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {c.label}
    </span>
  );
}

function VideoThumb({ title, duration, fileUrl }) {
  const [thumbSrc, setThumbSrc] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.src = fileUrl;
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(1, video.duration / 2);
    });
    video.addEventListener("seeked", () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbSrc(canvas.toDataURL("image/jpeg", 0.8));
      } catch (_) {}
      video.src = "";
    });
    return () => { cancelled = true; video.src = ""; };
  }, [fileUrl]);

  const initials = title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{ width: "100%", aspectRatio: "16/9", background: "#141414", border: "1px solid #262626", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {thumbSrc
        ? <img src={thumbSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1f1f1f", border: "1px solid #303030", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#9ca3af", fontFamily: "monospace" }}>{initials}</div>
      }
      <div style={{ position: "absolute", bottom: 5, right: 6, background: "rgba(0,0,0,0.8)", color: "#a3a3a3", fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 3 }}>{duration}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 12px", color: "#e5e5e5", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 12px", color: "#e5e5e5", fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function Btn({ children, onClick, variant = "ghost", style = {}, disabled = false }) {
  const [hovered, setHovered] = useState(false);
  const base = {
    primary: { background: "#fff", color: "#000", border: "1px solid #fff" },
    ghost:   { background: hovered ? "#252525" : "#1a1a1a", color: hovered ? "#ffffff" : "#d4d4d4", border: `1px solid ${hovered ? "#777777" : "#555555"}` },
    danger:  { background: hovered ? "#252525" : "#1a1a1a", color: hovered ? "#ffffff" : "#d4d4d4", border: `1px solid ${hovered ? "#777777" : "#555555"}` },
    success: { background: "#fff", color: "#000", border: "1px solid #fff" },
    warning: { background: hovered ? "rgba(249,115,22,0.22)" : "rgba(249,115,22,0.12)", color: "#f97316", border: "1px solid rgba(249,115,22,0.5)" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base[variant], borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s", opacity: disabled ? 0.5 : 1, ...style }}
    >
      {children}
    </button>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function ClipDetailModal({ clip, sessions, onClose, onResubmit }) {
  const sc = statusConfig[clip.status] || statusConfig.pending;
  const videoRef = useRef(null);
  const [creatorNotes, setCreatorNotes] = useState([]);

  useEffect(() => {
    supabase
      .from("clip_comments")
      .select("*")
      .eq("clip_id", clip.id)
      .order("timestamp_seconds", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) { console.error("[ClipDetailModal] failed to load comments:", error); return; }
        setCreatorNotes(data || []);
      });
  }, [clip.id]);

  const seekTo = (seconds) => {
    if (videoRef.current) videoRef.current.currentTime = seconds;
  };

  return (
    <div className="cf-modal-outer" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cf-modal-inner" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #2a2a2a" }}>
          <div style={{ fontWeight: 800, color: "#e5e5e5", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>{clip.title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>✕</button>
        </div>

        {/* Video player */}
        <div style={{ padding: "16px 20px 0" }}>
          {clip.fileUrl ? (
            <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <video ref={videoRef} key={clip.id} src={clip.fileUrl} controls style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
            </div>
          ) : (
            <VideoThumb title={clip.title} duration={clip.duration} fileUrl={clip.fileUrl} />
          )}

          {/* Status */}
          <div style={{ marginBottom: 14 }}>
            <StatusBadge status={clip.status} />
          </div>

          {/* Revision note */}
          {clip.status === "revision" && clip.revisionNote && (
            <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Creator's Note</div>
              <div style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.65, fontStyle: "italic" }}>"{clip.revisionNote}"</div>
            </div>
          )}

          {/* Creator Notes (timestamped comments) */}
          {creatorNotes.length > 0 && (
            <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Creator Notes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {creatorNotes.map(c => (
                  <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    {c.timestamp_label ? (
                      <button
                        onClick={() => seekTo(c.timestamp_seconds)}
                        title={`Seek to ${c.timestamp_label}`}
                        style={{ flexShrink: 0, background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: 4, color: "#d4d4d4", fontSize: 11, fontWeight: 800, padding: "2px 6px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}
                      >
                        {c.timestamp_label}
                      </button>
                    ) : (
                      <div style={{ width: 6, marginTop: 5, flexShrink: 0, height: 6, borderRadius: "50%", background: "#3a3a3a" }} />
                    )}
                    <div style={{ fontSize: 12, color: "#a3a3a3", lineHeight: 1.5 }}>{c.comment}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px", marginBottom: 16 }}>
            {[
              ["Session", clip.sessionTitle || "—"],
              ["Category", clip.category || "—"],
              ["Duration", clip.duration || "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#a3a3a3" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Submission fields */}
          {(clip.captions || clip.sound || clip.notes) && (
            <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {clip.captions && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Captions</div>
                  <div style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.6 }}>{clip.captions}</div>
                </div>
              )}
              {clip.sound && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Sound</div>
                  <div style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.6 }}>{clip.sound}</div>
                </div>
              )}
              {clip.notes && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.6 }}>{clip.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Resubmit */}
          {clip.status === "revision" && (
            <div style={{ paddingBottom: 20 }}>
              <Btn onClick={onResubmit} variant="warning" style={{ width: "100%", padding: "10px" }}>↩ Resubmit New Version</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadModal({ categories, sessions, onClose, onSubmit, defaultSessionId, defaultCategory, defaultTitle = "", defaultCaptions = "", defaultSound = "", defaultNotes = "", resubmitClipId = null, resubmitOldFileUrl = null }) {
  const [sessionId, setSessionId] = useState(defaultSessionId || sessions[0]?.id || "");
  const [category, setCategory] = useState(defaultCategory || categories[0] || "");
  const [title, setTitle] = useState(defaultTitle);
  const [captions, setCaptions] = useState(defaultCaptions);
  const [sound, setSound] = useState(defaultSound);
  const [notes, setNotes] = useState(defaultNotes);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith("video/")) return;
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !file) return;
    setUploading(true);
    setError("");
    setProgress(0);
    try {
      await onSubmit({ file, sessionId, category, title: title.trim(), captions, sound, notes, clipId: resubmitClipId, oldFileUrl: resubmitOldFileUrl }, setProgress);
      setProgress(100);
      setDone(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="cf-modal-outer" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={uploading ? undefined : onClose}>
      <div className="cf-modal-inner" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "28px", width: 480, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#e5e5e5", letterSpacing: "-0.02em" }}>{resubmitClipId ? "Resubmit Clip" : "Upload Clip"}</div>
          {!uploading && <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>}
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>✓</div>
            <div style={{ color: "#e5e5e5", fontWeight: 700, fontSize: 15 }}>{resubmitClipId ? "Clip resubmitted!" : "Clip uploaded!"}</div>
          </div>
        ) : (
          <>
            {/* File drop zone */}
            <div
              onClick={() => !uploading && fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              style={{ border: `1px dashed ${file ? "#525252" : "#262626"}`, borderRadius: 8, padding: "24px", textAlign: "center", cursor: uploading ? "default" : "pointer", marginBottom: 20, background: "#0d0d0d" }}
            >
              <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleFileChange} />
              {uploading ? (
                <div>
                  <div style={{ color: "#a3a3a3", fontSize: 13, marginBottom: 12 }}>Uploading {file?.name}…</div>
                  <div style={{ height: 4, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "#fff", borderRadius: 99, transition: "width 0.2s ease" }} />
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 8 }}>{progress}%</div>
                </div>
              ) : file ? (
                <>
                  <div style={{ color: "#a3a3a3", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{file.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: 11 }}>{(file.size / 1024 / 1024).toFixed(1)} MB — click to change</div>
                </>
              ) : (
                <>
                  <div style={{ color: "#9ca3af", fontSize: 24, marginBottom: 8 }}>↑</div>
                  <div style={{ color: "#a3a3a3", fontSize: 13, fontWeight: 600 }}>Click or drop video file</div>
                  <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>MP4, MOV — up to 2GB</div>
                </>
              )}
            </div>

            <Input label="Clip Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hormozi on Work Ethic" />

            {/* Video & Category */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Video</div>
                <select value={sessionId} onChange={e => setSessionId(e.target.value)} style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 10px", color: "#e5e5e5", fontSize: 12, outline: "none", fontFamily: "inherit" }}>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.date} — {s.title}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Folder</div>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 10px", color: "#e5e5e5", fontSize: 12, outline: "none", fontFamily: "inherit" }}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Footage link for selected session */}
            {(() => {
              const sel = sessions.find(s => s.id === sessionId);
              const url = sel?.footageUrl;
              if (!url || !(url.startsWith("http://") || url.startsWith("https://"))) return null;
              return (
                <div style={{ marginBottom: 14, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 7, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Source Footage</div>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, color: "#a3a3a3", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                    <span>Open in Drive</span><span style={{ fontSize: 14 }}>↗</span>
                  </a>
                </div>
              );
            })()}

            <Textarea label="Recommended Captions (optional)" value={captions} onChange={e => setCaptions(e.target.value)} placeholder="Paste suggested caption text or a key quote from the clip..." rows={2} />
            <Input label="Recommended Sound (optional)" value={sound} onChange={e => setSound(e.target.value)} placeholder="e.g. Phonk drift beat, Lo-fi hip hop, no sound needed..." />
            <Textarea label="Additional Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Strong hook at 0:08, best part is around 0:22, etc..." rows={2} />

            {error && (
              <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 6, fontSize: 12, color: "#f97316" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={uploading || !file || !title.trim()}
              style={{ width: "100%", padding: "11px", background: (uploading || !file || !title.trim()) ? "#111" : "#fff", color: (uploading || !file || !title.trim()) ? "#404040" : "#000", border: `1px solid ${(uploading || !file || !title.trim()) ? "#1f1f1f" : "#fff"}`, borderRadius: 7, fontSize: 13, fontWeight: 800, cursor: (uploading || !file || !title.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            >
              {uploading ? `Uploading… ${progress}%` : resubmitClipId ? "Resubmit Clip" : "Submit Clip"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Category Manager Modal ───────────────────────────────────────────────────

// ─── Onboarding ───────────────────────────────────────────────────────────────

const DEFAULT_ONBOARDING_AGREEMENT = `Welcome to the team! By joining this workspace as a clipper, you agree to:

• Only submit clips from footage provided in this workspace
• Follow the creator's style and formatting guidelines for every clip
• Keep workspace content, footage, and invite links strictly confidential
• Respond to revision requests within 48 hours
• Maintain respectful communication with the creator and team`;

function OnboardingModal({ initialWorkspaceName, workspaceId, onSaveName, onSaveAgreement, onSaveGuidelines, onComplete }) {
  const TOTAL = 4;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [wsName, setWsName] = useState(initialWorkspaceName || "My Workspace");

  // Step 2
  const [agreementBody, setAgreementBody] = useState(DEFAULT_ONBOARDING_AGREEMENT);

  // Step 3
  const [style, setStyle] = useState("");
  const [dos, setDos] = useState("");
  const [donts, setDonts] = useState("");

  // Step 4
  const inviteUrl = `${window.location.origin}${window.location.pathname}?workspace_id=${workspaceId}`;
  const [copied, setCopied] = useState(false);

  const advance = async (skip = false) => {
    if (!skip) {
      setSaving(true);
      try {
        if (step === 1 && wsName.trim()) await onSaveName(wsName.trim());
        else if (step === 2 && agreementBody.trim()) await onSaveAgreement({ enabled: true, title: "Clipper Team Agreement", body: agreementBody.trim() });
        else if (step === 3 && (style.trim() || dos.trim() || donts.trim())) await onSaveGuidelines({ overview: "", style: style.trim(), dos: dos.trim(), donts: donts.trim(), notes: "" });
      } catch (e) {
        console.error("[onboarding] save error:", e);
      }
      setSaving(false);
    }
    if (step === TOTAL) { onComplete(); return; }
    setStep(s => s + 1);
  };

  const STEPS = [
    { title: "Name your workspace",      sub: "Give your workspace a name your team will recognize." },
    { title: "Write your Team Agreement",sub: "Set expectations with your clippers from day one." },
    { title: "Set Clipping Guidelines",  sub: "Tell your clippers exactly what you're looking for." },
    { title: "Invite your first clipper",sub: "Share this link to bring your first clipper onboard." },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: "36px 36px 28px" }}>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: i < step ? "#fff" : "#1f1f1f", borderRadius: 99, transition: "background 0.3s" }} />
          ))}
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginLeft: 6, whiteSpace: "nowrap" }}>{step} / {TOTAL}</span>
        </div>

        {/* Welcome badge — step 1 only */}
        {step === 1 && (
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Welcome to ClipFlow</div>
        )}

        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>{STEPS[step - 1].title}</h2>
        <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 28px", lineHeight: 1.6 }}>{STEPS[step - 1].sub}</p>

        {/* ── Step 1: workspace name ── */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>Workspace name</div>
            <input
              autoFocus
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && advance()}
              placeholder="e.g. My Creator Studio"
              style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 7, padding: "11px 13px", color: "#e5e5e5", fontSize: 15, fontWeight: 700, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </>
        )}

        {/* ── Step 2: team agreement ── */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>Agreement text</div>
            <textarea
              value={agreementBody}
              onChange={e => setAgreementBody(e.target.value)}
              rows={10}
              style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 7, padding: "11px 13px", color: "#a3a3a3", fontSize: 13, lineHeight: 1.75, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, lineHeight: 1.5 }}>
              Clippers must accept this before accessing the workspace. You can edit it later under the Team Agreement tab.
            </div>
          </>
        )}

        {/* ── Step 3: clipping guidelines ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["Style", "What's your video style? (e.g. fast-paced, punchy, educational)", style, setStyle],
              ["Do's", "What should clippers always include or prioritize?", dos, setDos],
              ["Don'ts", "What should clippers avoid?", donts, setDonts],
            ].map(([label, placeholder, val, setter]) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>{label}</div>
                <textarea
                  value={val}
                  onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 7, padding: "11px 13px", color: "#a3a3a3", fontSize: 13, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>You can add more detail later under the Clipping Guidelines tab.</div>
          </div>
        )}

        {/* ── Step 4: invite link ── */}
        {step === 4 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>Clipper invite link</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                readOnly
                value={inviteUrl}
                style={{ flex: 1, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 7, padding: "10px 13px", color: "#9ca3af", fontSize: 12, fontFamily: "monospace", outline: "none", minWidth: 0, boxSizing: "border-box" }}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
                style={{ flexShrink: 0, background: copied ? "#141414" : "#fff", color: copied ? "#a3a3a3" : "#000", border: `1px solid ${copied ? "#333" : "#fff"}`, borderRadius: 7, padding: "10px 18px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap" }}
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
              Anyone with this link can join as a clipper. You can also find it any time under the <strong style={{ color: "#9ca3af" }}>Team</strong> tab.
            </div>
          </>
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32 }}>
          <button
            onClick={() => advance(true)}
            style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "8px 0" }}
          >
            {step === TOTAL ? "Skip" : "Skip this step"}
          </button>
          <button
            onClick={() => advance(false)}
            disabled={saving}
            style={{ background: saving ? "#111" : "#fff", color: saving ? "#404040" : "#000", border: `1px solid ${saving ? "#1f1f1f" : "#fff"}`, borderRadius: 7, padding: "12px 26px", fontSize: 13, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
          >
            {saving ? "Saving…" : step === TOTAL ? "Go to my workspace →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function CategoryManager({ categories, setCategories, onClose }) {
  const [newName, setNewName] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    const t = newName.trim();
    if (!t) return;
    if (categories.map(c => c.toLowerCase()).includes(t.toLowerCase())) return setError("Already exists.");
    setCategories(p => [...p, t]);
    setNewName(""); setError("");
  };

  const del = (i) => { if (categories.length > 1) setCategories(p => p.filter((_, x) => x !== i)); };

  const save = (i) => {
    const t = editVal.trim();
    if (!t) return;
    if (categories.filter((_, x) => x !== i).map(c => c.toLowerCase()).includes(t.toLowerCase())) return setError("Already exists.");
    setCategories(p => p.map((c, x) => x === i ? t : c));
    setEditIdx(null); setError("");
  };

  return (
    <div className="cf-modal-outer" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div className="cf-modal-inner" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "24px", width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e5e5e5" }}>Manage Folders</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: error ? 6 : 14 }}>
          <input value={newName} onChange={e => { setNewName(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && add()} placeholder="New folder name..." style={{ flex: 1, background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "8px 11px", color: "#e5e5e5", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          <Btn onClick={add} variant="primary">Add</Btn>
        </div>
        {error && <div style={{ color: "#f97316", fontSize: 11, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {categories.map((cat, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid #2a2a2a", borderRadius: 7, padding: "8px 12px" }}>
              {editIdx === i ? (
                <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") save(i); if (e.key === "Escape") setEditIdx(null); }} style={{ flex: 1, background: "#1a1a1a", border: "1px solid #303030", borderRadius: 5, padding: "3px 8px", color: "#e5e5e5", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              ) : (
                <span style={{ flex: 1, color: "#a3a3a3", fontSize: 13, fontWeight: 600 }}>{cat}</span>
              )}
              {editIdx === i ? (
                <>
                  <Btn onClick={() => save(i)} variant="primary" style={{ padding: "4px 10px", fontSize: 11 }}>Save</Btn>
                  <Btn onClick={() => setEditIdx(null)} variant="ghost" style={{ padding: "4px 8px", fontSize: 11 }}>Cancel</Btn>
                </>
              ) : (
                <>
                  <Btn onClick={() => { setEditIdx(i); setEditVal(cat); }} variant="ghost" style={{ padding: "4px 10px", fontSize: 11 }}>Rename</Btn>
                  <Btn onClick={() => del(i)} variant="ghost" style={{ padding: "4px 8px", fontSize: 11, color: categories.length <= 1 ? "#303030" : "#525252", cursor: categories.length <= 1 ? "not-allowed" : "pointer" }}>✕</Btn>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #2a2a2a", marginTop: 16, paddingTop: 14 }}>
          <Btn onClick={onClose} variant="primary" style={{ width: "100%", padding: "10px" }}>Done</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── New Workspace Modal ──────────────────────────────────────────────────────

function NewWorkspaceModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim());
    setLoading(false);
    onClose();
  };

  return (
    <div className="cf-modal-outer" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={loading ? undefined : onClose}>
      <div className="cf-modal-inner" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "24px", width: 380, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e5e5e5" }}>New Workspace</div>
          {!loading && <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>×</button>}
        </div>
        <Input label="Workspace Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Podcast, Brand Channel..." />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Btn onClick={onClose} variant="ghost" style={{ flex: 1, padding: "10px" }} disabled={loading}>Cancel</Btn>
          <Btn
            onClick={handleCreate}
            variant="primary"
            style={{ flex: 1, padding: "10px" }}
            disabled={loading || !name.trim()}
          >
            {loading ? "Creating…" : "Create Workspace"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── New Session Modal ────────────────────────────────────────────────────────

function NewSessionModal({ onClose, onAdd }) {
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");

  return (
    <div className="cf-modal-outer" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div className="cf-modal-inner" style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "24px", width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e5e5e5" }}>New Video Session</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <Input label="Date" value={date} onChange={e => setDate(e.target.value)} placeholder="e.g. Apr 2, 2025" />
        <Input label="Title / Guest" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Guest — Andrew Huberman" />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Btn onClick={onClose} variant="ghost" style={{ flex: 1, padding: "10px" }}>Cancel</Btn>
          <Btn onClick={() => { if (date.trim() && title.trim()) { onAdd(date.trim(), title.trim()); onClose(); } }} variant="primary" style={{ flex: 1, padding: "10px" }}>Create Session</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Creator Brief Editor ─────────────────────────────────────────────────────

function BriefView({ brief, setBrief, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(brief);

  const save = () => { setBrief(draft); setEditing(false); };
  const cancel = () => { setDraft(brief); setEditing(false); };

  const fields = [
    { key: "deadline", label: "Upload Deadline", placeholder: "e.g. Every Friday by 11:59 PM EST" },
    { key: "quantity", label: "Clips Per Video", placeholder: "e.g. 8–12 clips per video" },
    { key: "looking_for", label: "What We're Looking For", placeholder: "Describe the style, energy, and type of clips...", multi: true },
    { key: "specific_clips", label: "Specific Clips Wanted", placeholder: "List any specific moments, topics, or timestamps you want clipped for this video...", multi: true },
    { key: "notes", label: "Additional Notes", placeholder: "Anything else clippers should know...", multi: true },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>Video Brief</h1>
          <p style={{ color: "#a3a3a3", margin: "5px 0 0", fontSize: 13 }}>{readOnly ? "Instructions for this video from your creator" : "Set per-video expectations for your clip team"}</p>
        </div>
        {!readOnly && !editing && <Btn onClick={() => { setDraft(brief); setEditing(true); }} variant="ghost">Edit Brief</Btn>}
        {!readOnly && editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={cancel} variant="ghost">Cancel</Btn>
            <Btn onClick={save} variant="primary">Save</Btn>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {fields.map((f, i) => (
          <div key={f.key} style={{ borderTop: i === 0 ? "1px solid #2a2a2a" : "none", borderBottom: "1px solid #2a2a2a", padding: "20px 0", display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "start" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2 }}>{f.label}</div>
            {editing ? (
              f.multi
                ? <textarea value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} style={{ background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "8px 10px", color: "#e5e5e5", fontSize: 14, resize: "vertical", fontFamily: "inherit", outline: "none" }} />
                : <input value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "8px 10px", color: "#e5e5e5", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            ) : (
              <div style={{ fontSize: 14, color: brief[f.key] ? "#d4d4d4" : "#6b7280", lineHeight: 1.7 }}>{brief[f.key] || (readOnly ? "Not set" : "Not set — click Edit Brief to add")}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Agreement Gate (clipper must sign before accessing content) ──────────────

function AgreementGate({ agreement, onSign }) {
  const [name, setName] = useState("");
  const [checked, setChecked] = useState(false);
  const [signed, setSigned] = useState(false);

  const canSign = name.trim().length > 1 && checked;

  const handleSign = () => {
    if (!canSign) return;
    setSigned(true);
    setTimeout(() => onSign(name.trim()), 1400);
  };

  if (signed) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 16px" }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e5e5e5", marginBottom: 6 }}>Agreement signed</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>Taking you to your workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 580 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, background: "#fff", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#000", margin: "0 auto 16px" }}>✂</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Before you continue</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>{agreement.title}</h1>
        </div>

        {/* Agreement text */}
        <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "20px 22px", marginBottom: 24, maxHeight: 320, overflowY: "auto" }}>
          <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 13, color: "#d4d4d4", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {agreement.body}
          </pre>
        </div>

        {/* Checkbox */}
        <div
          onClick={() => setChecked(c => !c)}
          style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20, cursor: "pointer" }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${checked ? "#fff" : "#303030"}`, background: checked ? "#fff" : "transparent", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#000", transition: "all 0.15s" }}>
            {checked ? "✓" : ""}
          </div>
          <span style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.6 }}>
            I have read and agree to all terms in this agreement. I understand that accessing content in this workspace is conditional on my compliance.
          </span>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Type your full name to sign</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full name"
            onKeyDown={e => e.key === "Enter" && handleSign()}
            style={{ width: "100%", background: "#0d0d0d", border: "1px solid #262626", borderRadius: 7, padding: "11px 14px", color: "#e5e5e5", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box", fontStyle: name ? "italic" : "normal" }}
          />
        </div>

        <button
          onClick={handleSign}
          disabled={!canSign}
          style={{ width: "100%", background: canSign ? "#fff" : "#111", color: canSign ? "#000" : "#303030", border: `1px solid ${canSign ? "#fff" : "#1f1f1f"}`, borderRadius: 7, padding: "12px", fontSize: 13, fontWeight: 800, cursor: canSign ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}>
          Sign &amp; Continue
        </button>

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#6b7280" }}>
          Your name and timestamp will be recorded.
        </div>
      </div>
    </div>
  );
}

// ─── Agreement View (creator — edit agreement + view signatures) ──────────────

function AgreementView({ agreement, setAgreement, signatures }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agreement);

  const save = () => { setAgreement(draft); setEditing(false); };
  const cancel = () => { setDraft(agreement); setEditing(false); };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "36px 36px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>Team Agreement</h1>
          <p style={{ color: "#9ca3af", margin: "5px 0 0", fontSize: 13 }}>Clippers must sign this before accessing any content</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Toggle enabled */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700 }}>{draft.enabled ? "Required" : "Disabled"}</span>
            <div
              onClick={() => { const updated = { ...draft, enabled: !draft.enabled }; setDraft(updated); setAgreement(updated); }}
              style={{ width: 36, height: 20, borderRadius: 99, background: draft.enabled ? "#fff" : "#1f1f1f", border: `1px solid ${draft.enabled ? "#fff" : "#303030"}`, cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
              <div style={{ position: "absolute", top: 2, left: draft.enabled ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: draft.enabled ? "#000" : "#404040", transition: "all 0.2s" }} />
            </div>
          </div>
          {!editing
            ? <Btn onClick={() => { setDraft(agreement); setEditing(true); }} variant="ghost">Edit</Btn>
            : <><Btn onClick={cancel} variant="ghost">Cancel</Btn><Btn onClick={save} variant="primary" style={{ marginLeft: 0 }}>Save</Btn></>
          }
        </div>
      </div>

      {!agreement.enabled && (
        <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 16px", marginBottom: 24 }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Agreement is currently disabled. Clippers can access content without signing. Toggle "Required" to enforce it.</span>
        </div>
      )}

      {/* Agreement Title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Agreement Title</div>
        {editing
          ? <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 12px", color: "#e5e5e5", fontSize: 14, fontWeight: 700, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          : <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5" }}>{agreement.title}</div>
        }
      </div>

      {/* Agreement Body */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Agreement Text</div>
        {editing ? (
          <textarea
            value={draft.body}
            onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
            rows={16}
            style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 8, padding: "12px 14px", color: "#a3a3a3", fontSize: 12, lineHeight: 1.85, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        ) : (
          <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "18px 20px", maxHeight: 340, overflowY: "auto" }}>
            <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 12, color: "#9ca3af", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {agreement.body}
            </pre>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Signatures — {signatures.length}</div>
        </div>
        {signatures.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13, padding: "20px 0" }}>No signatures yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {signatures.map((sig, i) => (
              <div key={i} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#141414", border: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#9ca3af" }}>
                    {sig.name.split(" ").map(w => w[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e5e5", fontStyle: "italic" }}>{sig.name}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>Signed {sig.signedAt}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4d4d4" }} />
                  <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Signed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Guidelines View (global, not video-specific) ────────────────────────────

function GuidelinesView({ guidelines, setGuidelines, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(guidelines);

  const save = () => { setGuidelines(draft); setEditing(false); };
  const cancel = () => { setDraft(guidelines); setEditing(false); };

  const fields = [
    { key: "overview", label: "Overview", placeholder: "A brief description of the channel, what it's about, and the goal of the clips...", multi: true },
    { key: "style", label: "Style & Format", placeholder: "Energy level, pacing, caption style, orientation, hook timing...", multi: true },
    { key: "dos", label: "Do's", placeholder: "Types of moments, content, or edits that always work well...", multi: true },
    { key: "donts", label: "Don'ts", placeholder: "Things to always avoid — dead air, specific transitions, etc...", multi: true },
    { key: "notes", label: "Additional Notes", placeholder: "Anything else all clippers should know at all times...", multi: true },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>Clipping Guidelines</h1>
          <p style={{ color: "#9ca3af", margin: "5px 0 0", fontSize: 13 }}>{readOnly ? "General guidelines that apply to every video" : "Global standards for your entire clip team — applies to all videos"}</p>
        </div>
        {!readOnly && !editing && <Btn onClick={() => { setDraft(guidelines); setEditing(true); }} variant="ghost">Edit</Btn>}
        {!readOnly && editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={cancel} variant="ghost">Cancel</Btn>
            <Btn onClick={save} variant="primary">Save</Btn>
          </div>
        )}
      </div>

      {!readOnly && !editing && (
        <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 7, padding: "10px 14px", marginBottom: 28, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>↑ Pinned for all clippers</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>These guidelines are always visible to every clipper on your team, regardless of which video they're working on.</span>
        </div>
      )}
      {readOnly && (
        <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 7, padding: "10px 14px", marginBottom: 28 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>These are your creator's standing guidelines. They apply to every video you work on — read these before starting any clip.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {fields.map((f, i) => (
          <div key={f.key} style={{ borderTop: i === 0 ? "1px solid #2a2a2a" : "none", borderBottom: "1px solid #2a2a2a", padding: "20px 0", display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "start" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2 }}>{f.label}</div>
            {editing ? (
              <textarea value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} style={{ background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "8px 10px", color: "#e5e5e5", fontSize: 14, resize: "vertical", fontFamily: "inherit", outline: "none" }} />
            ) : (
              <div style={{ fontSize: 14, color: guidelines[f.key] ? "#d4d4d4" : "#6b7280", lineHeight: 1.7 }}>{guidelines[f.key] || (readOnly ? "Not set" : "Not set — click Edit to add")}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Footage Bar ──────────────────────────────────────────────────────────────

function FootageBar({ url, onChange, readOnly }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);

  const save = () => {
    onChange(draft.trim());
    setEditing(false);
  };

  const isValidUrl = (u) => u && (u.startsWith("http://") || u.startsWith("https://"));

  if (readOnly) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Source Footage</div>
        {isValidUrl(url) ? (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0d0d0d", border: "1px solid #262626", borderRadius: 7, padding: "9px 14px", textDecoration: "none", color: "#e5e5e5", fontSize: 13, fontWeight: 600 }}>
            <span style={{ fontSize: 15 }}>↗</span>
            <span>Open footage in Google Drive</span>
          </a>
        ) : (
          <div style={{ color: "#6b7280", fontSize: 13 }}>No footage link added yet.</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Source Footage</div>
      {editing ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft(url); setEditing(false); } }}
            placeholder="Paste Google Drive link..."
            style={{ flex: 1, background: "#0d0d0d", border: "1px solid #262626", borderRadius: 7, padding: "9px 12px", color: "#e5e5e5", fontSize: 13, outline: "none", fontFamily: "inherit" }}
          />
          <Btn onClick={save} variant="primary" style={{ padding: "9px 14px" }}>Save</Btn>
          <Btn onClick={() => { setDraft(url); setEditing(false); }} variant="ghost" style={{ padding: "9px 12px" }}>Cancel</Btn>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isValidUrl(url) ? (
            <>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0d0d0d", border: "1px solid #262626", borderRadius: 7, padding: "9px 14px", textDecoration: "none", color: "#e5e5e5", fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>↗</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
              </a>
              <Btn onClick={() => { setDraft(url); setEditing(true); }} variant="ghost" style={{ padding: "9px 12px", flexShrink: 0 }}>Edit</Btn>
            </>
          ) : (
            <button
              onClick={() => { setDraft(""); setEditing(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d0d0d", border: "1px dashed #262626", borderRadius: 7, padding: "9px 14px", color: "#9ca3af", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              <span>+</span> Add footage link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Clipper View ─────────────────────────────────────────────────────────────

function ClipperView({ sessions, categories, guidelines, agreement, onSign, currentUserName, currentUserId, workspaceId, onUploadClip, onResubmitClip, sidebarOpen = false, setSidebarOpen = () => {}, isMobile = false, isTablet = false, onSignOut = () => {}, workspaceName = "", jumpTo = null, onJumpHandled = () => {} }) {
  const [tab, setTab] = useState("clips");
  const [showUpload, setShowUpload] = useState(false);
  const [resubmitDefaults, setResubmitDefaults] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [myClipsData, setMyClipsData] = useState(null);
  const [expandedBriefId, setExpandedBriefId] = useState(null);

  // Navigate to a clip when jumpTo is set by a notification click
  useEffect(() => {
    if (!jumpTo?.clipId) return;
    setTab("clips");
    // myClipsData may not yet be populated; we'll try to find the clip
    setSelectedClip(prev => {
      // We can't access myClipsData here in the setter, so just clear and let the tab change show the clip
      return prev;
    });
    onJumpHandled();
  }, [jumpTo]); // eslint-disable-line

  useEffect(() => {
    if (!currentUserId || !workspaceId) return;
    const fetchAll = async () => {
      // My Clips — direct query by clipper_id + workspace_id
      const { data: clipsData, error: clipsError } = await supabase
        .from("clips")
        .select("id, title, status, duration, category, revision_note, file_url, session_id, captions, sound, notes")
        .eq("clipper_id", currentUserId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (clipsError) {
        console.error("[MyClips] query failed:", clipsError);
      } else {
        const sessionMap = Object.fromEntries(sessions.map(s => [s.id, s]));
        const mapped = (clipsData || []).map(c => ({
          id: c.id,
          title: c.title,
          status: c.status || "pending",
          duration: c.duration || "0:00",
          category: c.category || "Other",
          revisionNote: c.revision_note || "",
          fileUrl: c.file_url || "",
          sessionId: c.session_id,
          sessionTitle: sessionMap[c.session_id]?.title || "",
          sessionDate: sessionMap[c.session_id]?.date || "",
          captions: c.captions || "",
          sound: c.sound || "",
          notes: c.notes || "",
        }));
        setMyClipsData(mapped);
      }

      // My Stats — counts from same clipper_id + workspace_id
      const { data: statsData, error: statsError } = await supabase
        .from("clips")
        .select("id, status, session_id")
        .eq("clipper_id", currentUserId)
        .eq("workspace_id", workspaceId);
      if (statsError) {
        console.error("[MyStats] query failed:", statsError);
        return;
      }
      const total = statsData.length;
      const approved = statsData.filter(c => c.status === "finalized").length;
      const revision = statsData.filter(c => c.status === "revision").length;
      const discard = statsData.filter(c => c.status === "discard").length;
      const pending = statsData.filter(c => c.status === "pending").length;
      const reviewed = approved + revision + discard;
      const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : null;
      const bySession = sessions
        .map(s => {
          const sClips = statsData.filter(c => c.session_id === s.id);
          if (sClips.length === 0) return null;
          return { id: s.id, title: s.title, date: s.date, total: sClips.length, approved: sClips.filter(c => c.status === "finalized").length };
        })
        .filter(Boolean);
      setMyStats({ total, approved, revision, discard, pending, reviewed, approvalRate, bySession });
    };
    fetchAll().catch(console.error);
  }, [sessions, currentUserId, workspaceId]);

  const myClips = myClipsData ?? sessions.flatMap(s => s.clips.filter(c => c.clipperId === currentUserId));
  const revisions = myClips.filter(c => c.status === "revision");

  return (
    <>
      {showUpload && (
        <UploadModal
          categories={categories}
          sessions={sessions}
          onClose={() => { setShowUpload(false); setResubmitDefaults(null); }}
          onSubmit={resubmitDefaults?.clipId ? onResubmitClip : onUploadClip}
          defaultSessionId={resubmitDefaults?.sessionId}
          defaultCategory={resubmitDefaults?.category}
          defaultTitle={resubmitDefaults?.title || ""}
          defaultCaptions={resubmitDefaults?.captions || ""}
          defaultSound={resubmitDefaults?.sound || ""}
          defaultNotes={resubmitDefaults?.notes || ""}
          resubmitClipId={resubmitDefaults?.clipId || null}
          resubmitOldFileUrl={resubmitDefaults?.fileUrl || null}
        />
      )}
      {selectedClip && (
        <ClipDetailModal
          clip={selectedClip}
          sessions={sessions}
          onClose={() => setSelectedClip(null)}
          onResubmit={() => {
            setResubmitDefaults({
              sessionId: selectedClip.sessionId,
              category: selectedClip.category,
              title: selectedClip.title,
              captions: selectedClip.captions || "",
              sound: selectedClip.sound || "",
              notes: selectedClip.notes || "",
              clipId: selectedClip.id,
              fileUrl: selectedClip.fileUrl,
            });
            setSelectedClip(null);
            setShowUpload(true);
          }}
        />
      )}
      <div style={{ display: "flex", height: "calc(100vh - 58px)" }}>
        {/* Sidebar overlay — mobile only */}
        {sidebarOpen && <div className="cf-sidebar-overlay open" onClick={() => setSidebarOpen(false)} />}
        {/* Sidebar */}
        <div className={`cf-sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 200, borderRight: "1px solid #2a2a2a", padding: "20px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {[["clips", "My Clips"], ["videos", "Videos"], ["stats", "My Stats"], ["guidelines", "Clipping Guidelines"], ["agreement", "My Agreement"]].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setSidebarOpen(false); }} style={{ background: tab === id ? "#1a1a1a" : "transparent", color: tab === id ? "#ffffff" : "#c0c0c0", border: "none", borderLeft: tab === id ? "2px solid #ffffff" : "2px solid transparent", borderRadius: 0, padding: "9px 20px", minHeight: 44, fontSize: 13, fontWeight: tab === id ? 700 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.12s" }}>
              {label}
              {id === "clips" && revisions.length > 0 && (
                <span style={{ marginLeft: 8, background: "#f97316", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>{revisions.length}</span>
              )}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: "16px 20px" }}>
            <Btn onClick={() => { setShowUpload(true); setSidebarOpen(false); }} variant="primary" style={{ width: "100%", padding: "9px", minHeight: 44 }}>+ Upload</Btn>
          </div>
          {/* Sidebar footer — workspace name + sign out (always visible) */}
          <div style={{ flexShrink: 0, borderTop: "1px solid #2a2a2a", padding: "10px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {workspaceName || "Workspace"}
            </span>
            <button onClick={onSignOut} title="Sign out" style={{ flexShrink: 0, background: "none", border: "1px solid #2a2a2a", color: "#9ca3af", borderRadius: 5, padding: "6px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "guidelines" ? (
            <GuidelinesView guidelines={guidelines} setGuidelines={() => {}} readOnly />
          ) : tab === "videos" ? (
            <div style={{ padding: "28px 32px", maxWidth: 800 }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>Videos</h1>
                <p style={{ color: "#9ca3af", margin: "4px 0 0", fontSize: 13 }}>All sessions and clips in this workspace</p>
              </div>
              {sessions.length === 0 && (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>No sessions yet.</div>
              )}
              {sessions.map(s => {
                const hasBrief = s.brief && Object.values(s.brief).some(v => v?.trim?.());
                const briefOpen = expandedBriefId === s.id;
                return (
                <div key={s.id} style={{ marginBottom: 32 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#a3a3a3" }}>{s.title}</div>
                      {hasBrief && (
                        <button
                          onClick={() => setExpandedBriefId(briefOpen ? null : s.id)}
                          style={{ background: briefOpen ? "#1a1a1a" : "transparent", border: `1px solid ${briefOpen ? "#555555" : "#444444"}`, borderRadius: 5, color: briefOpen ? "#ffffff" : "#c0c0c0", fontSize: 11, fontWeight: 700, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}
                        >
                          {briefOpen ? "Hide Brief" : "Brief"}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>{s.date}</div>
                    <FootageBar url={s.footageUrl || ""} onChange={() => {}} readOnly />
                  </div>

                  {briefOpen && hasBrief && (
                    <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "16px 20px", marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Video Brief</div>
                      {[
                        ["Upload Deadline", s.brief.deadline],
                        ["Clips Per Video", s.brief.quantity],
                        ["What We're Looking For", s.brief.looking_for],
                        ["Specific Clips Wanted", s.brief.specific_clips],
                        ["Additional Notes", s.brief.notes],
                      ].filter(([, val]) => val?.trim?.()).map(([label, val]) => (
                        <div key={label} style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 13, color: "#a3a3a3", lineHeight: 1.6 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {s.clips.length === 0 ? (
                    <div style={{ background: "#0a0a0a", border: "1px dashed #1f1f1f", borderRadius: 8, padding: "14px 16px", color: "#6b7280", fontSize: 12, fontWeight: 600 }}>
                      No clips submitted yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {s.clips.map(clip => (
                        <div key={clip.id} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 100, flexShrink: 0 }}>
                            <VideoThumb title={clip.title} duration={clip.duration} fileUrl={clip.fileUrl} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 13, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clip.title}</div>
                            <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>{clip.clipper} · {clip.category}</div>
                            <StatusBadge status={clip.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ); })}
            </div>
          ) : tab === "stats" ? (
            <div style={{ padding: "32px 32px", maxWidth: 560 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>My Stats</h1>
              <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 28px" }}>Your personal performance — only visible to you and the creator</p>
              {!myStats ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
                    {[["Total Clips", myStats.total, "#737373"], ["Approved", myStats.approved, "#d4d4d4"], ["Sent for Revision", myStats.revision, "#f97316"], ["Pending Review", myStats.pending, "#525252"]].map(([label, val, col]) => (
                      <div key={label} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, padding: "16px 18px" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: col }}>{val}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 3 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {myStats.reviewed > 0 && (
                    <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Approval Rate</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: myStats.approvalRate >= 70 ? "#d4d4d4" : myStats.approvalRate >= 40 ? "#a3a3a3" : "#f97316", marginBottom: 10 }}>{myStats.approvalRate}%</div>
                      <div style={{ height: 6, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${myStats.approvalRate}%`, background: myStats.approvalRate >= 70 ? "#d4d4d4" : myStats.approvalRate >= 40 ? "#737373" : "#f97316", borderRadius: 99, transition: "width 0.3s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>{myStats.approved} approved out of {myStats.reviewed} reviewed</div>
                    </div>
                  )}
                  {myStats.bySession.length > 0 && (
                    <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, padding: "16px 18px" }}>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>By Session</div>
                      {myStats.bySession.map(s => (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #141414" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#a3a3a3" }}>{s.title}</div>
                            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{s.date}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>{s.approved}/{s.total} approved</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : tab === "agreement" ? (
            <div style={{ maxWidth: 620, margin: "0 auto", padding: "36px 36px" }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>My Agreement</h1>
              <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 28px" }}>You've signed this agreement. A copy is shown below for your reference.</p>
              <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#e5e5e5", marginBottom: 14 }}>{agreement.title}</div>
                <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 12, color: "#9ca3af", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{agreement.body}</pre>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4d4d4" }} />
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Signed by you on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: "28px 32px", maxWidth: 800 }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>My Clips</h1>
                <p style={{ color: "#9ca3af", margin: "4px 0 0", fontSize: 13 }}>Your uploads and revision feedback</p>
              </div>

              {revisions.length > 0 && (
                <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 8, padding: "16px 18px", marginBottom: 24 }}>
                  <div style={{ color: "#f97316", fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Needs Revision — {revisions.length}</div>
                  {revisions.map(c => (
                    <div key={c.id} style={{ borderTop: "1px solid rgba(249,115,22,0.1)", paddingTop: 12, marginTop: 12 }}>
                      <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 13, marginBottom: 2 }}>{c.title}</div>
                      <div style={{ color: "#a3a3a3", fontSize: 12, marginBottom: 2 }}>{c.sessionDate} — {c.sessionTitle}</div>
                      <div style={{ color: "#a3a3a3", fontSize: 13, lineHeight: 1.6, fontStyle: "italic", marginBottom: 10 }}>"{c.revisionNote}"</div>
                      <Btn variant="warning" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setSelectedClip(c)}>View & Resubmit</Btn>
                    </div>
                  ))}
                </div>
              )}

              {myClips.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13, paddingTop: 8 }}>No clips uploaded yet. Use the Upload button to submit your first clip.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myClips.map(clip => (
                    <div key={clip.id} onClick={() => setSelectedClip(clip)} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#303030"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1a1a"}>
                      <div style={{ width: 100, flexShrink: 0 }}>
                        <VideoThumb title={clip.title} duration={clip.duration} fileUrl={clip.fileUrl} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 13, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clip.title}</div>
                        <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>{clip.sessionTitle} · {clip.category}</div>
                        <StatusBadge status={clip.status} />
                        {clip.status === "revision" && clip.revisionNote && (
                          <div style={{ marginTop: 6, color: "#a3a3a3", fontSize: 11, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{clip.revisionNote}"</div>
                        )}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 16, flexShrink: 0 }}>›</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Creator View ─────────────────────────────────────────────────────────────

function CreatorView({ sessions, setSessions, categories, setCategories, guidelines, setGuidelines, agreement, setAgreement, signatures, activity, setActivity, onAddSession, onUpdateClip, onUpdateSessionFootage, onUpdateSessionBrief, workspaceId, teamMembers = [], onRemoveMember, isManager = false, sessionsLoading = false, contentLoading = false, dataLoadError = false, onRetry, sidebarOpen = false, setSidebarOpen = () => {}, isMobile = false, isTablet = false, onSignOut = () => {}, workspaceName = "", creatorWorkspaces = [], currentWorkspaceId = null, onSwitchWorkspace = () => {}, onNewWorkspace = () => {}, jumpTo = null, onJumpHandled = () => {} }) {
  const [tab, setTab] = useState("review");
  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id || null);
  const [briefSessionId, setBriefSessionId] = useState(sessions[0]?.id || null);
  const [activitySessionFilter, setActivitySessionFilter] = useState(null); // null = All Activity
  const [activeCat, setActiveCat] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const [revNote, setRevNote] = useState("");
  const [showCatManager, setShowCatManager] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamRawData, setTeamRawData] = useState(null); // { clips, profileMap } — null while loading
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [teamSessionFilter, setTeamSessionFilter] = useState(null); // null = All Sessions
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [teamInviteCopied, setTeamInviteCopied] = useState(false);
  const [teamManagerInviteCopied, setTeamManagerInviteCopied] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentTs, setCommentTs] = useState(null); // { seconds, label }
  const commentTsRef = useRef(null); // ref mirror so async addComment always reads latest value
  const videoRef = useRef(null);
  const [downloadProgress, setDownloadProgress] = useState(null); // null | { current, total } | "done"

  // Navigate to a session/clip when jumpTo is set by a notification click
  useEffect(() => {
    if (!jumpTo) return;
    setTab("review");
    if (jumpTo.sessionId) setActiveSessionId(jumpTo.sessionId);
    if (jumpTo.clipId && jumpTo.sessionId) {
      const sess = sessions.find(s => s.id === jumpTo.sessionId);
      const clip = sess?.clips.find(c => c.id === jumpTo.clipId);
      if (clip) setSelected(clip);
    }
    onJumpHandled();
  }, [jumpTo]); // eslint-disable-line

  // Load comments whenever the selected clip changes
  useEffect(() => {
    setComments([]);
    setCommentText("");
    setCommentTs(null);
    commentTsRef.current = null;
    if (!selected?.id) return;
    supabase
      .from("clip_comments")
      .select("*")
      .eq("clip_id", selected.id)
      .order("timestamp_seconds", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) { console.error("[comments] load failed:", error); return; }
        setComments(data || []);
      });
  }, [selected?.id]);

  const captureTimestamp = () => {
    const secs = Math.floor(videoRef.current?.currentTime ?? 0);
    const label = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
    const ts = { seconds: secs, label };
    commentTsRef.current = ts;
    setCommentTs(ts);
  };

  const addComment = async () => {
    if (!commentText.trim() || !selected?.id || !workspaceId) return;
    // Use manually pinned timestamp if set; otherwise auto-capture current video position
    const pinned = commentTsRef.current;
    const autoSecs = Math.floor(videoRef.current?.currentTime ?? 0);
    const autoLabel = Math.floor(autoSecs / 60) + ":" + String(autoSecs % 60).padStart(2, "0");
    const ts = pinned ?? { seconds: autoSecs, label: autoLabel };
    console.log("[addComment] ts:", ts, "| pinned:", pinned, "| commentText:", commentText.trim());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const row = {
      clip_id: selected.id,
      workspace_id: workspaceId,
      user_id: user.id,
      timestamp_seconds: ts.seconds,
      timestamp_label: ts.label,
      comment: commentText.trim(),
    };
    console.log("[addComment] inserting row:", row);
    const { data, error } = await supabase.from("clip_comments").insert(row).select().single();
    console.log("[addComment] insert result — data:", data, "| error:", error);
    if (error) { console.error("[comments] insert failed:", error); return; }
    setComments(prev => {
      const next = [...prev, data];
      const sorted = next.sort((a, b) => (a.timestamp_seconds ?? Infinity) - (b.timestamp_seconds ?? Infinity));
      console.log("[comments] updated list:", sorted.map(c => ({ id: c.id, timestamp_label: c.timestamp_label, comment: c.comment })));
      return sorted;
    });
    setCommentText("");
    commentTsRef.current = null;
    setCommentTs(null);
  };

  const seekTo = (seconds) => {
    if (videoRef.current) videoRef.current.currentTime = seconds;
  };

  const deleteComment = async (id) => {
    console.log("[deleteComment] deleting comment id:", id);
    const { data, error } = await supabase.from("clip_comments").delete().eq("id", id).select();
    console.log("[deleteComment] response — data:", data, "| error:", error);
    if (error) { console.error("[deleteComment] failed:", error); return; }
    setComments(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    if (!workspaceId) return;
    const fetch = async () => {
      // Step 1: get all clips in this workspace (include session_id for per-session filtering)
      const { data: clipsData, error: clipsError } = await supabase
        .from("clips")
        .select("id, status, clipper_id, session_id")
        .eq("workspace_id", workspaceId);
      if (clipsError) { console.error("[TeamStats] clips query failed:", clipsError); return; }
      if (!clipsData?.length) { setTeamRawData({ clips: [], profileMap: {} }); return; }

      // Step 2: fetch profiles for the unique clipper IDs
      const clipperIds = [...new Set(clipsData.map(c => c.clipper_id).filter(Boolean))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", clipperIds);
      if (profilesError) { console.error("[TeamStats] profiles query failed:", profilesError); return; }

      const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p.full_name]));

      // Store raw data — stats are derived in render so session filter is reactive
      setTeamRawData({ clips: clipsData, profileMap });
    };
    fetch().catch(console.error);
  }, [sessions, workspaceId]);
  const [selectedClips, setSelectedClips] = useState(new Set());
  const [bulkRevNote, setBulkRevNote] = useState("");
  const [savedClipId, setSavedClipId] = useState(null);

  // Search mode: search across all sessions
  const allClips = sessions.flatMap(s => s.clips.map(c => ({ ...c, sessionTitle: s.title, sessionDate: s.date })));
  const searchResults = searchQuery.trim().length > 0
    ? allClips.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.clipper.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const clips = activeSession?.clips || [];
  const filtered = clips.filter(c =>
    (activeCat === "All" || c.category === activeCat) &&
    (activeStatus === "All" || c.status === activeStatus.toLowerCase())
  );


  const logActivity = (type, text, sessionTitle) => {
    const now = new Date();
    const time = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setActivity(prev => [{ id: Date.now(), type, text, session: sessionTitle || "", time }, ...prev]);
  };

  const updateClip = async (id, updates) => {
    if (onUpdateClip) {
      try {
        await onUpdateClip(id, updates);
      } catch (err) {
        console.error("[updateClip] DB save failed:", err);
        return;
      }
    }
    setSessions(prev => prev.map(s => ({
      ...s,
      clips: s.clips.map(c => c.id === id ? { ...c, ...updates } : c)
    })));
    setSelected(p => p?.id === id ? { ...p, ...updates } : p);
    setSavedClipId(id);
    setTimeout(() => setSavedClipId(null), 1500);
  };

  const bulkUpdate = (status, note = "") => {
    const session = sessions.find(s => s.clips.some(c => selectedClips.has(c.id)));
    setSessions(prev => prev.map(s => ({
      ...s,
      clips: s.clips.map(c => selectedClips.has(c.id) ? { ...c, status, revisionNote: note } : c)
    })));
    if (onUpdateClip) {
      selectedClips.forEach(id => onUpdateClip(id, { status, revisionNote: note }).catch(console.error));
    }
    const count = selectedClips.size;
    if (status === "finalized") logActivity("approved", `${count} clips approved`, session?.title);
    else if (status === "revision") logActivity("revision", `${count} clips sent for revision`, session?.title);
    else if (status === "discard") logActivity("discard", `${count} clips discarded`, session?.title);
    setSelectedClips(new Set());
    setBulkRevNote("");
    setSelected(null);
  };

  const toggleClip = (id, e) => {
    e.stopPropagation();
    setSelectedClips(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedClips.size === filtered.length) setSelectedClips(new Set());
    else setSelectedClips(new Set(filtered.map(c => c.id)));
  };

  const downloadSingleClip = async (clip) => {
    if (!clip.fileUrl) return;
    const ext = clip.fileUrl.split("?")[0].split(".").pop() || "mp4";
    const filename = `${clip.title.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
    const res = await fetch(clip.fileUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkDownload = async () => {
    // Determine which clips to download
    let toDownload;
    if (selectedClips.size > 0) {
      toDownload = filtered.filter(c => selectedClips.has(c.id) && c.status === "finalized" && c.fileUrl);
    } else {
      toDownload = filtered.filter(c => c.status === "finalized" && c.fileUrl);
    }
    if (toDownload.length === 0) return;

    setDownloadProgress({ current: 0, total: toDownload.length });
    for (let i = 0; i < toDownload.length; i++) {
      setDownloadProgress({ current: i + 1, total: toDownload.length });
      try { await downloadSingleClip(toDownload[i]); } catch (e) { console.error("[download] failed for clip:", toDownload[i].title, e); }
      if (i < toDownload.length - 1) await new Promise(r => setTimeout(r, 500));
    }
    setDownloadProgress("done");
    setTimeout(() => setDownloadProgress(null), 3000);
  };

  const handleSetCategories = (newCats) => {
    setCategories(newCats);
    if (newCats.length > 0) {
      setSessions(prev => prev.map(s => ({
        ...s,
        clips: s.clips.map(c => newCats.includes(c.category) ? c : { ...c, category: newCats[0] })
      })));
    }
  };

  const addSession = async (date, title) => {
    if (onAddSession) {
      const id = await onAddSession(date, title);
      if (id) setActiveSessionId(id);
    } else {
      const id = "s" + Date.now();
      setSessions(p => [{ id, date, title, footageUrl: "", clips: [] }, ...p]);
      setActiveSessionId(id);
    }
  };

  const updateSessionFootage = (id, url) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, footageUrl: url } : s));
    if (onUpdateSessionFootage) onUpdateSessionFootage(id, url).catch(console.error);
  };

  const counts = { pending: clips.filter(c => c.status === "pending").length, finalized: clips.filter(c => c.status === "finalized").length, revision: clips.filter(c => c.status === "revision").length, discard: clips.filter(c => c.status === "discard").length };
  const totalPending = sessions.reduce((a, s) => a + s.clips.filter(c => c.status === "pending").length, 0);

  return (
    <>
      {showCatManager && <CategoryManager categories={categories} setCategories={handleSetCategories} onClose={() => setShowCatManager(false)} />}
      {showNewSession && <NewSessionModal onClose={() => setShowNewSession(false)} onAdd={addSession} />}

      <div style={{ display: "flex", height: "calc(100vh - 58px)" }}>
        {/* Sidebar overlay — mobile only */}
        {sidebarOpen && <div className="cf-sidebar-overlay open" onClick={() => setSidebarOpen(false)} />}
        {/* Left Sidebar */}
        <div className={`cf-sidebar${sidebarOpen ? " open" : ""}`} style={{ width: 220, borderRight: "1px solid #2a2a2a", display: "flex", flexDirection: "column" }}>
          {/* Nav */}
          <div style={{ padding: "16px 0 0" }}>
            {[["review", "Review Clips"], ["activity", "Activity"], ["team", "Team Stats"], ["members", "Team"], ["guidelines", "Clipping Guidelines"], ["brief", "Video Brief"], ["agreement", "Team Agreement"]].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); setSidebarOpen(false); }} style={{ background: tab === id ? "#1f1f1f" : "transparent", color: tab === id ? "#ffffff" : "#9ca3af", border: "none", borderLeft: tab === id ? "2px solid #ffffff" : "2px solid transparent", padding: "9px 20px", minHeight: 44, fontSize: 13, fontWeight: tab === id ? 800 : 600, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", transition: "all 0.12s" }}>
                {label}
                {id === "review" && totalPending > 0 && <span style={{ background: "#fff", color: "#000", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>{totalPending}</span>}
              </button>
            ))}
          </div>

          {/* Sessions — Review Clips tab */}
          {tab === "review" && (
            <>
              <div style={{ padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Videos</span>
                <button onClick={() => setShowNewSession(true)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>
              </div>
              <div className="cf-sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 0 16px" }}>
                {dataLoadError ? (
                  <div style={{ padding: "12px 20px" }}><LoadError onRetry={onRetry} /></div>
                ) : sessionsLoading ? (
                  <SessionSidebarSkeleton />
                ) : sessions.map(s => {
                  const pending = s.clips.filter(c => c.status === "pending").length;
                  const total = s.clips.length;
                  const reviewed = total - pending;
                  const progress = total > 0 ? Math.round((reviewed / total) * 100) : 0;
                  const active = activeSessionId === s.id;
                  return (
                    <button key={s.id} onClick={() => { setActiveSessionId(s.id); setSelected(null); setActiveCat("All"); setActiveStatus("All"); setSelectedClips(new Set()); setSidebarOpen(false); }} onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#141414"; }} onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }} style={{ background: active ? "#1f1f1f" : "transparent", border: "none", padding: "10px 20px 12px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", borderLeft: active ? "2px solid #e5e5e5" : "2px solid transparent", transition: "background 0.1s" }}>
                      <div style={{ fontSize: 11, color: active ? "#ffffff" : "#e5e5e5", fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>{s.date}</span>
                        {pending > 0
                          ? <span style={{ background: "#fff", color: "#000", borderRadius: 99, fontSize: 9, fontWeight: 800, padding: "1px 5px" }}>{pending}</span>
                          : total > 0 ? <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 700 }}>✓ Done</span> : null
                        }
                      </div>
                      {total > 0 && (
                        <div style={{ height: 3, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "#22c55e" : "#6b7280", borderRadius: 99, transition: "width 0.3s" }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Sessions — Team Stats tab */}
          {tab === "team" && (
            <>
              <div style={{ padding: "16px 20px 8px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Filter</span>
              </div>
              <div className="cf-sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 0 16px" }}>
                <button onClick={() => setTeamSessionFilter(null)} style={{ background: teamSessionFilter === null ? "#141414" : "transparent", border: "none", padding: "8px 20px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", borderLeft: teamSessionFilter === null ? "2px solid #e5e5e5" : "2px solid transparent" }}>
                  <div style={{ fontSize: 11, color: teamSessionFilter === null ? "#e5e5e5" : "#525252", fontWeight: teamSessionFilter === null ? 700 : 500 }}>All Sessions</div>
                </button>
                {sessions.map(s => {
                  const active = teamSessionFilter === s.id;
                  return (
                    <button key={s.id} onClick={() => setTeamSessionFilter(s.id)} style={{ background: active ? "#141414" : "transparent", border: "none", padding: "8px 20px 10px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", borderLeft: active ? "2px solid #e5e5e5" : "2px solid transparent" }}>
                      <div style={{ fontSize: 11, color: active ? "#e5e5e5" : "#525252", fontWeight: active ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{s.date}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Sessions — Activity tab */}
          {tab === "activity" && (
            <>
              <div style={{ padding: "16px 20px 8px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Filter</span>
              </div>
              <div className="cf-sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 0 16px" }}>
                <button onClick={() => setActivitySessionFilter(null)} style={{ background: activitySessionFilter === null ? "#141414" : "transparent", border: "none", padding: "8px 20px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", borderLeft: activitySessionFilter === null ? "2px solid #e5e5e5" : "2px solid transparent" }}>
                  <div style={{ fontSize: 11, color: activitySessionFilter === null ? "#e5e5e5" : "#525252", fontWeight: activitySessionFilter === null ? 700 : 500 }}>All Activity</div>
                </button>
                {sessions.map(s => {
                  const active = activitySessionFilter === s.id;
                  return (
                    <button key={s.id} onClick={() => setActivitySessionFilter(s.id)} style={{ background: active ? "#141414" : "transparent", border: "none", padding: "8px 20px 10px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", borderLeft: active ? "2px solid #e5e5e5" : "2px solid transparent" }}>
                      <div style={{ fontSize: 11, color: active ? "#e5e5e5" : "#525252", fontWeight: active ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{s.date}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Sessions — Video Brief tab */}
          {tab === "brief" && (
            <>
              <div style={{ padding: "16px 20px 8px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Videos</span>
              </div>
              <div className="cf-sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 0 16px" }}>
                {sessions.map(s => {
                  const active = briefSessionId === s.id;
                  return (
                    <button key={s.id} onClick={() => setBriefSessionId(s.id)} style={{ background: active ? "#141414" : "transparent", border: "none", padding: "10px 20px 12px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", borderLeft: active ? "2px solid #e5e5e5" : "2px solid transparent" }}>
                      <div style={{ fontSize: 11, color: active ? "#e5e5e5" : "#525252", fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{s.date}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Sidebar footer — workspace switcher + sign out (always visible) */}
          <div style={{ flexShrink: 0, borderTop: "1px solid #2a2a2a", padding: "10px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            {/* Workspace dropdown */}
            <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
              {wsDropdownOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => setWsDropdownOpen(false)} />
                  <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 300, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: 5, minWidth: 190, boxShadow: "0 -6px 20px rgba(0,0,0,0.7)" }}>
                    {creatorWorkspaces.map(ws => (
                      <button key={ws.id} onClick={() => { onSwitchWorkspace(ws); setWsDropdownOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: ws.id === currentWorkspaceId ? "#1a1a1a" : "none", border: "none", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontWeight: ws.id === currentWorkspaceId ? 700 : 500, color: ws.id === currentWorkspaceId ? "#e5e5e5" : "#a3a3a3", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        <span style={{ width: 12, flexShrink: 0, fontSize: 10, color: "#a3a3a3" }}>{ws.id === currentWorkspaceId ? "✓" : ""}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name || "Untitled"}</span>
                      </button>
                    ))}
                    <div style={{ borderTop: "1px solid #2a2a2a", marginTop: 4, paddingTop: 4 }}>
                      <button onClick={() => { onNewWorkspace(); setWsDropdownOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontWeight: 600, color: "#9ca3af", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                        <span style={{ width: 12, flexShrink: 0, fontSize: 14, color: "#9ca3af" }}>+</span>
                        <span>New Workspace</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
              <button
                onClick={() => setWsDropdownOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", background: "none", border: "none", borderRadius: 5, padding: "6px 8px", cursor: "pointer", fontFamily: "inherit", minWidth: 0 }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
                  {workspaceName || "Workspace"}
                </span>
                <span style={{ fontSize: 9, color: "#9ca3af", flexShrink: 0, transform: wsDropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
              </button>
            </div>
            {/* Sign out */}
            <button onClick={onSignOut} title="Sign out" style={{ flexShrink: 0, background: "none", border: "1px solid #2a2a2a", color: "#9ca3af", borderRadius: 5, padding: "6px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {tab === "agreement" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <AgreementView agreement={agreement} setAgreement={setAgreement} signatures={signatures} />
            </div>
          ) : tab === "activity" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px", maxWidth: 680 }}>
              {(() => {
                const filterSession = activitySessionFilter ? sessions.find(s => s.id === activitySessionFilter) : null;
                const filtered = filterSession
                  ? activity.filter(a => a.session === filterSession.title)
                  : activity;
                return (
                  <>
                    <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                      {filterSession ? filterSession.title : "Activity"}
                    </h1>
                    <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 28px" }}>
                      {filterSession ? filterSession.date : "Everything that's happened across your workspace"}
                    </p>
                    {dataLoadError ? <LoadError onRetry={onRetry} /> : contentLoading ? <ActivitySkeleton /> : (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {filtered.map((item, i) => {
                        const icons = { upload: "↑", approved: "✓", revision: "↩", discard: "✕" };
                        const colors = { upload: "#525252", approved: "#d4d4d4", revision: "#f97316", discard: "#404040" };
                        return (
                          <div key={item.id} style={{ display: "flex", gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: i < filtered.length - 1 ? "1px solid #2a2a2a" : "none" }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0d0d0d", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: colors[item.type], flexShrink: 0 }}>{icons[item.type]}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: "#a3a3a3", fontWeight: 600, marginBottom: 3 }}>{item.text}</div>
                              <div style={{ fontSize: 11, color: "#9ca3af" }}>{!filterSession && item.session && <span style={{ color: "#9ca3af", marginRight: 6 }}>{item.session} ·</span>}{item.time}</div>
                            </div>
                          </div>
                        );
                      })}
                      {filtered.length === 0 && <div style={{ color: "#6b7280", fontSize: 13 }}>No activity{filterSession ? " for this session" : ""} yet.</div>}
                    </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : tab === "team" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px", maxWidth: 760 }}>
              {(() => {
                const filterSession = teamSessionFilter ? sessions.find(s => s.id === teamSessionFilter) : null;
                const rawClips = teamRawData
                  ? (filterSession
                      ? teamRawData.clips.filter(c => c.session_id === filterSession.id)
                      : teamRawData.clips)
                  : null;
                const teamStats = rawClips ? (() => {
                  if (!rawClips.length) return [];
                  const byClipper = {};
                  rawClips.forEach(c => {
                    const uid = c.clipper_id;
                    if (!uid) return;
                    if (!byClipper[uid]) byClipper[uid] = { name: teamRawData.profileMap[uid] || "Unknown", clips: [] };
                    byClipper[uid].clips.push(c);
                  });
                  return Object.values(byClipper).map(({ name, clips }) => {
                    const total = clips.length;
                    const approved = clips.filter(c => c.status === "finalized").length;
                    const revision = clips.filter(c => c.status === "revision").length;
                    const discard = clips.filter(c => c.status === "discard").length;
                    const pending = clips.filter(c => c.status === "pending").length;
                    const reviewed = approved + revision + discard;
                    const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : null;
                    return { name, total, approved, revision, discard, pending, reviewed, approvalRate };
                  });
                })() : null;
                return (
                  <>
                    <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>
                      {filterSession ? filterSession.title : "Team Stats"}
                    </h1>
                    <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 28px" }}>
                      {filterSession ? filterSession.date : "Performance breakdown per clipper — only visible to you"}
                    </p>
                    {dataLoadError ? (
                      <LoadError onRetry={onRetry} />
                    ) : contentLoading || !teamStats ? (
                      <TeamStatsSkeleton />
                    ) : teamStats.length === 0 ? (
                      <div style={{ color: "#6b7280", fontSize: 13 }}>No clips submitted{filterSession ? " for this session" : ""} yet.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {teamStats.map(cs => (
                          <div key={cs.name} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 10, padding: "18px 20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#141414", border: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#9ca3af" }}>
                                  {cs.name.split(" ").map(w => w[0]).join("").toUpperCase()}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#e5e5e5" }}>{cs.name}</div>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: cs.approvalRate >= 70 ? "#d4d4d4" : cs.approvalRate >= 40 ? "#a3a3a3" : "#f97316" }}>
                                {cs.approvalRate !== null ? `${cs.approvalRate}% approval` : "No data yet"}
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                              {[["Total", cs.total, "#737373"], ["Approved", cs.approved, "#d4d4d4"], ["Revision", cs.revision, "#f97316"], ["Pending", cs.pending, "#525252"]].map(([label, val, col]) => (
                                <div key={label} style={{ background: "#111", borderRadius: 7, padding: "8px 10px" }}>
                                  <div style={{ fontSize: 18, fontWeight: 900, color: col }}>{val}</div>
                                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>{label}</div>
                                </div>
                              ))}
                            </div>
                            {cs.total > 0 && (
                              <div>
                                <div style={{ height: 4, background: "#1a1a1a", borderRadius: 99, overflow: "hidden", display: "flex" }}>
                                  <div style={{ height: "100%", width: `${(cs.approved / cs.total) * 100}%`, background: "#d4d4d4" }} />
                                  <div style={{ height: "100%", width: `${(cs.revision / cs.total) * 100}%`, background: "#f97316" }} />
                                  <div style={{ height: "100%", width: `${(cs.discard / cs.total) * 100}%`, background: "#303030" }} />
                                </div>
                                <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                                  {[["Approved", "#d4d4d4"], ["Revision", "#f97316"], ["Discarded", "#303030"], ["Pending", "#1a1a1a"]].map(([l, c]) => (
                                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c, border: c === "#1a1a1a" ? "1px solid #333" : "none" }} />
                                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{l}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : tab === "members" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px", maxWidth: 680 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>Team</h1>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}</span>
              </div>
              <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 28px" }}>Manage who has access to this workspace</p>

              {/* ── Clipper invite link ── */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Invite Clippers</div>
                <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {`${window.location.origin}${window.location.pathname}?workspace_id=${workspaceId}`}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}?workspace_id=${workspaceId}`;
                      navigator.clipboard.writeText(url);
                      setTeamInviteCopied(true);
                      setTimeout(() => setTeamInviteCopied(false), 2000);
                    }}
                    style={{ flexShrink: 0, background: teamInviteCopied ? "#1a1a1a" : "#141414", border: "1px solid #444444", borderRadius: 6, color: teamInviteCopied ? "#d4d4d4" : "#c0c0c0", fontSize: 12, fontWeight: 700, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                  >
                    {teamInviteCopied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>

              {/* ── Manager invite link ── */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Invite Managers</div>
                <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {`${window.location.origin}${window.location.pathname}?workspace_id=${workspaceId}&invite_role=manager`}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}${window.location.pathname}?workspace_id=${workspaceId}&invite_role=manager`;
                      navigator.clipboard.writeText(url);
                      setTeamManagerInviteCopied(true);
                      setTimeout(() => setTeamManagerInviteCopied(false), 2000);
                    }}
                    style={{ flexShrink: 0, background: teamManagerInviteCopied ? "#1a1a1a" : "#141414", border: "1px solid #444444", borderRadius: 6, color: teamManagerInviteCopied ? "#d4d4d4" : "#c0c0c0", fontSize: 12, fontWeight: 700, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                  >
                    {teamManagerInviteCopied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>

              {/* ── Managers section ── */}
              {(() => {
                const managers = teamMembers.filter(m => m.role === "manager");
                const clippers = teamMembers.filter(m => m.role !== "manager");
                const renderMember = (m) => (
                  <div key={m.userId} style={{ background: "#0a0a0a", border: `1px solid ${confirmRemoveId === m.userId ? "rgba(249,115,22,0.3)" : "#1f1f1f"}`, borderRadius: 10, padding: "14px 16px", transition: "border-color 0.15s" }}>
                    {confirmRemoveId === m.userId ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 13, color: "#f97316" }}>Remove <strong>{m.name}</strong> from the workspace?</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setConfirmRemoveId(null)} style={{ background: "transparent", border: "1px solid #444444", borderRadius: 5, color: "#c0c0c0", fontSize: 12, fontWeight: 700, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                          <button onClick={() => { onRemoveMember(m.userId); setConfirmRemoveId(null); }} style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.4)", borderRadius: 5, color: "#f97316", fontSize: 12, fontWeight: 700, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#141414", border: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#9ca3af", flexShrink: 0 }}>
                          {m.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e5e5", marginBottom: 2 }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.email}{m.email ? "  ·  " : ""} Joined {m.joinedAt}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          {m.role === "clipper" && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.05em", textTransform: "uppercase", ...(m.hasSigned ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" } : { background: "#111", color: "#9ca3af", border: "1px solid #2a2a2a" }) }}>
                              {m.hasSigned ? "Signed" : "Unsigned"}
                            </span>
                          )}
                          {(!isManager || m.role === "clipper") && (
                            <button onClick={() => setConfirmRemoveId(m.userId)} style={{ background: "transparent", border: "1px solid #444444", borderRadius: 5, color: "#a3a3a3", fontSize: 11, fontWeight: 700, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
                return (
                  <>
                    {managers.length > 0 && (
                      <div style={{ marginBottom: 28 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Managers · {managers.length}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{managers.map(renderMember)}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Clippers · {clippers.length}</div>
                      {clippers.length === 0 ? (
                        <div style={{ color: "#6b7280", fontSize: 13 }}>No clippers have joined yet. Share the invite link above.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{clippers.map(renderMember)}</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : tab === "guidelines" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <GuidelinesView guidelines={guidelines} setGuidelines={setGuidelines} />
            </div>
          ) : tab === "brief" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {briefSessionId ? (
                <BriefView
                  key={briefSessionId}
                  brief={sessions.find(s => s.id === briefSessionId)?.brief || { ...INITIAL_BRIEF }}
                  setBrief={(b) => onUpdateSessionBrief(briefSessionId, b)}
                />
              ) : (
                <div style={{ padding: 32, color: "#9ca3af", fontSize: 13 }}>Select a session to view its brief.</div>
              )}
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

                {/* Search bar */}
                <div style={{ marginBottom: 20 }}>
                  <input
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSelectedClips(new Set()); setSelected(null); }}
                    placeholder="Search clips by title, clipper, or folder..."
                    style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 7, padding: "9px 14px", color: "#e5e5e5", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>

                {/* Search results mode */}
                {searchResults ? (
                  <>
                    <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700, marginBottom: 14 }}>{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {searchResults.map(clip => (
                        <div key={clip.id} onClick={() => { setSelected(clip); setRevNote(clip.revisionNote || ""); }} style={{ background: "#0d0d0d", border: `1px solid ${selected?.id === clip.id ? "#404040" : "#1a1a1a"}`, borderRadius: 8, padding: "12px 14px", display: "flex", gap: 12, cursor: "pointer", alignItems: "center" }}>
                          <div style={{ width: 80, flexShrink: 0 }}><VideoThumb title={clip.title} duration={clip.duration} fileUrl={clip.fileUrl} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 13, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clip.title}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>{clip.sessionTitle} · {clip.clipper} · {clip.category}</div>
                            <StatusBadge status={clip.status} />
                          </div>
                        </div>
                      ))}
                      {searchResults.length === 0 && <div style={{ color: "#6b7280", fontSize: 13, padding: "20px 0" }}>No clips found.</div>}
                    </div>
                  </>
                ) : activeSession ? (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#e5e5e5", letterSpacing: "-0.03em" }}>{activeSession.title}</div>
                      <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 3 }}>{activeSession.date} · {clips.length} clips</div>
                    </div>

                    {/* Footage link */}
                    <FootageBar
                      url={activeSession.footageUrl || ""}
                      onChange={url => updateSessionFootage(activeSession.id, url)}
                      readOnly={false}
                    />

                    {/* Stats row */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                      {Object.entries(counts).map(([key, val]) => (
                        <div key={key} onClick={() => setActiveStatus(activeStatus.toLowerCase() === key ? "All" : key.charAt(0).toUpperCase() + key.slice(1))} style={{ flex: 1, background: activeStatus.toLowerCase() === key ? "#141414" : "#0d0d0d", border: `1px solid ${activeStatus.toLowerCase() === key ? "#2a2a2a" : "#1a1a1a"}`, borderRadius: 7, padding: "10px 12px", cursor: "pointer" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: statusConfig[key].dot }}>{val}</div>
                          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>{statusConfig[key].label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Folder + status filters */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                      {["All", ...categories].map(cat => (
                        <button key={cat} onClick={() => setActiveCat(cat)} style={{ background: activeCat === cat ? "#fff" : "transparent", color: activeCat === cat ? "#000" : "#c0c0c0", border: `1px solid ${activeCat === cat ? "#fff" : "#444444"}`, borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{cat}</button>
                      ))}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        {["All", "Pending", "Revision", "Finalized", "Discard"].map(sf => (
                          <button key={sf} onClick={() => setActiveStatus(sf)} style={{ background: activeStatus === sf ? "#1a1a1a" : "transparent", color: activeStatus === sf ? "#ffffff" : "#c0c0c0", border: `1px solid ${activeStatus === sf ? "#555555" : "#444444"}`, borderRadius: 5, fontSize: 11, fontWeight: activeStatus === sf ? 700 : 500, cursor: "pointer", fontFamily: "inherit", padding: "4px 10px" }}>{sf}</button>
                        ))}
                      </div>
                      <button onClick={() => setShowCatManager(true)} style={{ background: "transparent", border: "1px solid #444444", color: "#c0c0c0", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>⊞ Folders</button>
                    </div>

                    {/* Bulk action toolbar */}
                    {filtered.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 7 }}>
                        <div onClick={toggleAll} style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${selectedClips.size === filtered.length && filtered.length > 0 ? "#fff" : "#303030"}`, background: selectedClips.size === filtered.length && filtered.length > 0 ? "#fff" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#000", flexShrink: 0 }}>
                          {selectedClips.size === filtered.length && filtered.length > 0 ? "✓" : selectedClips.size > 0 ? "–" : ""}
                        </div>
                        <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{selectedClips.size > 0 ? `${selectedClips.size} selected` : "Select all"}</span>
                        {selectedClips.size > 0 && (
                          <>
                            <div style={{ width: 1, height: 14, background: "#1f1f1f", margin: "0 2px" }} />
                            <Btn onClick={() => bulkUpdate("finalized")} variant="ghost" style={{ padding: "4px 10px", fontSize: 11 }}>✓ Approve</Btn>
                            <Btn onClick={() => bulkUpdate("discard")} variant="ghost" style={{ padding: "4px 10px", fontSize: 11, color: "#9ca3af" }}>✕ Discard</Btn>
                          </>
                        )}
                        {/* Download All — shown when filter is Finalized or selected clips exist */}
                        {(activeStatus === "Finalized" || filtered.some(c => selectedClips.has(c.id) && c.status === "finalized")) && filtered.some(c => c.status === "finalized" && c.fileUrl) && (
                          <button
                            onClick={handleBulkDownload}
                            disabled={!!downloadProgress}
                            style={{ background: "none", border: "1px solid #333", borderRadius: 5, color: downloadProgress ? "#404040" : "#a3a3a3", fontSize: 11, fontWeight: 700, padding: "4px 10px", cursor: downloadProgress ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/></svg>
                            {downloadProgress === "done"
                              ? "All downloaded"
                              : downloadProgress
                              ? `Downloading ${downloadProgress.current} of ${downloadProgress.total}…`
                              : "Download All"}
                          </button>
                        )}
                        {selectedClips.size > 0 && (
                          <Btn onClick={() => setSelectedClips(new Set())} variant="ghost" style={{ padding: "4px 10px", fontSize: 11, marginLeft: "auto" }}>Clear</Btn>
                        )}
                      </div>
                    )}

                    {/* Clip grid */}
                    {sessionsLoading ? (
                      <ClipGridSkeleton />
                    ) : dataLoadError ? (
                      <LoadError onRetry={onRetry} />
                    ) : (
                      <>
                      <div className="cf-clip-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                        {filtered.map(clip => {
                          const isChecked = selectedClips.has(clip.id);
                          return (
                            <div key={clip.id} onClick={() => { if (selectedClips.size > 0) { toggleClip(clip.id, { stopPropagation: () => {} }); } else { setSelected(clip); setRevNote(clip.revisionNote || ""); } }} style={{ background: "#0d0d0d", border: `1px solid ${isChecked ? "#525252" : selected?.id === clip.id ? "#404040" : "#1a1a1a"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", position: "relative", outline: isChecked ? "1px solid #404040" : "none" }}>
                              {/* Checkbox */}
                              <div onClick={e => toggleClip(clip.id, e)} style={{ position: "absolute", top: 7, left: 7, zIndex: 2, width: 16, height: 16, borderRadius: 4, border: `1px solid ${isChecked ? "#fff" : "#404040"}`, background: isChecked ? "#fff" : "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#000", cursor: "pointer" }}>
                                {isChecked ? "✓" : ""}
                              </div>
                              <VideoThumb title={clip.title} duration={clip.duration} fileUrl={clip.fileUrl} />
                              <div style={{ padding: "9px 10px" }}>
                                <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 12, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clip.title}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                  <StatusDot status={clip.status} />
                                  <span style={{ color: "#9ca3af", fontSize: 10 }}>{clip.clipper}</span>
                                </div>
                                <StatusBadge status={clip.status} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {filtered.length === 0 && (
                        <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>No clips match</div>
                        </div>
                      )}
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 0", color: "#6b7280" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>No sessions yet</div>
                    <Btn onClick={() => setShowNewSession(true)} variant="ghost">+ Create First Session</Btn>
                  </div>
                )}
              </div>

              {/* Review Panel dim overlay — mobile only */}
              {selected && <div className="cf-review-overlay open" onClick={() => setSelected(null)} />}
              {/* Review Panel */}
              {selected && (
                <div className="cf-review-panel" style={{ width: 300, borderLeft: "1px solid #2a2a2a", padding: "20px 20px", overflowY: "auto", background: "#060606", flexShrink: 0 }}>
                  {/* Mobile drag handle */}
                  <div className="cf-review-handle" />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, color: "#e5e5e5", fontSize: 14, lineHeight: 1.3, paddingRight: 8 }}>{selected.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {selected.fileUrl && (
                        <button
                          onClick={() => downloadSingleClip(selected)}
                          title="Download clip"
                          style={{ background: "none", border: "1px solid #2a2a2a", borderRadius: 5, color: "#9ca3af", cursor: "pointer", padding: "3px 7px", display: "flex", alignItems: "center", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "#a3a3a3"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#525252"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/></svg>
                        </button>
                      )}
                      <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>×</button>
                    </div>
                  </div>

                  {selected.fileUrl ? (
                    <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: 6, overflow: "hidden" }}>
                      <video
                        ref={videoRef}
                        key={selected.id}
                        src={selected.fileUrl}
                        controls
                        style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
                      />
                    </div>
                  ) : (
                    <VideoThumb title={selected.title} duration={selected.duration} fileUrl={selected.fileUrl} />
                  )}

                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[["Clipper", selected.clipper], ["Folder", selected.category], ["Duration", selected.duration]].map(([l, v]) => (
                      <div key={l}><div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{l}</div><div style={{ fontSize: 12, color: "#a3a3a3" }}>{v}</div></div>
                    ))}
                  </div>

                  {/* Clipper notes */}
                  {(selected.captions || selected.sound || selected.notes) && (
                    <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 7, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Clipper Notes</div>
                      {selected.captions && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 3 }}>CAPTIONS</div><div style={{ fontSize: 12, color: "#a3a3a3", lineHeight: 1.5, fontStyle: "italic" }}>"{selected.captions}"</div></div>}
                      {selected.sound && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 3 }}>SOUND</div><div style={{ fontSize: 12, color: "#a3a3a3" }}>{selected.sound}</div></div>}
                      {selected.notes && <div><div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, marginBottom: 3 }}>NOTES</div><div style={{ fontSize: 12, color: "#a3a3a3", lineHeight: 1.5 }}>{selected.notes}</div></div>}
                    </div>
                  )}

                  {/* ── Comments ─────────────────────────────── */}
                  <div style={{ borderTop: "1px solid #2a2a2a", marginTop: 16, paddingTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Comments</div>

                    {/* Input row */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={captureTimestamp}
                          title="Capture current playback time"
                          style={{ flexShrink: 0, background: commentTs ? "#1f1f1f" : "#141414", border: `1px solid ${commentTs ? "#666" : "#444444"}`, borderRadius: 5, color: commentTs ? "#e5e5e5" : "#c0c0c0", fontSize: 12, fontWeight: 700, padding: "5px 8px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s" }}
                        >
                          {commentTs ? `⏱ ${commentTs.label}` : "⏱"}
                        </button>
                        <input
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && addComment()}
                          placeholder="Add a note…"
                          style={{ flex: 1, background: "#0d0d0d", border: "1px solid #444444", borderRadius: 5, padding: "5px 8px", color: "#e5e5e5", fontSize: 12, outline: "none", fontFamily: "inherit", minWidth: 0 }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {commentTs && (
                          <button onClick={() => { commentTsRef.current = null; setCommentTs(null); }} style={{ background: "none", border: "none", color: "#a3a3a3", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "3px 6px" }}>
                            clear time
                          </button>
                        )}
                        <button
                          onClick={addComment}
                          disabled={!commentText.trim()}
                          style={{ background: commentText.trim() ? "#fff" : "#141414", color: commentText.trim() ? "#000" : "#737373", border: `1px solid ${commentText.trim() ? "#fff" : "#444444"}`, borderRadius: 5, fontSize: 12, fontWeight: 700, padding: "4px 12px", cursor: commentText.trim() ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.15s" }}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Comment list */}
                    {comments.length > 0 && console.log("[comments] rendering:", comments.map(c => ({ id: c.id, timestamp_label: c.timestamp_label, timestamp_seconds: c.timestamp_seconds, comment: c.comment })))}
                    {comments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {comments.map(c => (
                          <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", group: true }}>
                            {c.timestamp_label ? (
                              <button
                                onClick={() => seekTo(c.timestamp_seconds)}
                                title={`Seek to ${c.timestamp_label}`}
                                style={{ flexShrink: 0, background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: 4, color: "#d4d4d4", fontSize: 11, fontWeight: 800, padding: "2px 6px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}
                              >
                                {c.timestamp_label}
                              </button>
                            ) : (
                              <div style={{ width: 6, marginTop: 5, flexShrink: 0, height: 6, borderRadius: "50%", background: "#3a3a3a" }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: "#a3a3a3", lineHeight: 1.5 }}>{c.comment}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                                <span style={{ fontSize: 10, color: "#9ca3af" }}>
                                  {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {new Date(c.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                </span>
                                <button onClick={() => deleteComment(c.id)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: 0, lineHeight: 1 }}>
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {comments.length === 0 && (
                      <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>No comments yet.</div>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid #2a2a2a", marginTop: 16, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Route</div>

                    <Btn onClick={() => updateClip(selected.id, { status: "finalized", revisionNote: "" })} variant={selected.status === "finalized" ? "primary" : "ghost"} style={{ width: "100%", padding: "9px", textAlign: "center" }}>✓ Approve</Btn>

                    <textarea value={revNote} onChange={e => setRevNote(e.target.value)} placeholder="Revision notes for clipper..." rows={2} style={{ width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px", color: "#a3a3a3", fontSize: 12, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    <Btn onClick={() => updateClip(selected.id, { status: "revision", revisionNote: revNote })} variant={selected.status === "revision" ? "warning" : "ghost"} style={{ width: "100%", padding: "9px" }}>↩ Request Revision</Btn>

                    <Btn onClick={() => updateClip(selected.id, { status: "discard", revisionNote: "" })} variant="ghost" style={{ width: "100%", padding: "9px", color: "#9ca3af" }}>✕ Discard</Btn>

                    <div style={{ borderTop: "1px solid #2a2a2a", marginTop: 4, paddingTop: 8 }}>
                      <Btn onClick={() => setSelected(null)} variant="ghost" style={{ width: "100%", padding: "9px", textAlign: "center" }}>← Back to clips</Btn>
                    </div>

                    {savedClipId === selected.id && (
                      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.04em", marginTop: 2 }}>✓ Saved</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

function Landing({ onLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap'); * { box-sizing: border-box; }`}</style>

      <nav style={{ padding: "0 48px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2a2a2a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, background: "#fff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000" }}>✂</div>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ClipFlow</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onLogin("creator")} style={{ background: "transparent", color: "#9ca3af", border: "1px solid #2a2a2a", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Log In</button>
          <button onClick={() => onLogin("creator")} style={{ background: "#fff", color: "#000", border: "none", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Get Started</button>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#111", border: "1px solid #2a2a2a", borderRadius: 99, padding: "4px 14px", marginBottom: 36, color: "#9ca3af", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Clip Review Platform
        </div>

        <h1 style={{ fontSize: "clamp(38px, 6vw, 70px)", fontWeight: 900, color: "#fff", margin: "0 0 20px", letterSpacing: "-0.045em", lineHeight: 1.0, maxWidth: 700 }}>
          One place for your<br />entire clip workflow.
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 16, maxWidth: 440, lineHeight: 1.75, margin: "0 0 40px" }}>
          Your team uploads. You review, approve, and route. No Drive folders. No messy spreadsheets.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onLogin("creator")} style={{ background: "#fff", color: "#000", border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Start free →</button>
          <button onClick={() => onLogin("clipper")} style={{ background: "transparent", color: "#9ca3af", border: "1px solid #2a2a2a", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>I'm a clipper</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 40, flexWrap: "wrap", justifyContent: "center" }}>
          {["Custom folders", "Video sessions", "Revision feedback", "Clipper brief", "Multi-account"].map(f => (
            <span key={f} style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", color: "#9ca3af", padding: "5px 13px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{f}</span>
          ))}
        </div>

        {/* Preview mockup */}
        <div style={{ marginTop: 64, width: "100%", maxWidth: 820, background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12, overflow: "hidden", position: "relative" }}>
          {/* Fake topbar */}
          <div style={{ height: 40, borderBottom: "1px solid #141414", display: "flex", alignItems: "center", padding: "0 20px", gap: 12 }}>
            <div style={{ width: 18, height: 18, background: "#141414", borderRadius: 5 }} />
            <div style={{ width: 60, height: 8, background: "#141414", borderRadius: 4 }} />
            <div style={{ flex: 1 }} />
            <div style={{ width: 50, height: 18, background: "#fff", borderRadius: 4, opacity: 0.9 }} />
          </div>
          <div style={{ display: "flex", height: 220 }}>
            {/* Fake sidebar */}
            <div style={{ width: 160, borderRight: "1px solid #141414", padding: "12px 0" }}>
              {["Mar 21 — Solo Q&A", "Mar 18 — Alex Hormozi", "Mar 14 — Gary Vee"].map((s, i) => (
                <div key={s} style={{ padding: "8px 14px", borderLeft: i === 0 ? "2px solid #fff" : "2px solid transparent" }}>
                  <div style={{ height: 7, background: i === 0 ? "#3a3a3a" : "#1a1a1a", borderRadius: 3, marginBottom: 4, width: "80%" }} />
                  <div style={{ height: 5, background: "#141414", borderRadius: 3, width: "55%" }} />
                </div>
              ))}
            </div>
            {/* Fake clip grid */}
            <div style={{ flex: 1, padding: "14px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: 52, background: "#141414" }} />
                    <div style={{ padding: "7px 8px" }}>
                      <div style={{ height: 5, background: "#1f1f1f", borderRadius: 3, marginBottom: 4, width: "75%" }} />
                      <div style={{ height: 12, background: i % 3 === 0 ? "rgba(229,229,229,0.1)" : i % 3 === 1 ? "rgba(249,115,22,0.1)" : "#141414", borderRadius: 3, width: "50%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #000 0%, transparent 50%)", pointerEvents: "none" }} />
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "20px", borderTop: "1px solid #2a2a2a", color: "#6b7280", fontSize: 11, fontWeight: 600 }}>
        © 2025 CLIPFLOW
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState("");
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [brief, setBrief] = useState(INITIAL_BRIEF);
  const [guidelines, setGuidelines] = useState(INITIAL_GUIDELINES);
  const [agreement, setAgreement] = useState(INITIAL_AGREEMENT);
  const [signatures, setSignatures] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clipperSigned, setClipperSigned] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [showAgreementGate, setShowAgreementGate] = useState(null); // null = not checked yet
  const [activity, setActivity] = useState([]);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [dataLoadError, setDataLoadError] = useState(false);
  const loadTimeoutRef = useRef(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState(false);
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState("");
  const [creatorWorkspaces, setCreatorWorkspaces] = useState([]);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = windowWidth <= 480;
  const isTablet = windowWidth <= 768;
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  // True if there is a pending workspace invite saved in localStorage.
  // This drives the invite-specific login UI before the user authenticates.
  const [hasPendingInvite, setHasPendingInvite] = useState(() =>
    !!localStorage.getItem("pendingWorkspaceInvite")
  );

  // On mount: if the URL contains ?workspace_id= (the invite link format),
  // persist it to localStorage immediately so it survives any auth redirects,
  // then strip the param from the URL so it isn't accidentally re-triggered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workspaceId = params.get("workspace_id");
    const inviteRole = params.get("invite_role"); // "manager" or absent (defaults to clipper)
    console.log("[invite] URL params:", window.location.search);
    console.log("[invite] workspace_id read from URL:", workspaceId ?? "(none)", "| invite_role:", inviteRole ?? "clipper");
    if (workspaceId) {
      localStorage.setItem("pendingWorkspaceInvite", workspaceId);
      if (inviteRole === "manager") {
        localStorage.setItem("pendingInviteRole", "manager");
      } else {
        localStorage.removeItem("pendingInviteRole");
      }
      console.log("[invite] stored in localStorage pendingWorkspaceInvite:", workspaceId, "| pendingInviteRole:", inviteRole ?? "clipper");
      setHasPendingInvite(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      console.log("[invite] no workspace_id in URL — checking localStorage:", localStorage.getItem("pendingWorkspaceInvite") ?? "(none)");
    }
  }, []);

  // Refs so async save functions always see current values without stale closures
  const workspaceRef = useRef(null);
  const userRef = useRef(null);
  const sessionsRef = useRef([]);
  const settingsRecordId = useRef(null);
  const agreementRecordId = useRef(null);
  const loadingUserDataRef = useRef(false); // guard against concurrent loadUserData calls

  useEffect(() => { workspaceRef.current = workspace; }, [workspace]);
  useEffect(() => { userRef.current = user; }, [user]);

  // 10-second timeout: if data is still loading, surface an error + retry option
  useEffect(() => {
    const loading = sessionsLoading || contentLoading;
    if (loading) {
      setDataLoadError(false);
      loadTimeoutRef.current = setTimeout(() => setDataLoadError(true), 10000);
    } else {
      clearTimeout(loadTimeoutRef.current);
    }
    return () => clearTimeout(loadTimeoutRef.current);
  }, [sessionsLoading, contentLoading]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  // ─── Agreement gate check ─────────────────────────────────────────────────────
  // Two-step sequential check so we never rely on workspace state being populated.
  // Step 1: get the clipper's workspace_id + signed_agreement from workspace_members.
  // Step 2: using that workspace_id, look for an active agreement.
  useEffect(() => {
    if (!user) return;
    if (role !== "clipper") {
      // Not a clipper — no gate needed, allow render
      if (workspaceReady) setShowAgreementGate(false);
      return;
    }

    const checkAgreementGate = async () => {
      // Use the workspace already resolved and set during loadUserData.
      // Querying workspace_members without a workspace filter can return a
      // different workspace row if the clipper belongs to more than one workspace.
      const ws = workspaceRef.current;
      console.log("[agreement gate] workspaceRef.current:", ws?.id ?? "(none)");

      if (!ws) {
        console.log("[agreement gate] no workspace loaded yet — skipping gate");
        setShowAgreementGate(false);
        return;
      }

      // Step 1 — get the member row for this user in this specific workspace
      const memberRes = await supabase
        .from("workspace_members")
        .select("id, workspace_id, signed_agreement")
        .eq("user_id", user.id)
        .eq("workspace_id", ws.id)
        .limit(1);

      console.log("[agreement gate] step 1 — workspace_members result:", memberRes);

      const member = memberRes.data?.[0];
      console.log("[agreement gate] member row:", member);

      if (!member) {
        console.log("[agreement gate] no membership found for workspace", ws.id, "— skipping gate");
        setShowAgreementGate(false);
        return;
      }

      // Managers do not need to sign the agreement
      if (member.role === "manager") {
        console.log("[agreement gate] user is a manager — skipping agreement gate");
        setShowAgreementGate(false);
        return;
      }

      // Step 2 — find an enabled agreement for this workspace
      const agreementRes = await supabase
        .from("agreements")
        .select("id, title, body, enabled")
        .eq("workspace_id", ws.id)
        .eq("enabled", true)
        .limit(1);

      console.log("[agreement gate] step 2 — agreements result:", agreementRes);

      const activeAgreement = agreementRes.data?.[0];
      console.log("[agreement gate] active agreement:", activeAgreement);
      console.log("[agreement gate] signed_agreement:", member.signed_agreement);

      const needsToSign = !!activeAgreement && !member.signed_agreement;
      console.log("[agreement gate] needsToSign:", needsToSign);

      if (activeAgreement) {
        setAgreement({ enabled: true, title: activeAgreement.title, body: activeAgreement.body });
        agreementRecordId.current = activeAgreement.id;
      }

      setShowAgreementGate(needsToSign);
    };

    checkAgreementGate().catch(console.error);
  }, [workspaceReady, role, user?.id]); // workspaceReady kept so check re-runs after load completes

  // ─── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    // Safety net: if auth hasn't resolved within 3 seconds, unblock the UI.
    const authTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("[auth] timeout — forcing authLoading=false");
        setAuthLoading(false);
        setWorkspaceReady(true);
      }
    }, 3000);

    // ── Step 1: read the stored session from localStorage / in-memory cache.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      clearTimeout(authTimeout);

      console.log("[auth] getSession result:", {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        accessToken: session?.access_token ? session.access_token.slice(0, 20) + "…" : null,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      });

      if (session?.user) {
        setUser(session.user);
        userRef.current = session.user;
        loadUserData(session.user.id).catch(console.error);
      } else {
        // No session — nothing to load, unblock immediately.
        setWorkspaceReady(true);
      }

      setAuthLoading(false);
    }).catch((e) => {
      console.error("ClipFlow session error:", e);
      clearTimeout(authTimeout);
      if (mounted) {
        setAuthLoading(false);
        setWorkspaceReady(true);
      }
    });

    // ── Step 2: keep auth state in sync for subsequent events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        // User clicked the reset link in their email — show the set-new-password form.
        // Unblock all gates immediately so showPasswordReset renders without waiting for workspace load.
        setShowPasswordReset(true);
        setAuthLoading(false);
        setWorkspaceReady(true);
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        userRef.current = session.user;
        loadUserData(session.user.id).catch(console.error);
      } else if (event === "SIGNED_OUT") {
        clearUserState();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ─── Notifications ────────────────────────────────────────────────────────────

  const loadNotifications = async (userId) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  const insertNotification = async ({ userId, type, message, clipId = null, sessionTitle = null }) => {
    const ws = workspaceRef.current;
    if (!ws || !userId) {
      console.warn("[insertNotification] SKIPPED — missing ws or userId:", { ws: !!ws, userId });
      return;
    }
    const payload = {
      user_id: userId,
      workspace_id: ws.id,
      type,
      message,
      clip_id: clipId || null,
      session_title: sessionTitle || null,
      read: false,
    };
    console.log("[insertNotification] inserting:", payload);
    const result = await supabase.from("notifications").insert(payload);
    console.log("[insertNotification] response — error:", result.error, "| status:", result.status, "| data:", result.data);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotifClick = async (notif) => {
    setNotifOpen(false);
    if (!notif.read) {
      supabase.from("notifications").update({ read: true }).eq("id", notif.id).then(() => {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    if (notif.clip_id) {
      // Find which session contains this clip so we can navigate to it
      for (const s of sessionsRef.current) {
        const clip = s.clips.find(c => c.id === notif.clip_id);
        if (clip) { setJumpTo({ sessionId: s.id, clipId: notif.clip_id }); return; }
      }
      // Clipper view — no session lookup needed, just pass clip_id
      setJumpTo({ sessionId: null, clipId: notif.clip_id });
    }
  };

  // Realtime: push new notifications into state as they arrive
  useEffect(() => {
    if (!user?.id) return;
    loadNotifications(user.id).catch(console.error);
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev => [payload.new, ...prev].slice(0, 20))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ─── Load ─────────────────────────────────────────────────────────────────────

  // Adds a user to a workspace as a clipper (idempotent).
  // Reads the pending workspace ID from localStorage, inserts the membership
  // if not already present, then clears the stored invite.
  const joinPendingWorkspace = async (userId) => {
    const workspaceId = localStorage.getItem("pendingWorkspaceInvite");
    const pendingRole = localStorage.getItem("pendingInviteRole") || "clipper";
    console.log("[joinPendingWorkspace] localStorage pendingWorkspaceInvite:", workspaceId ?? "(none)", "| pendingInviteRole:", pendingRole);
    if (!workspaceId) return null;

    // Upsert is atomic — if the row already exists (same workspace_id + user_id)
    // it updates in place; if not, it inserts. No race condition, no duplicates.
    const upsertRow = { workspace_id: workspaceId, user_id: userId, role: pendingRole, signed_agreement: false };
    console.log("[joinPendingWorkspace] upserting into workspace_members:", upsertRow);
    const { data: upsertData, error: upsertError } = await supabase
      .from("workspace_members")
      .upsert(upsertRow, { onConflict: "workspace_id,user_id" })
      .select();
    console.log("[joinPendingWorkspace] upsert result:", { upsertData, upsertError });

    if (upsertError) {
      console.error("[joinPendingWorkspace] upsert failed:", upsertError);
      return null;
    }

    localStorage.removeItem("pendingWorkspaceInvite");
    localStorage.removeItem("pendingInviteRole");
    setHasPendingInvite(false);
    return workspaceId;
  };

  const loadUserData = async (userId) => {
    if (loadingUserDataRef.current) return;
    loadingUserDataRef.current = true;
    try {
      // Join the pending invite workspace if one exists. Capture the returned
      // workspace_id so the clipper branch can use it directly without re-querying.
      const joinedWorkspaceId = await joinPendingWorkspace(userId);

      const { data: profile } = await supabase
        .from("profiles").select("role, full_name").eq("id", userId).single();

      const profileRole = profile?.role || "creator";
      setUserName(profile?.full_name || "");

      let ws = null;

      // Determine the true routing role. profiles.role may have defaulted to
      // "creator" if the DB CHECK constraint rejected "manager" before the
      // migration was run. To be safe, always check workspace_members first for
      // any manager/clipper membership — if found, route non-creator regardless
      // of what profiles.role says.
      let resolvedMemberRole = null; // "manager" | "clipper" | null
      if (profileRole !== "creator" || joinedWorkspaceId) {
        // Non-creator profile OR just joined via invite — check workspace_members
        let memberQuery = supabase
          .from("workspace_members")
          .select("workspace_id, role")
          .eq("user_id", userId)
          .in("role", ["manager", "clipper"]);
        if (joinedWorkspaceId) memberQuery = memberQuery.eq("workspace_id", joinedWorkspaceId);
        const { data: memberRows } = await memberQuery.limit(1);
        if (memberRows?.[0]) {
          resolvedMemberRole = memberRows[0].role; // "manager" or "clipper"
        }
      }

      const effectiveRole = resolvedMemberRole || profileRole;
      setRole(effectiveRole);

      if (effectiveRole === "creator") {
        // Load all workspaces for this creator
        const { data: allWorkspaces } = await supabase
          .from("workspaces").select("*").eq("creator_id", userId).order("created_at", { ascending: true });

        let workspaceList = allWorkspaces || [];

        if (workspaceList.length === 0) {
          // Safety check: before creating a workspace, confirm there are no
          // manager/clipper memberships (guards against mis-routed managers).
          const { data: anyMembership } = await supabase
            .from("workspace_members")
            .select("workspace_id, role")
            .eq("user_id", userId)
            .in("role", ["manager", "clipper"])
            .limit(1);

          if (anyMembership?.[0]) {
            // User was incorrectly routed to creator branch — re-route as manager/clipper
            const actualRole = anyMembership[0].role;
            setRole(actualRole);
            const { data: wsData } = await supabase
              .from("workspaces").select("*").eq("id", anyMembership[0].workspace_id).single();
            ws = wsData;
          } else {
            // True first-time creator: create a default workspace
            const { data: newWs } = await supabase
              .from("workspaces").insert({ name: "My Workspace", creator_id: userId })
              .select().single();
            if (newWs) {
              await supabase.from("workspace_members")
                .insert({ workspace_id: newWs.id, user_id: userId, role: "owner" });
              workspaceList = [newWs];
            }
          }
        }

        if (!ws) {
          setCreatorWorkspaces(workspaceList);
          // Restore last-used workspace from localStorage, fallback to first
          const savedId = localStorage.getItem("clipflow_active_workspace");
          ws = workspaceList.find(w => w.id === savedId) || workspaceList[0] || null;
          if (ws) localStorage.setItem("clipflow_active_workspace", ws.id);
        }
      } else {
        // Manager or clipper: if we just joined via invite link, use that workspace_id
        // directly. Otherwise fall back to the first matching membership row.
        let workspaceId = joinedWorkspaceId;
        if (!workspaceId) {
          const { data: memberships } = await supabase
            .from("workspace_members").select("workspace_id")
            .eq("user_id", userId)
            .in("role", ["manager", "clipper"])
            .limit(1);
          workspaceId = memberships?.[0]?.workspace_id;
        }
        console.log("[loadUserData] manager/clipper resolving workspace_id:", workspaceId, "| joinedFromInvite:", !!joinedWorkspaceId, "| effectiveRole:", effectiveRole);
        if (workspaceId) {
          const { data: wsData } = await supabase
            .from("workspaces").select("*").eq("id", workspaceId).single();
          ws = wsData;
        }

        // Confirm actual workspace_members role (may differ from profile-level role)
        if (ws) {
          const { data: memberRow } = await supabase
            .from("workspace_members").select("role")
            .eq("workspace_id", ws.id).eq("user_id", userId).single();
          if (memberRow?.role) setRole(memberRow.role);
        }
      }

      setWorkspace(ws);
      workspaceRef.current = ws;

      if (ws) {
        await Promise.all([loadSessions(ws.id), loadWorkspaceContent(ws.id)]);
        // Onboarding: show welcome flow for creators who haven't completed it yet
        const onboardingKey = `onboarding_complete_${ws.id}`;
        const onboardingKeyValue = localStorage.getItem(onboardingKey);
        console.log("[onboarding] effectiveRole:", effectiveRole);
        console.log("[onboarding] workspace_id:", ws.id);
        console.log("[onboarding] localStorage key:", onboardingKey);
        console.log("[onboarding] localStorage value:", onboardingKeyValue);
        console.log("[onboarding] showOnboarding (before set):", false);
        if (effectiveRole === "creator") {
          if (!onboardingKeyValue) {
            console.log("[onboarding] key not found — setting showOnboarding to true");
            setShowOnboarding(true);
          } else {
            console.log("[onboarding] key found — skipping onboarding");
          }
        } else {
          console.log("[onboarding] role is not creator — skipping onboarding check");
        }
      }
    } catch (err) {
      console.error("[loadUserData] error:", err);
    } finally {
      setWorkspaceReady(true);
      loadingUserDataRef.current = false;
    }
  };

  const loadSessions = async (workspaceId) => {
    setSessionsLoading(true);
    try {
    const [sessRes, clipsRes] = await Promise.all([
      supabase.from("sessions").select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      supabase.from("clips").select("*, profiles(full_name)")
        .eq("workspace_id", workspaceId),
    ]);
    if (!sessRes.data) return;

    const clipsBySession = {};
    (clipsRes.data || []).forEach(c => {
      const clip = {
        id: c.id,
        title: c.title,
        category: c.category || "Other",
        status: c.status || "pending",
        duration: c.duration || "0:00",
        clipper: c.profiles?.full_name || "Unknown",
        clipperId: c.clipper_id || null,
        captions: c.captions || "",
        sound: c.sound || "",
        notes: c.notes || "",
        revisionNote: c.revision_note || "",
        fileUrl: c.file_url || "",
        sessionTitle: null, // filled in below when building per-session arrays
      };
      if (!clipsBySession[c.session_id]) clipsBySession[c.session_id] = [];
      clipsBySession[c.session_id].push(clip);
    });

    const mapped = sessRes.data.map(s => ({
      id: s.id,
      date: s.date || new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      title: s.title,
      footageUrl: s.footage_url || "",
      brief: (s.brief && typeof s.brief === "object" && Object.keys(s.brief).length > 0) ? s.brief : { ...INITIAL_BRIEF },
      clips: (clipsBySession[s.id] || []).map(c => ({ ...c, sessionTitle: s.title, sessionDate: s.date || new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) })),
    }));
    setSessions(mapped);
    sessionsRef.current = mapped;
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadWorkspaceContent = async (workspaceId) => {
    setContentLoading(true);
    try {
    const [actRes, agreeRes, settingsRes] = await Promise.all([
      supabase.from("activity")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("agreements")
        .select("*")
        .eq("workspace_id", workspaceId)
        .limit(1),
      supabase.from("workspace_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .limit(1),
    ]);

    // ── Activity ──────────────────────────────────────────────────────────────
    setActivity((actRes.data || []).map(a => ({
      id: a.id,
      type: a.type,
      text: a.text || "",
      session: a.session_title || "",
      time: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        + " at " + new Date(a.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    })));

    // ── Workspace settings (brief + guidelines) ────────────────────────────────
    const settings = settingsRes.data?.[0];
    if (settings) {
      settingsRecordId.current = settings.id;
      if (settings.brief) {
        try { setBrief(typeof settings.brief === "string" ? JSON.parse(settings.brief) : settings.brief); } catch {}
      }
      if (settings.guidelines) {
        try { setGuidelines(typeof settings.guidelines === "string" ? JSON.parse(settings.guidelines) : settings.guidelines); } catch {}
      }
    }

    // ── Agreement ─────────────────────────────────────────────────────────────
    const agree = agreeRes.data?.[0];
    if (agree) {
      agreementRecordId.current = agree.id;
      setAgreement({ enabled: agree.enabled ?? false, title: agree.title, body: agree.body });

      const { data: sigData } = await supabase
        .from("signatures").select("*")
        .eq("agreement_id", agree.id);
      if (sigData) {
        setSignatures(sigData.map(sig => ({
          name: sig.full_name || "Unknown",
          signedAt: new Date(sig.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            + " at " + new Date(sig.signed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        })));
      }
    }

    // ── Team members (clippers) ───────────────────────────────────────────────
    console.log("[loadTeamMembers] querying workspace_id:", workspaceId);
    const { data: membersData, error: membersError } = await supabase
      .from("workspace_members")
      .select("user_id, role, created_at, signed_agreement")
      .eq("workspace_id", workspaceId)
      .in("role", ["clipper", "manager"]);
    console.log("[loadTeamMembers] workspace_members response — data:", membersData, "| error:", membersError);
    if (membersData?.length) {
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles").select("id, full_name, email").in("id", userIds);
      console.log("[loadTeamMembers] profiles response — data:", profilesData, "| error:", profilesError);
      const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      const mapped = membersData.map(m => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        name: profileMap[m.user_id]?.full_name || "Unknown",
        email: profileMap[m.user_id]?.email || "",
        hasSigned: !!m.signed_agreement,
      }));
      console.log("[loadTeamMembers] final mapped members:", mapped);
      setTeamMembers(mapped);
    } else {
      console.log("[loadTeamMembers] no members found (or error). membersData:", membersData, "| membersError:", membersError);
      setTeamMembers([]);
    }

    // ── Check if current clipper has already signed ────────────────────────────
    const u = userRef.current;
    if (u) {
      const { data: memberRow } = await supabase
        .from("workspace_members").select("signed_agreement")
        .eq("workspace_id", workspaceId).eq("user_id", u.id)
        .limit(1);
      if (memberRow?.[0]?.signed_agreement) setClipperSigned(true);
    }
    } finally {
      setContentLoading(false);
    }
  };

  // ─── Workspace switching ──────────────────────────────────────────────────────

  const switchWorkspace = async (ws) => {
    setWorkspace(ws);
    workspaceRef.current = ws;
    // Reset all workspace-scoped data before loading the new workspace
    setSessions([]);
    sessionsRef.current = [];
    setActivity([]);
    setSignatures([]);
    setTeamMembers([]);
    setGuidelines(INITIAL_GUIDELINES);
    setAgreement(INITIAL_AGREEMENT);
    setBrief(INITIAL_BRIEF);
    settingsRecordId.current = null;
    agreementRecordId.current = null;
    localStorage.setItem("clipflow_active_workspace", ws.id);
    await Promise.all([loadSessions(ws.id), loadWorkspaceContent(ws.id)]);
  };

  const handleCreateWorkspace = async (name) => {
    const u = userRef.current;
    if (!u || !name.trim()) return;
    const { data: newWs } = await supabase
      .from("workspaces").insert({ name: name.trim(), creator_id: u.id })
      .select().single();
    if (!newWs) return;
    await supabase.from("workspace_members")
      .insert({ workspace_id: newWs.id, user_id: u.id, role: "owner" });
    setCreatorWorkspaces(prev => [...prev, newWs]);
    await switchWorkspace(newWs);
  };

  // ─── Save helpers ─────────────────────────────────────────────────────────────

  const handleSetBrief = async (newBrief) => {
    setBrief(newBrief);
    const ws = workspaceRef.current;
    if (!ws) return;
    const value = JSON.stringify(newBrief);
    if (settingsRecordId.current) {
      await supabase.from("workspace_settings").update({ brief: value }).eq("id", settingsRecordId.current);
    } else {
      const { data } = await supabase.from("workspace_settings")
        .insert({ workspace_id: ws.id, brief: value })
        .select().single();
      if (data) settingsRecordId.current = data.id;
    }
  };

  const handleUpdateSessionBrief = async (sessionId, newBrief) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, brief: newBrief } : s));
    sessionsRef.current = sessionsRef.current.map(s => s.id === sessionId ? { ...s, brief: newBrief } : s);
    await supabase.from("sessions").update({ brief: newBrief }).eq("id", sessionId);
  };

  const handleSetGuidelines = async (newGuidelines) => {
    setGuidelines(newGuidelines);
    const ws = workspaceRef.current;
    if (!ws) return;
    const value = JSON.stringify(newGuidelines);
    if (settingsRecordId.current) {
      await supabase.from("workspace_settings").update({ guidelines: value }).eq("id", settingsRecordId.current);
    } else {
      const { data } = await supabase.from("workspace_settings")
        .insert({ workspace_id: ws.id, guidelines: value })
        .select().single();
      if (data) settingsRecordId.current = data.id;
    }
  };

  const handleSetAgreement = async (newAgreement) => {
    setAgreement(newAgreement);
    const ws = workspaceRef.current;
    if (!ws) return;
    const payload = { title: newAgreement.title, body: newAgreement.body, enabled: newAgreement.enabled };
    if (agreementRecordId.current) {
      await supabase.from("agreements").update(payload).eq("id", agreementRecordId.current);
    } else {
      const { data } = await supabase.from("agreements")
        .insert({ workspace_id: ws.id, ...payload })
        .select().single();
      if (data) agreementRecordId.current = data.id;
    }
  };

  // Wraps setActivity: updates local state and persists new items to DB
  const handleSetActivity = (updater) => {
    setActivity(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const newCount = next.length - prev.length;
      if (newCount > 0) {
        const ws = workspaceRef.current;
        if (ws) {
          next.slice(0, newCount).forEach(item => {
            supabase.from("activity").insert({
              workspace_id: ws.id,
              type: item.type,
              text: item.text,
              session_title: item.session || "",
            });
          });
        }
      }
      return next;
    });
  };

  // Inserts a new session row, updates local state, returns the real UUID
  const handleAddSession = async (date, title) => {
    const ws = workspaceRef.current;
    console.log("[handleAddSession] workspace:", ws);
    if (!ws) {
      console.error("[handleAddSession] Aborted — no workspace in ref");
      return null;
    }

    const insertPayload = { workspace_id: ws.id, title, date, footage_url: "" };
    console.log("[handleAddSession] Inserting into sessions:", insertPayload);

    // Optimistic update: add a placeholder immediately so the UI responds instantly
    const tempId = "__tmp__" + Date.now();
    const tempSession = { id: tempId, date, title, footageUrl: "", brief: { ...INITIAL_BRIEF }, clips: [] };
    setSessions(p => [tempSession, ...p]);
    sessionsRef.current = [tempSession, ...sessionsRef.current];

    const { data, error } = await supabase.from("sessions")
      .insert(insertPayload)
      .select().single();

    console.log("[handleAddSession] Supabase response — data:", data, "error:", error);

    if (!data) {
      console.error("[handleAddSession] Insert failed. Full error:", JSON.stringify(error, null, 2));
      setSessions(p => p.filter(s => s.id !== tempId));
      sessionsRef.current = sessionsRef.current.filter(s => s.id !== tempId);
      return null;
    }

    const realSession = {
      id: data.id,
      date: data.date || date,
      title: data.title,
      footageUrl: "",
      brief: { ...INITIAL_BRIEF },
      clips: [],
    };
    setSessions(p => p.map(s => s.id === tempId ? realSession : s));
    sessionsRef.current = sessionsRef.current.map(s => s.id === tempId ? realSession : s);
    return data.id;
  };

  // Persists a footage URL change to the sessions table
  const handleUpdateSessionFootage = async (sessionId, url) => {
    await supabase.from("sessions").update({ footage_url: url }).eq("id", sessionId);
  };

  // Persists a clip status / revision_note change to the clips table
  const handleUpdateClip = async (clipId, updates) => {
    const ws = workspaceRef.current;

    // ── 1. Build DB payload ────────────────────────────────────────────────────
    const payload = {};
    if (updates.status) payload.status = updates.status;
    if (updates.revisionNote !== undefined) payload.revision_note = updates.revisionNote;

    if (Object.keys(payload).length === 0) return;

    const { data: updateData, error } = await supabase.from("clips").update(payload).eq("id", clipId).select();
    if (error) {
      console.error("[handleUpdateClip] clips update failed:", error);
      return;
    }

    // ── 2. Log activity if a status change was made ────────────────────────────
    if (updates.status && ws) {
      // Find the clip's title, session title, and clipper id from current sessions state
      let clipTitle = "";
      let sessionTitle = "";
      let clipperId = null;
      for (const s of sessionsRef.current) {
        const match = s.clips.find(c => c.id === clipId);
        if (match) { clipTitle = match.title; sessionTitle = s.title; clipperId = match.clipperId; break; }
      }

      // Map UI status → activity table type enum
      const activityType = updates.status === "finalized"
        ? "approval"
        : updates.status === "revision"
        ? "revision_request"
        : "rejection";

      const activityText = updates.status === "finalized"
        ? `${clipTitle} approved`
        : updates.status === "revision"
        ? `${clipTitle} sent for revision${updates.revisionNote ? `: "${updates.revisionNote}"` : ""}`
        : `${clipTitle} discarded`;

      const now = new Date();
      const timeStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        + " at " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

      // Insert to DB
      await supabase.from("activity").insert({
        workspace_id: ws.id,
        type: activityType,
        text: activityText,
        session_title: sessionTitle,
      });

      // Update local activity state so the Activity tab reflects it immediately
      setActivity(prev => [{ id: Date.now(), type: activityType, text: activityText, session: sessionTitle, time: timeStr }, ...prev]);

      // ── 3. Insert in-app notification for the clipper ────────────────────────
      console.log("[notif] clip status change — clipperId:", clipperId, "| status:", updates.status, "| clipTitle:", clipTitle);
      if (clipperId) {
        const notifMsg = updates.status === "finalized"
          ? `Your clip "${clipTitle}" was approved`
          : updates.status === "revision"
          ? `Revision requested on "${clipTitle}"${updates.revisionNote ? `: ${updates.revisionNote}` : ""}`
          : `Your clip "${clipTitle}" was discarded`;
        console.log("[notif] sending clipper notification:", { clipperId, notifMsg });
        insertNotification({ userId: clipperId, type: updates.status, message: notifMsg, clipId, sessionTitle }).catch(console.error);
      } else {
        console.warn("[notif] clipperId is null — cannot notify clipper for clip:", clipId);
      }

      // ── 4. Send email notification for revision and approval ─────────────────
      if ((updates.status === "finalized" || updates.status === "revision") && clipperId) {
        sendClipNotificationEmail({ clipperId, clipTitle, status: updates.status, revisionNote: updates.revisionNote }).catch(console.error);
      }
    }

    // ── 4. Reload clips for the workspace so grid statuses refresh ─────────────
    if (ws) await loadSessions(ws.id);
  };

  // Looks up the clipper's email then fires the send-notification edge function.
  // Fire-and-forget — called with .catch() so email errors never block the UI.
  const sendClipNotificationEmail = async ({ clipperId, clipTitle, status, revisionNote }) => {
    const { data: profile } = await supabase
      .from("profiles").select("email, full_name").eq("id", clipperId).single();
    if (!profile?.email) return;

    const appUrl = window.location.origin + window.location.pathname;
    const isRevision = status === "revision";

    const subject = isRevision
      ? `Revision requested on "${clipTitle}"`
      : `Your clip "${clipTitle}" was approved`;

    const html = buildClipEmail({ clipTitle, isRevision, revisionNote, appUrl });

    await supabase.functions.invoke("send-notification", {
      body: { to: profile.email, subject, html },
    });
  };

  // Returns video duration string "m:ss" from a File object
  const getVideoDuration = (file) => new Promise(resolve => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const s = Math.round(video.duration) || 0;
      resolve(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    };
    video.onerror = () => resolve("0:00");
    video.src = URL.createObjectURL(file);
  });

  // Uploads a video file to Supabase Storage via XHR (for real progress events),
  // inserts a clips row, and logs an activity entry.
  const handleUploadClip = async ({ file, sessionId, category, title, captions, sound, notes }, onProgress) => {
    const ws = workspaceRef.current;
    const u = userRef.current;
    if (!ws || !u) throw new Error("Not authenticated");

    // ── 1. Get auth token for the XHR request ──────────────────────────────────
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token;
    if (!token) throw new Error("No auth token — please sign in again");

    // ── 2. Ensure the "clips" storage bucket exists (no-op if already present) ─
    await supabase.storage.createBucket("clips", { public: true }).catch(() => {});

    // ── 3. Build the storage path and upload via XHR for progress events ───────
    const ext = file.name.split(".").pop() || "mp4";
    const storagePath = `${ws.id}/${sessionId}/${Date.now()}.${ext}`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 95)); // cap at 95 until DB insert done
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Storage upload failed (${xhr.status}): ${xhr.responseText}`));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.open("POST", `${supabaseUrl}/storage/v1/object/clips/${storagePath}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.send(file);
    });

    // ── 4. Get public URL ───────────────────────────────────────────────────────
    const { data: { publicUrl } } = supabase.storage.from("clips").getPublicUrl(storagePath);

    // ── 5. Get video duration from the file ────────────────────────────────────
    const duration = await getVideoDuration(file);

    // ── 6. Insert clip row ─────────────────────────────────────────────────────
    const { data: clipData, error: clipError } = await supabase.from("clips").insert({
      session_id: sessionId,
      workspace_id: ws.id,
      clipper_id: u.id,
      title,
      category,
      captions,
      sound,
      notes,
      file_url: publicUrl,
      status: "pending",
      duration,
      revision_note: "",
    }).select().single();

    if (clipError) throw new Error(`Failed to save clip: ${clipError.message}`);

    // ── 7. Insert activity entry ────────────────────────────────────────────────
    const sessionTitle = sessionsRef.current.find(s => s.id === sessionId)?.title || "";
    await supabase.from("activity").insert({
      workspace_id: ws.id,
      type: "upload",
      text: `${userName || "A clipper"} uploaded ${title}`,
      session_title: sessionTitle,
    });

    // Notify the workspace creator (not if the creator is uploading themselves)
    console.log("[notif] upload — ws.creator_id:", ws.creator_id, "| uploader u.id:", u.id, "| clipData.id:", clipData.id);
    if (ws.creator_id && ws.creator_id !== u.id) {
      console.log("[notif] sending creator upload notification");
      insertNotification({ userId: ws.creator_id, type: "upload", message: `New clip uploaded: "${title}" by ${userName || "a clipper"}`, clipId: clipData.id, sessionTitle }).catch(console.error);
    } else {
      console.warn("[notif] upload notification skipped — creator_id missing or uploader is the creator:", { creator_id: ws.creator_id, uploader: u.id });
    }

    // ── 8. Update local sessions state ─────────────────────────────────────────
    const newClip = {
      id: clipData.id,
      title: clipData.title,
      category,
      status: "pending",
      duration,
      clipper: userName || "",
      clipperId: u.id,
      captions,
      sound,
      notes,
      revisionNote: "",
      fileUrl: publicUrl,
      sessionTitle,
      sessionDate: sessionsRef.current.find(s => s.id === sessionId)?.date || "",
    };
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, clips: [...s.clips, newClip] } : s
    ));
    sessionsRef.current = sessionsRef.current.map(s =>
      s.id === sessionId ? { ...s, clips: [...s.clips, newClip] } : s
    );

    onProgress(100);
  };

  // Resubmits an existing clip: uploads new file, deletes old, updates DB row, logs activity.
  const handleResubmitClip = async ({ file, sessionId, category, title, captions, sound, notes, clipId, oldFileUrl }, onProgress) => {
    const ws = workspaceRef.current;
    const u = userRef.current;
    if (!ws || !u) throw new Error("Not authenticated");

    // ── 1. Get auth token ──────────────────────────────────────────────────────
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const token = authSession?.access_token;
    if (!token) throw new Error("No auth token — please sign in again");

    // ── 2. Upload new file via XHR for progress ────────────────────────────────
    const ext = file.name.split(".").pop() || "mp4";
    const storagePath = `${ws.id}/${sessionId}/${Date.now()}.${ext}`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 85));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Storage upload failed (${xhr.status}): ${xhr.responseText}`));
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.open("POST", `${supabaseUrl}/storage/v1/object/clips/${storagePath}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.send(file);
    });

    onProgress(88);

    // ── 3. Get public URL of new file ──────────────────────────────────────────
    const { data: { publicUrl } } = supabase.storage.from("clips").getPublicUrl(storagePath);

    // ── 4. Delete old file from storage ───────────────────────────────────────
    if (oldFileUrl) {
      const marker = "/object/public/clips/";
      const idx = oldFileUrl.indexOf(marker);
      if (idx !== -1) {
        const oldPath = decodeURIComponent(oldFileUrl.slice(idx + marker.length));
        await supabase.storage.from("clips").remove([oldPath]).catch(console.warn);
      }
    }

    // ── 5. Get video duration ──────────────────────────────────────────────────
    const duration = await getVideoDuration(file);

    onProgress(93);

    // ── 6. Delete old comments (they belong to the previous version) ───────────
    console.log("[handleResubmitClip] deleting comments for clip_id:", clipId);
    const { data: deletedComments, error: deleteCommentsError } = await supabase.from("clip_comments").delete().eq("clip_id", clipId).select();
    console.log("[handleResubmitClip] comments delete response — data:", deletedComments, "| error:", deleteCommentsError);

    // ── 7. Update existing clip row ────────────────────────────────────────────
    const { error: updateError } = await supabase.from("clips").update({
      file_url: publicUrl,
      status: "pending",
      revision_note: "",
      title,
      category,
      captions,
      sound,
      notes,
      duration,
    }).eq("id", clipId);

    if (updateError) throw new Error(`Failed to update clip: ${updateError.message}`);

    // ── 7. Activity entry ──────────────────────────────────────────────────────
    const sessionTitle = sessionsRef.current.find(s => s.id === sessionId)?.title || "";
    await supabase.from("activity").insert({
      workspace_id: ws.id,
      type: "upload",
      text: `${userName || "A clipper"} resubmitted ${title}`,
      session_title: sessionTitle,
    });

    // Notify the workspace creator
    console.log("[notif] resubmit — ws.creator_id:", ws.creator_id, "| resubmitter u.id:", u.id, "| clipId:", clipId);
    if (ws.creator_id && ws.creator_id !== u.id) {
      console.log("[notif] sending creator resubmit notification");
      insertNotification({ userId: ws.creator_id, type: "resubmit", message: `${userName || "A clipper"} resubmitted "${title}"`, clipId, sessionTitle }).catch(console.error);
    } else {
      console.warn("[notif] resubmit notification skipped — creator_id missing or resubmitter is the creator:", { creator_id: ws.creator_id, resubmitter: u.id });
    }

    // ── 8. Update local state ──────────────────────────────────────────────────
    const updatedClip = { status: "pending", revisionNote: "", fileUrl: publicUrl, title, category, captions, sound, notes, duration };
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, clips: s.clips.map(c => c.id === clipId ? { ...c, ...updatedClip } : c) } : s
    ));
    sessionsRef.current = sessionsRef.current.map(s =>
      s.id === sessionId ? { ...s, clips: s.clips.map(c => c.id === clipId ? { ...c, ...updatedClip } : c) } : s
    );

    onProgress(100);
  };

  const handleRetryLoad = () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    setDataLoadError(false);
    Promise.all([loadSessions(ws.id), loadWorkspaceContent(ws.id)]).catch(console.error);
  };

  // ─── Auth handlers ────────────────────────────────────────────────────────────

  const handleAuth = ({ user, role }) => {
    setUser(user);
    setRole(role);
    userRef.current = user;
    loadUserData(user.id).catch(console.error);
  };

  const clearUserState = () => {
    // Clear auth
    setUser(null);        userRef.current = null;
    setRole(null);
    setUserName(null);
    setAuthLoading(false);

    // Clear workspace — set workspaceReady TRUE so the loading gate doesn't
    // block navigation to the Login screen (nothing to load when signed out).
    setWorkspace(null);   workspaceRef.current = null;
    setCreatorWorkspaces([]);
    setWorkspaceReady(true);
    setShowAgreementGate(null);

    // Clear workspace data
    setSessions([]);      sessionsRef.current = [];
    setActivity([]);
    setSignatures([]);
    setTeamMembers([]);
    setBrief(INITIAL_BRIEF);
    setGuidelines(INITIAL_GUIDELINES);
    setAgreement(INITIAL_AGREEMENT);
    setClipperSigned(false);

    // Clear loading / error states
    setSessionsLoading(false);
    setContentLoading(false);
    setDataLoadError(false);
    loadingUserDataRef.current = false;
    settingsRecordId.current = null;
    agreementRecordId.current = null;

    // Clear persisted invite and workspace data from localStorage
    localStorage.removeItem("pendingWorkspaceInvite");
    localStorage.removeItem("pendingInviteRole");
    localStorage.removeItem("clipflow_active_workspace");
  };

  const handleSignOut = () => {
    clearUserState();
    supabase.auth.signOut().catch(console.error);
  };

  const handleRemoveMember = async (userId) => {
    const ws = workspaceRef.current;
    if (!ws) return;
    await supabase.from("workspace_members").delete().eq("workspace_id", ws.id).eq("user_id", userId);
    setTeamMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const handleRenameWorkspace = async (name) => {
    const trimmed = name.trim();
    if (!trimmed || !workspace) { setEditingWorkspaceName(false); return; }
    const updated = { ...workspace, name: trimmed };
    setWorkspace(updated);
    workspaceRef.current = updated;
    setCreatorWorkspaces(prev => prev.map(w => w.id === workspace.id ? { ...w, name: trimmed } : w));
    setEditingWorkspaceName(false);
    await supabase.from("workspaces").update({ name: trimmed }).eq("id", workspace.id);
  };

  const handleCopyInviteLink = () => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const url = `${window.location.origin}${window.location.pathname}?workspace_id=${ws.id}`;
    console.log("[handleCopyInviteLink] workspace_id:", ws.id);
    console.log("[handleCopyInviteLink] full invite URL:", url);
    navigator.clipboard.writeText(url);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleSign = async (name) => {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + " at " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setSignatures(s => [...s, { name, signedAt: formatted }]);
    setClipperSigned(true);
    setShowAgreementGate(false);

    const ws = workspaceRef.current;
    const u = userRef.current;
    if (!ws || !u) return;

    // Mark signed in workspace_members
    await supabase.from("workspace_members")
      .update({ signed_agreement: true, signed_at: now.toISOString() })
      .eq("workspace_id", ws.id).eq("user_id", u.id);

    // Record the signature
    if (agreementRecordId.current) {
      await supabase.from("signatures").insert({
        agreement_id: agreementRecordId.current,
        user_id: u.id,
        full_name: name,
      });
    }
  };

  // ─── DIAGNOSTIC LOGS — fires on every render ─────────────────────────────────
  console.log("=== APP RENDER ===", {
    authLoading,
    userId: user?.id ?? "NO USER",
    role,
    workspaceReady,
    showAgreementGate,
    clipperSigned,
    agreementEnabled: agreement.enabled,
    agreementTitle: agreement.title,
    workspaceId: workspace?.id ?? "NO WORKSPACE",
  });
  if (user && role === "clipper") {
    console.log("[GATE DECISION] role=clipper | showAgreementGate=" + showAgreementGate + " | workspaceReady=" + workspaceReady);
    console.log("[GATE DECISION] Will show gate?", showAgreementGate === true);
    console.log("[GATE DECISION] Still waiting for check?", showAgreementGate === null);
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // Password reset — show immediately, before any loading gate
  if (showPasswordReset) {
    return (
      <PasswordResetScreen
        onComplete={async () => {
          await supabase.auth.signOut();
          setShowPasswordReset(false);
          setPasswordResetSuccess("Password updated — please sign in.");
        }}
      />
    );
  }

  // Still loading auth state
  if (authLoading || (!!user && !workspaceReady) || (role === "clipper" && showAgreementGate === null)) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
          * { box-sizing: border-box; }
          ${SKL_STYLE}
        `}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "logoPulse 1.8s ease-in-out infinite" }}>
          <div style={{ width: 22, height: 22, background: "#fff", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#000" }}>✂</div>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ClipFlow</span>
        </div>
      </div>
    );
  }

  // Not logged in — show Login screen
  if (!user) {
    return <Login onAuth={handleAuth} isInvite={hasPendingInvite} successMessage={passwordResetSuccess} />;
  }

  // Show agreement gate for clippers who haven't signed yet (driven by live DB check)
  if (role === "clipper" && showAgreementGate === true) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 2px; }`}</style>
        <AgreementGate agreement={agreement} onSign={handleSign} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#e5e5e5" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        ::placeholder { color: #6b7280 !important; opacity: 1; }
        ::-webkit-input-placeholder { color: #6b7280 !important; }
        ::-moz-placeholder { color: #6b7280 !important; opacity: 1; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        select option { background: #111; }
        ${SKL_STYLE}

        /* ── Responsive layout ─────────────────────────────────────────────── */
        .cf-hamburger {
          display: none; background: none; border: 1px solid #2a2a2a;
          color: #a3a3a3; cursor: pointer; padding: 0; width: 36px; height: 36px;
          align-items: center; justify-content: center; border-radius: 6px;
          font-size: 16px; font-family: inherit; flex-shrink: 0;
        }
        .cf-sidebar { transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); }
        .cf-sidebar-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.65); z-index: 149;
        }
        .cf-sidebar-overlay.open { display: block; }
        .cf-clip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
        .cf-review-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.7); z-index: 199;
        }
        .cf-review-handle { display: none; }

        /* Inner sidebar scroll areas — touch-friendly */
        .cf-sidebar-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          touch-action: pan-y;
        }

        @media (max-width: 768px) {
          .cf-hamburger { display: flex !important; }
          .cf-topbar-ws { display: none !important; }
          .cf-topbar-actions { display: none !important; }
          .cf-sidebar {
            position: fixed !important; top: 58px !important; left: 0 !important;
            bottom: 0 !important; width: 260px !important; z-index: 150 !important;
            transform: translateX(-100%); background: #000 !important;
            border-right: 1px solid #2a2a2a !important;
            /* overflow: hidden keeps the footer pinned — inner scroll areas handle their own scrolling */
            overflow: hidden !important;
          }
          .cf-sidebar.open { transform: translateX(0) !important; }
          .cf-clip-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .cf-modal-outer { align-items: flex-end !important; padding: 0 !important; }
          .cf-modal-inner {
            width: 100% !important; max-width: 100% !important;
            border-radius: 16px 16px 0 0 !important; max-height: 92vh !important;
          }
        }

        @media (max-width: 480px) {
          .cf-clip-grid { grid-template-columns: 1fr !important; }
          .cf-review-overlay.open { display: block; }
          .cf-review-panel {
            position: fixed !important; bottom: 0 !important; left: 0 !important;
            right: 0 !important; top: auto !important; width: 100% !important;
            max-height: 90vh !important; z-index: 200 !important;
            border-radius: 16px 16px 0 0 !important; border-left: none !important;
            overflow-y: auto !important; animation: slideUp 0.3s cubic-bezier(0.4,0,0.2,1);
          }
          .cf-review-handle {
            display: block !important; width: 36px; height: 4px; background: #333;
            border-radius: 2px; margin: 0 auto 14px; flex-shrink: 0;
          }
          /* Mobile: bump all text up 1px */
          * { font-size: max(var(--fs, 0px), inherit); }
          .cf-sidebar button, .cf-sidebar span, .cf-sidebar div { font-size: max(12px, 100%); }
          .cf-clip-grid div, .cf-clip-grid span { font-size: max(12px, 100%); }
          .cf-review-panel div, .cf-review-panel span, .cf-review-panel button { font-size: max(12px, 100%); }
        }
      `}</style>

      {/* Topbar */}
      <div style={{ height: 58, borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 24px", position: "sticky", top: 0, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(10px)", zIndex: 100 }}>
        {/* Left: logo + workspace switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 22, height: 22, background: "#fff", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#000" }}>✂</div>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ClipFlow</span>
          {workspace && (
            <>
              <span className="cf-topbar-ws" style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 13, color: "#444", margin: "0 2px" }}>·</span>
              {role === "creator" ? (
                editingWorkspaceName ? (
                  <input
                    autoFocus
                    value={workspaceNameDraft}
                    onChange={e => setWorkspaceNameDraft(e.target.value)}
                    onBlur={() => handleRenameWorkspace(workspaceNameDraft)}
                    onKeyDown={e => { if (e.key === "Enter") handleRenameWorkspace(workspaceNameDraft); if (e.key === "Escape") setEditingWorkspaceName(false); }}
                    style={{ background: "#111", border: "1px solid #333", borderRadius: 5, padding: "3px 8px", color: "#e5e5e5", fontSize: 13, fontWeight: 700, fontFamily: "inherit", outline: "none", width: 180 }}
                  />
                ) : (
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    {/* Workspace name / rename trigger */}
                    <button
                      onClick={() => { setWorkspaceNameDraft(workspace.name || ""); setEditingWorkspaceName(true); setWorkspaceSwitcherOpen(false); }}
                      title="Rename workspace"
                      style={{ background: "none", border: "none", padding: "2px 4px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, borderRadius: 4 }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#e5e5e5" }}>{workspace.name || "Untitled Workspace"}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>✎</span>
                    </button>
                    {/* Switcher dropdown trigger */}
                    <button
                      onClick={() => setWorkspaceSwitcherOpen(o => !o)}
                      title="Switch workspace"
                      style={{ background: "none", border: "none", padding: "3px 5px", cursor: "pointer", color: "#9ca3af", fontSize: 11, fontFamily: "inherit", lineHeight: 1, borderRadius: 4 }}
                    >▾</button>
                    {/* Dropdown */}
                    {workspaceSwitcherOpen && (
                      <>
                        <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setWorkspaceSwitcherOpen(false)} />
                        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "5px", minWidth: 210, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                          {creatorWorkspaces.map(ws => (
                            <div
                              key={ws.id}
                              onClick={() => { switchWorkspace(ws); setWorkspaceSwitcherOpen(false); }}
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: ws.id === workspace.id ? "#1a1a1a" : "transparent", color: ws.id === workspace.id ? "#e5e5e5" : "#a3a3a3", fontSize: 13, fontWeight: ws.id === workspace.id ? 700 : 500, transition: "background 0.1s" }}
                              onMouseEnter={e => { if (ws.id !== workspace.id) e.currentTarget.style.background = "#141414"; }}
                              onMouseLeave={e => { if (ws.id !== workspace.id) e.currentTarget.style.background = "transparent"; }}
                            >
                              <span style={{ width: 14, fontSize: 10, color: "#a3a3a3", flexShrink: 0 }}>{ws.id === workspace.id ? "✓" : ""}</span>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws.name || "Untitled"}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: "1px solid #2a2a2a", marginTop: 4, paddingTop: 4 }}>
                            <div
                              onClick={() => { setShowNewWorkspaceModal(true); setWorkspaceSwitcherOpen(false); }}
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, cursor: "pointer", color: "#a3a3a3", fontSize: 13, fontWeight: 600, transition: "background 0.1s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#141414"; e.currentTarget.style.color = "#a3a3a3"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#737373"; }}
                            >
                              <span style={{ width: 14, textAlign: "center", fontSize: 14, flexShrink: 0 }}>+</span>
                              <span>New Workspace</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af" }}>{workspace.name || "Workspace"}</span>
              )}
            </span>{/* /cf-topbar-ws */}
            </>
          )}
        </div>

        {/* Right: role badge + actions (desktop) + hamburger (mobile) */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="cf-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", border: "1px solid #555555", borderRadius: 4, padding: "2px 8px" }}>{role === "creator" ? "Creator" : role === "manager" ? "Manager" : "Clipper"}</span>
            {role === "creator" && workspace && (
              <button
                onClick={handleCopyInviteLink}
                style={{ background: "#141414", border: "1px solid #3a3a3a", color: inviteCopied ? "#d4d4d4" : "#a3a3a3", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
              >
                {inviteCopied ? "Link Copied!" : "Invite Clippers"}
              </button>
            )}
            {/* Bell icon */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: "#e5e5e5", fontSize: 16, lineHeight: 1, fontFamily: "inherit", borderRadius: 6, display: "flex", alignItems: "center" }}
                aria-label="Notifications"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: 1, right: 1, background: "#ef4444", color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", lineHeight: 1 }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => setNotifOpen(false)} />
                  <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 300, width: 340, maxHeight: 440, background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, boxShadow: "0 12px 32px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 10px", borderBottom: "1px solid #141414", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#e5e5e5", letterSpacing: "-0.01em" }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af", fontFamily: "inherit", fontWeight: 600, padding: 0 }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    {/* List */}
                    <div style={{ overflowY: "auto", flex: 1 }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: "32px 14px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>No notifications yet</div>
                      ) : notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          style={{ padding: "11px 14px", borderBottom: "1px solid #0f0f0f", cursor: n.clip_id ? "pointer" : "default", background: n.read ? "transparent" : "rgba(255,255,255,0.02)", display: "flex", gap: 10, alignItems: "flex-start", transition: "background 0.1s" }}
                          onMouseEnter={e => { if (n.clip_id) e.currentTarget.style.background = "#111"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = n.read ? "transparent" : "rgba(255,255,255,0.02)"; }}
                        >
                          {/* Unread dot */}
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: n.read ? "transparent" : "#3b82f6", flexShrink: 0, marginTop: 5 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: n.read ? "#737373" : "#d4d4d4", lineHeight: 1.5, marginBottom: 3 }}>{n.message}</div>
                            {n.session_title && <div style={{ fontSize: 11, color: "#9ca3af" }}>{n.session_title}</div>}
                            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>{timeAgo(n.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={handleSignOut} style={{ background: "#141414", border: "1px solid #3a3a3a", color: "#a3a3a3", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
          </div>
          {/* Hamburger — shown on tablet/mobile */}
          <button className="cf-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
            {sidebarOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {role === "clipper"
        ? <ClipperView sessions={sessions} categories={categories} guidelines={guidelines} agreement={agreement} onSign={handleSign} currentUserName={userName} currentUserId={user?.id} workspaceId={workspace?.id} onUploadClip={handleUploadClip} onResubmitClip={handleResubmitClip} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} onSignOut={handleSignOut} workspaceName={workspace?.name} jumpTo={jumpTo} onJumpHandled={() => setJumpTo(null)} />
        : <CreatorView sessions={sessions} setSessions={setSessions} categories={categories} setCategories={setCategories} guidelines={guidelines} setGuidelines={handleSetGuidelines} agreement={agreement} setAgreement={handleSetAgreement} signatures={signatures} activity={activity} setActivity={handleSetActivity} onAddSession={handleAddSession} onUpdateClip={handleUpdateClip} onUpdateSessionFootage={handleUpdateSessionFootage} onUpdateSessionBrief={handleUpdateSessionBrief} workspaceId={workspace?.id} teamMembers={teamMembers} onRemoveMember={handleRemoveMember} isManager={role === "manager"} sessionsLoading={sessionsLoading} contentLoading={contentLoading} dataLoadError={dataLoadError} onRetry={handleRetryLoad} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} onSignOut={handleSignOut} workspaceName={workspace?.name} creatorWorkspaces={creatorWorkspaces} currentWorkspaceId={workspace?.id} onSwitchWorkspace={(ws) => { switchWorkspace(ws); setSidebarOpen(false); }} onNewWorkspace={() => { setShowNewWorkspaceModal(true); setSidebarOpen(false); }} jumpTo={jumpTo} onJumpHandled={() => setJumpTo(null)} />
      }

      {showNewWorkspaceModal && (
        <NewWorkspaceModal
          onClose={() => setShowNewWorkspaceModal(false)}
          onCreate={handleCreateWorkspace}
        />
      )}

      {showOnboarding && workspace && (
        <OnboardingModal
          initialWorkspaceName={workspace.name}
          workspaceId={workspace.id}
          onSaveName={handleRenameWorkspace}
          onSaveAgreement={handleSetAgreement}
          onSaveGuidelines={handleSetGuidelines}
          onComplete={() => {
            localStorage.setItem(`onboarding_complete_${workspace.id}`, "1");
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
