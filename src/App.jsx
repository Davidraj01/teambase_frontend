import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "https://skiez-campus-backend.onrender.com/api";

const TEAMS = [
  { id: "uiux",   name: "UI/UX Design",       icon: "🎨", color: "#ec4899" },
  { id: "python", name: "Python Developers",   icon: "🐍", color: "#3b82f6" },
  { id: "flutter", name: "Flutter Developers",  icon: "🦋", color: "#06b6d4" },
  { id: "mern",   name: "MERN Stack",          icon: "⚛️", color: "#10b981" },
  { id: "pm",     name: "Project Managers",    icon: "📋", color: "#8b5cf6" },
  { id: "dm",     name: "Digital Marketing",   icon: "📣", color: "#ef4444" },
  { id: "hr",     name: "HR",                  icon: "🤝", color: "#14b8a6" },
  { id: "sales",  name: "Sales & Marketing",   icon: "💼", color: "#f97316" },
  { id: "marine", name: "Marine",              icon: "🌊", color: "#0ea5e9" },
];

const PRIORITY = { urgent:{label:"Urgent",color:"#ef4444"}, high:{label:"High",color:"#f59e0b"}, medium:{label:"Medium",color:"#3b82f6"}, low:{label:"Low",color:"#94a3b8"} };
const STATUS   = { todo:{label:"To Do",color:"#94a3b8",bg:"#f1f5f9"}, inprogress:{label:"In Progress",color:"#3b82f6",bg:"#eff6ff"}, done:{label:"Done",color:"#10b981",bg:"#f0fdf4"} };

// ─── API HELPER ───────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

// ─── SMALL UI ─────────────────────────────────────────────────────────────────
function Avatar({ name = "?", avatar, color = "#6366f1", size = 32 }) {
  return <div style={{ width:size, height:size, borderRadius:"50%", background:color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.33, fontWeight:700, flexShrink:0 }}>{avatar || name.slice(0,2).toUpperCase()}</div>;
}
function Badge({ label, color }) {
  return <span style={{ background:color+"20", color, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{label}</span>;
}
function Btn({ children, onClick, variant="primary", style={}, disabled=false }) {
  const v = { primary:{background:"#6366f1",color:"#fff"}, secondary:{background:"#f1f5f9",color:"#374151"}, danger:{background:"#fee2e2",color:"#ef4444"}, success:{background:"#d1fae5",color:"#059669"} };
  return <button onClick={onClick} disabled={disabled} style={{ ...v[variant], border:"none", borderRadius:8, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.6:1, ...style }}>{children}</button>;
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:480, maxHeight:"90vh", overflow:"auto", boxShadow:"0 25px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 22px", borderBottom:"1px solid #f1f5f9" }}>
          <h3 style={{ margin:0, fontSize:17, color:"#0f172a" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:18, color:"#64748b" }}>×</button>
        </div>
        <div style={{ padding:22 }}>{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <div style={{ marginBottom:14 }}><label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>{label}</label>{children}</div>;
}
function Inp({ label, ...p }) {
  return <Field label={label}><input style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", background:"#f8fafc" }} {...p} /></Field>;
}
function Sel({ label, children, ...p }) {
  return <Field label={label}><select style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", background:"#f8fafc" }} {...p}>{children}</select></Field>;
}
function Alert({ msg, type="error" }) {
  if (!msg) return null;
  const colors = { error:["#fee2e2","#ef4444"], success:["#d1fae5","#059669"], info:["#eff6ff","#3b82f6"] };
  const [bg, color] = colors[type];
  return <div style={{ background:bg, color, padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:14 }}>{msg}</div>;
}
function Spinner() {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:40 }}><div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

