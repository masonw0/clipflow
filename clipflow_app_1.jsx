import { useState, useRef } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = ["Speeches", "Brainrot", "Other"];

const INITIAL_SESSIONS = [
  {
    id: "s1", date: "Mar 21, 2025", title: "Solo Q&A — Career & Mindset",
    footageUrl: "https://drive.google.com/drive/folders/example-s1",
    clips: [
      { id: 1, title: "Best Advice I Ever Got", clipper: "Jake R.", category: "Speeches", status: "pending", duration: "0:47", revisionNote: "", captions: "Success isn't given, it's earned — every single day.", sound: "", notes: "" },
      { id: 2, title: "Brainrot Subway Cut #1", clipper: "Mia T.", category: "Brainrot", status: "finalized", duration: "1:12", revisionNote: "", captions: "", sound: "Phonk drift beat", notes: "High energy, works well for short-form", account: "Main Channel" },
      { id: 3, title: "Random Q Response", clipper: "Jake R.", category: "Other", status: "revision", duration: "0:33", revisionNote: "Cut the first 5 seconds, tighten the ending.", captions: "", sound: "", notes: "" },
    ]
  },
  {
    id: "s2", date: "Mar 18, 2025", title: "Guest — Alex Hormozi",
    footageUrl: "https://drive.google.com/drive/folders/example-s2",
    clips: [
      { id: 4, title: "Hormozi on Work Ethic", clipper: "Carlos V.", category: "Speeches", status: "pending", duration: "1:02", revisionNote: "", captions: "Most people quit right before it gets good.", sound: "", notes: "Strong hook at 0:08" },
      { id: 5, title: "Minecraft Parkour Overlay", clipper: "Mia T.", category: "Brainrot", status: "discard", duration: "0:22", revisionNote: "", captions: "", sound: "", notes: "" },
      { id: 6, title: "Business Breakdown", clipper: "Carlos V.", category: "Speeches", status: "finalized", duration: "0:58", revisionNote: "", captions: "", sound: "", notes: "", account: "Fitness Channel" },
    ]
  },
  {
    id: "s3", date: "Mar 14, 2025", title: "Guest — Gary Vee",
    footageUrl: "",
    clips: [
      { id: 7, title: "Gary on Patience", clipper: "Jake R.", category: "Speeches", status: "pending", duration: "0:51", revisionNote: "", captions: "Stop complaining. Start executing.", sound: "", notes: "" },
      { id: 8, title: "Family Feud Overlay", clipper: "Mia T.", category: "Brainrot", status: "revision", duration: "0:39", revisionNote: "Recolor the footage — too dark. Trim dead air at 0:18.", captions: "", sound: "Lofi hip hop", notes: "" },
    ]
  },
];

const INITIAL_BRIEF = {
  deadline: "Every Friday by 11:59 PM EST",
  quantity: "8–12 clips per video",
  looking_for: "High-energy speech moments, punchy one-liners, and anything that would stop a scroll. Avoid slow intros or long pauses.",
  specific_clips: "",
  notes: "If a clip has a strong hook in the first 2 seconds, always prioritize it. When in doubt, clip it — I'd rather have too many than miss a good one.",
};

const INITIAL_GUIDELINES = {
  overview: "We clip short-form content for multiple platforms. Every clip should be able to stand on its own — a viewer who has never seen the full video should understand it immediately.",
  style: "High energy, punchy cuts. No dead air. Captions always on. Vertical format (1080x1920). Hook must land in the first 2–3 seconds.",
  dos: "Strong one-liners, emotional moments, surprising takes, quotable statements, anything that makes someone stop scrolling.",
  donts: "Slow intros, clips that require context from earlier in the video, long pauses, shaky or poorly lit footage.",
  notes: "",
};

const INITIAL_AGREEMENT = {
  enabled: true,
  title: "Clipper Team Agreement",
  body: `By joining this workspace and accessing any video content, you agree to the following terms:

1. CONFIDENTIALITY. All video footage, audio, and any content shared within this platform is strictly confidential. You may not share, distribute, post, or discuss any content with anyone outside of this workspace.

2. NO EARLY RELEASE. You agree not to publish, upload, or share any clips or excerpts from this content on any platform — including but not limited to TikTok, Instagram, YouTube, or Twitter — until explicitly authorized by the creator.

3. OWNERSHIP. All content shared in this workspace remains the sole property of the creator. Your work product (edited clips) produced from this content is also owned by the creator unless otherwise agreed in writing.

4. NO UNAUTHORIZED USE. You may not use any footage, clips, or content from this workspace for your own portfolio, demo reel, or personal projects without prior written consent from the creator.

5. CONSEQUENCES. Violation of any of the above terms may result in immediate removal from the workspace and potential legal action.

By typing your full name below, you confirm that you have read, understood, and agree to these terms.`,
};

const MOCK_SIGNATURES = [
  { name: "Jake Reynolds", signedAt: "Mar 15, 2025 at 9:42 AM" },
  { name: "Mia Torres", signedAt: "Mar 15, 2025 at 11:08 AM" },
  { name: "Carlos Vega", signedAt: "Mar 16, 2025 at 2:31 PM" },
];

