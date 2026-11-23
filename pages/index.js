import { useState, useEffect, useRef } from "react";
import { supabase, fmt, fmtDate, isOverdue, genId, setIdPrefix, authFetch, AGR_STYLES } from "./shared";
import { currentPortalSlug } from "../lib/portal";
import { SONKHELA_TENANT_ID } from "../lib/tenantIds";
import { applyTheme, THEMES } from "../lib/theme";

const ADMIN_STYLES = `
${AGR_STYLES}
body{background:var(--bg);transition:background 0.3s,color 0.3s;}
body.dark{--bg:#0f1a13;--white:#1a2e1f;--border:#2a4030;--muted:#7a9e85;--ink:#e8f5ee;--accent:#1a2e1f;--green-light:#1a2e1f;}
.shell{display:flex;min-height:100vh;}

/* ── Sidebar ── */
.sidebar{width:240px;flex-shrink:0;background:#145f39;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;z-index:100;}
.sidebar-brand{padding:24px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.08);}
.brand-logo{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:18px;font-weight:700;color:#fff;margin-bottom:8px;overflow:hidden;}
.brand-logo img{width:100%;height:100%;object-fit:cover;}
.brand-name{font-family:'Lora',serif;color:#fff;font-size:0.95rem;font-weight:700;line-height:1.3;}
.brand-tag{font-size:0.7rem;color:rgba(255,255,255,0.5);margin-top:2px;}
.sidebar-nav{flex:1;padding:12px;display:flex;flex-direction:column;gap:3px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:none;cursor:pointer;font-family:'Nunito',sans-serif;font-size:0.875rem;font-weight:700;color:rgba(255,255,255,0.6);background:transparent;transition:all 0.18s;text-align:left;width:100%;}
.nav-item:hover{color:#fff;background:rgba(255,255,255,0.08);}
.nav-item.active{color:#145f39;background:#fff;}
.sidebar-footer{padding:12px;border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:6px;}
.logout-btn{width:100%;padding:9px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.5);font-family:'Nunito',sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;gap:8px;}
.logout-btn:hover{background:rgba(255,255,255,0.08);color:#fff;}
.dark-toggle{width:100%;padding:9px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.5);font-family:'Nunito',sans-serif;font-size:0.8rem;font-weight:700;cursor:pointer;transition:all 0.18s;display:flex;align-items:center;gap:8px;}
.dark-toggle:hover{background:rgba(255,255,255,0.08);color:#fff;}

/* ── Mobile Bottom Nav ── */
.mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:#145f39;z-index:200;padding:8px 4px 12px;border-top:1px solid rgba(255,255,255,0.1);}
.mobile-nav-items{display:flex;justify-content:space-around;align-items:center;}
.mobile-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 12px;border:none;background:transparent;cursor:pointer;color:rgba(255,255,255,0.55);font-family:'Nunito',sans-serif;font-size:0.62rem;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;border-radius:8px;transition:all 0.18s;}
.mobile-nav-item.active{color:#fff;background:rgba(255,255,255,0.15);}
.mobile-nav-item .icon{font-size:1.2rem;}
.mobile-nav-items .mobile-nav-item{flex:1;min-width:0;padding:6px 1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:none;letter-spacing:0;font-size:0.68rem;}
@media(max-width:380px){.mobile-nav-items .mobile-nav-item{font-size:0.58rem;}}
.more-overlay{position:fixed;inset:0;background:rgba(13,31,20,0.45);z-index:190;display:flex;align-items:flex-end;}
.more-sheet{width:100%;background:var(--white);border-radius:18px 18px 0 0;padding:8px 12px calc(84px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:4px;box-shadow:0 -8px 30px rgba(13,31,20,0.2);}
.more-handle{width:40px;height:4px;border-radius:4px;background:var(--border);margin:4px auto 8px;}
.more-item{display:flex;align-items:center;gap:12px;width:100%;padding:13px 14px;border:none;border-radius:12px;background:transparent;font-family:'Nunito',sans-serif;font-size:0.95rem;font-weight:800;color:var(--ink);text-decoration:none;cursor:pointer;text-align:left;position:relative;}
.more-item:hover,.more-item.active{background:var(--accent);color:#145f39;}
.more-icon{font-size:1.15rem;width:26px;text-align:center;}
.more-item.nav-locked::after{margin-left:auto;}

/* ── Main ── */
.main{flex:1;overflow-y:auto;min-width:0;}
.topbar{background:var(--white);border-bottom:1px solid var(--border);padding:0 1.5rem;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;}
.topbar-title{font-family:'Lora',serif;font-size:1.1rem;font-weight:700;}
.topbar-date{font-size:0.78rem;color:var(--muted);}
.page{padding:1.5rem;max-width:1100px;padding-bottom:80px;}

/* ── Notification Banner ── */
.notif-banner{background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:12px;padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;color:#fff;}
.notif-icon{font-size:1.5rem;flex-shrink:0;}
.notif-text{flex:1;}
.notif-title{font-weight:800;font-size:0.9rem;margin-bottom:2px;}
.notif-sub{font-size:0.78rem;opacity:0.85;}
.notif-items{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem;}
.notif-chip{background:rgba(255,255,255,0.2);border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:700;}

/* ── Stats ── */
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem;}
.stat-card{background:var(--white);border-radius:12px;border:1px solid var(--border);padding:1.1rem 1.25rem;border-top:3px solid #1a7a4a;transition:transform 0.2s;box-shadow:0 1px 6px rgba(26,122,74,0.07);}
.stat-card:hover{transform:translateY(-2px);}
.stat-card.amber{border-top-color:#d97706;}
.stat-card.gray{border-top-color:#888;}
.stat-card.purple{border-top-color:#7c3aed;}
.stat-card.blue{border-top-color:#2563eb;}
.stat-card.teal{border-top-color:#0891b2;}
.stat-label{font-size:0.68rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;}
.stat-value{font-family:'Lora',serif;font-size:1.5rem;font-weight:700;color:var(--ink);line-height:1;}
.stat-value.sm{font-size:1.1rem;}
.stat-sub{font-size:0.7rem;color:var(--muted);margin-top:4px;}

/* ── Cards & Tables ── */
.card{background:var(--white);border-radius:12px;border:1px solid var(--border);margin-bottom:1.5rem;box-shadow:0 1px 6px rgba(26,122,74,0.07);}
.card-head{padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.nav-locked{opacity:0.45;}
.nav-locked::after{content:"🔒";margin-left:auto;font-size:0.75rem;}
.mobile-nav-item.nav-locked::after{position:absolute;top:2px;right:6px;margin:0;font-size:0.6rem;}
.plan-banner{margin:1rem 1.5rem 0;padding:0.75rem 1rem;border-radius:10px;font-size:0.85rem;font-weight:700;line-height:1.5;border:1px solid;}
.plan-banner.red{background:#fdf0ee;color:#991b1b;border-color:#f3c4bd;}
.plan-banner.amber{background:#fffbeb;color:#92400e;border-color:#fde68a;}
.plan-banner.blue{background:#eff6ff;color:#1e40af;border-color:#bfdbfe;}
.feat-row{display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-top:1px solid var(--border);}
.feat-row:first-of-type{border-top:none;}
.feat-row.is-locked .feat-name,.feat-row.is-locked .feat-desc,.feat-row.is-locked .feat-icon{opacity:0.5;}
.feat-icon{font-size:1.2rem;width:28px;text-align:center;}
.feat-name{font-weight:800;font-size:0.88rem;}
.feat-desc{font-size:0.76rem;color:var(--muted);}
.feat-pill{font-size:0.7rem;font-weight:800;padding:4px 10px;border-radius:20px;white-space:nowrap;border:none;font-family:'Nunito',sans-serif;}
.feat-pill.on{background:#d1fae5;color:#065f46;}
.feat-pill.wait{background:#fef3c7;color:#92400e;}
.feat-pill.locked{background:#ede9fe;color:#5b21b6;cursor:pointer;}
.feat-note{margin-top:0.6rem;font-size:0.78rem;color:var(--muted);background:var(--accent);border-radius:8px;padding:8px 10px;}
.upgrade-box{background:#ede9fe;color:#4c1d95;border-radius:10px;padding:12px 14px;font-size:0.9rem;}
.locked-btn{opacity:0.65;}
@media(max-width:768px){.plan-banner{margin:0.75rem 1rem 0;}}
.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;}
.settings-grid > *{min-width:0;}
@media(max-width:900px){.settings-grid{grid-template-columns:1fr;gap:1rem;}}
.link-btns{display:inline-flex;flex-direction:column;align-items:stretch;gap:4px;vertical-align:middle;}
.link-btns .btn{justify-content:center;text-decoration:none;}
.share-apply{padding:1rem 1.15rem;}
.attn-card{display:flex;align-items:center;gap:0.7rem;width:100%;padding:0.8rem 1rem;margin-bottom:0.75rem;border:1px solid var(--border);border-left:4px solid #e67e22;border-radius:12px;background:var(--white);font-family:'Nunito',sans-serif;font-size:0.9rem;color:var(--ink);cursor:pointer;text-align:left;}
.attn-card:hover{background:var(--accent);}
.attn-icon{font-size:1.1rem;}
.attn-text{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem;}
.attn-red{color:#c0392b;}
.attn-dot{color:var(--muted);}
.attn-go{font-weight:800;font-size:0.8rem;color:#1a7a4a;white-space:nowrap;}
.apply-strip{display:flex;align-items:center;gap:0.5rem;padding:0.55rem 0.6rem 0.55rem 0.9rem;margin-bottom:1.25rem;border:1px solid var(--border);border-radius:12px;background:var(--white);font-size:0.82rem;}
.apply-strip-label{font-weight:800;white-space:nowrap;}
.apply-strip-url{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-weight:700;}
.apply-strip-btn{flex-shrink:0;padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--accent);color:#145f39;font-family:'Nunito',sans-serif;font-size:0.78rem;font-weight:800;cursor:pointer;text-decoration:none;}
.apply-strip-btn:hover{background:#1a7a4a;color:#fff;border-color:#1a7a4a;}
@media(max-width:420px){.apply-strip-url{display:none;}.apply-strip-label{flex:1;}}
.share-apply-sub{color:var(--muted);font-size:0.8rem;margin-top:2px;}
.share-apply-row{display:flex;gap:0.6rem;align-items:center;margin-top:0.75rem;flex-wrap:wrap;}
.share-apply-url{flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border);border-radius:9px;font-family:'Nunito',sans-serif;font-size:0.85rem;font-weight:700;color:var(--ink);background:var(--accent);}
.share-apply-btns{display:flex;gap:0.5rem;flex-wrap:wrap;}
.share-apply-btns a{text-decoration:none;}
.clients-link{text-decoration:none;color:#fff!important;border-color:rgba(255,255,255,0.35)!important;}
.clients-top{text-decoration:none;}
.card-title{font-family:'Lora',serif;font-size:0.95rem;font-weight:700;}
.card-body{padding:1.25rem;}
.tbl-wrap{overflow-x:auto;}
table{width:100%;border-collapse:collapse;font-size:0.85rem;}
th{padding:9px 12px;text-align:left;background:var(--accent);color:var(--muted);font-size:0.66rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid var(--border);}
td{padding:11px 12px;border-bottom:1px solid var(--border);vertical-align:middle;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:var(--accent);}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.66rem;font-weight:800;text-transform:uppercase;}
.badge-active{background:#dcf5e7;color:#145f39;}
.badge-overdue{background:#fdf0ee;color:#c0392b;}
.badge-settled{background:#e8eaed;color:#555;}
.badge-app-pending{background:#fef3cd;color:#8a6d1a;}
.badge-app-under_review{background:#dbeafe;color:#1d4ed8;}
.badge-app-approved{background:#dcf5e7;color:#145f39;}
.badge-app-rejected{background:#fdf0ee;color:#c0392b;}
.nav-badge{margin-left:auto;background:#f59e0b;color:#fff;border-radius:20px;min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:0.66rem;font-weight:900;padding:0 6px;}
.nav-badge.mobile{position:absolute;top:0;right:6px;margin-left:0;min-width:16px;height:16px;font-size:0.58rem;}
.app-tabs{display:flex;gap:8px;margin-bottom:1.25rem;flex-wrap:wrap;}
.app-tab{padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:var(--white);cursor:pointer;font-family:'Nunito',sans-serif;font-size:0.8rem;font-weight:800;color:var(--muted);transition:all 0.18s;display:inline-flex;align-items:center;gap:6px;}
.app-tab:hover{border-color:#1a7a4a;color:#145f39;}
.app-tab.active{background:#145f39;color:#fff;border-color:#145f39;}
.app-tab-count{background:rgba(0,0,0,0.12);border-radius:12px;padding:1px 7px;font-size:0.68rem;}
.app-tab.active .app-tab-count{background:rgba(255,255,255,0.25);}
.app-img-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.75rem;}
.app-img-thumb{display:block;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--accent);text-decoration:none;position:relative;}
.app-img-thumb img{width:100%;height:120px;object-fit:cover;display:block;}
.app-img-fallback{display:flex;flex-direction:column;align-items:center;justify-content:center;height:120px;color:var(--muted);font-size:0.72rem;font-weight:700;text-align:center;}
.app-img-label{display:block;padding:5px 8px;font-size:0.68rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;background:var(--white);border-top:1px solid var(--border);}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:9px;border:none;font-family:'Nunito',sans-serif;font-weight:800;font-size:0.85rem;cursor:pointer;transition:all 0.18s;}
.btn:disabled{opacity:0.55;cursor:not-allowed;transform:none!important;}
.btn-green{background:#1a7a4a;color:#fff;}
.btn-green:hover:not(:disabled){background:#2da05f;transform:translateY(-1px);}
.btn-outline{background:transparent;color:#1a7a4a;border:2px solid #1a7a4a;}
.btn-outline:hover{background:#e8f5ee;}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border);}
.btn-ghost:hover:not(:disabled){background:var(--accent);color:var(--ink);}
.btn-red{background:#c0392b;color:#fff;}
.btn-red:hover{background:#a93226;}
.btn-blue{background:#2563eb;color:#fff;}
.btn-blue:hover:not(:disabled){background:#1d4ed8;}
.btn-link{background:#e8f5ee;color:#145f39;border:1px solid var(--border);}
.btn-link:hover{background:#d4edda;}

.btn-sm{padding:6px 12px;font-size:0.76rem;}
.btn-xs{padding:4px 9px;font-size:0.7rem;}

/* ── Forms ── */
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
.form-group{display:flex;flex-direction:column;gap:5px;}
.form-group.full{grid-column:1/-1;}
label{font-size:0.7rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;}
input,select,textarea{padding:9px 13px;border:1.5px solid var(--border);border-radius:9px;font-family:'Nunito',sans-serif;font-size:0.9rem;color:var(--ink);background:var(--white);outline:none;transition:border-color 0.18s;width:100%;}
input:focus,select:focus,textarea:focus{border-color:#1a7a4a;box-shadow:0 0 0 3px rgba(26,122,74,0.1);}
textarea{resize:vertical;min-height:80px;}

/* ── Modal ── */
.modal-backdrop{position:fixed;inset:0;z-index:200;background:rgba(13,31,20,0.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem;}
.modal{background:var(--white);border-radius:16px;width:100%;max-width:700px;max-height:92vh;overflow-y:auto;box-shadow:0 12px 48px rgba(26,122,74,0.16);}
.modal-head{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--white);z-index:1;}
.modal-title{font-family:'Lora',serif;font-size:1.1rem;font-weight:700;}
.modal-body{padding:1.5rem;}
.modal-foot{padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;gap:0.75rem;justify-content:flex-end;position:sticky;bottom:0;background:var(--white);}
.close-btn{width:30px;height:30px;border-radius:50%;border:none;background:var(--accent);cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;color:var(--muted);}

/* ── Login ── */
.login-shell{min-height:100vh;background:#145f39;display:flex;align-items:center;justify-content:center;padding:1rem;}
.login-box{background:var(--white);border-radius:20px;padding:2.5rem;width:100%;max-width:400px;text-align:center;box-shadow:0 12px 48px rgba(26,122,74,0.2);}
.login-logo{width:72px;height:72px;border-radius:50%;background:#1a7a4a;margin:0 auto 1.25rem;display:flex;align-items:center;justify-content:center;font-family:'Lora',serif;font-size:24px;font-weight:700;color:#fff;overflow:hidden;}
.login-logo img{width:100%;height:100%;object-fit:cover;}
.login-title{font-family:'Lora',serif;font-size:1.5rem;font-weight:700;margin-bottom:4px;}
.login-sub{color:var(--muted);font-size:0.875rem;margin-bottom:2rem;}
.pin-dots{display:flex;gap:12px;justify-content:center;margin-bottom:1.5rem;}
.pin-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--border);transition:all 0.18s;}
.pin-dot.filled{background:#1a7a4a;border-color:#1a7a4a;}
.pin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem;}
.pin-key{padding:14px;border-radius:10px;border:1.5px solid var(--border);background:var(--accent);font-family:'Nunito',sans-serif;font-size:1.1rem;font-weight:800;color:var(--ink);cursor:pointer;transition:all 0.15s;}
.pin-key:hover{background:#e8f5ee;border-color:#1a7a4a;color:#145f39;}
.pin-key:active{transform:scale(0.95);}
.pin-key.zero{grid-column:2;}
.pin-key.del{background:#fdf0ee;border-color:#f5c6c0;color:#c0392b;}
.pin-error{color:#c0392b;font-size:0.85rem;font-weight:700;margin-bottom:0.75rem;}
.login-input{width:100%;padding:13px 16px;border-radius:12px;border:1.5px solid var(--border);background:var(--white);font-family:'Nunito',sans-serif;font-size:0.95rem;font-weight:700;color:var(--text);outline:none;transition:border 0.18s;}
.login-input:focus{border-color:#1a7a4a;}
.login-submit{width:100%;padding:13px;border-radius:12px;border:none;background:#145f39;color:#fff;font-family:'Nunito',sans-serif;font-size:0.95rem;font-weight:800;cursor:pointer;transition:all 0.18s;}
.login-submit:hover{background:#1a7a4a;}
.login-submit:disabled{opacity:0.6;cursor:not-allowed;}

/* ── Upload ── */
.upload-area{border:2px dashed var(--border);border-radius:10px;padding:1.25rem;text-align:center;cursor:pointer;transition:all 0.2s;background:var(--accent);}
.upload-area:hover{border-color:#1a7a4a;background:#e8f5ee;}
.upload-preview{max-width:220px;max-height:90px;object-fit:contain;margin:0 auto 0.5rem;display:block;}
.upload-preview-round{width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 0.5rem;display:block;}
.section-sub{font-size:0.75rem;font-weight:800;color:#1a7a4a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem;padding-bottom:0.5rem;border-bottom:1px solid #e8f5ee;}

/* ── Toast ── */
.toast{position:fixed;bottom:5rem;right:1rem;background:#0d1f14;color:#fff;padding:11px 18px;border-radius:10px;font-size:0.85rem;font-weight:700;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.2);border-left:4px solid #1a7a4a;animation:fadeUp 0.25s ease;max-width:320px;}
.toast.error{border-left-color:#c0392b;}
.toast.info{border-left-color:#2563eb;}

/* ── Monthly Summary ── */
.month-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;}
.month-card{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:1.25rem;border-left:4px solid #1a7a4a;}
.month-name{font-family:'Lora',serif;font-size:1rem;font-weight:700;margin-bottom:0.75rem;color:var(--ink);}
.month-row{display:flex;justify-content:space-between;font-size:0.82rem;padding:4px 0;border-bottom:1px solid var(--border);}
.month-row:last-child{border-bottom:none;font-weight:800;color:#1a7a4a;}

/* ── Responsive ── */
@media(max-width:768px){
  .sidebar{display:none;}
  .mobile-nav{display:block;}
  .stats-row{grid-template-columns:1fr 1fr;}
  .form-grid{grid-template-columns:1fr;}
  .page{padding:1rem;padding-bottom:90px;}
  .topbar{padding:0 1rem;}
}
@media(max-width:480px){.stats-row{grid-template-columns:1fr 1fr;gap:0.6rem;}.stat-card{padding:0.85rem 0.9rem;}.stat-label{font-size:0.6rem;letter-spacing:0.03em;}.stat-value,.stat-value.sm{font-size:1.05rem;}.stat-sub{font-size:0.66rem;}.stats-row > .stat-card:nth-child(3):last-child{grid-column:span 2;}}
`;

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [business, setBusiness] = useState(null);
  const [loans, setLoans] = useState([]);
  const [settled, setSettled] = useState([]);
  const [applications, setApplications] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "ok" });

  // Which business the logged-in user belongs to (for the apply link and Clients button)
  const [me, setMe] = useState(null);
  const [plan, setPlan] = useState(null); // package, status and features of this business
  READ_ONLY = !!plan && plan.canWrite === false;
  // Suspended/cancelled: only the Dashboard summary; every other page shows the renew message
  const goTo = (id) => {
    if (READ_ONLY && id !== "dashboard") { showToast("Your subscription has ended. Renew to open this page.", "error"); return; }
    setActivePage(id);
  };
  useEffect(() => { if (plan && plan.canWrite === false) setActivePage("dashboard"); }, [plan]);
  useEffect(() => {
    if (screen !== "app") return;
    (async () => {
      const { data: m } = await supabase.from("tenant_users").select("tenant_id, role").maybeSingle();
      if (!m) return;
      const { data: t } = await supabase.from("tenants").select("slug, code").eq("id", m.tenant_id).maybeSingle();
      const isSonkhela = m.tenant_id === SONKHELA_TENANT_ID;
      setIdPrefix(isSonkhela ? "SSL" : t?.code); // new loans get this business's prefix
      authFetch("/api/my-plan").then(r => r.ok ? r.json() : null).then(setPlan).catch(() => {});
      setMe({
        isPlatformAdmin: isSonkhela && m.role === "owner",
        applyUrl: isSonkhela || !t?.slug ? "https://sonkhela.com/apply" : `https://${t.slug}.sonkhela.com/apply`,
      });
    })();
  }, [screen]);

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast({ msg: "", type: "ok" }), 3500); };

  useEffect(() => {
    (async () => {
      await loadBusiness();
      // If a previous session is still valid, go straight in.
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        await loadLoans();
        setScreen("app");
      } else {
        setScreen("login");
      }
    })();
  }, []);

  useEffect(() => {
    if (darkMode) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
  }, [darkMode]);

  const loadBusiness = async () => {
    // On a client portal (e.g. copperbelt.sonkhela.com) show that business's
    // name and logo on the login screen.
    const slug = currentPortalSlug();
    if (slug) {
      const { data: s } = await supabase.auth.getSession();
      if (!s?.session) {
        const r = await fetch(`/api/portal?portal=${encodeURIComponent(slug)}`).catch(() => null);
        if (r?.ok) {
          const p = await r.json();
          setBusiness({ name:p.name, tagline:p.tagline, phone:p.phone, email:p.email, address:p.address, logo:p.logo, signature:null, theme:p.theme });
          return;
        }
      }
    }
    // RLS limits a logged-in user to their own business row; before login this is Sonkhela's.
    const { data } = await supabase.from("business").select("*").order("id").limit(1).maybeSingle();
    setBusiness(data || { name:"Sonkhela Soft Loans", tagline:"Simple Loans. Real People.", phone:"", email:"", address:"", logo:null, signature:null });
  };

  const loadLoans = async () => {
    // Skip heavy base64 fields (collateral_photo, client_signature) in the lists.
    // They're loaded only when editing a single loan — this is what makes login fast.
    const LIST_COLS = "id,client_name,client_phone,client_nrc,client_email,amount,interest_rate,processing_date,due_date,repayment,collateral,collateral_value,status,terms,created_at";
    const [loansRes, settledRes, appsRes] = await Promise.all([
      supabase.from("loans").select(LIST_COLS).order("created_at", { ascending: false }),
      supabase.from("settled_loans").select("*").order("settled_at", { ascending: false }),
      supabase.from("applications").select("*").order("created_at", { ascending: false }),
    ]);
    if (loansRes.data) setLoans(loansRes.data);
    if (settledRes.data) setSettled(settledRes.data);
    if (appsRes.data) setApplications(appsRes.data);
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!loginEmail.trim() || !loginPassword) { setPinError("Enter your email and password."); return; }
    setLoggingIn(true);
    setPinError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) {
      setPinError("Invalid email or password.");
      setLoggingIn(false);
      return;
    }
    setLoginPassword("");
    await loadBusiness();
    await loadLoans();
    setScreen("app");
    setLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoginPassword("");
    setMe(null);
    setPlan(null);
    setIdPrefix("SSL");
    await loadBusiness();
    setScreen("login");
  };

  const pendingApps = applications.filter(a => a.status === "pending" || a.status === "under_review").length;

  const [moreOpen, setMoreOpen] = useState(false);
  const MOBILE_MAIN = ["dashboard", "applications", "clients", "notifications"];
  const navItems = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"applications", icon:"📥", label:"Applications", badge: pendingApps },
    { id:"clients", icon:"👥", label:"Clients" },
    { id:"records", icon:"📁", label:"Records" },
    { id:"notifications", icon:"🔔", label:"Alerts" },
    { id:"summary", icon:"📈", label:"Summary" },
    { id:"settings", icon:"⚙️", label:"Settings" },
  ];

  if (screen === "loading") return (<><style dangerouslySetInnerHTML={{ __html: applyTheme(ADMIN_STYLES, business?.theme) }}/><div className="loading-screen"><div className="loading-spinner"/><div className="loading-text">Loading{business?.name ? " " + business.name : ""}...</div></div></>);

  if (screen === "login") return (
    <><style dangerouslySetInnerHTML={{ __html: applyTheme(ADMIN_STYLES, business?.theme) }}/>
    <div className="login-shell">
      <div className="login-box fade-up">
        <div className="login-logo">{business?.logo ? <img src={business.logo} alt="logo"/> : (business?.name||"S")[0]}</div>
        <div className="login-title">{business?.name || "Sonkhela Soft Loans"}</div>
        <div className="login-sub">Admin Login</div>
        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:12,marginTop:18}}>
          <input
            className="login-input"
            type="email"
            autoComplete="username"
            placeholder="Email"
            value={loginEmail}
            onChange={e => { setLoginEmail(e.target.value); setPinError(""); }}
          />
          <input
            className="login-input"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={loginPassword}
            onChange={e => { setLoginPassword(e.target.value); setPinError(""); }}
          />
          {pinError && <div className="pin-error">{pinError}</div>}
          <button type="submit" className="login-submit" disabled={loggingIn}>
            {loggingIn ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div></>
  );

  return (
    <><style dangerouslySetInnerHTML={{ __html: applyTheme(ADMIN_STYLES, business?.theme) }}/>
    {toast.msg && <div className={`toast ${toast.type==="error"?"error":toast.type==="info"?"info":""}`}>{toast.msg}</div>}
    <div className="shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">{business?.logo?<img src={business.logo} alt=""/>:(business?.name||"S")[0]}</div>
          <div className="brand-name">{business?.name}</div>
          <div className="brand-tag">{business?.tagline}</div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${activePage===item.id?"active":""} ${READ_ONLY && item.id!=="dashboard"?"nav-locked":""}`} onClick={() => goTo(item.id)}>
              <span style={{width:20,textAlign:"center"}}>{item.icon}</span>{item.label}
              {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {me?.isPlatformAdmin && <a className="logout-btn clients-link" href="/admin/tenants">🏢 Client businesses</a>}
          <button className="dark-toggle" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          <button className="logout-btn" onClick={handleLogout}>🔒 Logout</button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      {/* Phone menu: 4 main pages + More (Records, Summary, Settings, dark mode, logout) */}
      {moreOpen && (
        <div className="more-overlay" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={e => e.stopPropagation()}>
            <div className="more-handle"/>
            {navItems.filter(i => !MOBILE_MAIN.includes(i.id)).map(item => (
              <button key={item.id} className={`more-item ${activePage===item.id?"active":""} ${READ_ONLY && item.id!=="dashboard"?"nav-locked":""}`}
                onClick={() => { setMoreOpen(false); goTo(item.id); }}>
                <span className="more-icon">{item.icon}</span>{item.label}
              </button>
            ))}
            {me?.isPlatformAdmin && <a className="more-item" href="/admin/tenants"><span className="more-icon">🏢</span>Client businesses</a>}
            <button className="more-item" onClick={() => setDarkMode(d => !d)}><span className="more-icon">{darkMode ? "☀️" : "🌙"}</span>{darkMode ? "Light Mode" : "Dark Mode"}</button>
            <button className="more-item" onClick={() => { setMoreOpen(false); handleLogout(); }}><span className="more-icon">🔒</span>Logout</button>
          </div>
        </div>
      )}
      <nav className="mobile-nav">
        <div className="mobile-nav-items">
          {navItems.filter(i => MOBILE_MAIN.includes(i.id)).map(item => (
            <button key={item.id} className={`mobile-nav-item ${activePage===item.id?"active":""} ${READ_ONLY && item.id!=="dashboard"?"nav-locked":""}`} onClick={() => { setMoreOpen(false); goTo(item.id); }} style={{position:"relative"}}>
              <span className="icon">{item.icon}</span>
              {item.label}
              {item.badge > 0 && <span className="nav-badge mobile">{item.badge}</span>}
            </button>
          ))}
          <button className={`mobile-nav-item ${moreOpen || !MOBILE_MAIN.includes(activePage) ? "active" : ""}`} onClick={() => setMoreOpen(o => !o)} style={{position:"relative"}}>
            <span className="icon">☰</span>
            More
          </button>
        </div>
      </nav>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{navItems.find(n=>n.id===activePage)?.label}</div>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <button className="btn btn-ghost btn-xs" onClick={() => setDarkMode(d=>!d)} style={{display:"none"}}>{darkMode?"☀️":"🌙"}</button>
            {me?.isPlatformAdmin && <a className="btn btn-outline btn-xs clients-top" href="/admin/tenants">🏢 Clients</a>}
            <div className="topbar-date">{new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</div>
          </div>
        </div>
        <PlanBanner plan={plan}/>
        <div className="page fade-up" key={activePage}>
          {activePage==="dashboard" && <Dashboard loans={loans} settled={settled} setActivePage={goTo} showToast={showToast} applyUrl={plan?.canWrite === false ? null : me?.applyUrl} business={business}/>}
          {activePage==="applications" && <ApplicationsPage applications={applications} setApplications={setApplications} loans={loans} setLoans={setLoans} showToast={showToast} applyUrl={me?.applyUrl}/>}
          {activePage==="clients" && <ClientsPage loans={loans} setLoans={setLoans} settled={settled} setSettled={setSettled} showToast={showToast} business={business}/>}
          {activePage==="records" && <RecordsPage settled={settled} setSettled={setSettled} showToast={showToast}/>}
          {activePage==="notifications" && <NotificationsPage loans={loans} showToast={showToast} plan={plan}/>}
          {activePage==="summary" && <SummaryPage loans={loans} settled={settled} business={business}/>}
          {activePage==="settings" && <SettingsPage business={business} setBusiness={setBusiness} showToast={showToast}/>}
        </div>
      </div>
    </div></>
  );
}

// Box with the business's public application link: copy, WhatsApp, or phone share sheet.
function ShareApplyLink({ url, showToast, compact }) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && !!navigator.share); }, []);
  if (!url) return null;
  const text = "Apply for a loan here:";
  const copy = () => {
    const done = () => showToast("✓ Apply link copied! Paste it to anyone who wants a loan.");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => window.prompt("Copy this link:", url));
    else window.prompt("Copy this link:", url);
  };
  const share = () => navigator.share({ title: "Apply for a loan", text, url }).catch(() => {});
  if (compact) return (
    <div className="apply-strip">
      <span className="apply-strip-label">📨 Apply link</span>
      <span className="apply-strip-url">{url.replace(/^https?:\/\//, "")}</span>
      <button className="apply-strip-btn" onClick={copy}>Copy</button>
      {canShare
        ? <button className="apply-strip-btn" onClick={share}>Share</button>
        : <a className="apply-strip-btn" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>}
    </div>
  );
  return (
    <div className="card share-apply">
      <div className="share-apply-head">
        <div>
          <div className="card-title">📨 Your loan application link</div>
          <div className="share-apply-sub">Send this to anyone who wants a loan. Their application comes straight to your Applications page.</div>
        </div>
      </div>
      <div className="share-apply-row">
        <input className="share-apply-url" readOnly value={url} onFocus={e => e.target.select()} aria-label="Application link"/>
        <div className="share-apply-btns">
          <button className="btn btn-green btn-sm" onClick={copy}>🔗 Copy link</button>
          <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          {canShare && <button className="btn btn-ghost btn-sm" onClick={share}>Share…</button>}
        </div>
      </div>
    </div>
  );
}

// ── Subscription & feature locks ───────────────────────────────────────────────
// View-only while the business is suspended/cancelled. The database enforces it;
// this makes the screen say so instead of pretending a change worked.
let READ_ONLY = false;
const READ_ONLY_MSG = "Your subscription has ended. Renew to add or change anything.";
const readOnly = (showToast) => { if (READ_ONLY) { showToast(READ_ONLY_MSG, "error"); return true; } return false; };
// A refused update/delete returns no error but changes 0 rows: treat that as blocked.
const changed = (res, showToast, failMsg) => {
  if (res.error) { showToast(failMsg, "error"); return false; }
  if (Array.isArray(res.data) && res.data.length === 0) { showToast(READ_ONLY_MSG, "error"); return false; }
  return true;
};
const FEATURE_INFO = {
  sms_reminders:    { icon: "⏰", name: "Automatic SMS reminders", desc: "Texts borrowers 2 days before and on the due date." },
  weekly_quotes:    { icon: "💡", name: "Weekly money tips", desc: "A short financial tip by SMS to your borrowers every Friday." },
  custom_messaging: { icon: "📱", name: "Custom SMS to borrowers", desc: "Write and send your own text to any borrower." },
};
const FEATURE_COL = { sms_reminders: "can_sms_reminders", weekly_quotes: "can_weekly_quotes", custom_messaging: "can_custom_messaging" };

function PlanBanner({ plan }) {
  if (!plan || plan.isSonkhela) return null;
  const contact = [plan.contact?.phone, plan.contact?.email].filter(Boolean).join(" or ");
  const ends = plan.subscription_end ? fmtDate(plan.subscription_end) : "";
  let cls = "", text = null;
  if (plan.status === "suspended" || plan.status === "cancelled") {
    cls = "red";
    text = <>Your subscription has ended. Only this summary is available until you renew: your records, applications and messaging are locked. Contact {plan.contact?.name}{contact ? ` on ${contact}` : ""} to renew. Your data is kept safe.</>;
  } else if (plan.status === "grace") {
    cls = "amber";
    text = <>Your subscription ended on {ends}. Renew within a few days to keep using the system. Contact {plan.contact?.name}{contact ? ` on ${contact}` : ""}.</>;
  } else if (plan.status === "trial" && plan.days_left !== null) {
    cls = "blue";
    text = plan.days_left > 0
      ? <>Free trial: {plan.days_left} day{plan.days_left === 1 ? "" : "s"} left ({plan.package?.name}). Contact {plan.contact?.name}{contact ? ` on ${contact}` : ""} to subscribe.</>
      : <>Your free trial ends today. Contact {plan.contact?.name}{contact ? ` on ${contact}` : ""} to subscribe.</>;
  } else if (plan.status === "active" && plan.days_left !== null && plan.days_left <= 5) {
    cls = "amber";
    text = <>Your subscription renews on {ends} ({plan.days_left} day{plan.days_left === 1 ? "" : "s"} left).</>;
  }
  if (!text) return null;
  return <div className={`plan-banner ${cls}`}>{text}</div>;
}

function MessagingCard({ plan, onUpgrade }) {
  if (!plan) return null;
  const pill = (f) => {
    if (!plan.features?.[f]) return <button className="feat-pill locked" onClick={() => onUpgrade(f)}>🔒 Upgrade</button>;
    if (!plan.smsReady) return <span className="feat-pill wait" title="Ask Sonkhela to connect your Africa's Talking account">Needs SMS account</span>;
    return <span className="feat-pill on">{f === "custom_messaging" ? "Available" : "On"}</span>;
  };
  return (
    <div className="card" style={{padding:"1rem 1.15rem"}}>
      <div className="card-title" style={{marginBottom:"0.6rem"}}>📨 Messaging{plan.package && !plan.isSonkhela ? <span style={{fontFamily:"'Nunito',sans-serif",fontSize:"0.75rem",color:"var(--muted)",fontWeight:700,marginLeft:8}}>Your package: {plan.package.name}</span> : null}</div>
      {Object.entries(FEATURE_INFO).map(([f, info]) => (
        <div key={f} className={`feat-row ${plan.features?.[f] ? "" : "is-locked"}`}>
          <div className="feat-icon">{info.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="feat-name">{info.name}</div>
            <div className="feat-desc">{info.desc}</div>
          </div>
          {pill(f)}
        </div>
      ))}
      {!plan.isSonkhela && !plan.smsReady && Object.values(plan.features || {}).some(Boolean) && (
        <div className="feat-note">To switch these on, Sonkhela connects your own Africa's Talking account, so texts show your name and use your airtime. Contact {plan.contact?.name}{plan.contact?.phone ? ` on ${plan.contact.phone}` : ""}.</div>
      )}
    </div>
  );
}

function UpgradeModal({ plan, feature, close }) {
  const info = FEATURE_INFO[feature];
  const pkg = (plan?.packages || []).filter(p => p[FEATURE_COL[feature]]).sort((a, b) => Number(a.monthly_price) - Number(b.monthly_price))[0];
  const contact = [plan?.contact?.phone, plan?.contact?.email].filter(Boolean);
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" style={{maxWidth:420}} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">🔒 {info?.name}</div><button className="modal-close" onClick={close}>✕</button></div>
        <div className="modal-body">
          <p style={{color:"var(--muted)",fontSize:"0.9rem",lineHeight:1.6,marginBottom:"1rem"}}>{info?.desc}</p>
          {pkg ? (
            <div className="upgrade-box">Included in <b>{pkg.name}</b>{Number(pkg.monthly_price) > 0 ? <> for <b>{fmt(pkg.monthly_price)}</b> a month</> : null}.</div>
          ) : null}
          <p style={{fontSize:"0.88rem",marginTop:"1rem"}}>To upgrade, contact <b>{plan?.contact?.name}</b>{contact.length ? <> on <b>{contact.join(" or ")}</b></> : null}.</p>
        </div>
      </div>
    </div>
  );
}

function SmsModal({ loan, close, showToast }) {
  const first = (loan.client_name || "").split(" ")[0];
  const [msg, setMsg] = useState(`Hi ${first}, `);
  const [sending, setSending] = useState(false);
  const send = async () => {
    setSending(true);
    const r = await authFetch("/api/send-sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loanId: loan.id, message: msg }) });
    const d = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) { showToast(d.error || "SMS failed.", "error"); return; }
    showToast(`✓ SMS sent to ${loan.client_name}`);
    close();
  };
  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" style={{maxWidth:460}} onClick={e => e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">📱 SMS to {loan.client_name}</div><button className="modal-close" onClick={close}>✕</button></div>
        <div className="modal-body">
          <div style={{fontSize:"0.8rem",color:"var(--muted)",marginBottom:6}}>To {loan.client_phone}</div>
          <textarea rows={5} maxLength={459} value={msg} onChange={e => setMsg(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"1px solid var(--border)",borderRadius:9,fontFamily:"'Nunito',sans-serif",fontSize:"0.9rem",background:"var(--white)",color:"var(--ink)"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
            <span style={{fontSize:"0.75rem",color:"var(--muted)"}}>{msg.length}/459 · {Math.max(1, Math.ceil(msg.length / 153))} SMS</span>
            <button className="btn btn-green btn-sm" disabled={sending || !msg.trim()} onClick={send}>{sending ? "Sending…" : "Send SMS"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Salary share (%) of interest, set per business in Settings (default 30%)
const salaryRate = (b) => {
  const r = Number(b?.salary_rate);
  return b?.salary_rate != null && r >= 0 && r <= 100 ? r : 30;
};

// Agreement link: Copy (to send to the borrower) and View (opens the agreement
// in a new tab; inside the installed app it opens over the app with a close button)
function CopyLinkBtn({ loanId, showToast }) {
  const url = () => `${window.location.origin}/agreement/${loanId}`;
  return (
    <span className="link-btns">
      <button className="btn btn-link btn-xs" onClick={() => { navigator.clipboard.writeText(url()).then(() => showToast("✓ Link copied!")); }}>🔗 Copy</button>
      <a className="btn btn-link btn-xs" href={`/agreement/${loanId}`} target="_blank" rel="noopener" title="Open the agreement">📄 Open</a>
    </span>
  );
}

// ── Applications (from website) ────────────────────────────────────────────────
const APP_STATUSES = [
  { id: "pending", label: "Pending", icon: "🕐" },
  { id: "under_review", label: "Under Review", icon: "🔍" },
  { id: "approved", label: "Approved", icon: "✅" },
  { id: "rejected", label: "Rejected", icon: "❌" },
  { id: "cancelled", label: "Cancelled", icon: "🚫" },
];

const LOAN_TYPE_NAMES = {
  collateral: "Collateral Backed Loan",
  payslip: "Payslip Backed Loan",
  student: "Student Loan",
  marketeer: "Marketeer Loan",
  business: "Business Loan",
  "white-book": "White Book Loan",
};

// Renders an image stored in the private "loan-documents" bucket.
// Signed URLs are created server-side (/api/storage-url) with the service role key,
// so the bucket stays private and images are only viewable through this admin system.
function StorageImg({ path, label }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    authFetch("/api/storage-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    })
      .then(r => r.json())
      .then(d => { if (alive) { if (d.url) setUrl(d.url); else setFailed(true); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [path]);
  if (!path) return null;
  return (
    <a className="app-img-thumb" href={url || "#"} target="_blank" rel="noreferrer" title="Open full size">
      {url && !failed
        ? <img src={url} alt={label} onError={() => setFailed(true)}/>
        : <span className="app-img-fallback">🖼️<br/>{failed ? "Could not load" : "Loading..."}</span>}
      <span className="app-img-label">{label}</span>
    </a>
  );
}

function notifyApplicant(type, applicationId, extra = {}) {
  // Fire-and-forget email; failures are logged but never block the admin action.
  return authFetch("/api/application-decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, applicationId, ...extra }),
  }).then(r => r.json()).catch(err => ({ error: String(err) }));
}

function ApplicationsPage({ applications, setApplications, loans, setLoans, showToast, applyUrl }) {
  const [tab, setTab] = useState("pending");
  const [detail, setDetail] = useState(null);      // application being viewed
  const [approving, setApproving] = useState(null); // application being approved (opens LoanModal)
  const [saving, setSaving] = useState(false);

  const filtered = applications.filter(a => (a.status || "pending") === tab);
  const counts = Object.fromEntries(APP_STATUSES.map(s => [s.id, applications.filter(a => (a.status||"pending")===s.id).length]));

  const updateApp = async (id, fields) => {
    if (readOnly(showToast)) return false;
    const res = await supabase.from("applications").update({ ...fields, reviewed_at: new Date().toISOString() }).eq("id", id).select("id");
    if (!changed(res, showToast, "Failed to update application.")) return false;
    setApplications(p => p.map(a => a.id === id ? { ...a, ...fields } : a));
    return true;
  };

  const handleReject = async (app) => {
    const reason = window.prompt("Reason for rejection (will be emailed to the applicant):", "");
    if (reason === null) return;
    if (!(await updateApp(app.id, { status: "rejected", admin_notes: reason }))) return;
    showToast("Application rejected.");
    setDetail(null);
    const res = await notifyApplicant("rejected", app.id, { note: reason });
    if (res?.error) showToast("Status saved, but email failed: " + res.error, "error");
    else if (app.email) showToast("Rejection email sent ✓");
  };

  const handleMoreInfo = async (app) => {
    const note = window.prompt("What additional information do you need from the applicant?", "");
    if (!note) return;
    if (!(await updateApp(app.id, { status: "under_review", admin_notes: note }))) return;
    showToast("Marked as Under Review.");
    setDetail(null);
    const res = await notifyApplicant("more_info", app.id, { note });
    if (res?.error) showToast("Status saved, but email failed: " + res.error, "error");
    else if (app.email) showToast("Request sent to applicant ✓");
  };

  const handleCancel = async (app) => {
    if (!confirm(`Cancel ${app.full_name}'s application? No email will be sent.`)) return;
    if (!(await updateApp(app.id, { status: "cancelled" }))) return;
    showToast("Application cancelled.");
    setDetail(null);
  };

  // Approve: open the existing LoanModal pre-filled from the application.
  const startApprove = (app) => {
    const weeks = Number(app.repayment_period) || 1;
    const today = new Date();
    const due = new Date(today.getTime() + weeks * 7 * 86400000);
    setApproving({
      app,
      prefill: {
        client_name: app.full_name || "",
        client_phone: app.phone || "",
        client_nrc: app.nrc_number || "",
        client_email: app.email || "",
        amount: app.loan_amount || "",
        interest_rate: "",
        processing_date: today.toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
        repayment: "lump-sum",
        collateral: app.collateral_description || "",
        collateral_value: "",
        status: "active",
        terms: "In the event that the Borrower fails to pay any installment due under this Agreement on or before the specified due date, the Lender shall have the right to take full ownership and possession of the collateral pledged under this Agreement, unless the Borrower renews the loan contract in accordance with the terms herein. Renewal of the contract shall only be permitted upon full payment of the interest due on the current loan, subject to the mutual agreement of the parties. Upon such default and failure to renew, the Borrower shall forfeit all rights, title, and interest in the collateral to the Lender without further notice.",
      },
    });
    setDetail(null);
  };

  const finishApprove = async (loanData) => {
    if (readOnly(showToast)) return;
    setSaving(true);
    const app = approving.app;
    const newLoan = { ...loanData, id: genId() };
    const { error } = await supabase.from("loans").insert(newLoan);
    if (error) { showToast("Failed to create loan agreement.", "error"); setSaving(false); return; }
    setLoans(p => [newLoan, ...p]);
    if (!(await updateApp(app.id, { status: "approved", loan_id: newLoan.id }))) { setSaving(false); return; }
    setSaving(false);
    setApproving(null);
    showToast("Approved! Agreement " + newLoan.id + " created ✓");
    const res = await notifyApplicant("approved", app.id, { loanId: newLoan.id, agreementUrl: `${window.location.origin}/agreement/${newLoan.id}` });
    if (res?.error) showToast("Approved, but email failed: " + res.error, "error");
    else if (app.email) showToast("Approval email sent ✓");
  };

  return (
    <>
      <ShareApplyLink url={applyUrl} showToast={showToast}/>
      <div className="app-tabs">
        {APP_STATUSES.map(s => (
          <button key={s.id} className={`app-tab ${tab===s.id?"active":""}`} onClick={() => setTab(s.id)}>
            {s.icon} {s.label}{counts[s.id] > 0 && <span className="app-tab-count">{counts[s.id]}</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">{APP_STATUSES.find(s=>s.id===tab)?.label} Applications</div></div>
        <div className="card-body" style={{padding: filtered.length ? 0 : "2.5rem", textAlign: filtered.length ? "left" : "center"}}>
          {filtered.length === 0 ? (
            <div style={{color:"var(--muted)",fontWeight:700,fontSize:"0.9rem"}}>No {tab.replace("_"," ")} applications.</div>
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Applicant</th><th>Loan Type</th><th>Amount</th><th>Period</th><th>Applied</th><th></th></tr></thead>
              <tbody>
                {filtered.map(app => (
                  <tr key={app.id}>
                    <td>
                      <div style={{fontWeight:800}}>{app.full_name}</div>
                      <div style={{fontSize:"0.74rem",color:"var(--muted)"}}>{app.phone}{app.app_ref ? ` · ${app.app_ref}` : ""}</div>
                    </td>
                    <td>{LOAN_TYPE_NAMES[app.loan_type] || app.loan_type}</td>
                    <td style={{fontWeight:800}}>{fmt(app.loan_amount)}</td>
                    <td>{app.repayment_period} week{Number(app.repayment_period)>1?"s":""}</td>
                    <td>{app.created_at ? new Date(app.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"}</td>
                    <td style={{textAlign:"right",whiteSpace:"nowrap"}}>
                      {tab === "approved" && app.loan_id && <CopyLinkBtn loanId={app.loan_id} showToast={showToast}/>}
                      <button className="btn btn-outline btn-xs" style={{marginLeft:6}} onClick={() => setDetail(app)}>View</button>
                      {(tab === "pending" || tab === "under_review") && <button className="btn btn-red btn-xs" style={{marginLeft:6}} onClick={() => handleCancel(app)}>Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {detail && (
        <AppDetailModal
          app={detail}
          onClose={() => setDetail(null)}
          onApprove={() => startApprove(detail)}
          onReject={() => handleReject(detail)}
          onMoreInfo={() => handleMoreInfo(detail)}
          showToast={showToast}
        />
      )}

      {approving && (
        <LoanModal loan={approving.prefill} onClose={() => setApproving(null)} onSave={finishApprove} saving={saving}/>
      )}
    </>
  );
}

function AppDetailModal({ app, onClose, onApprove, onReject, onMoreInfo, showToast }) {
  const status = app.status || "pending";
  const cell = (label, value) => (
    <div className="agr-cell"><div className="agr-cell-label">{label}</div><div className="agr-cell-value">{value || "—"}</div></div>
  );
  return (
    <div className="modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal fade-up">
        <div className="modal-head">
          <div className="modal-title">Application — {app.full_name} <span className={`badge badge-app-${status}`} style={{marginLeft:8}}>{status.replace("_"," ")}</span></div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="section-sub">👤 Applicant</p>
          <div className="agr-grid" style={{marginBottom:"1.25rem"}}>
            {app.app_ref && cell("Application No.", app.app_ref)}
            {cell("Full Name", app.full_name)}
            {cell("Phone", app.phone)}
            {cell("NRC Number", app.nrc_number)}
            {cell("Email", app.email)}
          </div>
          <p className="section-sub">💰 Loan Request</p>
          <div className="agr-grid" style={{marginBottom:"1.25rem"}}>
            {cell("Loan Type", LOAN_TYPE_NAMES[app.loan_type] || app.loan_type)}
            {cell("Amount", fmt(app.loan_amount))}
            {cell("Repayment Period", `${app.repayment_period} week${Number(app.repayment_period)>1?"s":""}`)}
            {cell("Applied On", app.created_at ? new Date(app.created_at).toLocaleString("en-GB") : "—")}
          </div>
          <p className="section-sub">🔒 Collateral</p>
          <div className="agr-grid" style={{marginBottom:"0.9rem"}}>
            <div className="agr-cell full"><div className="agr-cell-label">Description</div><div className="agr-cell-value">{app.collateral_description || "—"}</div></div>
          </div>
          {(app.collateral_images?.length > 0) && (
            <div className="app-img-grid">
              {app.collateral_images.map((p, i) => <StorageImg key={p} path={p} label={`Collateral ${i+1}`}/>)}
            </div>
          )}
          <p className="section-sub" style={{marginTop:"1.25rem"}}>🪪 NRC Images</p>
          {(app.nrc_front || app.nrc_back) ? (
            <div className="app-img-grid">
              <StorageImg path={app.nrc_front} label="NRC Front"/>
              <StorageImg path={app.nrc_back} label="NRC Back"/>
            </div>
          ) : <div style={{color:"var(--muted)",fontSize:"0.82rem",fontWeight:700}}>No NRC images uploaded.</div>}
          {app.admin_notes && (
            <>
              <p className="section-sub" style={{marginTop:"1.25rem"}}>📝 Admin Notes</p>
              <div className="agr-cell full"><div className="agr-cell-value" style={{fontWeight:600}}>{app.admin_notes}</div></div>
            </>
          )}
        </div>
        <div className="modal-foot" style={{flexWrap:"wrap"}}>
          {status === "approved" && app.loan_id && <CopyLinkBtn loanId={app.loan_id} showToast={showToast}/>}
          {status !== "approved" && status !== "rejected" && (
            <>
              <button className="btn btn-ghost" onClick={onMoreInfo}>📩 Request More Info</button>
              <button className="btn btn-red" onClick={onReject}>Reject</button>
              <button className="btn btn-green" onClick={onApprove}>✓ Approve</button>
            </>
          )}
          {(status === "approved" || status === "rejected") && <button className="btn btn-ghost" onClick={onClose}>Close</button>}
        </div>
      </div>
    </div>
  );
}



// ── Dashboard ──────────────────────────────────────────────────────────────────
function Dashboard({ loans, settled, setActivePage, showToast, applyUrl, business }) {
  const activeLoans = loans.filter(l => l.status !== "settled");
  const totalIssued = activeLoans.reduce((s,l) => s+Number(l.amount),0);
  const totalInterest = activeLoans.reduce((s,l) => s+(Number(l.amount)*Number(l.interest_rate)/100),0);
  const rate = salaryRate(business);
  const salary = totalInterest * rate / 100;
  const active = loans.filter(l => l.status==="active" && !isOverdue(l)).length;
  const overdue = loans.filter(isOverdue).length;
  const settledCount = settled.length;

  // Loans due in next 7 days
  const now = new Date();
  const in7 = new Date(now.getTime() + 7*86400000);
  const dueSoon = loans.filter(l => l.status==="active" && !isOverdue(l) && new Date(l.due_date+"T00:00:00") <= in7);
  const overdueList = loans.filter(isOverdue);

  return (
    <>
      <div style={{marginBottom:"1.25rem"}}>
        <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:4}}>Welcome back 👋</h1>
        <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Here's what's happening with your loan portfolio today.</p>
      </div>

      {/* Compact attention card: counts only; names live on the Alerts page */}
      {(dueSoon.length > 0 || overdueList.length > 0) && (
        <button className="attn-card" onClick={() => setActivePage("notifications")}>
          <span className="attn-icon">🔔</span>
          <span className="attn-text">
            {overdueList.length > 0 && <b className="attn-red">{overdueList.length} overdue</b>}
            {overdueList.length > 0 && dueSoon.length > 0 && <span className="attn-dot">·</span>}
            {dueSoon.length > 0 && <b>{dueSoon.length} due this week</b>}
          </span>
          <span className="attn-go">View →</span>
        </button>
      )}

      <ShareApplyLink url={applyUrl} showToast={showToast} compact/>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Issued</div>
          <div className="stat-value sm">{fmt(totalIssued)}</div>
          <div className="stat-sub">active & overdue</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Total Interest Expected</div>
          <div className="stat-value sm">{fmt(totalInterest)}</div>
          <div className="stat-sub">active & overdue</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">💼 Salary ({rate}%)</div>
          <div className="stat-value sm">{fmt(salary)}</div>
          <div className="stat-sub">estimated earnings</div>
        </div>
      </div>
      <div className="stats-row" style={{marginBottom:"1.5rem"}}>
        <div className="stat-card blue">
          <div className="stat-label">Active</div>
          <div className="stat-value">{active}</div>
          <div className="stat-sub">in good standing</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{color:overdue>0?"#d97706":"inherit"}}>{overdue}</div>
          <div className="stat-sub">need attention</div>
        </div>
        <div className="stat-card gray">
          <div className="stat-label">Settled</div>
          <div className="stat-value">{settledCount}</div>
          <div className="stat-sub">fully repaid</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Recent Agreements</div>
          <button className="btn btn-outline btn-sm" onClick={() => setActivePage("clients")}>View All →</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Loan ID</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Link</th></tr></thead>
            <tbody>
              {loans.length===0 && <tr><td colSpan={6} style={{textAlign:"center",color:"var(--muted)",padding:"2rem"}}>No loans yet.</td></tr>}
              {loans.slice(0,6).map(loan => {
                const over = isOverdue(loan);
                return (
                  <tr key={loan.id}>
                    <td style={{fontWeight:800,fontFamily:"'Lora',serif",fontSize:"0.8rem"}}>{loan.id}</td>
                    <td style={{fontWeight:700}}>{loan.client_name}</td>
                    <td style={{fontWeight:700}}>{fmt(loan.amount)}</td>
                    <td style={{color:over?"#c0392b":"inherit",fontWeight:over?800:400}}>{fmtDate(loan.due_date)}</td>
                    <td><span className={`badge badge-${over?"overdue":loan.status}`}>{over?"overdue":loan.status}</span></td>
                    <td>
                      <CopyLinkBtn loanId={loan.id} showToast={showToast}/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Clients ────────────────────────────────────────────────────────────────────
function ClientsPage({ loans, setLoans, settled, setSettled, showToast, business }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [dupPrefill, setDupPrefill] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null);

  const filtered = loans.filter(l => {
    const s = ((l.client_name||"")+l.id).toLowerCase().includes(search.toLowerCase());
    if (filter==="all") return s;
    if (filter==="overdue") return s && isOverdue(l);
    return s && l.status===filter && !isOverdue(l);
  });

  const deleteLoan = async (id) => {
    if (readOnly(showToast)) return;
    if (!confirm("Delete this loan agreement permanently?")) return;
    const res = await supabase.from("loans").delete().eq("id", id).select("id");
    if (!changed(res, showToast, "Failed to delete.")) return;
    setLoans(p => p.filter(l => l.id!==id));
    showToast("Agreement deleted.");
  };

  const duplicateLoan = async (loan) => {
    const { data } = await supabase.from("loans").select("*").eq("id", loan.id).single();
    const source = data || loan;
    const { id, created_at, ...copy } = source;
    copy.status = "active";
    copy.processing_date = new Date().toISOString().slice(0, 10);
    setEditTarget(null);
    setDupPrefill(copy);
    setShowModal(true);
  };

  const updateStatus = async (id, status) => {
    if (readOnly(showToast)) return;
    const res = await supabase.from("loans").update({ status }).eq("id", id).select("id");
    if (!changed(res, showToast, "Failed to update status.")) return;
    setLoans(p => p.map(l => l.id===id ? {...l,status} : l));
    if (status === "settled") {
      const loan = loans.find(l => l.id===id);
      if (loan) {
        const interest = Number(loan.amount)*Number(loan.interest_rate)/100;
        const total = Number(loan.amount)+interest;
        const record = { id:loan.id,client_name:loan.client_name,client_phone:loan.client_phone,client_nrc:loan.client_nrc,client_email:loan.client_email,amount:loan.amount,interest_rate:loan.interest_rate,interest,total,processing_date:loan.processing_date,due_date:loan.due_date,repayment:loan.repayment,collateral:loan.collateral,collateral_value:loan.collateral_value,terms:loan.terms };
        const { error: sErr } = await supabase.from("settled_loans").insert(record);
        if (!sErr) { setSettled(p => [{...record,settled_at:new Date().toISOString()},...p]); showToast("✓ Settled & saved to Records!"); }
        else showToast("Settled but failed to save record.","error");
      }
    }
  };

  const handleSave = async (data) => {
    if (readOnly(showToast)) return;
    setSaving(true);
    if (editTarget) {
      const res = await supabase.from("loans").update(data).eq("id", editTarget.id).select("id");
      if (!changed(res, showToast, "Failed to save.")) { setSaving(false); return; }
      setLoans(p => p.map(l => l.id===editTarget.id ? {...l,...data} : l));
      showToast("Agreement updated! ✓");
    } else {
      const newLoan = {...data, id:genId()};
      const { error } = await supabase.from("loans").insert(newLoan);
      if (error) { showToast("Failed to create.","error"); setSaving(false); return; }
      setLoans(p => [newLoan,...p]);
      showToast("Agreement created! ✓");
    }
    setSaving(false); setShowModal(false);
  };

  const sendReminder = async (loan) => {
    if (!loan.client_email) { showToast("This client has no email.","error"); return; }
    setSendingEmail(loan.id);
    try {
      const res = await authFetch("/api/send-reminder",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({loanId:loan.id})});
      const d = await res.json();
      if (d.success) showToast(`✉️ Reminder sent to ${loan.client_email}`);
      else showToast(d.error||"Email failed.","error");
    } catch { showToast("Email unavailable.","error"); }
    setSendingEmail(null);
  };

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"1.25rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:4}}>Clients</h1>
          <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>{loans.length} agreement{loans.length!==1?"s":""} on record</p>
        </div>
        <button className="btn btn-green" onClick={() => {if (readOnly(showToast)) return; setEditTarget(null);setShowModal(true);}}>+ New Agreement</button>
      </div>
      <div style={{display:"flex",gap:"0.75rem",marginBottom:"1rem",flexWrap:"wrap"}}>
        <input style={{flex:1,minWidth:180}} placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{minWidth:140}}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="settled">Settled</option>
        </select>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Loan ID</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Collateral</th><th>Status</th><th>Link</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={8} style={{textAlign:"center",color:"var(--muted)",padding:"2.5rem"}}>No agreements found.</td></tr>}
              {filtered.map(loan => {
                const over = isOverdue(loan);
                const dueSoon = !over && loan.status==="active" && new Date(loan.due_date+"T00:00:00") <= new Date(Date.now()+3*86400000);
                return (
                  <tr key={loan.id}>
                    <td style={{fontWeight:800,fontFamily:"'Lora',serif",fontSize:"0.8rem"}}>{loan.id}</td>
                    <td>
                      <div style={{fontWeight:700}}>{loan.client_name}</div>
                      {loan.client_phone && <div style={{fontSize:"0.7rem",color:"var(--muted)"}}>{loan.client_phone}</div>}
                      {loan.client_email && <div style={{fontSize:"0.68rem",color:"#2563eb"}}>✉ {loan.client_email}</div>}
                    </td>
                    <td style={{fontWeight:700}}>{fmt(loan.amount)}</td>
                    <td>
                      <div style={{color:over?"#c0392b":"inherit",fontWeight:over?800:400}}>{fmtDate(loan.due_date)}</div>
                      {dueSoon && <div style={{fontSize:"0.66rem",color:"#d97706",fontWeight:800}}>⚠️ Due soon</div>}
                    </td>
                    <td style={{fontSize:"0.76rem",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loan.collateral}</td>
                    <td>
                      <select value={over?"overdue":loan.status} onChange={e=>updateStatus(loan.id,e.target.value)} style={{padding:"4px 8px",fontSize:"0.76rem",minWidth:95}}>
                        <option value="active">Active</option>
                        <option value="settled">Settled</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td>
                      <CopyLinkBtn loanId={loan.id} showToast={showToast}/>
                    </td>
                    <td>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
<button className="btn btn-ghost btn-xs" onClick={() => duplicateLoan(loan)}>⧉</button>
                        <button className="btn btn-ghost btn-xs" onClick={async () => { const { data } = await supabase.from("loans").select("*").eq("id", loan.id).single(); setEditTarget(data || loan); setShowModal(true); }}>Edit</button>                        {loan.client_email && <button className="btn btn-blue btn-xs" disabled={sendingEmail===loan.id} onClick={() => sendReminder(loan)}>{sendingEmail===loan.id?"...":"📧"}</button>}
                        <button className="btn btn-red btn-xs" onClick={() => deleteLoan(loan.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <LoanModal loan={editTarget || dupPrefill} saving={saving} onClose={() => {setShowModal(false); setDupPrefill(null);}} onSave={handleSave}/>}
    </>
  );
}

// ── Loan Modal ─────────────────────────────────────────────────────────────────
function LoanModal({ loan, onClose, onSave, saving }) {
  const blank = { client_name:"",client_phone:"",client_nrc:"",client_email:"",amount:"",interest_rate:"",processing_date:new Date().toISOString().slice(0,10),due_date:"",repayment:"monthly",collateral:"",collateral_value:"",status:"active",terms:"In the event that the Borrower fails to pay any installment due under this Agreement on or before the specified due date, the Lender shall have the right to take full ownership and possession of the collateral pledged under this Agreement, unless the Borrower renews the loan contract in accordance with the terms herein. Renewal of the contract shall only be permitted upon full payment of the interest due on the current loan, subject to the mutual agreement of the parties. Upon such default and failure to renew, the Borrower shall forfeit all rights, title, and interest in the collateral to the Lender without further notice." };
  const [f, setF] = useState(loan || blank);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const uploadCollateral = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("collateral_photo", ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal fade-up">
        <div className="modal-head">
          <div className="modal-title">{loan?"Edit Agreement":"New Loan Agreement"}</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="section-sub">👤 Client Info</p>
          <div className="form-grid" style={{marginBottom:"1.25rem"}}>
            <div className="form-group"><label>Full Name *</label><input value={f.client_name} onChange={e=>set("client_name",e.target.value)} placeholder="e.g. Chanda Mutale"/></div>
            <div className="form-group"><label>Phone Number</label><input value={f.client_phone} onChange={e=>set("client_phone",e.target.value)} placeholder="+260 97..."/></div>
            <div className="form-group"><label>NRC / National ID</label><input value={f.client_nrc} onChange={e=>set("client_nrc",e.target.value)} placeholder="234567/10/1"/></div>
            <div className="form-group"><label>Email <span style={{color:"var(--muted)",fontWeight:400,textTransform:"none",fontSize:"0.68rem"}}>(optional)</span></label><input type="email" value={f.client_email||""} onChange={e=>set("client_email",e.target.value)} placeholder="client@example.com"/></div>
          </div>
          <p className="section-sub">💰 Loan Details</p>
          <div className="form-grid" style={{marginBottom:"1.25rem"}}>
            <div className="form-group"><label>Loan Amount (K) *</label><input type="number" value={f.amount} onChange={e=>set("amount",e.target.value)}/></div>
            <div className="form-group"><label>Interest Rate (%)</label><input type="number" value={f.interest_rate} onChange={e=>set("interest_rate",e.target.value)}/></div>
            <div className="form-group"><label>Processing Date</label><input type="date" value={f.processing_date} onChange={e=>set("processing_date",e.target.value)}/></div>
            <div className="form-group"><label>Due Date *</label><input type="date" value={f.due_date} onChange={e=>set("due_date",e.target.value)}/></div>
            <div className="form-group full"><label>Repayment Schedule</label>
              <select value={f.repayment} onChange={e=>set("repayment",e.target.value)}>
                <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="lump-sum">Lump Sum</option>
              </select>
            </div>
          </div>
          <p className="section-sub">🔒 Collateral</p>
          <div className="form-grid" style={{marginBottom:"1.25rem"}}>
            <div className="form-group full"><label>Item / Description *</label><input value={f.collateral} onChange={e=>set("collateral",e.target.value)}/></div>
            <div className="form-group"><label>Collateral Value (K)</label><input type="number" value={f.collateral_value} onChange={e=>set("collateral_value",e.target.value)}/></div>
            <div className="form-group full">
              <label>Collateral Photo <span style={{color:"var(--muted)",fontWeight:400,textTransform:"none",fontSize:"0.68rem"}}>(optional)</span></label>
              <div className="upload-area" onClick={() => document.getElementById("collateralUpload").click()}>
                {f.collateral_photo ? <img src={f.collateral_photo} alt="collateral" style={{maxHeight:80,maxWidth:"100%",objectFit:"contain",display:"block",margin:"0 auto 6px"}}/> : <div style={{fontSize:"1.5rem",marginBottom:6}}>📷</div>}
                <div style={{fontSize:"0.76rem",color:"var(--muted)",fontWeight:700}}>Click to upload photo of collateral item</div>
              </div>
              <input id="collateralUpload" type="file" accept="image/*" style={{display:"none"}} onChange={uploadCollateral}/>
              {f.collateral_photo && <button className="btn btn-ghost btn-xs" style={{marginTop:6}} onClick={()=>set("collateral_photo",null)}>Remove Photo</button>}
            </div>
          </div>
          <p className="section-sub">📋 Terms & Conditions</p>
          <div className="form-group"><textarea value={f.terms} onChange={e=>set("terms",e.target.value)} rows={4}/></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" disabled={saving} onClick={() => { if(!f.client_name||!f.amount||!f.due_date){alert("Fill in: Name, Amount, Due Date");return;} onSave(f); }}>{saving?"Saving...":loan?"Save Changes":"✓ Create Agreement"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Records ────────────────────────────────────────────────────────────────────
function RecordsPage({ settled, setSettled, showToast }) {
  const [search, setSearch] = useState("");
  const filtered = settled.filter(l => ((l.client_name||"")+l.id).toLowerCase().includes(search.toLowerCase()));
  const totalInterest = settled.reduce((s,l) => s+Number(l.interest||0),0);
  const totalRepaid = settled.reduce((s,l) => s+Number(l.total||0),0);

  const exportCSV = () => {
    const headers = ["Loan ID","Client Name","Phone","Amount","Interest Rate %","Interest","Total Repaid","Processing Date","Due Date","Repayment","Collateral","Settled Date"];
    const rows = filtered.map(l => [l.id,l.client_name,l.client_phone||"",l.amount,l.interest_rate,l.interest,l.total,l.processing_date,l.due_date,l.repayment,l.collateral,l.settled_at?new Date(l.settled_at).toLocaleDateString("en-GB"):""]);
    const csv = [headers,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="Settled_Records.csv"; a.click();
    showToast("✓ CSV downloaded!");
  };

  return (
    <>
      <div style={{marginBottom:"1.25rem"}}>
        <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:4}}>📁 Settled Records</h1>
        <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>All fully repaid loan agreements — saved permanently.</p>
      </div>
      <div className="stats-row" style={{marginBottom:"1.5rem"}}>
        <div className="stat-card gray"><div className="stat-label">Total Settled</div><div className="stat-value">{settled.length}</div><div className="stat-sub">agreements</div></div>
        <div className="stat-card"><div className="stat-label">Interest Collected</div><div className="stat-value sm">{fmt(totalInterest)}</div><div className="stat-sub">from settled loans</div></div>
        <div className="stat-card teal"><div className="stat-label">Total Recovered</div><div className="stat-value sm">{fmt(totalRepaid)}</div><div className="stat-sub">principal + interest</div></div>
      </div>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Settled Loan History</div>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>⬇️ Export CSV</button>
        </div>
        <div style={{padding:"0.75rem 1.25rem",borderBottom:"1px solid var(--border)"}}>
          <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",maxWidth:380}}/>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Loan ID</th><th>Client</th><th>Principal</th><th>Interest</th><th>Total Repaid</th><th>Collateral</th><th>Settled Date</th><th>Agreement</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={9} style={{textAlign:"center",color:"var(--muted)",padding:"2.5rem"}}>No settled loans yet.</td></tr>}
              {filtered.map(loan => (
                <tr key={loan.id}>
                  <td style={{fontWeight:800,fontFamily:"'Lora',serif",fontSize:"0.8rem"}}>{loan.id}</td>
                  <td><div style={{fontWeight:700}}>{loan.client_name}</div><div style={{fontSize:"0.7rem",color:"var(--muted)"}}>{loan.client_phone}</div></td>
                  <td style={{fontWeight:700}}>{fmt(loan.amount)}</td>
                  <td style={{color:"#0891b2",fontWeight:700}}>{fmt(loan.interest)}</td>
                  <td style={{fontWeight:800,color:"#145f39"}}>{fmt(loan.total)}</td>
                  <td style={{fontSize:"0.76rem",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loan.collateral}</td>
                  <td style={{fontSize:"0.76rem",color:"var(--muted)"}}>{loan.settled_at?new Date(loan.settled_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"}</td>
                  <td>
                    <button className="btn btn-link btn-xs" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/agreement/${loan.id}`); showToast("✓ Link copied!"); }}>🔗 Copy Link</button>
                  </td>
                  <td>
                    <button className="btn btn-red btn-xs" onClick={async () => {
                      if (readOnly(showToast)) return;
                      if (!confirm("Delete this settled record permanently?")) return;
                      const res = await supabase.from("settled_loans").delete().eq("id", loan.id).select("id");
                      if (!changed(res, showToast, "Failed to delete.")) return;
                      setSettled(p => p.filter(r => r.id !== loan.id));
                      showToast("Record deleted.");
                    }}>✕ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


// ── Notifications Page ─────────────────────────────────────────────────────────
function NotifSection({ title, color, borderColor, loans, showToast, plan, onSms, onUpgrade }) {
  const loanFont = "'Lora',serif";
  return (
    <div className="card" style={{borderTop:`3px solid ${borderColor}`}}>
      <div className="card-head">
        <div className="card-title" style={{color}}>{title} <span style={{background:color,color:"#fff",borderRadius:"20px",padding:"2px 10px",fontSize:"0.72rem",marginLeft:6}}>{loans.length}</span></div>
      </div>
      {loans.length === 0 ? (
        <div style={{padding:"1.5rem",textAlign:"center",color:"var(--muted)",fontSize:"0.85rem"}}>
          {title.includes("Overdue") ? "✅ No overdue loans — great!" : title.includes("Today") ? "No loans due today." : title.includes("1–3") ? "No loans due in the next 3 days." : "No loans due in the next 7 days."}
        </div>
      ) : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Loan ID</th><th>Client</th><th>Phone</th><th>Amount</th><th>Due Date</th><th>Link</th></tr></thead>
            <tbody>
              {loans.map(loan => (
                <tr key={loan.id}>
                  <td style={{fontWeight:800,fontFamily:loanFont,fontSize:"0.8rem"}}>{loan.id}</td>
                  <td style={{fontWeight:700}}>{loan.client_name}</td>
                  <td style={{fontSize:"0.78rem",color:"var(--muted)"}}>{loan.client_phone||"—"}</td>
                  <td style={{fontWeight:700}}>{fmt(loan.amount)}</td>
                  <td style={{fontWeight:800,color}}>{fmtDate(loan.due_date)}</td>
                  <td style={{whiteSpace:"nowrap"}}>
                    <CopyLinkBtn loanId={loan.id} showToast={showToast}/>{" "}
                    {plan && (plan.features?.custom_messaging
                      ? <button className="btn btn-link btn-xs" disabled={!plan.smsReady || !plan.canWrite || !loan.client_phone}
                          title={!plan.smsReady ? "SMS account not connected yet" : !loan.client_phone ? "No phone number" : "Send an SMS"}
                          onClick={() => onSms(loan)}>📱 SMS</button>
                      : <button className="btn btn-link btn-xs locked-btn" onClick={() => onUpgrade("custom_messaging")}>🔒 SMS</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NotificationsPage({ loans, showToast, plan }) {
  const [upgrade, setUpgrade] = useState(null); // feature the user tapped while locked
  const [smsLoan, setSmsLoan] = useState(null); // loan being texted
  const now = new Date();
  const in7 = new Date(now.getTime() + 7*86400000);
  const in3 = new Date(now.getTime() + 3*86400000);
  const overdueLoans = loans.filter(l => isOverdue(l));
  const dueTodayLoans = loans.filter(l => l.status==="active" && !isOverdue(l) && new Date(l.due_date+"T00:00:00").toDateString() === now.toDateString());
  const due3Loans = loans.filter(l => l.status==="active" && !isOverdue(l) && new Date(l.due_date+"T00:00:00") <= in3 && new Date(l.due_date+"T00:00:00").toDateString() !== now.toDateString());
  const due7Loans = loans.filter(l => l.status==="active" && !isOverdue(l) && new Date(l.due_date+"T00:00:00") > in3 && new Date(l.due_date+"T00:00:00") <= in7);

  return (
    <>
      <div style={{marginBottom:"1.25rem"}}>
        <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:4}}>🔔 Alerts & Notifications</h1>
        <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Stay on top of overdue and upcoming loan repayments.</p>
      </div>
      <div className="stats-row" style={{marginBottom:"1.5rem"}}>
        <div className="stat-card" style={{borderTopColor:"#c0392b"}}>
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{color:overdueLoans.length>0?"#c0392b":"inherit"}}>{overdueLoans.length}</div>
          <div className="stat-sub">past due date</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Due Today</div>
          <div className="stat-value" style={{color:dueTodayLoans.length>0?"#d97706":"inherit"}}>{dueTodayLoans.length}</div>
          <div className="stat-sub">due right now</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Due This Week</div>
          <div className="stat-value">{due3Loans.length + due7Loans.length}</div>
          <div className="stat-sub">within 7 days</div>
        </div>
      </div>
      <MessagingCard plan={plan} onUpgrade={setUpgrade}/>
      {upgrade && <UpgradeModal plan={plan} feature={upgrade} close={() => setUpgrade(null)}/>}
      {smsLoan && <SmsModal loan={smsLoan} close={() => setSmsLoan(null)} showToast={showToast}/>}
      <NotifSection title="🚨 Overdue Loans" color="#c0392b" borderColor="#c0392b" loans={overdueLoans} showToast={showToast} plan={plan} onSms={setSmsLoan} onUpgrade={setUpgrade}/>
      <NotifSection title="⏰ Due Today" color="#d97706" borderColor="#d97706" loans={dueTodayLoans} showToast={showToast} plan={plan} onSms={setSmsLoan} onUpgrade={setUpgrade}/>
      <NotifSection title="⚠️ Due in 1–3 Days" color="#d97706" borderColor="#f59e0b" loans={due3Loans} showToast={showToast} plan={plan} onSms={setSmsLoan} onUpgrade={setUpgrade}/>
      <NotifSection title="📅 Due in 4–7 Days" color="#2563eb" borderColor="#2563eb" loans={due7Loans} showToast={showToast} plan={plan} onSms={setSmsLoan} onUpgrade={setUpgrade}/>
    </>
  );
}

// ── Monthly Summary ────────────────────────────────────────────────────────────
function SummaryPage({ loans, settled, business }) {
  const rate = salaryRate(business);
  const allLoans = [...loans, ...settled];

  const monthlyData = {};
  allLoans.forEach(l => {
    const date = new Date((l.processing_date || l.settled_at || "")+"T00:00:00");
    if (isNaN(date)) return;
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
    if (!monthlyData[key]) monthlyData[key] = { issued:0, interest:0, salary:0, count:0, settled:0, settledInterest:0 };
    monthlyData[key].issued += Number(l.amount||0);
    monthlyData[key].interest += Number(l.amount||0)*Number(l.interest_rate||0)/100;
    monthlyData[key].salary += (Number(l.amount||0)*Number(l.interest_rate||0)/100)*rate/100;
    monthlyData[key].count += 1;
    if (l.settled_at || l.status==="settled") {
      monthlyData[key].settled += 1;
      monthlyData[key].settledInterest += Number(l.interest||Number(l.amount||0)*Number(l.interest_rate||0)/100);
    }
  });

  const months = Object.keys(monthlyData).sort().reverse();
  const monthName = (key) => { const [y,m] = key.split("-"); return new Date(y,m-1).toLocaleDateString("en-GB",{month:"long",year:"numeric"}); };

  return (
    <>
      <div style={{marginBottom:"1.25rem"}}>
        <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:4}}>📈 Monthly Summary</h1>
        <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Breakdown of loan activity by month.</p>
      </div>
      {months.length === 0 && <div style={{textAlign:"center",color:"var(--muted)",padding:"3rem"}}>No data yet.</div>}
      <div className="month-grid">
        {months.map(key => {
          const d = monthlyData[key];
          return (
            <div key={key} className="month-card">
              <div className="month-name">{monthName(key)}</div>
              <div className="month-row"><span>Loans Issued</span><span style={{fontWeight:700}}>{d.count}</span></div>
              <div className="month-row"><span>Total Issued</span><span style={{fontWeight:700}}>{fmt(d.issued)}</span></div>
              <div className="month-row"><span>Interest Expected</span><span style={{fontWeight:700,color:"#0891b2"}}>{fmt(d.interest)}</span></div>
              <div className="month-row"><span>Settled</span><span style={{fontWeight:700}}>{d.settled} loan{d.settled!==1?"s":""}</span></div>
              <div className="month-row"><span>Interest Collected</span><span style={{fontWeight:700,color:"#145f39"}}>{fmt(d.settledInterest)}</span></div>
              <div className="month-row"><span>💼 Salary ({rate}%)</span><span style={{fontWeight:800,color:"#7c3aed"}}>{fmt(d.salary)}</span></div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────────
function SettingsPage({ business, setBusiness, showToast }) {
  const [f, setF] = useState({...business});
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const uploadImage = (key,e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set(key,ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const rate = Number(f.salary_rate ?? 30);
    if (!(rate >= 0 && rate <= 100) || String(f.salary_rate ?? "30").trim() === "") { showToast("Salary share must be between 0 and 100%.","error"); return; }
    if (readOnly(showToast)) return;
    setSaving(true);
    const { error } = await supabase.from("business").update({
      name:f.name,tagline:f.tagline,phone:f.phone,email:f.email,
      address:f.address,logo:f.logo,signature:f.signature,salary_rate:rate,theme:f.theme||"green",
    }).eq("id",business.id ?? 1);
    setSaving(false);
    if (error) { showToast("Failed to save.","error"); return; }
    setBusiness({...f, salary_rate: rate}); showToast("Settings saved! ✓");
  };

  return (
    <>
      <div style={{marginBottom:"1.25rem"}}>
        <h1 style={{fontFamily:"'Lora',serif",fontSize:"1.5rem",fontWeight:700,marginBottom:4}}>Settings</h1>
        <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Manage your profile, signature and security</p>
      </div>
      <div className="settings-grid">
        <div className="card">
          <div className="card-head"><div className="card-title">🏢 Business Profile</div></div>
          <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div className="form-group">
              <label>Business Logo</label>
              <div className="upload-area" onClick={() => document.getElementById("logoUpload").click()}>
                {f.logo?<img className="upload-preview-round" src={f.logo} alt="logo"/>:<div style={{fontSize:"2rem",marginBottom:6}}>🏢</div>}
                <div style={{fontSize:"0.76rem",color:"var(--muted)",fontWeight:700}}>Click to upload logo</div>
              </div>
              <input id="logoUpload" type="file" accept="image/*" style={{display:"none"}} onChange={e=>uploadImage("logo",e)}/>
            </div>
            <div className="form-group"><label>Business Name</label><input value={f.name||""} onChange={e=>set("name",e.target.value)}/></div>
            <div className="form-group"><label>Tagline</label><input value={f.tagline||""} onChange={e=>set("tagline",e.target.value)}/></div>
            <div className="form-group"><label>Phone</label><input value={f.phone||""} onChange={e=>set("phone",e.target.value)}/></div>
            <div className="form-group"><label>Email</label><input value={f.email||""} onChange={e=>set("email",e.target.value)}/></div>
            <div className="form-group"><label>Address</label><input value={f.address||""} onChange={e=>set("address",e.target.value)}/></div>
            <div className="form-group">
              <label>Colour theme</label>
              <select value={f.theme || "green"} onChange={async e => {
                // Applies and saves straight away (no need to press Save Settings)
                const theme = e.target.value, prev = f.theme || "green";
                if (readOnly(showToast)) return;
                set("theme", theme);
                setBusiness(b => ({ ...b, theme }));
                const res = await supabase.from("business").update({ theme }).eq("id", business.id ?? 1).select("id");
                if (!changed(res, showToast, "Could not save the theme.")) { set("theme", prev); setBusiness(b => ({ ...b, theme: prev })); return; }
                showToast(`Theme changed to ${THEMES[theme].label} ✓`);
              }}>
                {Object.entries(THEMES).map(([k,t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
              <div style={{fontSize:"0.74rem",color:"var(--muted)",marginTop:4}}>Changes straight away for the dashboard, apply page, agreements and app icon.</div>
            </div>
            <div className="form-group">
              <label>Salary share (%)</label>
              <input type="number" min="0" max="100" step="0.5" inputMode="decimal" value={f.salary_rate ?? 30} onChange={e=>set("salary_rate",e.target.value)}/>
              <div style={{fontSize:"0.74rem",color:"var(--muted)",marginTop:4}}>Part of the interest counted as salary on the Dashboard and Summary. Default 30%.</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
          <div className="card">
            <div className="card-head"><div className="card-title">✍️ Your Signature</div></div>
            <div className="card-body">
              <div className="upload-area" onClick={() => document.getElementById("sigUpload").click()}>
                {f.signature?<img className="upload-preview" src={f.signature} alt="sig"/>:<div style={{fontSize:"2rem",marginBottom:6}}>✍️</div>}
                <div style={{fontSize:"0.76rem",color:"var(--muted)",fontWeight:700}}>{f.signature?"Click to change":"Click to upload signature"}</div>
              </div>
              <input id="sigUpload" type="file" accept="image/*" style={{display:"none"}} onChange={e=>uploadImage("signature",e)}/>
              {f.signature&&<button className="btn btn-ghost btn-sm" style={{marginTop:"0.75rem",width:"100%"}} onClick={()=>set("signature",null)}>Remove</button>}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">🔐 Security</div></div>
            <div className="card-body">
              <div className="form-group">
                <label>Change Login Password</label>
                <input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password (min 8 characters)"/>
              </div>
              <button className="btn btn-outline btn-sm" style={{width:"100%"}} disabled={changingPw || newPassword.length < 8} onClick={async () => {
                setChangingPw(true);
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                setChangingPw(false);
                if (error) { showToast("Failed to change password: " + error.message, "error"); return; }
                setNewPassword("");
                showToast("Password changed ✓");
              }}>
                {changingPw ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
          <button className="btn btn-green" style={{width:"100%",padding:"13px"}} onClick={handleSave} disabled={saving}>
            {saving?"Saving...":"💾 Save All Settings"}
          </button>
        </div>
      </div>
    </>
  );
}