// ─── FORGOT PASSWORD FLOW ────────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [step, setStep]   = useState(1); // 1=email, 2=otp, 3=newpass
  const [email, setEmail] = useState("");
  const [otp, setOtp]     = useState("");
  const [pass, setPass]   = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg]     = useState(null);
  const [ok, setOk]       = useState(null);
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    setLoading(true); setMsg(null);
    try { await apiFetch("/auth/forgot-password", { method:"POST", body:JSON.stringify({ email }) }); setStep(2); setOk("OTP sent to your email!"); }
    catch(e) { setMsg(e.message); } finally { setLoading(false); }
  };
  const verifyOTP = async () => {
    setLoading(true); setMsg(null);
    try { await apiFetch("/auth/verify-otp", { method:"POST", body:JSON.stringify({ email, otp }) }); setStep(3); setOk("OTP verified!"); }
    catch(e) { setMsg(e.message); } finally { setLoading(false); }
  };
  const resetPass = async () => {
    if (pass !== pass2) { setMsg("Passwords do not match."); return; }
    setLoading(true); setMsg(null);
    try { await apiFetch("/auth/reset-password", { method:"POST", body:JSON.stringify({ email, otp, newPassword:pass }) }); setOk("Password reset! Please login."); setTimeout(onBack, 2000); }
    catch(e) { setMsg(e.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h3 style={{ margin:"0 0 6px", color:"#0f172a" }}>🔐 Reset Password</h3>
      <p style={{ color:"#64748b", fontSize:13, margin:"0 0 20px" }}>Step {step} of 3</p>
      <Alert msg={ok} type="success" /><Alert msg={msg} />
      {step===1 && <><Inp label="Your Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" /><Btn onClick={sendOTP} disabled={loading} style={{ width:"100%" }}>{loading?"Sending OTP...":"Send OTP →"}</Btn></>}
      {step===2 && <><Inp label="Enter OTP (check email)" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} /><Btn onClick={verifyOTP} disabled={loading} style={{ width:"100%" }}>{loading?"Verifying...":"Verify OTP →"}</Btn></>}
      {step===3 && <><Inp label="New Password" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Min 6 characters" /><Inp label="Confirm Password" type="password" value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="Repeat password" /><Btn onClick={resetPass} disabled={loading} style={{ width:"100%" }}>{loading?"Resetting...":"Reset Password ✓"}</Btn></>}
      <button onClick={onBack} style={{ background:"none", border:"none", color:"#6366f1", cursor:"pointer", fontSize:13, marginTop:14, padding:0 }}>← Back to Login</button>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [err, setErr]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);

  const login = async () => {
    setLoading(true); setErr(null);
    try {
      const { token, user } = await apiFetch("/auth/login", { method:"POST", body:JSON.stringify({ email, password:pass }) });
      localStorage.setItem("tb_token", token);
      localStorage.setItem("tb_user", JSON.stringify(user));
      onLogin(token, user);
    } catch(e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:20, padding:40, width:380, boxShadow:"0 30px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:44 }}>🚀</div>
          <h1 style={{ margin:"8px 0 4px", fontSize:24, fontWeight:800, color:"#0f172a" }}>TeamBase Pro</h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>IT Company Management · 40 Members · 9 Teams</p>
        </div>
        {forgot ? <ForgotPassword onBack={()=>setForgot(false)} /> : (
          <>
            <Alert msg={err} />
            <Inp label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" />
            <Inp label="Password" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Your password" />
            <button onClick={login} disabled={loading} style={{ width:"100%", padding:"13px 0", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:12 }}>{loading?"Logging in...":"Login →"}</button>
            <button onClick={()=>setForgot(true)} style={{ background:"none", border:"none", color:"#6366f1", cursor:"pointer", fontSize:13, width:"100%", textAlign:"center" }}>Forgot Password?</button>
            <div style={{ marginTop:16, padding:12, background:"#f8fafc", borderRadius:8, fontSize:12, color:"#64748b" }}>
              <strong>Admin:</strong> admin@company.com / Admin@123<br/>
              <strong>Members:</strong> firstname@company.com / Pass@123
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CHANGE PASSWORD MODAL ────────────────────────────────────────────────────
function ChangePasswordModal({ token, onClose }) {
  const [cur, setCur]   = useState("");
  const [n1, setN1]     = useState("");
  const [n2, setN2]     = useState("");
  const [msg, setMsg]   = useState(null);
  const [ok, setOk]     = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (n1 !== n2) { setMsg("Passwords don't match."); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await apiFetch("/auth/change-password", { method:"PUT", body:JSON.stringify({ currentPassword:cur, newPassword:n1 }) }, token);
      setOk(res.message); setTimeout(onClose, 1500);
    } catch(e) { setMsg(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal title="🔐 Change Password" onClose={onClose}>
      <Alert msg={ok} type="success" /><Alert msg={msg} />
      <Inp label="Current Password" type="password" value={cur} onChange={e=>setCur(e.target.value)} />
      <Inp label="New Password" type="password" value={n1} onChange={e=>setN1(e.target.value)} />
      <Inp label="Confirm New Password" type="password" value={n2} onChange={e=>setN2(e.target.value)} />
      <Btn onClick={submit} disabled={loading} style={{ width:"100%" }}>{loading?"Saving...":"Change Password"}</Btn>
    </Modal>
  );
}

// ─── ADMIN: USER MANAGEMENT ───────────────────────────────────────────────────
function UserManagement({ token }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [newPass, setNewPass]   = useState("");
  const [msg, setMsg]           = useState(null);
  const [ok, setOk]             = useState(null);
  const [newUser, setNewUser]   = useState({ name:"", email:"", password:"", role:"member", teamId:"uiux", designation:"" });
  const [filterTeam, setFilterTeam] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const u = await apiFetch(`/users${filterTeam?`?teamId=${filterTeam}`:""}`, {}, token); setUsers(u); }
    catch(e) { setMsg(e.message); } finally { setLoading(false); }
  }, [token, filterTeam]);

  useEffect(() => { load(); }, [load]);

  const createUser = async () => {
    setMsg(null);
    try { await apiFetch("/users", { method:"POST", body:JSON.stringify(newUser) }, token); setOk("User created! Welcome email sent."); setShowAdd(false); setNewUser({ name:"", email:"", password:"", role:"member", teamId:"uiux", designation:"" }); load(); }
    catch(e) { setMsg(e.message); }
  };

  const updateUser = async () => {
    setMsg(null);
    try { await apiFetch(`/users/${editUser._id}`, { method:"PUT", body:JSON.stringify(editUser) }, token); setOk("User updated."); setEditUser(null); load(); }
    catch(e) { setMsg(e.message); }
  };

  const deactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    try { await apiFetch(`/users/${id}`, { method:"DELETE" }, token); setOk(`${name} deactivated.`); load(); }
    catch(e) { setMsg(e.message); }
  };

  const adminReset = async () => {
    if (!newPass || newPass.length < 6) { setMsg("Min 6 characters."); return; }
    try { await apiFetch(`/users/${resetUser._id}/reset-password`, { method:"PUT", body:JSON.stringify({ newPassword:newPass }) }, token); setOk(`Password reset for ${resetUser.name}.`); setResetUser(null); setNewPass(""); }
    catch(e) { setMsg(e.message); }
  };

  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div><h3 style={{ margin:0, fontSize:18, color:"#0f172a" }}>👥 User Management</h3><p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>{users.length} users</p></div>
        <Btn onClick={()=>setShowAdd(true)}>+ New User</Btn>
      </div>
      <Alert msg={ok} type="success" /><Alert msg={msg} />

      {/* Filter */}
      <div style={{ marginBottom:16 }}>
        <select value={filterTeam} onChange={e=>setFilterTeam(e.target.value)} style={{ padding:"8px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, background:"#f8fafc" }}>
          <option value="">All Teams</option>
          {TEAMS.map(t=><option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display:"grid", gap:10 }}>
          {users.map(u => {
            const team = TEAMS.find(t=>t.id===u.teamId);
            return (
              <div key={u._id} style={{ background:"#fff", borderRadius:12, padding:"14px 18px", border:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:14 }}>
                <Avatar name={u.name} avatar={u.avatar} color={team?.color||"#6366f1"} size={40} />
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:700, fontSize:15, color:"#0f172a" }}>{u.name}</span>
                    {u.role==="admin" && <Badge label="Admin" color="#6366f1" />}
                    {!u.isActive && <Badge label="Inactive" color="#94a3b8" />}
                  </div>
                  <div style={{ fontSize:12, color:"#64748b" }}>{u.email} · {u.designation}</div>
                  {team && <div style={{ fontSize:11, color:team.color, fontWeight:600, marginTop:2 }}>{team.icon} {team.name}</div>}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn variant="secondary" onClick={()=>setEditUser({...u})} style={{ fontSize:12, padding:"6px 12px" }}>Edit</Btn>
                  <Btn variant="secondary" onClick={()=>{ setResetUser(u); setNewPass(""); }} style={{ fontSize:12, padding:"6px 12px" }}>🔐 Reset</Btn>
                  {u.role!=="admin" && <Btn variant="danger" onClick={()=>deactivate(u._id, u.name)} style={{ fontSize:12, padding:"6px 12px" }}>Deactivate</Btn>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showAdd && (
        <Modal title="Create New User" onClose={()=>setShowAdd(false)}>
          <Alert msg={msg} />
          <Inp label="Full Name" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} placeholder="e.g. Kavya Reddy" />
          <Inp label="Email" type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="kavya@company.com" />
          <Inp label="Password" type="password" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} placeholder="Min 6 characters" />
          <Inp label="Designation" value={newUser.designation} onChange={e=>setNewUser({...newUser,designation:e.target.value})} placeholder="e.g. React Developer" />
          <Sel label="Role" value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>
            <option value="member">Team Member</option>
            <option value="admin">Admin</option>
          </Sel>
          {newUser.role==="member" && (
            <Sel label="Team" value={newUser.teamId} onChange={e=>setNewUser({...newUser,teamId:e.target.value})}>
              {TEAMS.map(t=><option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </Sel>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={createUser}>Create & Send Welcome Email</Btn>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title="Edit User" onClose={()=>setEditUser(null)}>
          <Alert msg={msg} />
          <Inp label="Full Name" value={editUser.name} onChange={e=>setEditUser({...editUser,name:e.target.value})} />
          <Inp label="Email" value={editUser.email} onChange={e=>setEditUser({...editUser,email:e.target.value})} />
          <Inp label="Designation" value={editUser.designation||""} onChange={e=>setEditUser({...editUser,designation:e.target.value})} />
          <Sel label="Team" value={editUser.teamId||""} onChange={e=>setEditUser({...editUser,teamId:e.target.value})}>
            {TEAMS.map(t=><option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </Sel>
          <Field label="Status">
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <input type="checkbox" checked={editUser.isActive} onChange={e=>setEditUser({...editUser,isActive:e.target.checked})} />
              Active
            </label>
          </Field>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="secondary" onClick={()=>setEditUser(null)}>Cancel</Btn>
            <Btn onClick={updateUser}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {/* Admin Reset Password Modal */}
      {resetUser && (
        <Modal title={`Reset Password — ${resetUser.name}`} onClose={()=>setResetUser(null)}>
          <Alert msg={msg} />
          <p style={{ color:"#64748b", fontSize:13 }}>Set a new password for <strong>{resetUser.name}</strong>. They will be notified to change it after login.</p>
          <Inp label="New Password" type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Min 6 characters" />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="secondary" onClick={()=>setResetUser(null)}>Cancel</Btn>
            <Btn onClick={adminReset}>Reset Password</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CHAT VIEW ────────────────────────────────────────────────────────────────
function ChatView({ teamId, user, token }) {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg]           = useState("");
  const [loading, setLoading]   = useState(true);
  const team = TEAMS.find(t=>t.id===teamId);

  useEffect(()=>{
    setLoading(true);
    apiFetch(`/messages/${teamId}`,{},token).then(setMessages).catch(()=>{}).finally(()=>setLoading(false));
  },[teamId,token]);

  const send = async () => {
    if (!msg.trim()) return;
    try {
      const m = await apiFetch("/messages",{method:"POST",body:JSON.stringify({teamId,text:msg})},token);
      setMessages(p=>[...p,m]); setMsg("");
    } catch(e) { console.error(e); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ padding:"14px 20px", borderBottom:"1px solid #f1f5f9" }}>
        <span style={{ fontSize:20 }}>{team?.icon}</span> <strong>{team?.name}</strong> Chat
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:14 }}>
        {loading ? <Spinner /> : messages.map(m=>{
          const isMe = m.from?._id === user._id;
          const sender = m.from || {};
          const senderTeam = TEAMS.find(t=>t.id===sender.teamId);
          return (
            <div key={m._id} style={{ display:"flex", gap:10, flexDirection:isMe?"row-reverse":"row" }}>
              <Avatar name={sender.name||"?"} avatar={sender.avatar} color={sender.role==="admin"?"#6366f1":senderTeam?.color||"#94a3b8"} size={34} />
              <div style={{ maxWidth:"70%" }}>
                <div style={{ fontSize:11, color:"#94a3b8", marginBottom:3, textAlign:isMe?"right":"left" }}>
                  {isMe?"You":sender.name} · {new Date(m.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                </div>
                <div style={{ background:isMe?"#6366f1":"#f1f5f9", color:isMe?"#fff":"#0f172a", padding:"10px 14px", borderRadius:isMe?"12px 12px 2px 12px":"12px 12px 12px 2px", fontSize:14, lineHeight:1.5 }}>{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding:16, borderTop:"1px solid #f1f5f9", display:"flex", gap:10 }}>
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a message... (Enter to send)" style={{ flex:1, padding:"10px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none" }} />
        <Btn onClick={send}>Send →</Btn>
      </div>
    </div>
  );
}

// ─── TASKS VIEW ───────────────────────────────────────────────────────────────
function TasksView({ teamId, user, token }) {
  const [tasks, setTasks]   = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title:"", assignee:"", priority:"medium", due:"" });
  const [msg, setMsg]         = useState(null);
  const team = TEAMS.find(t=>t.id===teamId);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([
        apiFetch(`/tasks/${teamId}`,{},token),
        apiFetch(`/users/team/${teamId}`,{},token)
      ]);
      setTasks(t); setMembers(m);
    } catch(e) { setMsg(e.message); } finally { setLoading(false); }
  },[teamId,token]);

  useEffect(()=>{ load(); },[load]);

  const addTask = async () => {
    setMsg(null);
    try {
      await apiFetch("/tasks",{method:"POST",body:JSON.stringify({...newTask,teamId})},token);
      setShowAdd(false); setNewTask({title:"",assignee:"",priority:"medium",due:""}); load();
    } catch(e) { setMsg(e.message); }
  };

  const updateStatus = async (id, status) => {
    try { await apiFetch(`/tasks/${id}/status`,{method:"PUT",body:JSON.stringify({status})},token); setTasks(p=>p.map(t=>t._id===id?{...t,status}:t)); }
    catch(e) { console.error(e); }
  };

  const deleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;
    try { await apiFetch(`/tasks/${id}`,{method:"DELETE"},token); setTasks(p=>p.filter(t=>t._id!==id)); }
    catch(e) { console.error(e); }
  };

  if (loading) return <Spinner />;
  const cols = ["todo","inprogress","done"];

  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h3 style={{ margin:0, fontSize:18, color:"#0f172a" }}>{team?.icon} {team?.name} — Tasks</h3>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"#64748b" }}>{tasks.filter(t=>t.status==="done").length}/{tasks.length} done</p>
        </div>
        {user.role==="admin" && <Btn onClick={()=>setShowAdd(true)}>+ Add Task</Btn>}
      </div>
      <Alert msg={msg} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
        {cols.map(col=>{
          const colTasks = tasks.filter(t=>t.status===col);
          return (
            <div key={col} style={{ background:STATUS[col].bg, borderRadius:12, padding:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:STATUS[col].color }} />
                <span style={{ fontWeight:700, fontSize:13, color:"#374151" }}>{STATUS[col].label}</span>
                <span style={{ background:STATUS[col].color+"30", color:STATUS[col].color, borderRadius:20, fontSize:11, fontWeight:700, padding:"1px 7px" }}>{colTasks.length}</span>
              </div>
              {colTasks.map(task=>{
                const assignee = task.assignee;
                return (
                  <div key={task._id} style={{ background:"#fff", borderRadius:10, padding:12, marginBottom:10, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#0f172a", lineHeight:1.4, flex:1 }}>{task.title}</div>
                      {user.role==="admin" && <button onClick={()=>deleteTask(task._id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:14, padding:"0 0 0 6px" }}>×</button>}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <Badge label={PRIORITY[task.priority]?.label} color={PRIORITY[task.priority]?.color} />
                      {task.due && <span style={{ fontSize:10, color:"#94a3b8" }}>📅 {task.due?.slice(0,10)}</span>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      {assignee && <div style={{ display:"flex", alignItems:"center", gap:6 }}><Avatar name={assignee.name} avatar={assignee.avatar} color={team?.color} size={22}/><span style={{ fontSize:11, color:"#64748b" }}>{assignee.name?.split(" ")[0]}</span></div>}
                      <select onChange={e=>updateStatus(task._id,e.target.value)} value={task.status} style={{ border:"1px solid #e2e8f0", borderRadius:6, padding:"3px 5px", fontSize:10, background:"#f8fafc", cursor:"pointer" }}>
                        <option value="todo">To Do</option>
                        <option value="inprogress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Modal title="Add Task" onClose={()=>setShowAdd(false)}>
          <Alert msg={msg} />
          <Inp label="Task Title" value={newTask.title} onChange={e=>setNewTask({...newTask,title:e.target.value})} placeholder="What needs to be done?" />
          <Sel label="Assign To" value={newTask.assignee} onChange={e=>setNewTask({...newTask,assignee:e.target.value})}>
            <option value="">Select member</option>
            {members.map(m=><option key={m._id} value={m._id}>{m.name} — {m.designation}</option>)}
          </Sel>
          <Sel label="Priority" value={newTask.priority} onChange={e=>setNewTask({...newTask,priority:e.target.value})}>
            <option value="urgent">🔥 Urgent</option>
            <option value="high">⚡ High</option>
            <option value="medium">📌 Medium</option>
            <option value="low">💤 Low</option>
          </Sel>
          <Inp label="Due Date" type="date" value={newTask.due} onChange={e=>setNewTask({...newTask,due:e.target.value})} />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={addTask}>Add Task</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MEMBERS VIEW ─────────────────────────────────────────────────────────────
function MembersView({ teamId, token }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const team = TEAMS.find(t=>t.id===teamId);

  useEffect(()=>{
    apiFetch(`/users/team/${teamId}`,{},token).then(setMembers).catch(()=>{}).finally(()=>setLoading(false));
  },[teamId,token]);

  if (loading) return <Spinner />;
  return (
    <div style={{ padding:24, overflowY:"auto", height:"100%" }}>
      <h3 style={{ margin:"0 0 20px", fontSize:18, color:"#0f172a" }}>{team?.icon} {team?.name} — Members ({members.length})</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
        {members.map(m=>(
          <div key={m._id} style={{ background:"#fff", borderRadius:14, padding:18, border:"1px solid #f1f5f9" }}>
            <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:10 }}>
              <Avatar name={m.name} avatar={m.avatar} color={team?.color} size={44} />
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{m.name}</div>
                <div style={{ fontSize:12, color:"#94a3b8" }}>{m.designation}</div>
              </div>
            </div>
            <div style={{ fontSize:12, color:"#64748b" }}>✉️ {m.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ token, onSelectTeam }) {
  const [stats, setStats] = useState({ users:0, tasks:0, done:0, urgent:0 });

  useEffect(()=>{
    apiFetch("/users",{},token).then(u=>setStats(s=>({...s,users:u.length}))).catch(()=>{});
  },[token]);

  return (
    <div style={{ padding:28, overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#0f172a", margin:"0 0 4px" }}>👑 Admin Overview</h2>
        <p style={{ color:"#64748b", margin:0, fontSize:14 }}>Full access to all 9 teams. Team members only see their own workspace.</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
        {[{label:"Total Teams",value:9,icon:"🏢",color:"#6366f1"},{label:"Team Members",value:40,icon:"👥",color:"#10b981"},{label:"Total Users (DB)",value:stats.users,icon:"💾",color:"#3b82f6"}].map((s,i)=>( 
          <div key={i} style={{ background:"#fff", borderRadius:12, padding:18, border:"1px solid #f1f5f9" }}>
            <div style={{ fontSize:26, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:"#64748b" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <h3 style={{ fontSize:16, color:"#0f172a", margin:"0 0 14px" }}>Select a Team to Manage</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 }}>
        {TEAMS.map(team=>(
          <div key={team.id} onClick={()=>onSelectTeam(team.id)} style={{ background:"#fff", borderRadius:14, padding:18, cursor:"pointer", border:"1px solid #f1f5f9", borderLeft:`4px solid ${team.color}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:24 }}>{team.icon}</span>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"#0f172a" }}>{team.name}</div>
                <div style={{ fontSize:12, color:"#94a3b8" }}>5 members · Click to manage →</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken]     = useState(()=>localStorage.getItem("tb_token"));
  const [user, setUser]       = useState(()=>{ try { return JSON.parse(localStorage.getItem("tb_user")); } catch { return null; } });
  const [activeTeam, setActiveTeam] = useState(null);
  const [tab, setTab]         = useState("tasks");
  const [showChangePw, setShowChangePw] = useState(false);
  const [adminTab, setAdminTab] = useState("dashboard");
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushStatus, setPushStatus] = useState("");

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  // Registers the single service worker (idempotent — the browser reuses
  // the existing registration if the script is unchanged).
  const registerServiceWorker = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushSupported(false);
      return null;
    }
    setPushSupported(true);
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      return reg;
    } catch (e) {
      console.error('Service worker registration failed', e);
      return null;
    }
  }, []);

  // Creates (or re-validates) the push subscription and saves it on the
  // backend against the logged-in user.
  // `interactive` = true means this was triggered by a user click, so it's
  // safe to pop the permission prompt; when false (e.g. automatic
  // re-subscribe on load) we only proceed if permission was already granted,
  // since browsers block Notification.requestPermission() outside a
  // user gesture anyway.
  const ensurePushSubscription = useCallback(async (interactive = false) => {
    if (!token || !('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    if (!('Notification' in window)) return null;

    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      let permission = Notification.permission;
      if (permission === 'denied') {
        setPushStatus('Permission denied');
        return null;
      }
      if (permission !== 'granted') {
        if (!interactive) return null; // don't prompt without a user gesture
        permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setPushStatus('Permission ' + permission);
          return null;
        }
      }

      const vap = await apiFetch('/push/vapidPublicKey', {}, token);
      if (!vap.key) {
        console.error('No VAPID public key returned by server — push disabled.');
        setPushStatus('Push not configured on server');
        return null;
      }
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vap.key)
      });
    }

    // Always (re)send the subscription — cheap upsert on the backend, and
    // makes sure it's tied to whichever account is currently logged in,
    // even if the browser already had a subscription from a previous login.
    await apiFetch('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }, token);
    setPushSubscribed(true);
    setPushStatus('subscribed');
    return subscription;
  }, [token]);

  const handleNotifButtonClick = async () => {
    if (!pushSubscribed && pushSupported) {
      try {
        await ensurePushSubscription(true);
      } catch (e) {
        console.error('Push setup failed', e);
      }
    }
    setShowNotifs(s => !s);
    if (!showNotifs) loadNotifications();
  };

  const applyNotificationIntent = useCallback((targetUrl) => {
    if (typeof window === 'undefined' || !targetUrl) return;
    try {
      const url = new URL(targetUrl, window.location.origin);
      const view = url.searchParams.get('view');
      const teamId = url.searchParams.get('teamId');
      const shouldOpenNotifications = url.searchParams.get('openNotifications') === '1' || url.searchParams.get('openNotifications') === 'true';

      if (view === 'chat' || view === 'tasks') {
        setTab(view);
        if (teamId) setActiveTeam(teamId);
      }
      if (shouldOpenNotifications) {
        setShowNotifs(true);
      }
    } catch (e) {
      console.error('Failed to apply notification target', e);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const n = await apiFetch('/notifications', {}, token);
      setNotifications(n);
    } catch (e) { console.error('Failed loading notifications', e.message); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadNotifications();
    const id = setInterval(loadNotifications, 30000);
    return () => clearInterval(id);
  }, [token, loadNotifications]);

  // Register the service worker and silently (re-)subscribe to push once
  // logged in. Silent = only if permission was already granted previously,
  // so this reliably restores notifications on reload/new tab/new device
  // session without needing another click on the bell icon.
  useEffect(() => {
    if (!token || !user) return;
    applyNotificationIntent(window.location.href);
    let cancelled = false;
    (async () => {
      const reg = await registerServiceWorker();
      if (!reg || cancelled) return;
      try {
        await ensurePushSubscription(false);
      } catch (e) {
        console.error('Push auto-subscribe failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [token, user, registerServiceWorker, ensurePushSubscription, applyNotificationIntent]);

  // If the browser silently rotates the push subscription in the background,
  // the service worker posts us the new one so we can save it right away.
  useEffect(() => {
    if (!token || !('serviceWorker' in navigator)) return;
    const onMessage = (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && event.data.subscription) {
        apiFetch('/push/subscribe', { method: 'POST', body: JSON.stringify(event.data.subscription) }, token)
          .catch((e) => console.error('Failed to save rotated push subscription', e));
      }
      if (event.data?.type === 'PUSH_NOTIFICATION_CLICK' && event.data.url) {
        applyNotificationIntent(event.data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [token]);

  const markNotification = async (n) => {
    try {
      await apiFetch(`/notifications/${n._id}/read`, { method: 'PUT' }, token);
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
      // navigate to team/tab
      if (n.teamId) { setActiveTeam(n.teamId); setTab(n.type === 'message' ? 'chat' : 'tasks'); }
      setShowNotifs(false);
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' }, token);
      setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    } catch (e) { console.error(e); }
  };

  const login = (t, u) => { setToken(t); setUser(u); if (u.role==="member") setActiveTeam(u.teamId); };
  const logout = () => { localStorage.removeItem("tb_token"); localStorage.removeItem("tb_user"); setToken(null); setUser(null); setActiveTeam(null); };

  if (!token || !user) return <Login onLogin={login} />;

  const visibleTeams = user.role==="admin" ? TEAMS : TEAMS.filter(t=>t.id===user.teamId);
  const currentTeam  = TEAMS.find(t=>t.id===activeTeam);

  return (
    <div className="app-root">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="top">
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, background:"#6366f1", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🚀</div>
            <div><div style={{ color:"#fff", fontWeight:800, fontSize:14 }}>TeamBase Pro</div><div style={{ color:"#475569", fontSize:10 }}>40 Members · 9 Teams</div></div>
          </div>
          <button className="sidebar-close-button" onClick={()=>setSidebarOpen(false)} aria-label="Close menu">×</button>
          <div style={{ background:"#1e293b", borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
            <Avatar name={user.name} avatar={user.avatar} color={user.role==="admin"?"#6366f1":currentTeam?.color||"#6366f1"} size={28} />
            <div style={{ flex:1, overflow:"hidden" }}>
              <div style={{ color:"#fff", fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</div>
              <div style={{ color:"#475569", fontSize:10 }}>{user.role==="admin"?"👑 Admin":currentTeam?.name}</div>
            </div>
          </div>
        </div>

        <nav>
          {user.role==="admin" && (
            <>
              <button onClick={()=>{ setAdminTab("dashboard"); setActiveTeam(null); setSidebarOpen(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 10px", marginBottom:4, border:"none", borderRadius:8, background:!activeTeam&&adminTab==="dashboard"?"#1e293b":"transparent", color:!activeTeam&&adminTab==="dashboard"?"#fff":"#94a3b8", cursor:"pointer", fontSize:13, fontWeight:600, textAlign:"left" }}>🏠 Dashboard</button>
              <button onClick={()=>{ setAdminTab("users"); setActiveTeam(null); setSidebarOpen(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 10px", marginBottom:8, border:"none", borderRadius:8, background:!activeTeam&&adminTab==="users"?"#1e293b":"transparent", color:!activeTeam&&adminTab==="users"?"#fff":"#94a3b8", cursor:"pointer", fontSize:13, fontWeight:600, textAlign:"left" }}>👥 User Management</button>
            </>
          )}
          <div style={{ color:"#475569", fontSize:10, fontWeight:700, padding:"6px 10px 4px", letterSpacing:1 }}>{user.role==="admin"?"ALL TEAMS":"MY TEAM"}</div>
          {visibleTeams.map(team=>(
            <button key={team.id} onClick={()=>{ setActiveTeam(team.id); setTab("tasks"); setSidebarOpen(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 10px", marginBottom:3, border:"none", borderRadius:8, background:activeTeam===team.id?"#1e293b":"transparent", color:activeTeam===team.id?"#fff":"#94a3b8", cursor:"pointer", fontSize:13, fontWeight:activeTeam===team.id?700:400, textAlign:"left" }}>
              <span>{team.icon}</span>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{team.name}</span>
            </button>
          ))}
        </nav>

        <div className="footer">
          <button onClick={()=>{ setShowChangePw(true); setSidebarOpen(false); }} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:12, textAlign:"left", padding:"6px 10px", borderRadius:6 }}>🔐 Change Password</button>
          <button onClick={()=>{ logout(); setSidebarOpen(false); }} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:12, textAlign:"left", padding:"6px 10px", borderRadius:6 }}>← Logout</button>
        </div>
      </div>

      <div className={`sidebar-backdrop ${sidebarOpen ? "visible" : ""}`} onClick={()=>setSidebarOpen(false)} />
      {/* Main */}
      <div className="main">
        {/* Top bar */}
        <div className="topbar">
          <button className="topbar-menu-button" onClick={()=>setSidebarOpen(true)} aria-label="Open menu">☰</button>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {currentTeam && <span style={{ fontSize:22 }}>{currentTeam.icon}</span>}
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:"#0f172a" }}>
                {!activeTeam && adminTab==="dashboard" ? "Admin Dashboard" : !activeTeam && adminTab==="users" ? "User Management" : currentTeam?.name}
              </div>
              <div style={{ fontSize:12, color:"#94a3b8" }}>
                {currentTeam ? `${5} members` : user.role==="admin" ? "Full system access" : ""}
              </div>
            </div>
            <div className="topbar-actions">
              <button className="topbar-icon-button" onClick={handleNotifButtonClick}>🔔</button>
              <button className="topbar-logout-button" onClick={logout}>← Logout</button>
              <div className="notif-container">
                {notifications.filter(n => !n.read).length > 0 && <span className="notif-badge">{notifications.filter(n => !n.read).length}</span>}
                {showNotifs && (
                  <div className="notif-panel">
                    <div className="notif-panel-header">
                      <span className="notif-panel-title">Notifications</span>
                      <button className="notif-close-button" onClick={() => setShowNotifs(false)} aria-label="Close notifications">×</button>
                    </div>
                    {notifications.length === 0 && <div style={{ color:"#64748b", padding:12 }}>No notifications</div>}
                    {notifications.map(n => (
                      <div key={n._id} onClick={() => markNotification(n)} style={{ padding:10, borderBottom:"1px solid #f1f5f9", background: n.read ? "#fff" : "#f8fafc", cursor:"pointer" }}>
                        <div style={{ fontSize:13, fontWeight:700 }}>{n.title}</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{n.body}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                    {notifications.length > 0 && <div style={{ textAlign:"right", marginTop:8 }}><button onClick={markAllRead} style={{ background:"none", border:"none", color: "#6366f1", cursor:"pointer" }}>Mark all read</button></div>}
                  </div>
                )}
              </div>
            </div>
          </div>
          {activeTeam && (
            <div className="topbar-tabs">
              {[["tasks","📋 Tasks"],["chat","💬 Chat"],["members","👥 Members"]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} className="topbar-tab-button" style={{ padding:"7px 14px", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:tab===k?700:500, background:tab===k?"#fff":"transparent", color:tab===k?"#6366f1":"#64748b", boxShadow:tab===k?"0 1px 4px rgba(0,0,0,0.08)":"none" }}>{l}</button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="content">
          {!activeTeam && adminTab==="dashboard" && <AdminDashboard token={token} onSelectTeam={id=>{ setActiveTeam(id); setTab("tasks"); }} />}
          {!activeTeam && adminTab==="users"     && <UserManagement token={token} />}
          {activeTeam && tab==="tasks"   && <TasksView   teamId={activeTeam} user={user} token={token} />}
          {activeTeam && tab==="chat"    && <ChatView    teamId={activeTeam} user={user} token={token} />}
          {activeTeam && tab==="members" && <MembersView teamId={activeTeam} token={token} />}
        </div>
      </div>

      {showChangePw && <ChangePasswordModal token={token} onClose={()=>setShowChangePw(false)} />}
    </div>
  );
}