const INITIAL_ACTIVITY = [
  { id: 1, type: "upload",   text: "Jake R. uploaded Best Advice I Ever Got",         session: "Solo Q&A — Career & Mindset", time: "Mar 21 at 9:14 AM" },
  { id: 2, type: "upload",   text: "Mia T. uploaded Brainrot Subway Cut #1",           session: "Solo Q&A — Career & Mindset", time: "Mar 21 at 9:41 AM" },
  { id: 3, type: "approved", text: "Brainrot Subway Cut #1 approved",                  session: "Solo Q&A — Career & Mindset", time: "Mar 21 at 11:02 AM" },
  { id: 4, type: "revision", text: "Random Q Response sent for revision",              session: "Solo Q&A — Career & Mindset", time: "Mar 21 at 11:15 AM" },
  { id: 5, type: "upload",   text: "Carlos V. uploaded Hormozi on Work Ethic",         session: "Guest — Alex Hormozi",        time: "Mar 19 at 2:30 PM" },
  { id: 6, type: "approved", text: "Business Breakdown approved",                      session: "Guest — Alex Hormozi",        time: "Mar 19 at 4:08 PM" },
  { id: 7, type: "discard",  text: "Minecraft Parkour Overlay discarded",              session: "Guest — Alex Hormozi",        time: "Mar 19 at 4:09 PM" },
  { id: 8, type: "upload",   text: "Jake R. uploaded Gary on Patience",                session: "Guest — Gary Vee",            time: "Mar 15 at 10:00 AM" },
  { id: 9, type: "revision", text: "Family Feud Overlay sent for revision",            session: "Guest — Gary Vee",            time: "Mar 16 at 1:44 PM" },
];

const statusConfig = {
  pending:   { label: "Pending",  color: "#a3a3a3", bg: "rgba(163,163,163,0.1)",  dot: "#737373" },
  finalized: { label: "Approved", color: "#e5e5e5", bg: "rgba(229,229,229,0.1)",  dot: "#d4d4d4" },
  revision:  { label: "Revision", color: "#f97316", bg: "rgba(249,115,22,0.1)",   dot: "#f97316" },
  discard:   { label: "Discard",  color: "#525252", bg: "rgba(82,82,82,0.1)",     dot: "#404040" },
};

// ─── Shared Components ────────────────────────────────────────────────────────

function StatusDot({ status }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusConfig[status].dot, display: "inline-block", flexShrink: 0 }} />;
}

function StatusBadge({ status }) {
  const c = statusConfig[status];
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30`, padding: "2px 9px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {c.label}
    </span>
  );
}

function VideoThumb({ title, duration }) {
  const initials = title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{ width: "100%", aspectRatio: "16/9", background: "#141414", border: "1px solid #262626", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1f1f1f", border: "1px solid #303030", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#525252", fontFamily: "monospace" }}>{initials}</div>
      <div style={{ position: "absolute", bottom: 5, right: 6, background: "rgba(0,0,0,0.8)", color: "#737373", fontSize: 10, fontWeight: 700, padding: "2px 5px", borderRadius: 3 }}>{duration}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 12px", color: "#e5e5e5", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 12px", color: "#e5e5e5", fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function Btn({ children, onClick, variant = "ghost", style = {} }) {
  const styles = {
    primary: { background: "#fff", color: "#000", border: "none" },
    ghost:   { background: "transparent", color: "#a3a3a3", border: "1px solid #262626" },
    danger:  { background: "transparent", color: "#525252", border: "1px solid #262626" },
    success: { background: "#fff", color: "#000", border: "none" },
    warning: { background: "rgba(249,115,22,0.12)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)" },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", ...style }}>
      {children}
    </button>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ categories, sessions, onClose, onSubmit }) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id || "");
  const [category, setCategory] = useState(categories[0] || "");
  const [title, setTitle] = useState("");
  const [captions, setCaptions] = useState("");
  const [sound, setSound] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const handleSubmit = () => {
    if (!title.trim()) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setDone(true);
      onSubmit({ sessionId, category, title: title.trim(), captions, sound, notes });
      setTimeout(onClose, 1200);
    }, 1600);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 12, padding: "28px", width: 480, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#e5e5e5", letterSpacing: "-0.02em" }}>Upload Clip</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#525252", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ color: "#e5e5e5", fontWeight: 700, fontSize: 15 }}>Clip uploaded!</div>
          </div>
        ) : (
          <>
            {/* File drop */}
            <div onClick={() => fileRef.current.click()} style={{ border: "1px dashed #262626", borderRadius: 8, padding: "28px", textAlign: "center", cursor: "pointer", marginBottom: 20, background: "#0d0d0d" }}>
              <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={() => {}} />
              {uploading ? (
                <div style={{ color: "#525252", fontSize: 13 }}>Uploading...</div>
              ) : (
                <>
                  <div style={{ color: "#404040", fontSize: 24, marginBottom: 8 }}>↑</div>
                  <div style={{ color: "#737373", fontSize: 13, fontWeight: 600 }}>Click or drop video file</div>
                  <div style={{ color: "#404040", fontSize: 11, marginTop: 4 }}>MP4, MOV — up to 2GB</div>
                </>
              )}
            </div>

            <Input label="Clip Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Hormozi on Work Ethic" />

            {/* Video & Category */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Video</div>
                <select value={sessionId} onChange={e => setSessionId(e.target.value)} style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 10px", color: "#e5e5e5", fontSize: 12, outline: "none", fontFamily: "inherit" }}>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.date} — {s.title}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Folder</div>
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
                <div style={{ marginBottom: 14, background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: 7, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, color: "#525252", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Source Footage</div>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, color: "#a3a3a3", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                    <span>Open in Drive</span><span style={{ fontSize: 14 }}>↗</span>
                  </a>
                </div>
              );
            })()}

            <Textarea label="Recommended Captions (optional)" value={captions} onChange={e => setCaptions(e.target.value)} placeholder="Paste suggested caption text or a key quote from the clip..." rows={2} />
            <Input label="Recommended Sound (optional)" value={sound} onChange={e => setSound(e.target.value)} placeholder="e.g. Phonk drift beat, Lo-fi hip hop, no sound needed..." />
            <Textarea label="Additional Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Strong hook at 0:08, best part is around 0:22, etc..." rows={2} />

            <Btn onClick={handleSubmit} variant="primary" style={{ width: "100%", padding: "11px" }}>
              {uploading ? "Uploading..." : "Submit Clip"}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Category Manager Modal ───────────────────────────────────────────────────

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 12, padding: "24px", width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e5e5e5" }}>Manage Folders</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#525252", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: error ? 6 : 14 }}>
          <input value={newName} onChange={e => { setNewName(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && add()} placeholder="New folder name..." style={{ flex: 1, background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "8px 11px", color: "#e5e5e5", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          <Btn onClick={add} variant="primary">Add</Btn>
        </div>
        {error && <div style={{ color: "#f97316", fontSize: 11, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {categories.map((cat, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid #1a1a1a", borderRadius: 7, padding: "8px 12px" }}>
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
        <div style={{ borderTop: "1px solid #1a1a1a", marginTop: 16, paddingTop: 14 }}>
          <Btn onClick={onClose} variant="primary" style={{ width: "100%", padding: "10px" }}>Done</Btn>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 12, padding: "24px", width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#e5e5e5" }}>New Video Session</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#525252", cursor: "pointer", fontSize: 18 }}>×</button>
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
          <p style={{ color: "#404040", margin: "5px 0 0", fontSize: 13 }}>{readOnly ? "Instructions for this video from your creator" : "Set per-video expectations for your clip team"}</p>
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
          <div key={f.key} style={{ borderTop: i === 0 ? "1px solid #1a1a1a" : "none", borderBottom: "1px solid #1a1a1a", padding: "20px 0", display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "start" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2 }}>{f.label}</div>
            {editing ? (
              f.multi
                ? <textarea value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} style={{ background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "8px 10px", color: "#e5e5e5", fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none" }} />
                : <input value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "8px 10px", color: "#e5e5e5", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
            ) : (
              <div style={{ fontSize: 13, color: brief[f.key] ? "#a3a3a3" : "#303030", lineHeight: 1.7 }}>{brief[f.key] || (readOnly ? "Not set" : "Not set — click Edit Brief to add")}</div>
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
          <div style={{ fontSize: 13, color: "#525252" }}>Taking you to your workspace...</div>
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
          <div style={{ fontSize: 11, fontWeight: 700, color: "#404040", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Before you continue</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>{agreement.title}</h1>
        </div>

        {/* Agreement text */}
        <div style={{ background: "#0a0a0a", border: "1px solid #1f1f1f", borderRadius: 10, padding: "20px 22px", marginBottom: 24, maxHeight: 320, overflowY: "auto" }}>
          <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 12, color: "#737373", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
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
          <span style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>
            I have read and agree to all terms in this agreement. I understand that accessing content in this workspace is conditional on my compliance.
          </span>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Type your full name to sign</div>
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

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#303030" }}>
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
          <p style={{ color: "#404040", margin: "5px 0 0", fontSize: 13 }}>Clippers must sign this before accessing any content</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Toggle enabled */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#525252", fontWeight: 700 }}>{draft.enabled ? "Required" : "Disabled"}</span>
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
        <div style={{ background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: 8, padding: "12px 16px", marginBottom: 24 }}>
          <span style={{ fontSize: 12, color: "#525252" }}>Agreement is currently disabled. Clippers can access content without signing. Toggle "Required" to enforce it.</span>
        </div>
      )}

      {/* Agreement Title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Agreement Title</div>
        {editing
          ? <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "9px 12px", color: "#e5e5e5", fontSize: 14, fontWeight: 700, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          : <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e5e5" }}>{agreement.title}</div>
        }
      </div>

      {/* Agreement Body */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Agreement Text</div>
        {editing ? (
          <textarea
            value={draft.body}
            onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
            rows={16}
            style={{ width: "100%", background: "#111", border: "1px solid #262626", borderRadius: 8, padding: "12px 14px", color: "#a3a3a3", fontSize: 12, lineHeight: 1.85, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        ) : (
          <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "18px 20px", maxHeight: 340, overflowY: "auto" }}>
            <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 12, color: "#525252", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {agreement.body}
            </pre>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em" }}>Signatures — {signatures.length}</div>
        </div>
        {signatures.length === 0 ? (
          <div style={{ color: "#303030", fontSize: 13, padding: "20px 0" }}>No signatures yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {signatures.map((sig, i) => (
              <div key={i} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#141414", border: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#525252" }}>
                    {sig.name.split(" ").map(w => w[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e5e5", fontStyle: "italic" }}>{sig.name}</div>
                    <div style={{ fontSize: 11, color: "#404040", marginTop: 1 }}>Signed {sig.signedAt}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4d4d4" }} />
                  <span style={{ fontSize: 10, color: "#525252", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Signed</span>
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
          <p style={{ color: "#404040", margin: "5px 0 0", fontSize: 13 }}>{readOnly ? "General guidelines that apply to every video" : "Global standards for your entire clip team — applies to all videos"}</p>
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
        <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 7, padding: "10px 14px", marginBottom: 28, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#525252", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>↑ Pinned for all clippers</span>
          <span style={{ fontSize: 11, color: "#404040" }}>These guidelines are always visible to every clipper on your team, regardless of which video they're working on.</span>
        </div>
      )}
      {readOnly && (
        <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 7, padding: "10px 14px", marginBottom: 28 }}>
          <span style={{ fontSize: 11, color: "#404040" }}>These are your creator's standing guidelines. They apply to every video you work on — read these before starting any clip.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {fields.map((f, i) => (
          <div key={f.key} style={{ borderTop: i === 0 ? "1px solid #1a1a1a" : "none", borderBottom: "1px solid #1a1a1a", padding: "20px 0", display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "start" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#525252", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2 }}>{f.label}</div>
            {editing ? (
              <textarea value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder} rows={3} style={{ background: "#111", border: "1px solid #262626", borderRadius: 6, padding: "8px 10px", color: "#e5e5e5", fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none" }} />
            ) : (
              <div style={{ fontSize: 13, color: guidelines[f.key] ? "#a3a3a3" : "#303030", lineHeight: 1.7 }}>{guidelines[f.key] || (readOnly ? "Not set" : "Not set — click Edit to add")}</div>
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
        <div style={{ fontSize: 10, fontWeight: 700, color: "#404040", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Source Footage</div>
        {isValidUrl(url) ? (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0d0d0d", border: "1px solid #262626", borderRadius: 7, padding: "9px 14px", textDecoration: "none", color: "#e5e5e5", fontSize: 13, fontWeight: 600 }}>
            <span style={{ fontSize: 15 }}>↗</span>
            <span>Open footage in Google Drive</span>
          </a>
        ) : (
          <div style={{ color: "#303030", fontSize: 13 }}>No footage link added yet.</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#404040", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Source Footage</div>
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
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d0d0d", border: "1px dashed #262626", borderRadius: 7, padding: "9px 14px", color: "#404040", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              <span>+</span> Add footage link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Clipper View ─────────────────────────────────────────────────────────────

function ClipperView({ sessions, categories, brief, guidelines, agreement, onSign }) {
  const [tab, setTab] = useState("clips");
  const [showUpload, setShowUpload] = useState(false);

  const myClips = sessions.flatMap(s => s.clips.filter(c => c.clipper === "Jake R.").map(c => ({ ...c, sessionTitle: s.title, sessionDate: s.date })));
  const revisions = myClips.filter(c => c.status === "revision");

  return (
    <>
      {showUpload && <UploadModal categories={categories} sessions={sessions} onClose={() => setShowUpload(false)} onSubmit={() => {}} />}
      <div style={{ display: "flex", height: "calc(100vh - 58px)" }}>
        {/* Sidebar */}
        <div style={{ width: 200, borderRight: "1px solid #1a1a1a", padding: "20px 0", display: "flex", flexDirection: "column", gap: 2 }}>
          {[["clips", "My Clips"], ["stats", "My Stats"], ["guidelines", "Clipping Guidelines"], ["brief", "Video Brief"], ["agreement", "My Agreement"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? "#141414" : "transparent", color: tab === id ? "#e5e5e5" : "#525252", border: "none", borderRadius: 0, padding: "9px 20px", fontSize: 13, fontWeight: tab === id ? 700 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
              {label}
              {id === "clips" && revisions.length > 0 && (
                <span style={{ marginLeft: 8, background: "#f97316", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>{revisions.length}</span>
              )}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: "16px 20px" }}>
            <Btn onClick={() => setShowUpload(true)} variant="primary" style={{ width: "100%", padding: "9px" }}>+ Upload</Btn>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "guidelines" ? (
            <GuidelinesView guidelines={guidelines} setGuidelines={() => {}} readOnly />
          ) : tab === "brief" ? (
            <BriefView brief={brief} setBrief={() => {}} readOnly />
          ) : tab === "stats" ? (
            (() => {
              const myAllClips = sessions.flatMap(s => s.clips.filter(c => c.clipper === "Jake R."));
              const approved = myAllClips.filter(c => c.status === "finalized").length;
              const revision = myAllClips.filter(c => c.status === "revision").length;
              const discard = myAllClips.filter(c => c.status === "discard").length;
              const pending = myAllClips.filter(c => c.status === "pending").length;
              const reviewed = approved + revision + discard;
              const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : null;
              return (
                <div style={{ padding: "32px 32px", maxWidth: 560 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>My Stats</h1>
                  <p style={{ color: "#404040", fontSize: 13, margin: "0 0 28px" }}>Your personal performance — only visible to you and the creator</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
                    {[["Total Clips", myAllClips.length, "#737373"], ["Approved", approved, "#d4d4d4"], ["Sent for Revision", revision, "#f97316"], ["Pending Review", pending, "#525252"]].map(([label, val, col]) => (
                      <div key={label} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, padding: "16px 18px" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: col }}>{val}</div>
                        <div style={{ fontSize: 11, color: "#404040", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 3 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {reviewed > 0 && (
                    <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
                      <div style={{ fontSize: 11, color: "#525252", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Approval Rate</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: approvalRate >= 70 ? "#d4d4d4" : approvalRate >= 40 ? "#a3a3a3" : "#f97316", marginBottom: 10 }}>{approvalRate}%</div>
                      <div style={{ height: 6, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${approvalRate}%`, background: approvalRate >= 70 ? "#d4d4d4" : approvalRate >= 40 ? "#737373" : "#f97316", borderRadius: 99, transition: "width 0.3s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#404040", marginTop: 8 }}>{approved} approved out of {reviewed} reviewed</div>
                    </div>
                  )}
                  <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, color: "#525252", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>By Video</div>
                    {sessions.map(s => {
                      const sClips = s.clips.filter(c => c.clipper === "Jake R.");
                      if (sClips.length === 0) return null;
                      const sApproved = sClips.filter(c => c.status === "finalized").length;
                      return (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #141414" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#a3a3a3" }}>{s.title}</div>
                            <div style={{ fontSize: 10, color: "#404040", marginTop: 2 }}>{s.date}</div>
                          </div>
                          <div style={{ fontSize: 12, color: "#525252" }}>{sApproved}/{sClips.length} approved</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : tab === "agreement" ? (
            <div style={{ maxWidth: 620, margin: "0 auto", padding: "36px 36px" }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>My Agreement</h1>
              <p style={{ color: "#404040", fontSize: 13, margin: "0 0 28px" }}>You've signed this agreement. A copy is shown below for your reference.</p>
              <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#e5e5e5", marginBottom: 14 }}>{agreement.title}</div>
                <pre style={{ margin: 0, fontFamily: "inherit", fontSize: 12, color: "#525252", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{agreement.body}</pre>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 7 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#d4d4d4" }} />
                <span style={{ fontSize: 11, color: "#525252", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Signed by you on {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: "28px 32px", maxWidth: 800 }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: 0, letterSpacing: "-0.03em" }}>My Clips</h1>
                <p style={{ color: "#404040", margin: "4px 0 0", fontSize: 13 }}>Your uploads and revision feedback</p>
              </div>

              {revisions.length > 0 && (
                <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 8, padding: "16px 18px", marginBottom: 24 }}>
                  <div style={{ color: "#f97316", fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Needs Revision — {revisions.length}</div>
                  {revisions.map(c => (
                    <div key={c.id} style={{ borderTop: "1px solid rgba(249,115,22,0.1)", paddingTop: 12, marginTop: 12 }}>
                      <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 13, marginBottom: 2 }}>{c.title}</div>
                      <div style={{ color: "#737373", fontSize: 12, marginBottom: 2 }}>{c.sessionDate} — {c.sessionTitle}</div>
                      <div style={{ color: "#a3a3a3", fontSize: 13, lineHeight: 1.6, fontStyle: "italic", marginBottom: 10 }}>"{c.revisionNote}"</div>
                      <Btn variant="warning" style={{ fontSize: 11, padding: "5px 12px" }}>Resubmit</Btn>
                    </div>
                  ))}
                </div>
              )}

              {/* Clips grouped by session */}
              {sessions.filter(s => s.clips.some(c => c.clipper === "Jake R.")).map(s => {
                const sClips = s.clips.filter(c => c.clipper === "Jake R.");
                return (
                  <div key={s.id} style={{ marginBottom: 28 }}>
                    {/* Session header */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#a3a3a3", marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: "#404040", marginBottom: 10 }}>{s.date}</div>
                      <FootageBar url={s.footageUrl || ""} onChange={() => {}} readOnly />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sClips.map(clip => (
                        <div key={clip.id} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 100, flexShrink: 0 }}>
                            <VideoThumb title={clip.title} duration={clip.duration} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 13, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clip.title}</div>
                            <div style={{ color: "#404040", fontSize: 11, marginBottom: 8 }}>{clip.category}</div>
                            <StatusBadge status={clip.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Creator View ─────────────────────────────────────────────────────────────

function CreatorView({ sessions, setSessions, categories, setCategories, brief, setBrief, guidelines, setGuidelines, agreement, setAgreement, signatures, activity, setActivity }) {
  const [tab, setTab] = useState("review");
  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id || null);
  const [activeCat, setActiveCat] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const [revNote, setRevNote] = useState("");
  const [showCatManager, setShowCatManager] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClips, setSelectedClips] = useState(new Set());
  const [bulkRevNote, setBulkRevNote] = useState("");

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

  // Clipper stats across all sessions
  const clipperNames = [...new Set(allClips.map(c => c.clipper))];
  const clipperStats = clipperNames.map(name => {
    const myClips = allClips.filter(c => c.clipper === name);
    const approved = myClips.filter(c => c.status === "finalized").length;
    const revision = myClips.filter(c => c.status === "revision").length;
    const discard = myClips.filter(c => c.status === "discard").length;
    const pending = myClips.filter(c => c.status === "pending").length;
    const reviewed = approved + revision + discard;
    const approvalRate = reviewed > 0 ? Math.round((approved / reviewed) * 100) : null;
    return { name, total: myClips.length, approved, revision, discard, pending, approvalRate };
  });

  const logActivity = (type, text, sessionTitle) => {
    const now = new Date();
    const time = now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setActivity(prev => [{ id: Date.now(), type, text, session: sessionTitle || "", time }, ...prev]);
  };

  const updateClip = (id, updates) => {
    const clip = sessions.flatMap(s => s.clips).find(c => c.id === id);
    const session = sessions.find(s => s.clips.some(c => c.id === id));
    setSessions(prev => prev.map(s => ({
      ...s,
      clips: s.clips.map(c => c.id === id ? { ...c, ...updates } : c)
    })));
    setSelected(p => p?.id === id ? { ...p, ...updates } : p);
    if (updates.status === "finalized") logActivity("approved", `${clip?.title} approved`, session?.title);
    else if (updates.status === "revision") logActivity("revision", `${clip?.title} sent for revision`, session?.title);
    else if (updates.status === "discard") logActivity("discard", `${clip?.title} discarded`, session?.title);
  };

  const bulkUpdate = (status, note = "") => {
    const session = sessions.find(s => s.clips.some(c => selectedClips.has(c.id)));
    setSessions(prev => prev.map(s => ({
      ...s,
      clips: s.clips.map(c => selectedClips.has(c.id) ? { ...c, status, revisionNote: note } : c)
    })));
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

  const handleSetCategories = (newCats) => {
    setCategories(newCats);
    if (newCats.length > 0) {
      setSessions(prev => prev.map(s => ({
        ...s,
        clips: s.clips.map(c => newCats.includes(c.category) ? c : { ...c, category: newCats[0] })
      })));
    }
  };

  const addSession = (date, title) => {
    const id = "s" + Date.now();
    setSessions(p => [{ id, date, title, footageUrl: "", clips: [] }, ...p]);
    setActiveSessionId(id);
  };

  const updateSessionFootage = (id, url) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, footageUrl: url } : s));
  };

  const counts = { pending: clips.filter(c => c.status === "pending").length, finalized: clips.filter(c => c.status === "finalized").length, revision: clips.filter(c => c.status === "revision").length, discard: clips.filter(c => c.status === "discard").length };
  const totalPending = sessions.reduce((a, s) => a + s.clips.filter(c => c.status === "pending").length, 0);

  return (
    <>
      {showCatManager && <CategoryManager categories={categories} setCategories={handleSetCategories} onClose={() => setShowCatManager(false)} />}
      {showNewSession && <NewSessionModal onClose={() => setShowNewSession(false)} onAdd={addSession} />}

      <div style={{ display: "flex", height: "calc(100vh - 58px)" }}>
        {/* Left Sidebar */}
        <div style={{ width: 220, borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column" }}>
          {/* Nav */}
          <div style={{ padding: "16px 0 0" }}>
            {[["review", "Review Clips"], ["activity", "Activity"], ["team", "Team Stats"], ["guidelines", "Clipping Guidelines"], ["brief", "Video Brief"], ["agreement", "Team Agreement"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? "#141414" : "transparent", color: tab === id ? "#e5e5e5" : "#525252", border: "none", padding: "9px 20px", fontSize: 13, fontWeight: tab === id ? 700 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                {label}
                {id === "review" && totalPending > 0 && <span style={{ background: "#fff", color: "#000", borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>{totalPending}</span>}
              </button>
            ))}
          </div>

          {/* Sessions */}
          {tab === "review" && (
            <>
              <div style={{ padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#404040", textTransform: "uppercase", letterSpacing: "0.08em" }}>Videos</span>
                <button onClick={() => setShowNewSession(true)} style={{ background: "none", border: "none", color: "#525252", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 0 16px" }}>
                {sessions.map(s => {
                  const pending = s.clips.filter(c => c.status === "pending").length;
                  const total = s.clips.length;
                  const reviewed = total - pending;
                  const progress = total > 0 ? Math.round((reviewed / total) * 100) : 0;
                  const active = activeSessionId === s.id;
                  return (
                    <button key={s.id} onClick={() => { setActiveSessionId(s.id); setSelected(null); setActiveCat("All"); setActiveStatus("All"); setSelectedClips(new Set()); }} style={{ background: active ? "#141414" : "transparent", border: "none", padding: "10px 20px 12px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit", borderLeft: active ? "2px solid #e5e5e5" : "2px solid transparent" }}>
                      <div style={{ fontSize: 11, color: active ? "#e5e5e5" : "#525252", fontWeight: 700, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: "#404040" }}>{s.date}</span>
                        {pending > 0
                          ? <span style={{ background: "#fff", color: "#000", borderRadius: 99, fontSize: 9, fontWeight: 800, padding: "1px 5px" }}>{pending}</span>
                          : total > 0 ? <span style={{ fontSize: 9, color: "#525252", fontWeight: 700 }}>✓ Done</span> : null
                        }
                      </div>
                      {total > 0 && (
                        <div style={{ height: 3, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? "#d4d4d4" : "#525252", borderRadius: 99, transition: "width 0.3s" }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {tab === "agreement" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <AgreementView agreement={agreement} setAgreement={setAgreement} signatures={signatures} />
            </div>
          ) : tab === "activity" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px", maxWidth: 680 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>Activity</h1>
              <p style={{ color: "#404040", fontSize: 13, margin: "0 0 28px" }}>Everything that's happened across your workspace</p>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {activity.map((item, i) => {
                  const icons = { upload: "↑", approved: "✓", revision: "↩", discard: "✕" };
                  const colors = { upload: "#525252", approved: "#d4d4d4", revision: "#f97316", discard: "#404040" };
                  return (
                    <div key={item.id} style={{ display: "flex", gap: 14, paddingBottom: 16, marginBottom: 16, borderBottom: i < activity.length - 1 ? "1px solid #111" : "none" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0d0d0d", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: colors[item.type], flexShrink: 0 }}>{icons[item.type]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#a3a3a3", fontWeight: 600, marginBottom: 3 }}>{item.text}</div>
                        <div style={{ fontSize: 11, color: "#404040" }}>{item.session && <span style={{ color: "#525252", marginRight: 6 }}>{item.session} ·</span>}{item.time}</div>
                      </div>
                    </div>
                  );
                })}
                {activity.length === 0 && <div style={{ color: "#303030", fontSize: 13 }}>No activity yet.</div>}
              </div>
            </div>
          ) : tab === "team" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px", maxWidth: 760 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: "#e5e5e5", margin: "0 0 6px", letterSpacing: "-0.03em" }}>Team Stats</h1>
              <p style={{ color: "#404040", fontSize: 13, margin: "0 0 28px" }}>Performance breakdown per clipper — only visible to you</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {clipperStats.map(cs => (
                  <div key={cs.name} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#141414", border: "1px solid #262626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#525252" }}>
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
                          <div style={{ fontSize: 10, color: "#404040", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>{label}</div>
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
                              <span style={{ fontSize: 10, color: "#525252" }}>{l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : tab === "guidelines" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <GuidelinesView guidelines={guidelines} setGuidelines={setGuidelines} />
            </div>
          ) : tab === "brief" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <BriefView brief={brief} setBrief={setBrief} />
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
                    style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: 7, padding: "9px 14px", color: "#e5e5e5", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>

                {/* Search results mode */}
                {searchResults ? (
                  <>
                    <div style={{ fontSize: 12, color: "#525252", fontWeight: 700, marginBottom: 14 }}>{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {searchResults.map(clip => (
                        <div key={clip.id} onClick={() => { setSelected(clip); setRevNote(clip.revisionNote || ""); }} style={{ background: "#0d0d0d", border: `1px solid ${selected?.id === clip.id ? "#404040" : "#1a1a1a"}`, borderRadius: 8, padding: "12px 14px", display: "flex", gap: 12, cursor: "pointer", alignItems: "center" }}>
                          <div style={{ width: 80, flexShrink: 0 }}><VideoThumb title={clip.title} duration={clip.duration} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 13, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clip.title}</div>
                            <div style={{ fontSize: 11, color: "#404040", marginBottom: 6 }}>{clip.sessionTitle} · {clip.clipper} · {clip.category}</div>
                            <StatusBadge status={clip.status} />
                          </div>
                        </div>
                      ))}
                      {searchResults.length === 0 && <div style={{ color: "#303030", fontSize: 13, padding: "20px 0" }}>No clips found.</div>}
                    </div>
                  </>
                ) : activeSession ? (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#e5e5e5", letterSpacing: "-0.03em" }}>{activeSession.title}</div>
                      <div style={{ color: "#404040", fontSize: 12, marginTop: 3 }}>{activeSession.date} · {clips.length} clips</div>
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
                          <div style={{ fontSize: 10, color: "#404040", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>{statusConfig[key].label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Folder + status filters */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                      {["All", ...categories].map(cat => (
                        <button key={cat} onClick={() => setActiveCat(cat)} style={{ background: activeCat === cat ? "#fff" : "transparent", color: activeCat === cat ? "#000" : "#525252", border: `1px solid ${activeCat === cat ? "#fff" : "#1f1f1f"}`, borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{cat}</button>
                      ))}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        {["All", "Pending", "Revision", "Finalized", "Discard"].map(sf => (
                          <button key={sf} onClick={() => setActiveStatus(sf)} style={{ background: "transparent", color: activeStatus === sf ? "#a3a3a3" : "#404040", border: "none", fontSize: 11, fontWeight: activeStatus === sf ? 700 : 500, cursor: "pointer", fontFamily: "inherit", padding: "4px 6px" }}>{sf}</button>
                        ))}
                      </div>
                      <button onClick={() => setShowCatManager(true)} style={{ background: "transparent", border: "1px solid #1f1f1f", color: "#404040", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>⊞ Folders</button>
                    </div>

                    {/* Bulk action toolbar */}
                    {filtered.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 7 }}>
                        <div onClick={toggleAll} style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${selectedClips.size === filtered.length && filtered.length > 0 ? "#fff" : "#303030"}`, background: selectedClips.size === filtered.length && filtered.length > 0 ? "#fff" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#000", flexShrink: 0 }}>
                          {selectedClips.size === filtered.length && filtered.length > 0 ? "✓" : selectedClips.size > 0 ? "–" : ""}
                        </div>
                        <span style={{ fontSize: 11, color: "#525252", fontWeight: 600 }}>{selectedClips.size > 0 ? `${selectedClips.size} selected` : "Select all"}</span>
                        {selectedClips.size > 0 && (
                          <>
                            <div style={{ width: 1, height: 14, background: "#1f1f1f", margin: "0 2px" }} />
                            <Btn onClick={() => bulkUpdate("finalized")} variant="ghost" style={{ padding: "4px 10px", fontSize: 11 }}>✓ Approve</Btn>
                            <Btn onClick={() => bulkUpdate("discard")} variant="ghost" style={{ padding: "4px 10px", fontSize: 11, color: "#525252" }}>✕ Discard</Btn>
                            <Btn onClick={() => setSelectedClips(new Set())} variant="ghost" style={{ padding: "4px 10px", fontSize: 11, marginLeft: "auto" }}>Clear</Btn>
                          </>
                        )}
                      </div>
                    )}

                    {/* Clip grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                      {filtered.map(clip => {
                        const isChecked = selectedClips.has(clip.id);
                        return (
                          <div key={clip.id} onClick={() => { if (selectedClips.size > 0) { toggleClip(clip.id, { stopPropagation: () => {} }); } else { setSelected(clip); setRevNote(clip.revisionNote || ""); } }} style={{ background: "#0d0d0d", border: `1px solid ${isChecked ? "#525252" : selected?.id === clip.id ? "#404040" : "#1a1a1a"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", position: "relative", outline: isChecked ? "1px solid #404040" : "none" }}>
                            {/* Checkbox */}
                            <div onClick={e => toggleClip(clip.id, e)} style={{ position: "absolute", top: 7, left: 7, zIndex: 2, width: 16, height: 16, borderRadius: 4, border: `1px solid ${isChecked ? "#fff" : "#404040"}`, background: isChecked ? "#fff" : "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#000", cursor: "pointer" }}>
                              {isChecked ? "✓" : ""}
                            </div>
                            <VideoThumb title={clip.title} duration={clip.duration} />
                            <div style={{ padding: "9px 10px" }}>
                              <div style={{ fontWeight: 700, color: "#e5e5e5", fontSize: 12, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clip.title}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                <StatusDot status={clip.status} />
                                <span style={{ color: "#404040", fontSize: 10 }}>{clip.clipper}</span>
                              </div>
                              <StatusBadge status={clip.status} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {filtered.length === 0 && (
                      <div style={{ textAlign: "center", padding: "60px 0", color: "#303030" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>No clips match</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 0", color: "#303030" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>No sessions yet</div>
                    <Btn onClick={() => setShowNewSession(true)} variant="ghost">+ Create First Session</Btn>
                  </div>
                )}
              </div>

              {/* Review Panel */}
              {selected && (
                <div style={{ width: 300, borderLeft: "1px solid #1a1a1a", padding: "20px 20px", overflowY: "auto", background: "#060606", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, color: "#e5e5e5", fontSize: 14, lineHeight: 1.3, paddingRight: 8 }}>{selected.title}</div>
                    <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#525252", cursor: "pointer", fontSize: 18, flexShrink: 0 }}>×</button>
                  </div>

                  <VideoThumb title={selected.title} duration={selected.duration} />

                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[["Clipper", selected.clipper], ["Folder", selected.category], ["Duration", selected.duration]].map(([l, v]) => (
                      <div key={l}><div style={{ fontSize: 10, fontWeight: 700, color: "#404040", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{l}</div><div style={{ fontSize: 12, color: "#737373" }}>{v}</div></div>
                    ))}
                  </div>

                  {/* Clipper notes */}
                  {(selected.captions || selected.sound || selected.notes) && (
                    <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 7, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#404040", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Clipper Notes</div>
                      {selected.captions && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#525252", fontWeight: 700, marginBottom: 3 }}>CAPTIONS</div><div style={{ fontSize: 12, color: "#737373", lineHeight: 1.5, fontStyle: "italic" }}>"{selected.captions}"</div></div>}
                      {selected.sound && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 10, color: "#525252", fontWeight: 700, marginBottom: 3 }}>SOUND</div><div style={{ fontSize: 12, color: "#737373" }}>{selected.sound}</div></div>}
                      {selected.notes && <div><div style={{ fontSize: 10, color: "#525252", fontWeight: 700, marginBottom: 3 }}>NOTES</div><div style={{ fontSize: 12, color: "#737373", lineHeight: 1.5 }}>{selected.notes}</div></div>}
                    </div>
                  )}

                  <div style={{ borderTop: "1px solid #1a1a1a", marginTop: 16, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#404040", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Route</div>

                    <Btn onClick={() => updateClip(selected.id, { status: "finalized", revisionNote: "" })} variant={selected.status === "finalized" ? "primary" : "ghost"} style={{ width: "100%", padding: "9px", textAlign: "center" }}>✓ Approve</Btn>

                    <textarea value={revNote} onChange={e => setRevNote(e.target.value)} placeholder="Revision notes for clipper..." rows={2} style={{ width: "100%", background: "#0d0d0d", border: "1px solid #1f1f1f", borderRadius: 6, padding: "8px", color: "#a3a3a3", fontSize: 12, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    <Btn onClick={() => updateClip(selected.id, { status: "revision", revisionNote: revNote })} variant={selected.status === "revision" ? "warning" : "ghost"} style={{ width: "100%", padding: "9px" }}>↩ Request Revision</Btn>

                    <Btn onClick={() => updateClip(selected.id, { status: "discard", revisionNote: "" })} variant="ghost" style={{ width: "100%", padding: "9px", color: "#525252" }}>✕ Discard</Btn>
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

      <nav style={{ padding: "0 48px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #111" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, background: "#fff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000" }}>✂</div>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ClipFlow</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onLogin("creator")} style={{ background: "transparent", color: "#525252", border: "1px solid #1f1f1f", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Log In</button>
          <button onClick={() => onLogin("creator")} style={{ background: "#fff", color: "#000", border: "none", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Get Started</button>
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#111", border: "1px solid #1f1f1f", borderRadius: 99, padding: "4px 14px", marginBottom: 36, color: "#525252", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Clip Review Platform
        </div>

        <h1 style={{ fontSize: "clamp(38px, 6vw, 70px)", fontWeight: 900, color: "#fff", margin: "0 0 20px", letterSpacing: "-0.045em", lineHeight: 1.0, maxWidth: 700 }}>
          One place for your<br />entire clip workflow.
        </h1>
        <p style={{ color: "#404040", fontSize: 16, maxWidth: 440, lineHeight: 1.75, margin: "0 0 40px" }}>
          Your team uploads. You review, approve, and route. No Drive folders. No messy spreadsheets.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onLogin("creator")} style={{ background: "#fff", color: "#000", border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Start free →</button>
          <button onClick={() => onLogin("clipper")} style={{ background: "transparent", color: "#525252", border: "1px solid #1f1f1f", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>I'm a clipper</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 40, flexWrap: "wrap", justifyContent: "center" }}>
          {["Custom folders", "Video sessions", "Revision feedback", "Clipper brief", "Multi-account"].map(f => (
            <span key={f} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", color: "#404040", padding: "5px 13px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{f}</span>
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
                  <div key={i} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 6, overflow: "hidden" }}>
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

      <div style={{ textAlign: "center", padding: "20px", borderTop: "1px solid #0d0d0d", color: "#1f1f1f", fontSize: 11, fontWeight: 600 }}>
        © 2025 CLIPFLOW
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [role, setRole] = useState(null);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [brief, setBrief] = useState(INITIAL_BRIEF);
  const [guidelines, setGuidelines] = useState(INITIAL_GUIDELINES);
  const [agreement, setAgreement] = useState(INITIAL_AGREEMENT);
  const [signatures, setSignatures] = useState(MOCK_SIGNATURES);
  const [clipperSigned, setClipperSigned] = useState(false);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);

  const handleSign = (name) => {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " at " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setSignatures(s => [...s, { name, signedAt: formatted }]);
    setClipperSigned(true);
  };

  // Show agreement gate for clippers who haven't signed yet
  if (role === "clipper" && agreement.enabled && !clipperSigned) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 2px; }`}</style>
        <AgreementGate agreement={agreement} onSign={handleSign} />
      </div>
    );
  }

  if (!role) return <Landing onLogin={setRole} />;

  return (
    <div style={{ minHeight: "100vh", background: "#000", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#e5e5e5" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #111; }
      `}</style>

      {/* Topbar */}
      <div style={{ height: 58, borderBottom: "1px solid #111", display: "flex", alignItems: "center", padding: "0 24px", position: "sticky", top: 0, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(10px)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 22, height: 22, background: "#fff", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#000" }}>✂</div>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>ClipFlow</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#303030", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{role === "creator" ? "Creator" : "Clipper"}</span>
          <button onClick={() => { setRole(null); setClipperSigned(false); }} style={{ background: "transparent", border: "1px solid #1f1f1f", color: "#404040", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Exit</button>
        </div>
      </div>

      {role === "clipper"
        ? <ClipperView sessions={sessions} categories={categories} brief={brief} guidelines={guidelines} agreement={agreement} onSign={handleSign} />
        : <CreatorView sessions={sessions} setSessions={setSessions} categories={categories} setCategories={setCategories} brief={brief} setBrief={setBrief} guidelines={guidelines} setGuidelines={setGuidelines} agreement={agreement} setAgreement={setAgreement} signatures={signatures} activity={activity} setActivity={setActivity} />
      }
    </div>
  );
}
