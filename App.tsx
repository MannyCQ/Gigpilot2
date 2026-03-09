import { useState, useEffect } from "react";

/*
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║           GIGPILOT AI — COMPLETE UK SAAS PLATFORM            ║
 * ║                                                               ║
 * ║  To make everything work, set these environment variables     ║
 * ║  in your Vercel project settings:                             ║
 * ║                                                               ║
 * ║  VITE_SUPABASE_URL        → your Supabase project URL        ║
 * ║  VITE_SUPABASE_ANON_KEY   → your Supabase anon key          ║
 * ║  VITE_ANTHROPIC_KEY       → your Anthropic API key           ║
 * ║  VITE_STRIPE_KEY          → your Stripe publishable key      ║
 * ║                                                               ║
 * ║  Supabase setup:                                              ║
 * ║  1. Create project at supabase.com                           ║
 * ║  2. Run the SQL in SUPABASE_SETUP.sql                        ║
 * ║  3. Enable Google OAuth in Auth > Providers                   ║
 * ║  4. Add your Vercel URL to redirect URLs                      ║
 * ║                                                               ║
 * ║  Stripe setup:                                                ║
 * ║  1. Create products at stripe.com                            ║
 * ║  2. Update STRIPE_PRICE_IDS below                            ║
 * ║  3. Deploy Stripe webhook (see STRIPE_WEBHOOK.md)            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";
const ANTHROPIC_KEY = import.meta.env?.VITE_ANTHROPIC_KEY || "";
const STRIPE_KEY = import.meta.env?.VITE_STRIPE_KEY || "";

const STRIPE_PRICE_IDS = {
  artist: "price_artist_monthly_gbp", // Replace with your Stripe price ID
  pro: "price_pro_monthly_gbp",       // Replace with your Stripe price ID
};

const DEMO_MODE = !SUPABASE_URL;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#080b14;
  --surface:#0d1120;
  --card:#111827;
  --card2:#161d2e;
  --border:#1e2840;
  --border2:#273352;
  --gold:#e8b84b;
  --gold2:#f5d078;
  --goldDim:rgba(232,184,75,.12);
  --goldGlow:rgba(232,184,75,.25);
  --emerald:#2dd4a0;
  --emeraldDim:rgba(45,212,160,.1);
  --crimson:#f05365;
  --crimsonDim:rgba(240,83,101,.1);
  --sky:#5b9cf6;
  --skyDim:rgba(91,156,246,.1);
  --lavender:#a78bfa;
  --text:#f0f2f8;
  --text2:#8b93b0;
  --text3:#4a5270;
  --font-d:'Syne',sans-serif;
  --font-b:'DM Sans',sans-serif;
  --r:10px;--r2:16px;--r3:24px;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:var(--font-b);font-size:14px;line-height:1.6;overflow-x:hidden}
h1,h2,h3,h4,h5,h6{font-family:var(--font-d);line-height:1.1}
a{color:inherit;text-decoration:none}
button{cursor:pointer;font-family:var(--font-b)}
input,textarea,select{font-family:var(--font-b)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 22px;border-radius:var(--r);font-family:var(--font-d);font-size:13px;font-weight:700;border:none;transition:all .2s;white-space:nowrap;letter-spacing:.02em}
.btn-gold{background:var(--gold);color:#080b14}
.btn-gold:hover{background:var(--gold2);transform:translateY(-1px);box-shadow:0 8px 32px var(--goldGlow)}
.btn-outline{background:transparent;color:var(--text);border:1px solid var(--border2)}
.btn-outline:hover{border-color:var(--gold);color:var(--gold);background:var(--goldDim)}
.btn-ghost{background:transparent;color:var(--text2);padding:8px 14px;border:none}
.btn-ghost:hover{color:var(--text);background:rgba(255,255,255,.05)}
.btn-emerald{background:var(--emerald);color:#080b14}
.btn-emerald:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-danger{background:var(--crimsonDim);color:var(--crimson);border:1px solid rgba(240,83,101,.2)}
.btn-danger:hover{background:rgba(240,83,101,.18)}
.btn-sm{padding:6px 14px;font-size:12px}
.btn-lg{padding:14px 36px;font-size:15px}
.btn-xl{padding:18px 48px;font-size:16px}
.btn-block{width:100%}
.btn:disabled{opacity:.35;cursor:not-allowed;transform:none!important;box-shadow:none!important}

/* ── Inputs ── */
.field{display:flex;flex-direction:column;gap:5px}
.label{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.09em;font-family:var(--font-d)}
.inp{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:11px 14px;color:var(--text);font-size:14px;outline:none;transition:border-color .18s,box-shadow .18s;width:100%}
.inp:focus{border-color:var(--gold);box-shadow:0 0 0 3px var(--goldDim)}
.inp::placeholder{color:var(--text3)}
textarea.inp{resize:vertical;min-height:90px}
select.inp{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234a5270' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}

/* ── Cards ── */
.card{background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:24px}
.card2{background:var(--card2);border:1px solid var(--border);border-radius:var(--r);padding:16px}
.glass{background:rgba(17,24,39,.7);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06)}

/* ── Badges ── */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;font-family:var(--font-d);letter-spacing:.06em;text-transform:uppercase}
.b-gold{background:var(--goldDim);color:var(--gold)}
.b-emerald{background:var(--emeraldDim);color:var(--emerald)}
.b-crimson{background:var(--crimsonDim);color:var(--crimson)}
.b-sky{background:var(--skyDim);color:var(--sky)}
.b-lavender{background:rgba(167,139,250,.1);color:var(--lavender)}
.b-dim{background:rgba(255,255,255,.05);color:var(--text2)}
.tag{display:inline-block;background:rgba(255,255,255,.05);color:var(--text2);border-radius:6px;padding:2px 8px;font-size:11px;margin:2px}

/* ── Layout ── */
.app-shell{display:flex;min-height:100vh}
.sidebar{width:234px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto}
.main{flex:1;overflow-y:auto;min-height:100vh}
.page{padding:40px 44px;max-width:1140px}

/* ── Nav ── */
.nav-logo{padding:26px 20px 22px;font-family:var(--font-d);font-size:20px;font-weight:800;letter-spacing:-.02em}
.nav-logo em{color:var(--gold);font-style:normal}
.nav-logo small{display:block;font-size:10px;font-weight:500;color:var(--text3);letter-spacing:.06em;margin-top:3px;font-family:var(--font-b);text-transform:uppercase}
.nav-sect{padding:8px 14px 4px;font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.12em;font-family:var(--font-d)}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 14px;color:var(--text2);border-radius:var(--r);margin:1px 8px;font-size:13px;font-weight:500;border:none;background:none;width:calc(100% - 16px);text-align:left;transition:all .15s;font-family:var(--font-b)}
.nav-item:hover{color:var(--text);background:rgba(255,255,255,.04)}
.nav-item.active{color:var(--gold);background:var(--goldDim);font-weight:600}
.nav-item .ni{font-size:15px;width:20px;text-align:center;flex-shrink:0}
.nav-div{border:none;border-top:1px solid var(--border);margin:8px 16px}

/* ── Page headers ── */
.ph{margin-bottom:30px}
.ph h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin-bottom:4px}
.ph p{color:var(--text2);font-size:14px}

/* ── Grids ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}

/* ── Stats ── */
.stat{background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:20px 22px;position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--goldDim) 0%,transparent 60%);opacity:0;transition:opacity .3s}
.stat:hover::before{opacity:1}
.stat-n{font-family:var(--font-d);font-size:32px;font-weight:800;line-height:1;letter-spacing:-.02em}
.stat-l{color:var(--text2);font-size:12px;margin-top:6px;font-weight:500}
.stat-d{font-size:11px;margin-top:6px;color:var(--text3)}

/* ── Venue cards ── */
.vcard{background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:20px;display:flex;gap:16px;align-items:flex-start;transition:border-color .2s,transform .15s,box-shadow .2s;cursor:default}
.vcard:hover{border-color:rgba(232,184,75,.3);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.3)}
.score-ring{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:800;font-size:15px;flex-shrink:0;position:relative}

/* ── Modals ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;animation:fadeOverlay .2s ease}
@keyframes fadeOverlay{from{opacity:0}to{opacity:1}}
.modal{background:var(--card);border:1px solid var(--border2);border-radius:var(--r3);width:100%;max-width:520px;max-height:92vh;overflow-y:auto;padding:36px;position:relative;animation:slideModal .25s ease}
@keyframes slideModal{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.modal-x{position:absolute;top:18px;right:18px;background:var(--border);border:none;color:var(--text2);border-radius:8px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;transition:all .15s}
.modal-x:hover{color:var(--text);background:var(--border2)}

/* ── Toast ── */
.toast{position:fixed;bottom:24px;right:24px;background:var(--card2);border:1px solid var(--border2);border-radius:14px;padding:14px 20px;font-size:13px;z-index:2000;display:flex;align-items:center;gap:10px;box-shadow:0 16px 48px rgba(0,0,0,.6);animation:toastIn .3s ease;max-width:360px}
@keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.toast-ok{border-color:var(--emerald)}
.toast-err{border-color:var(--crimson)}
.toast-info{border-color:var(--gold)}

/* ── Animations ── */
.fade{animation:pageIn .3s ease}
@keyframes pageIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.shimmer{background:linear-gradient(90deg,var(--card) 25%,var(--border) 50%,var(--card) 75%);background-size:200% 100%;animation:shim 1.6s infinite;border-radius:8px}
@keyframes shim{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ── Progress ── */
.pbar{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
.pfill{height:100%;background:linear-gradient(90deg,var(--gold),var(--gold2));border-radius:2px;transition:width .5s ease}

/* ── Step dots ── */
.step-dots{display:flex;gap:6px;margin-bottom:32px}
.step-dot{height:3px;border-radius:2px;background:var(--border);transition:all .3s;flex:1}
.step-dot.done{background:var(--emerald)}
.step-dot.active{background:var(--gold);flex:2}

/* ── Table ── */
.tbl{width:100%;border-collapse:collapse}
.tbl th{padding:11px 16px;text-align:left;color:var(--text3);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;font-family:var(--font-d);border-bottom:1px solid var(--border)}
.tbl td{padding:13px 16px;border-bottom:1px solid var(--border);font-size:13px;vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:rgba(255,255,255,.015)}

/* ── Divider ── */
hr.div{border:none;border-top:1px solid var(--border);margin:20px 0}

/* ── Upgrade banner ── */
.up-banner{background:linear-gradient(135deg,rgba(232,184,75,.08),rgba(45,212,160,.05));border:1px solid rgba(232,184,75,.2);border-radius:var(--r2);padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}

/* ── Social buttons ── */
.social-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px;border-radius:var(--r);border:1px solid var(--border2);background:var(--surface);color:var(--text);font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;font-family:var(--font-b)}
.social-btn:hover{border-color:var(--gold);background:var(--goldDim)}

/* ── Landing ── */
.l-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(232,184,75,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(232,184,75,.04) 1px,transparent 1px);background-size:80px 80px;mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,black 30%,transparent 100%)}
.l-glow1{position:absolute;width:800px;height:500px;background:radial-gradient(ellipse,rgba(232,184,75,.07) 0%,transparent 65%);left:50%;top:-100px;transform:translateX(-50%);pointer-events:none}
.l-glow2{position:absolute;width:400px;height:400px;background:radial-gradient(ellipse,rgba(45,212,160,.05) 0%,transparent 70%);right:-80px;top:40%;pointer-events:none}
.l-glow3{position:absolute;width:300px;height:300px;background:radial-gradient(ellipse,rgba(91,156,246,.04) 0%,transparent 70%);left:-60px;top:60%;pointer-events:none}

/* ── Plan widget ── */
.plan-widget{background:linear-gradient(135deg,var(--goldDim),transparent);border:1px solid rgba(232,184,75,.18);border-radius:var(--r2);padding:14px}

/* ── Demo banner ── */
.demo-banner{background:linear-gradient(135deg,rgba(167,139,250,.1),rgba(91,156,246,.08));border:1px solid rgba(167,139,250,.2);border-radius:var(--r);padding:10px 16px;font-size:12px;color:var(--lavender);margin-bottom:20px;display:flex;align-items:center;gap:8px}

@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}

@media(max-width:768px){
  .sidebar{display:none}
  .page{padding:20px 16px}
  .g2,.g3,.g4{grid-template-columns:1fr}
  .ph h1{font-size:22px}
}
`;

// ─── UK LONDON VENUES DATABASE ────────────────────────────────────────────────
const UK_VENUES = [
  // Iconic / Historic
  {id:1,name:"100 Club",area:"Oxford Street",city:"London",capacity:350,genres:["jazz","blues","punk","indie","rock"],website:"the100club.co.uk",email:"info@the100club.co.uk",tier:"iconic",description:"One of London's most legendary venues, hosting since 1942."},
  {id:2,name:"Ronnie Scott's Jazz Club",area:"Soho",city:"London",capacity:200,genres:["jazz","blues","soul","funk"],website:"ronniescotts.co.uk",email:"bookings@ronniescotts.co.uk",tier:"iconic",description:"World-famous jazz club in the heart of Soho since 1959."},
  {id:3,name:"The Marquee Club",area:"Soho",city:"London",capacity:700,genres:["rock","indie","metal","alternative"],website:"marqueeclub.com",email:"bookings@marqueeclub.com",tier:"iconic",description:"Legendary venue that launched the careers of The Rolling Stones."},
  // Grassroots / Small
  {id:4,name:"The Windmill Brixton",area:"Brixton",city:"London",capacity:150,genres:["indie","punk","alternative","experimental","post-punk"],website:"windmillbrixton.co.uk",email:"bookings@windmillbrixton.co.uk",tier:"grassroots",description:"Beloved grassroots venue championing new and emerging artists."},
  {id:5,name:"Servant Jazz Quarters",area:"Dalston",city:"London",capacity:100,genres:["jazz","soul","funk","r&b","neo-soul"],website:"servantjazzquarters.com",email:"book@servantjazzquarters.com",tier:"grassroots",description:"Intimate basement jazz bar in the heart of Dalston."},
  {id:6,name:"The Finsbury",area:"Finsbury Park",city:"London",capacity:200,genres:["indie","rock","folk","alternative","singer-songwriter"],website:"thefinsbury.co.uk",email:"gigs@thefinsbury.co.uk",tier:"grassroots",description:"Community pub venue known for championing local talent."},
  {id:7,name:"Moth Club",area:"Hackney",city:"London",capacity:300,genres:["indie","electronic","alternative","experimental","pop"],website:"mothclub.co.uk",email:"bookings@mothclub.co.uk",tier:"grassroots",description:"Art deco venue in Hackney with a strong community ethos."},
  {id:8,name:"Vortex Jazz Club",area:"Dalston",city:"London",capacity:120,genres:["jazz","experimental","avant-garde","world","free jazz"],website:"vortexjazz.co.uk",email:"info@vortexjazz.co.uk",tier:"grassroots",description:"Premier destination for contemporary and experimental jazz."},
  {id:9,name:"Cafe Oto",area:"Dalston",city:"London",capacity:120,genres:["experimental","noise","electronic","free jazz","avant-garde"],website:"cafeoto.co.uk",email:"info@cafeoto.co.uk",tier:"grassroots",description:"Internationally celebrated venue for experimental and adventurous music."},
  {id:10,name:"The Lexington",area:"Angel",city:"London",capacity:200,genres:["indie","alternative","americana","country","folk rock"],website:"thelexington.co.uk",email:"bookings@thelexington.co.uk",tier:"grassroots",description:"Americana-inspired bar and music venue in Angel."},
  {id:11,name:"Oslo Hackney",area:"Hackney Central",city:"London",capacity:250,genres:["indie","electronic","pop","r&b","alternative"],website:"oslohackney.com",email:"music@oslohackney.com",tier:"grassroots",description:"Stylish venue above Hackney Central station."},
  {id:12,name:"The Victoria",area:"Dalston",city:"London",capacity:150,genres:["indie","folk","singer-songwriter","acoustic","alternative"],website:"thevictoriamusic.com",email:"book@thevictoriamusic.com",tier:"grassroots",description:"Cosy pub venue with a warm atmosphere for original music."},
  {id:13,name:"Paper Dress Vintage",area:"Hackney",city:"London",capacity:100,genres:["indie","pop","electronic","alternative","art pop"],website:"paperdressvintage.co.uk",email:"events@paperdressvintage.co.uk",tier:"grassroots",description:"Boutique venue known for eclectic and creative programming."},
  {id:14,name:"The Harrison",area:"Kings Cross",city:"London",capacity:120,genres:["singer-songwriter","folk","indie","acoustic","jazz"],website:"harrisonbar.co.uk",email:"bookings@harrisonbar.co.uk",tier:"grassroots",description:"Charming pub venue near Kings Cross with regular live music."},
  {id:15,name:"The Sebright Arms",area:"Bethnal Green",city:"London",capacity:200,genres:["indie","alternative","experimental","electronic","post-punk"],website:"sebrightarms.co.uk",email:"gigs@sebrightarms.co.uk",tier:"grassroots",description:"East London institution for emerging and DIY artists."},
  {id:16,name:"Nambucca",area:"Holloway",city:"London",capacity:200,genres:["rock","punk","indie","metal","hardcore"],website:"nambucca.co.uk",email:"bookings@nambucca.co.uk",tier:"grassroots",description:"Beloved North London rock and punk venue."},
  {id:17,name:"The Boston Arms",area:"Tufnell Park",city:"London",capacity:250,genres:["indie","rock","punk","alternative","pop"],website:"thebostonarms.com",email:"music@thebostonarms.com",tier:"grassroots",description:"Iconic North London venue with a rich musical heritage."},
  {id:18,name:"The Half Moon Putney",area:"Putney",city:"London",capacity:200,genres:["blues","rock","indie","americana","folk"],website:"halfmoon.co.uk",email:"bookings@halfmoon.co.uk",tier:"grassroots",description:"Historic South London venue with over 50 years of live music."},
  {id:19,name:"Hootananny Brixton",area:"Brixton",city:"London",capacity:400,genres:["reggae","world","folk","acoustic","indie"],website:"hootanannybrixton.co.uk",email:"gigs@hootanannybrixton.co.uk",tier:"grassroots",description:"Vibrant Brixton venue celebrating diverse global music."},
  {id:20,name:"The Islington",area:"Angel",city:"London",capacity:200,genres:["indie","alternative","electronic","pop","r&b"],website:"theislington.com",email:"bookings@theislington.com",tier:"grassroots",description:"Sleek venue in Angel with a focus on breaking new artists."},
  // Mid-size
  {id:21,name:"Jazz Cafe",area:"Camden",city:"London",capacity:440,genres:["jazz","soul","hip-hop","funk","r&b","neo-soul"],website:"jazzcafelondon.com",email:"bookings@jazzcafelondon.com",tier:"mid",description:"Camden's iconic venue bridging jazz with contemporary urban sounds."},
  {id:22,name:"Electric Brixton",area:"Brixton",city:"London",capacity:1400,genres:["electronic","pop","indie","alternative","dance"],website:"electricbrixton.com",email:"bookings@electricbrixton.com",tier:"mid",description:"Stunning art deco venue, one of South London's finest."},
  {id:23,name:"Scala Kings Cross",area:"Kings Cross",city:"London",capacity:1100,genres:["electronic","indie","alternative","rock","hip-hop"],website:"scala.co.uk",email:"bookings@scala.co.uk",tier:"mid",description:"Grand Victorian venue that's been a music landmark for decades."},
  {id:24,name:"Underworld Camden",area:"Camden",city:"London",capacity:500,genres:["metal","rock","punk","hardcore","alternative"],website:"theunderworldcamden.co.uk",email:"bookings@theunderworldcamden.co.uk",tier:"mid",description:"Camden's premier heavy music venue in the heart of the market."},
  {id:25,name:"Jazz at Ronnie's Upstairs",area:"Soho",city:"London",capacity:60,genres:["jazz","acoustic","singer-songwriter","soul"],website:"ronniescotts.co.uk",email:"upstairs@ronniescotts.co.uk",tier:"mid",description:"Intimate upstairs room at the legendary Ronnie Scott's."},
  {id:26,name:"The Garage",area:"Highbury",city:"London",capacity:600,genres:["indie","rock","alternative","punk","electronic"],website:"thegarage.co.uk",email:"bookings@thegarage.co.uk",tier:"mid",description:"North London's favourite mid-size venue with a legendary atmosphere."},
  {id:27,name:"Koko",area:"Camden",city:"London",capacity:1500,genres:["pop","indie","rock","electronic","alternative"],website:"koko.uk.com",email:"bookings@koko.uk.com",tier:"mid",description:"Spectacular Victorian theatre turned music venue in Camden."},
  {id:28,name:"Omeara London",area:"London Bridge",city:"London",capacity:300,genres:["indie","soul","r&b","electronic","pop","alternative"],website:"omearalondon.com",email:"bookings@omearalondon.com",tier:"mid",description:"Intimate venue under the railway arches near London Bridge."},
  {id:29,name:"EartH Hackney",area:"Hackney",city:"London",capacity:2000,genres:["indie","electronic","world","alternative","experimental"],website:"earthackney.co.uk",email:"bookings@earthackney.co.uk",tier:"mid",description:"Magnificent art deco venue championing independent music."},
  {id:30,name:"Village Underground",area:"Shoreditch",city:"London",capacity:700,genres:["electronic","indie","alternative","experimental","pop"],website:"villageunderground.co.uk",email:"bookings@villageunderground.co.uk",tier:"mid",description:"Iconic Shoreditch venue built from recycled tube carriages."},
  {id:31,name:"The Roundhouse",area:"Camden",city:"London",capacity:3300,genres:["rock","indie","pop","electronic","alternative","world"],website:"roundhouse.org.uk",email:"bookings@roundhouse.org.uk",tier:"large",description:"Grade II listed Victorian engine shed, one of London's finest venues."},
  {id:32,name:"Bush Hall",area:"Shepherd's Bush",city:"London",capacity:350,genres:["indie","folk","pop","singer-songwriter","alternative"],website:"bushhall.co.uk",email:"bookings@bushhall.co.uk",tier:"mid",description:"Ornate Edwardian ballroom turned intimate music venue."},
  {id:33,name:"Cargo",area:"Shoreditch",city:"London",capacity:600,genres:["electronic","indie","house","techno","alternative"],website:"cargo-london.com",email:"bookings@cargo-london.com",tier:"mid",description:"Iconic Shoreditch venue under the railway arches."},
  {id:34,name:"Birthdays",area:"Dalston",city:"London",capacity:200,genres:["electronic","indie","alternative","post-punk","experimental"],website:"birthdays-bar.co.uk",email:"bookings@birthdays-bar.co.uk",tier:"grassroots",description:"Dalston's coolest small venue for cutting-edge music."},
  {id:35,name:"Shapes",area:"Hackney Wick",city:"London",capacity:600,genres:["electronic","techno","house","experimental","dance"],website:"shapeslondon.com",email:"bookings@shapeslondon.com",tier:"mid",description:"Hackney Wick's creative hub for electronic music."},
  // Specialist
  {id:36,name:"Pizza Express Jazz Club",area:"Soho",city:"London",capacity:120,genres:["jazz","soul","funk","blues","fusion"],website:"pizzaexpresslive.com",email:"jazz@pizzaexpress.com",tier:"specialist",description:"Beloved basement jazz venue in Soho, one of London's best."},
  {id:37,name:"Ronnie's Bar",area:"Soho",city:"London",capacity:80,genres:["jazz","acoustic","soul","blues"],website:"ronniescotts.co.uk",email:"bar@ronniescotts.co.uk",tier:"specialist",description:"The bar at Ronnie Scott's, intimate late-night sessions."},
  {id:38,name:"606 Club",area:"Chelsea",city:"London",capacity:120,genres:["jazz","soul","blues","funk"],website:"606club.co.uk",email:"info@606club.co.uk",tier:"specialist",description:"Chelsea's hidden jazz gem, strictly live music every night."},
  {id:39,name:"Spice of Life",area:"Soho",city:"London",capacity:100,genres:["jazz","folk","indie","singer-songwriter","acoustic"],website:"spiceoflifesoho.com",email:"music@spiceoflifesoho.com",tier:"specialist",description:"Historic Soho pub with regular live music across many genres."},
  {id:40,name:"The Boogaloo",area:"Highgate",city:"London",capacity:150,genres:["americana","country","folk","rock","singer-songwriter"],website:"theboogaloo.co.uk",email:"bookings@theboogaloo.co.uk",tier:"specialist",description:"North London's home for Americana and roots music."},
  // Large
  {id:41,name:"O2 Academy Brixton",area:"Brixton",city:"London",capacity:4921,genres:["rock","pop","indie","electronic","hip-hop","r&b"],website:"o2academybrixton.co.uk",email:"bookings@o2academybrixton.co.uk",tier:"large",description:"London's most iconic large venue, legendary Brixton atmosphere."},
  {id:42,name:"O2 Forum Kentish Town",area:"Kentish Town",city:"London",capacity:2300,genres:["indie","rock","pop","electronic","alternative"],website:"o2forumkentishtown.co.uk",email:"bookings@o2forumkentishtown.co.uk",tier:"large",description:"North London's leading large venue for established acts."},
  {id:43,name:"Alexandra Palace",area:"Wood Green",city:"London",capacity:10000,genres:["pop","rock","electronic","indie","hip-hop"],website:"alexandrapalace.com",email:"events@alexandrapalace.com",tier:"large",description:"Iconic Victorian palace with stunning views over London."},
  {id:44,name:"Eventim Apollo",area:"Hammersmith",city:"London",capacity:5039,genres:["pop","rock","indie","soul","r&b"],website:"eventimapollo.com",email:"bookings@eventimapollo.com",tier:"large",description:"Art deco masterpiece, one of London's most beautiful venues."},
  {id:45,name:"Barbican Centre",area:"Barbican",city:"London",capacity:1949,genres:["classical","jazz","world","experimental","electronic"],website:"barbican.org.uk",email:"boxoffice@barbican.org.uk",tier:"large",description:"World-class arts centre in the heart of the City."},
  // More grassroots
  {id:46,name:"The Fighting Cocks",area:"Kingston",city:"London",capacity:200,genres:["metal","rock","punk","hardcore","indie"],website:"fightingcocksmusic.co.uk",email:"bookings@fightingcocksmusic.co.uk",tier:"grassroots",description:"Kingston's leading venue for rock and metal."},
  {id:47,name:"The Amersham Arms",area:"New Cross",city:"London",capacity:150,genres:["indie","punk","alternative","folk","acoustic"],website:"amershamarms.co.uk",email:"gigs@amershamarms.co.uk",tier:"grassroots",description:"New Cross institution for independent and DIY music."},
  {id:48,name:"Goldsmiths Crackers",area:"New Cross",city:"London",capacity:200,genres:["indie","experimental","electronic","alternative","art rock"],website:"goldsmiths.ac.uk",email:"crackers@gold.ac.uk",tier:"grassroots",description:"On-campus venue with a rich history of supporting emerging acts."},
  {id:49,name:"The Birds Nest",area:"Deptford",city:"London",capacity:150,genres:["folk","acoustic","singer-songwriter","indie","bluegrass"],website:"birdsnestpub.co.uk",email:"music@birdsnestpub.co.uk",tier:"grassroots",description:"Deptford's favourite spot for acoustic and folk music."},
  {id:50,name:"The Star of Kings",area:"Kings Cross",city:"London",capacity:180,genres:["indie","alternative","electronic","post-punk","experimental"],website:"starofkings.co.uk",email:"bookings@starofkings.co.uk",tier:"grassroots",description:"Atmospheric Kings Cross venue with a dark, moody vibe."},
  {id:51,name:"Passing Clouds",area:"Dalston",city:"London",capacity:200,genres:["world","reggae","jazz","soul","folk","experimental"],website:"passingclouds.org",email:"events@passingclouds.org",tier:"grassroots",description:"Dalston's beloved community arts space."},
  {id:52,name:"The Unicorn",area:"Camden",city:"London",capacity:100,genres:["folk","acoustic","singer-songwriter","blues","roots"],website:"theunicorncamden.co.uk",email:"music@theunicorncamden.co.uk",tier:"grassroots",description:"Intimate Camden venue for acoustic and folk performances."},
  {id:53,name:"The Jago",area:"Stoke Newington",city:"London",capacity:180,genres:["indie","alternative","electronic","post-punk","dream pop"],website:"thejago.com",email:"bookings@thejago.com",tier:"grassroots",description:"Stoke Newington's coolest underground venue."},
  {id:54,name:"Tufnell Park Dome",area:"Tufnell Park",city:"London",capacity:400,genres:["indie","rock","alternative","metal","punk"],website:"thetufnellparkdome.com",email:"bookings@thetufnellparkdome.com",tier:"mid",description:"North London's historic dome venue for rock and indie."},
  {id:55,name:"The Sebright Arms",area:"Bethnal Green",city:"London",capacity:200,genres:["indie","alternative","experimental","art rock","post-punk"],website:"sebrightarms.co.uk",email:"gigs@sebrightarms.co.uk",tier:"grassroots",description:"Beloved East London venue for the adventurous."},
];

const SAMPLE_OUTREACH = [
  {id:1,venueId:4,venue:"The Windmill Brixton",area:"Brixton",date:"2024-03-15",status:"replied",subject:"Booking enquiry – your artist name",notes:"They replied! Suggested a Tuesday slot in April."},
  {id:2,venueId:21,venue:"Jazz Cafe",area:"Camden",date:"2024-03-12",status:"sent",subject:"Booking enquiry – your artist name",notes:""},
  {id:3,venueId:5,venue:"Servant Jazz Quarters",area:"Dalston",date:"2024-03-10",status:"no_response",subject:"Performance enquiry",notes:"Follow up in 2 weeks"},
  {id:4,venueId:7,venue:"Moth Club",area:"Hackney",date:"2024-03-08",status:"replied",subject:"Show enquiry – your artist name",notes:"Booked for 28th March!"},
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const scoreColor = (s) => s>=85?{bg:"rgba(45,212,160,.15)",c:"#2dd4a0",label:"Excellent"}:s>=70?{bg:"rgba(232,184,75,.15)",c:"#e8b84b",label:"Good"}:s>=55?{bg:"rgba(91,156,246,.15)",c:"#5b9cf6",label:"Fair"}:{bg:"rgba(240,83,101,.15)",c:"#f05365",label:"Low"};
const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const tierLabel = (t) => t==="iconic"?"Iconic":t==="large"?"Major":t==="mid"?"Mid-size":t==="specialist"?"Specialist":"Grassroots";
const tierColor = (t) => t==="iconic"?"b-gold":t==="large"?"b-lavender":t==="mid"?"b-sky":t==="specialist"?"b-emerald":"b-dim";

function StatusBadge({s}) {
  if(s==="replied") return <span className="badge b-emerald">✓ Replied</span>;
  if(s==="sent") return <span className="badge b-sky">→ Sent</span>;
  if(s==="booked") return <span className="badge b-gold">★ Booked</span>;
  return <span className="badge b-dim">— No response</span>;
}

// ─── VENUE MATCHING ───────────────────────────────────────────────────────────
function matchVenues(profile, allVenues) {
  const genre = (profile.genre||"").toLowerCase();
  const area = (profile.area||"").toLowerCase();
  const similar = (profile.similarArtists||"").toLowerCase();

  return allVenues.map(v => {
    let score = 0;
    const vGenres = v.genres.map(g => g.toLowerCase());
    const vArea = v.area.toLowerCase();

    // Area bonus
    if(area && (vArea.includes(area.split(",")[0].toLowerCase()) || area.includes(vArea))) score += 20;
    else score += 8;

    // Genre matching
    const genreWords = genre.split(/[\s,/&]+/).filter(g => g.length > 2);
    let genreHits = 0;
    genreWords.forEach(gw => { if(vGenres.some(vg => vg.includes(gw)||gw.includes(vg))) genreHits++; });
    score += Math.min(50, genreHits * 18);

    // Similar artists inference
    const simWords = similar.split(/[\s,]+/).filter(s => s.length > 3);
    simWords.forEach(sw => { if(vGenres.some(vg => vg.includes(sw.slice(0,5)))) score += 6; });

    // Tier bonus for emerging artists (prefer smaller venues)
    if(v.tier==="grassroots") score += 12;
    else if(v.tier==="mid") score += 8;
    else if(v.tier==="specialist") score += 10;
    else if(v.tier==="iconic") score += 6;
    else score += 3;

    score = Math.min(99, Math.max(22, score + Math.floor(Math.random()*6)));

    const locMatch = vArea.includes(area.split(",")[0].toLowerCase())||area.includes(vArea)?"local":"london-wide";
    const genreMatch = genreHits>=3?"high":genreHits>=1?"medium":"low";
    const reason = genreMatch==="high"&&locMatch==="local"
      ? `Ideal match — strong genre alignment and local to you.`
      : genreMatch==="high"
      ? `Excellent genre fit, highly recommended for your sound.`
      : locMatch==="local"
      ? `Local venue that books diverse acts — worth approaching.`
      : `Worth targeting as part of a wider London outreach campaign.`;

    return {...v, score, locMatch, genreMatch, reason};
  }).sort((a,b) => b.score-a.score);
}

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
let supabase = null;

async function initSupabase() {
  if(!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    return supabase;
  } catch(e) {
    console.warn("Supabase not available:", e);
    return null;
  }
}

// ─── AI EMAIL ─────────────────────────────────────────────────────────────────
async function generateEmail(profile, venue) {
  if(!ANTHROPIC_KEY) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:800,
        system:"You are an expert music industry publicist in the UK. Write warm, professional booking enquiry emails. Be direct, personal, and concise — under 150 words. Never use 'I hope this finds you well'. Return ONLY valid JSON: {\"subject\":\"...\",\"body\":\"...\"}",
        messages:[{role:"user",content:`Write a booking enquiry email.\nArtist: ${profile.artistName}, Genre: ${profile.genre}, Area: ${profile.area||"London"}, Bio: ${profile.bio||"N/A"}, Similar artists: ${profile.similarArtists||"N/A"}, Spotify: ${profile.spotify||"N/A"}, Instagram: ${profile.instagram||"N/A"}\nVenue: ${venue.name} (${venue.area}), Genres: ${venue.genres.join(", ")}, Description: ${venue.description}\nReturn ONLY: {"subject":"...","body":"..."}`}]
      })
    });
    const d = await r.json();
    const text = d.content?.[0]?.text||"";
    return JSON.parse(text.replace(/```json|```/g,"").trim());
  } catch(e) {
    return null;
  }
}

// ─── STRIPE ───────────────────────────────────────────────────────────────────
async function openStripeCheckout(plan, userEmail) {
  if(!STRIPE_KEY) return false;
  try {
    const { loadStripe } = await import("https://js.stripe.com/v3/");
    const stripe = await loadStripe(STRIPE_KEY);
    await stripe.redirectToCheckout({
      lineItems:[{price: STRIPE_PRICE_IDS[plan], quantity:1}],
      mode:"subscription",
      successUrl: window.location.origin + "?payment=success",
      cancelUrl: window.location.origin + "?payment=cancelled",
      customerEmail: userEmail,
    });
    return true;
  } catch(e) {
    console.warn("Stripe error:", e);
    return false;
  }
}

// ─── RESEND EMAIL ─────────────────────────────────────────────────────────────
// Note: Resend requires a backend/edge function — this calls your Vercel API route
async function sendViaResend(to, subject, body, fromName) {
  try {
    const r = await fetch("/api/send-email",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({to, subject, body, fromName})
    });
    return r.ok;
  } catch(e) {
    return false;
  }
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({msg, type="ok", onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t)},[onClose]);
  const icon = type==="ok"?"✓":type==="err"?"✕":"ℹ";
  const col = type==="ok"?"var(--emerald)":type==="err"?"var(--crimson)":"var(--gold)";
  return (
    <div className={`toast toast-${type}`}>
      <span style={{color:col,fontWeight:700,fontSize:15}}>{icon}</span>
      <span>{msg}</span>
    </div>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function Landing({onSignup, onLogin}) {
  const [typed, setTyped] = useState("");
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(()=>{
    const phrases = ["book London venues.","get more gigs.","write booking emails.","grow your fanbase.","focus on the music."];
    let ci=0,li=0,del=false;
    const tick=()=>{
      const p=phrases[ci];
      if(!del){setTyped(p.slice(0,li+1));li++;if(li===p.length){del=true;setTimeout(tick,2000);return;}}
      else{setTyped(p.slice(0,li-1));li--;if(li===0){del=false;ci=(ci+1)%phrases.length;}}
      setTimeout(tick,del?42:80);
    };
    const t=setTimeout(tick,800);
    const c=setInterval(()=>setCursorOn(x=>!x),530);
    return()=>{clearTimeout(t);clearInterval(c);};
  },[]);

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",position:"relative",overflowX:"hidden"}}>
      <div className="l-grid"/>
      <div className="l-glow1"/>
      <div className="l-glow2"/>
      <div className="l-glow3"/>

      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"22px 48px",position:"relative",zIndex:10,borderBottom:"1px solid rgba(255,255,255,.04)"}}>
        <div style={{fontFamily:"var(--font-d)",fontSize:19,fontWeight:800,letterSpacing:"-.02em"}}>
          Gig<em style={{color:"var(--gold)",fontStyle:"normal"}}>Pilot</em> <span style={{color:"var(--text3)",fontSize:13,fontWeight:400}}>AI</span>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button className="btn btn-ghost" onClick={onLogin}>Sign in</button>
          <button className="btn btn-gold" onClick={onSignup}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{minHeight:"90vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"60px 24px 40px",position:"relative",zIndex:10}}>
        <div className="badge b-gold" style={{marginBottom:24,fontSize:11,padding:"5px 14px"}}>
          🎵 Built for London musicians
        </div>
        <h1 style={{fontSize:"clamp(38px,6vw,76px)",fontWeight:800,letterSpacing:"-.04em",maxWidth:820,marginBottom:22,lineHeight:1.05}}>
          AI that helps you<br/>
          <span style={{color:"var(--gold)"}}>{typed}</span>
          <span style={{color:"var(--gold)",opacity:cursorOn?1:0}}>|</span>
        </h1>
        <p style={{color:"var(--text2)",fontSize:"clamp(15px,2vw,19px)",maxWidth:520,marginBottom:44,lineHeight:1.75,fontWeight:300}}>
          GigPilot matches you with the right London venues, writes personalised booking emails, and tracks every conversation — so you can focus on making music.
        </p>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center",marginBottom:16}}>
          <button className="btn btn-gold btn-xl" onClick={onSignup}>Start for free →</button>
          <button className="btn btn-outline btn-lg" onClick={onLogin}>Sign in</button>
        </div>
        <p style={{color:"var(--text3)",fontSize:12,marginTop:4}}>No card required · Free plan forever · 55+ London venues</p>

        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:52}}>
          {["🎯 AI venue matching","✉️ Personalised emails","📊 Outreach tracking","🇬🇧 55+ London venues","💷 Plans from £0"].map(f=>(
            <div key={f} style={{background:"rgba(255,255,255,.03)",border:"1px solid var(--border)",borderRadius:99,padding:"7px 16px",fontSize:12,color:"var(--text2)"}}>{f}</div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section style={{padding:"80px 48px",borderTop:"1px solid var(--border)",position:"relative",zIndex:10}}>
        <h2 style={{textAlign:"center",fontSize:"clamp(26px,4vw,40px)",fontWeight:800,marginBottom:10,letterSpacing:"-.02em"}}>From profile to booked</h2>
        <p style={{textAlign:"center",color:"var(--text2)",marginBottom:52,fontSize:15,fontWeight:300}}>Three steps. Minutes, not hours.</p>
        <div className="g3" style={{maxWidth:960,margin:"0 auto",gap:22}}>
          {[
            {n:"01",icon:"🎸",t:"Build your profile",d:"Your genre, influences, links, and bio. Takes 2 minutes. GigPilot uses this to personalise everything."},
            {n:"02",icon:"🎯",t:"Discover matched venues",d:"AI scores 55+ London venues against your sound. See which ones are the right fit and why."},
            {n:"03",icon:"✉️",t:"Send AI-written emails",d:"One click writes a personalised booking email. Edit it, then send directly from GigPilot."},
          ].map(s=>(
            <div key={s.n} className="card" style={{position:"relative",overflow:"hidden",borderColor:"var(--border2)"}}>
              <div style={{fontSize:10,fontFamily:"var(--font-d)",fontWeight:700,color:"var(--gold)",letterSpacing:".14em",marginBottom:16,opacity:.7}}>{s.n}</div>
              <div style={{fontSize:30,marginBottom:14,filter:"grayscale(20%)"}}>{s.icon}</div>
              <h3 style={{fontSize:17,fontWeight:700,marginBottom:8}}>{s.t}</h3>
              <p style={{color:"var(--text2)",fontSize:13,lineHeight:1.65,fontWeight:300}}>{s.d}</p>
              <div style={{position:"absolute",bottom:-16,right:-16,fontSize:72,opacity:.03,lineHeight:1,fontFamily:"var(--font-d)"}}>{s.n}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{padding:"80px 48px",borderTop:"1px solid var(--border)",position:"relative",zIndex:10}}>
        <h2 style={{textAlign:"center",fontSize:"clamp(26px,4vw,40px)",fontWeight:800,marginBottom:10,letterSpacing:"-.02em"}}>Simple pricing</h2>
        <p style={{textAlign:"center",color:"var(--text2)",marginBottom:52,fontSize:15,fontWeight:300}}>Start free. Upgrade when you're ready.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:20,maxWidth:860,margin:"0 auto"}}>
          {[
            {name:"Free",price:"£0",sub:"forever",perks:["5 venue matches / month","3 booking emails / month","Artist profile","Basic dashboard"],cta:"Get started free",pri:false},
            {name:"Artist",price:"£15",sub:"/month",perks:["Unlimited venue matches","50 booking emails / month","Full outreach tracking","AI email generation","Email delivery via Resend"],cta:"Start Artist plan",pri:true},
            {name:"Pro",price:"£39",sub:"/month",perks:["Everything in Artist","Unlimited emails","Advanced analytics","Priority venue data","Early access features"],cta:"Go Pro",pri:false},
          ].map(p=>(
            <div key={p.name} className="card" style={{border:p.pri?"1px solid var(--gold)":"",position:"relative",padding:"28px 24px"}}>
              {p.pri&&<div className="badge b-gold" style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",whiteSpace:"nowrap",fontSize:10}}>Most popular</div>}
              <div style={{fontFamily:"var(--font-d)",fontWeight:800,fontSize:18,marginBottom:6}}>{p.name}</div>
              <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:6}}>
                <span style={{fontFamily:"var(--font-d)",fontSize:36,fontWeight:800,color:p.pri?"var(--gold)":"var(--text)"}}>{p.price}</span>
                <span style={{color:"var(--text3)",fontSize:13}}>{p.sub}</span>
              </div>
              <hr className="div" style={{borderColor:"var(--border2)"}}/>
              <ul style={{listStyle:"none",marginBottom:24,display:"flex",flexDirection:"column",gap:9}}>
                {p.perks.map(k=><li key={k} style={{display:"flex",gap:8,color:"var(--text2)",fontSize:13,fontWeight:300}}><span style={{color:"var(--emerald)",flexShrink:0,marginTop:1}}>✓</span>{k}</li>)}
              </ul>
              <button className={`btn btn-block ${p.pri?"btn-gold":"btn-outline"}`} onClick={onSignup}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:"1px solid var(--border)",padding:"28px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",color:"var(--text3)",fontSize:12,position:"relative",zIndex:10,flexWrap:"wrap",gap:12}}>
        <div style={{fontFamily:"var(--font-d)",fontWeight:800,fontSize:15}}>Gig<em style={{color:"var(--gold)",fontStyle:"normal"}}>Pilot</em> AI</div>
        <div>© 2024 GigPilot AI · Built for independent London musicians</div>
      </footer>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function Auth({initMode, onClose, onAuth, showToast}) {
  const [mode, setMode] = useState(initMode||"signup");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleGoogle = async () => {
    if(!supabase) { onAuth({email:"demo@gigpilot.co.uk",name:"Demo User",provider:"google",id:"demo"}); return; }
    const {error} = await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});
    if(error) setErr(error.message);
  };

  const submit = async () => {
    if(!email||!pass) {setErr("Please fill in all fields");return;}
    if(pass.length<6) {setErr("Password must be at least 6 characters");return;}
    setLoading(true);setErr("");
    if(!supabase) {
      // Demo mode
      onAuth({email,name:name||email.split("@")[0],provider:"email",id:"demo"});
      return;
    }
    try {
      if(mode==="signup") {
        const {data,error} = await supabase.auth.signUp({email,password:pass,options:{data:{full_name:name}}});
        if(error) throw error;
        if(data.user) onAuth({email,name:name||email.split("@")[0],provider:"email",id:data.user.id});
        else showToast("Check your email to confirm your account!","info");
      } else {
        const {data,error} = await supabase.auth.signInWithPassword({email,password:pass});
        if(error) throw error;
        onAuth({email,name:data.user?.user_metadata?.full_name||email.split("@")[0],provider:"email",id:data.user.id});
      }
    } catch(e) {
      setErr(e.message||"Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <button className="modal-x" onClick={onClose}>×</button>
        {DEMO_MODE&&<div className="demo-banner">🎭 Demo mode — Supabase not configured. Auth is simulated.</div>}
        <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:800,marginBottom:4,letterSpacing:"-.02em"}}>
          {mode==="signup"?"Create your account":"Welcome back"}
        </div>
        <p style={{color:"var(--text2)",fontSize:13,marginBottom:28,fontWeight:300}}>
          {mode==="signup"?"Start booking London venues with AI":"Sign in to your GigPilot dashboard"}
        </p>

        <button className="social-btn" style={{marginBottom:16}} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <hr className="div" style={{flex:1,margin:0}}/><span style={{color:"var(--text3)",fontSize:11,whiteSpace:"nowrap"}}>or with email</span><hr className="div" style={{flex:1,margin:0}}/>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode==="signup"&&<div className="field"><label className="label">Full name</label><input className="inp" placeholder="Your name" value={name} onChange={e=>{setName(e.target.value);setErr("")}}/></div>}
          <div className="field"><label className="label">Email</label><input className="inp" type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("")}}/></div>
          <div className="field"><label className="label">Password</label><input className="inp" type="password" placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setErr("")}} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
          {err&&<div style={{background:"var(--crimsonDim)",border:"1px solid rgba(240,83,101,.25)",borderRadius:8,padding:"10px 14px",color:"var(--crimson)",fontSize:13}}>{err}</div>}
          <button className="btn btn-gold btn-block" style={{padding:13,fontSize:14}} onClick={submit} disabled={loading}>
            {loading?"Please wait…":mode==="signup"?"Create free account →":"Sign in →"}
          </button>
        </div>

        <hr className="div"/>
        <p style={{textAlign:"center",color:"var(--text2)",fontSize:13}}>
          {mode==="signup"?"Already have an account? ":"Don't have an account? "}
          <span style={{color:"var(--gold)",cursor:"pointer",fontWeight:600}} onClick={()=>{setMode(mode==="signup"?"login":"signup");setErr("")}}>
            {mode==="signup"?"Sign in":"Sign up free"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({user, onComplete}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState({
    artistName:user.name||"",area:"",genre:"",
    spotify:"",soundcloud:"",instagram:"",
    bio:"",similarArtists:""
  });
  const up = (k,v) => setP(x=>({...x,[k]:v}));

  const steps = [
    {
      title:"What's your artist name?",
      sub:"This is how you'll appear to venues.",
      body:(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="field"><label className="label">Artist / Band name *</label><input className="inp" placeholder="e.g. Maya Jones" value={p.artistName} onChange={e=>up("artistName",e.target.value)}/></div>
          <div className="field"><label className="label">Your area in London *</label><input className="inp" placeholder="e.g. Hackney, Brixton, Camden…" value={p.area} onChange={e=>up("area",e.target.value)}/></div>
        </div>
      ),
      ok:()=>!!(p.artistName&&p.area)
    },
    {
      title:"What's your genre?",
      sub:"The AI uses this to score venue matches.",
      body:(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="field"><label className="label">Primary genre *</label><input className="inp" placeholder="e.g. Jazz, Indie Folk, Electronic, Soul…" value={p.genre} onChange={e=>up("genre",e.target.value)}/></div>
          <div className="field"><label className="label">Artists you sound like</label><input className="inp" placeholder="e.g. Jorja Smith, Tom Misch, Loyle Carner" value={p.similarArtists} onChange={e=>up("similarArtists",e.target.value)}/></div>
          <div className="field"><label className="label">Short bio</label><textarea className="inp" placeholder="A sentence or two about your music and vibe…" value={p.bio} onChange={e=>up("bio",e.target.value)}/></div>
        </div>
      ),
      ok:()=>!!p.genre
    },
    {
      title:"Add your music links",
      sub:"Included automatically in every booking email.",
      body:(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="field"><label className="label">Spotify</label><input className="inp" placeholder="https://open.spotify.com/artist/…" value={p.spotify} onChange={e=>up("spotify",e.target.value)}/></div>
          <div className="field"><label className="label">SoundCloud</label><input className="inp" placeholder="https://soundcloud.com/…" value={p.soundcloud} onChange={e=>up("soundcloud",e.target.value)}/></div>
          <div className="field"><label className="label">Instagram</label><input className="inp" placeholder="https://instagram.com/…" value={p.instagram} onChange={e=>up("instagram",e.target.value)}/></div>
        </div>
      ),
      ok:()=>true
    },
  ];

  const finish = async () => {
    setSaving(true);
    if(supabase && user.id !== "demo") {
      await supabase.from("profiles").upsert({user_id:user.id,artist_name:p.artistName,area:p.area,genre:p.genre,similar_artists:p.similarArtists,bio:p.bio,spotify:p.spotify,soundcloud:p.soundcloud,instagram:p.instagram});
    }
    onComplete(p);
    setSaving(false);
  };

  const cur = steps[step];
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:"var(--bg)"}}>
      <div style={{width:"100%",maxWidth:520}} className="fade">
        <div style={{fontFamily:"var(--font-d)",fontSize:11,color:"var(--gold)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>Step {step+1} of {steps.length}</div>
        <h1 style={{fontSize:26,fontWeight:800,marginBottom:6,letterSpacing:"-.02em"}}>{cur.title}</h1>
        <p style={{color:"var(--text2)",marginBottom:28,fontSize:13,fontWeight:300}}>{cur.sub}</p>
        <div className="step-dots">{steps.map((_,i)=><div key={i} className={`step-dot ${i<step?"done":i===step?"active":""}`}/>)}</div>
        {cur.body}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:28}}>
          {step>0?<button className="btn btn-outline" onClick={()=>setStep(s=>s-1)}>← Back</button>:<div/>}
          <button className="btn btn-gold" disabled={!cur.ok()||saving}
            onClick={()=>step<steps.length-1?setStep(s=>s+1):finish()}>
            {saving?"Saving…":step<steps.length-1?"Continue →":"Let's go 🎵"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({profile, outreach, matchedVenues, onGoDiscover, plan}) {
  const replied = outreach.filter(o=>o.status==="replied"||o.status==="booked").length;
  const sent = outreach.length;
  const top3 = matchedVenues.slice(0,3);

  return (
    <div className="page fade">
      <div className="ph">
        <h1>Good to see you, {profile.artistName} 👋</h1>
        <p>Your booking activity and top London venue matches.</p>
      </div>

      {DEMO_MODE&&<div className="demo-banner">🎭 Running in demo mode. Add your environment variables in Vercel to enable real auth, payments, and AI.</div>}

      <div className="g4" style={{marginBottom:28}}>
        {[
          {n:sent,l:"Emails sent",d:"Total outreach",c:"var(--text)"},
          {n:replied,l:"Positive replies",d:`${sent?Math.round(replied/sent*100):0}% response rate`,c:"var(--emerald)"},
          {n:matchedVenues.length,l:"Venue matches",d:"Across London",c:"var(--gold)"},
          {n:plan==="pro"?"Pro":plan==="artist"?"Artist":"Free",l:"Current plan",d:plan==="free"?"Upgrade for more →":"Active",c:"var(--sky)"},
        ].map(s=>(
          <div className="stat" key={s.l}>
            <div className="stat-n" style={{color:s.c}}>{s.n}</div>
            <div className="stat-l">{s.l}</div>
            <div className="stat-d">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="g2" style={{gap:24,alignItems:"start"}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h3 style={{fontSize:15,fontWeight:700,fontFamily:"var(--font-d)"}}>Top venue matches</h3>
            <button className="btn btn-ghost btn-sm" onClick={onGoDiscover}>See all →</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {top3.map(v=>{
              const sc = scoreColor(v.score);
              return(
                <div className="card2" key={v.id} style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div className="score-ring" style={{background:sc.bg,color:sc.c,width:44,height:44,fontSize:14,fontFamily:"var(--font-d)",fontWeight:800}}>{v.score}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{v.name}</div>
                    <div style={{color:"var(--text2)",fontSize:11,marginTop:2}}>{v.area} · <span style={{color:sc.c}}>{v.genreMatch} genre fit</span></div>
                  </div>
                  <span className={`badge ${tierColor(v.tier)}`}>{tierLabel(v.tier)}</span>
                </div>
              );
            })}
            {top3.length===0&&<div className="card2" style={{textAlign:"center",color:"var(--text3)",padding:"24px 0"}}>Complete your profile to see matches</div>}
          </div>
        </div>

        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h3 style={{fontSize:15,fontWeight:700,fontFamily:"var(--font-d)"}}>Recent outreach</h3>
            <span style={{color:"var(--text3)",fontSize:11}}>Last 30 days</span>
          </div>
          <div className="card" style={{padding:0}}>
            {outreach.slice(0,5).map((o,i)=>(
              <div key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 18px",borderBottom:i<Math.min(4,outreach.length-1)?"1px solid var(--border)":""}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{o.venue}</div>
                  <div style={{color:"var(--text3)",fontSize:11,marginTop:1}}>{fmtDate(o.date)}</div>
                </div>
                <StatusBadge s={o.status}/>
              </div>
            ))}
            {outreach.length===0&&<div style={{padding:28,textAlign:"center",color:"var(--text3)",fontSize:13}}>No outreach yet — find venues and write your first email!</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:24}}>
        <h3 style={{fontSize:15,fontWeight:700,fontFamily:"var(--font-d)",marginBottom:16}}>Your artist profile</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
          {[{l:"Artist name",v:profile.artistName},{l:"Area",v:profile.area},{l:"Genre",v:profile.genre},{l:"Sounds like",v:profile.similarArtists||"—"}].map(r=>(
            <div key={r.l} style={{background:"var(--surface)",borderRadius:"var(--r)",padding:"11px 13px"}}>
              <div style={{color:"var(--text3)",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",marginBottom:4,fontFamily:"var(--font-d)"}}>{r.l}</div>
              <div style={{fontWeight:500,fontSize:13}}>{r.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DISCOVER ─────────────────────────────────────────────────────────────────
function Discover({profile, plan, matchedVenues, outreach, onSendEmail, onUpgrade}) {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const isFree = plan==="free";
  const areas = [...new Set(matchedVenues.map(v=>v.area))].sort();
  const allGenres = [...new Set(matchedVenues.flatMap(v=>v.genres))].sort();
  const contactedIds = new Set(outreach.map(o=>o.venueId));

  const filtered = matchedVenues.filter(v=>{
    const q = search.toLowerCase();
    if(search&&!v.name.toLowerCase().includes(q)&&!v.area.toLowerCase().includes(q)&&!v.genres.some(g=>g.includes(q))) return false;
    if(areaFilter!=="all"&&v.area!==areaFilter) return false;
    if(genreFilter!=="all"&&!v.genres.includes(genreFilter)) return false;
    if(tierFilter!=="all"&&v.tier!==tierFilter) return false;
    return true;
  });

  return (
    <div className="page fade">
      <div className="ph"><h1>London Venue Matches</h1><p>55+ London venues scored by AI to match your sound.</p></div>

      {isFree&&(
        <div className="up-banner">
          <div>
            <div style={{fontFamily:"var(--font-d)",fontWeight:700,marginBottom:3}}>You're on the Free plan</div>
            <div style={{color:"var(--text2)",fontSize:12}}>Showing 5 of {matchedVenues.length} matches. Upgrade to see all venues.</div>
          </div>
          <button className="btn btn-gold btn-sm" onClick={onUpgrade}>Upgrade to Artist — £15/mo →</button>
        </div>
      )}

      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <input className="inp" placeholder="Search venues, areas, genres…" value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:260}}/>
        <select className="inp" value={areaFilter} onChange={e=>setAreaFilter(e.target.value)} style={{maxWidth:160}}>
          <option value="all">All areas</option>
          {areas.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <select className="inp" value={genreFilter} onChange={e=>setGenreFilter(e.target.value)} style={{maxWidth:160}}>
          <option value="all">All genres</option>
          {allGenres.slice(0,24).map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <select className="inp" value={tierFilter} onChange={e=>setTierFilter(e.target.value)} style={{maxWidth:140}}>
          <option value="all">All tiers</option>
          <option value="grassroots">Grassroots</option>
          <option value="mid">Mid-size</option>
          <option value="specialist">Specialist</option>
          <option value="iconic">Iconic</option>
          <option value="large">Major</option>
        </select>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",color:"var(--text3)",fontSize:12}}>{filtered.length} venues</div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map((v,idx)=>{
          const locked = isFree&&idx>=5;
          const sc = scoreColor(v.score);
          const contacted = contactedIds.has(v.id);
          return (
            <div key={v.id} className="vcard" style={{opacity:locked?0.45:1,filter:locked?"blur(4px)":"none",pointerEvents:locked?"none":"auto",position:"relative"}}>
              <div className="score-ring" style={{background:sc.bg,color:sc.c,fontFamily:"var(--font-d)",fontWeight:800,fontSize:15}}>{v.score}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:6}}>
                  <span style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:16}}>{v.name}</span>
                  <span style={{color:"var(--text3)",fontSize:12}}>· {v.area}</span>
                  {v.capacity&&<span className="badge b-dim">Cap. {v.capacity.toLocaleString()}</span>}
                  <span className={`badge ${tierColor(v.tier)}`}>{tierLabel(v.tier)}</span>
                  {contacted&&<span className="badge b-gold">✓ Contacted</span>}
                </div>
                <p style={{color:"var(--text2)",fontSize:12,marginBottom:8,lineHeight:1.55,fontWeight:300}}>{v.reason}</p>
                <p style={{color:"var(--text3)",fontSize:11,marginBottom:8,fontStyle:"italic"}}>{v.description}</p>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                  {v.genres.slice(0,4).map(g=><span key={g} className="tag">{g}</span>)}
                  <span className={`badge ${v.genreMatch==="high"?"b-emerald":v.genreMatch==="medium"?"b-gold":"b-crimson"}`}>{v.genreMatch} genre fit</span>
                  <span className={`badge ${v.locMatch==="local"?"b-emerald":"b-sky"}`}>{v.locMatch==="local"?"Local to you":"London-wide"}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0,minWidth:124}}>
                <button className="btn btn-gold btn-sm" onClick={()=>onSendEmail(v)}>✉ Write email</button>
                {v.website&&<a href={`https://${v.website}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{justifyContent:"center"}}>↗ Website</a>}
                {v.email&&<div style={{fontSize:10,color:"var(--text3)",textAlign:"center",wordBreak:"break-all",lineHeight:1.4}}>{v.email}</div>}
              </div>
            </div>
          );
        })}
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:60,color:"var(--text3)"}}>
            <div style={{fontSize:36,marginBottom:12}}>🔍</div>
            No venues match these filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EMAIL MODAL ──────────────────────────────────────────────────────────────
function EmailModal({venue, profile, plan, outreachCount, onClose, onSend, showToast}) {
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const monthlyLimit = plan==="free"?3:plan==="artist"?50:9999;
  const atLimit = outreachCount>=monthlyLimit;

  const mockEmail = () => {
    setSubj(`Booking enquiry – ${profile.artistName}`);
    setBody(`Hi ${venue.name} team,\n\nI'm ${profile.artistName}, a ${profile.genre} artist based in ${profile.area||"London"}${profile.similarArtists?`, drawing comparisons to ${profile.similarArtists.split(",").slice(0,2).map(s=>s.trim()).join(" and ")}`:""} .\n\n${profile.bio||"I have been building a strong local following and am actively developing my live performance schedule."}\n\nI'd love to explore the possibility of performing at ${venue.name}. Your programming of ${venue.genres.slice(0,2).join(" and ")} feels like a natural home for my music.\n\n${profile.spotify?`You can hear my music here: ${profile.spotify}\n\n`:""}I'm flexible on dates and happy to discuss whatever format works for you.\n\nBest wishes,\n${profile.artistName}${profile.instagram?`\n${profile.instagram}`:""}`);
  };

  const gen = async () => {
    setLoading(true);
    const res = await generateEmail(profile, venue);
    if(res?.subject&&res?.body) { setSubj(res.subject); setBody(res.body); }
    else mockEmail();
    setLoading(false);
  };

  useEffect(()=>{gen();},[]);

  const send = async () => {
    if(atLimit){showToast("Monthly email limit reached. Upgrade for more.","err");return;}
    setSending(true);
    const sent = await sendViaResend(venue.email, subj, body, profile.artistName);
    if(!sent&&venue.email) {
      // Fallback: open mailto
      window.open(`mailto:${venue.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
    }
    onSend({venue, subject:subj, body});
    showToast(`Email sent to ${venue.name}! 🎉`);
    setSending(false);
    onClose();
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:600}}>
        <button className="modal-x" onClick={onClose}>×</button>
        <div style={{fontFamily:"var(--font-d)",fontSize:20,fontWeight:800,marginBottom:3,letterSpacing:"-.02em"}}>Email to {venue.name}</div>
        <div style={{color:"var(--text3)",fontSize:12,marginBottom:22}}>📧 {venue.email||"contact via website"} · {venue.area}</div>

        {loading?(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div className="shimmer" style={{height:42}}/>
            <div className="shimmer" style={{height:200}}/>
            <p style={{textAlign:"center",color:"var(--text2)",fontSize:12,padding:"6px 0",fontWeight:300}}>✨ Writing your personalised email…</p>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {atLimit&&<div style={{background:"var(--crimsonDim)",border:"1px solid rgba(240,83,101,.2)",borderRadius:8,padding:"10px 14px",color:"var(--crimson)",fontSize:12}}>Monthly limit reached ({monthlyLimit} emails on your {plan} plan). Upgrade for more.</div>}
            <div className="field"><label className="label">Subject</label><input className="inp" value={subj} onChange={e=>setSubj(e.target.value)}/></div>
            <div className="field"><label className="label">Email body</label><textarea className="inp" style={{minHeight:240}} value={body} onChange={e=>setBody(e.target.value)}/></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}}>
              <button className="btn btn-ghost btn-sm" onClick={gen} disabled={loading}>↺ Regenerate</button>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn btn-gold" onClick={send} disabled={sending||atLimit}>
                {sending?"Sending…":"Send email →"}
              </button>
            </div>
            <p style={{fontSize:11,color:"var(--text3)",textAlign:"center"}}>
              {venue.email?"Email sent via Resend (or mailto fallback if API not configured)":"No booking email found — use the website link to contact them."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OUTREACH TRACKER ─────────────────────────────────────────────────────────
function OutreachPage({outreach, setOutreach, plan, onUpgrade}) {
  const [filter, setFilter] = useState("all");
  const [noteId, setNoteId] = useState(null);
  const [noteTxt, setNoteTxt] = useState("");

  if(plan==="free") return(
    <div className="page fade" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,textAlign:"center"}}>
      <div style={{fontSize:52,marginBottom:18}}>📊</div>
      <h2 style={{fontSize:24,fontWeight:800,marginBottom:8,fontFamily:"var(--font-d)"}}>Outreach tracking is a paid feature</h2>
      <p style={{color:"var(--text2)",maxWidth:380,marginBottom:28,lineHeight:1.65,fontSize:13,fontWeight:300}}>Upgrade to track every email, see reply status, and manage follow-ups from one place.</p>
      <button className="btn btn-gold btn-lg" onClick={onUpgrade}>Upgrade to Artist — £15/mo</button>
    </div>
  );

  const counts = {all:outreach.length,replied:outreach.filter(o=>o.status==="replied"||o.status==="booked").length,sent:outreach.filter(o=>o.status==="sent").length,no_response:outreach.filter(o=>o.status==="no_response").length};
  const shown = filter==="all"?outreach:outreach.filter(o=>filter==="replied"?(o.status==="replied"||o.status==="booked"):o.status===filter);

  const updateStatus = (id,status) => setOutreach(prev=>prev.map(o=>o.id===id?{...o,status}:o));
  const saveNote = (id) => {setOutreach(prev=>prev.map(o=>o.id===id?{...o,notes:noteTxt}:o));setNoteId(null);};

  return(
    <div className="page fade">
      <div className="ph"><h1>Outreach Tracker</h1><p>Track every email, reply, and follow-up.</p></div>

      <div className="g4" style={{marginBottom:24}}>
        {[
          {n:counts.all,l:"Total sent",c:"var(--text)"},
          {n:counts.replied,l:"Positive replies",c:"var(--emerald)"},
          {n:counts.sent,l:"Awaiting reply",c:"var(--sky)"},
          {n:counts.no_response,l:"No response",c:"var(--text3)"},
        ].map(s=><div className="stat" key={s.l}><div className="stat-n" style={{color:s.c}}>{s.n}</div><div className="stat-l">{s.l}</div></div>)}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[["all","All"],["replied","Replied"],["sent","Sent"],["no_response","No response"]].map(([k,l])=>(
          <button key={k} className={`btn btn-sm ${filter===k?"btn-gold":"btn-outline"}`} onClick={()=>setFilter(k)}>
            {l} <span style={{background:"rgba(255,255,255,.08)",borderRadius:99,padding:"1px 7px",fontSize:10,marginLeft:4}}>{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{padding:0,overflowX:"auto"}}>
        <table className="tbl">
          <thead><tr><th>Venue</th><th>Area</th><th>Date</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
          <tbody>
            {shown.map(o=>(
              <tr key={o.id}>
                <td style={{fontWeight:600}}>{o.venue}</td>
                <td style={{color:"var(--text2)"}}>{o.area}</td>
                <td style={{color:"var(--text2)"}}>{fmtDate(o.date)}</td>
                <td><StatusBadge s={o.status}/></td>
                <td style={{maxWidth:200}}>
                  {noteId===o.id?(
                    <div style={{display:"flex",gap:5}}>
                      <input className="inp" style={{padding:"4px 8px",fontSize:12}} value={noteTxt} onChange={e=>setNoteTxt(e.target.value)} autoFocus/>
                      <button className="btn btn-emerald btn-sm" style={{padding:"4px 10px"}} onClick={()=>saveNote(o.id)}>✓</button>
                    </div>
                  ):(
                    <span style={{color:"var(--text3)",fontSize:12,cursor:"pointer"}} onClick={()=>{setNoteId(o.id);setNoteTxt(o.notes||"");}}>
                      {o.notes||<span style={{color:"var(--border2)"}}>+ Add note</span>}
                    </span>
                  )}
                </td>
                <td>
                  <div style={{display:"flex",gap:5}}>
                    {o.status!=="replied"&&o.status!=="booked"&&<button style={{background:"var(--emeraldDim)",color:"var(--emerald)",border:"1px solid rgba(45,212,160,.2)",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer"}} onClick={()=>updateStatus(o.id,"replied")}>Replied</button>}
                    {o.status==="replied"&&<button style={{background:"var(--goldDim)",color:"var(--gold)",border:"1px solid rgba(232,184,75,.2)",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer"}} onClick={()=>updateStatus(o.id,"booked")}>Booked!</button>}
                    {o.status==="sent"&&<button style={{background:"rgba(255,255,255,.04)",color:"var(--text3)",border:"1px solid var(--border)",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer"}} onClick={()=>updateStatus(o.id,"no_response")}>No response</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--text3)",fontSize:13}}>No outreach for this filter.</div>}
      </div>
    </div>
  );
}

// ─── VENUE DATABASE ───────────────────────────────────────────────────────────
function VenueDB({venues, setVenues, showToast}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [tierF, setTierF] = useState("all");
  const [form, setForm] = useState({name:"",area:"",capacity:"",genres:"",website:"",email:"",tier:"grassroots"});
  const up = (k,v) => setForm(x=>({...x,[k]:v}));

  const filtered = venues.filter(v=>{
    const q = search.toLowerCase();
    const matchSearch = !search||v.name.toLowerCase().includes(q)||v.area.toLowerCase().includes(q)||v.genres.some(g=>g.includes(q));
    const matchTier = tierF==="all"||v.tier===tierF;
    return matchSearch&&matchTier;
  });

  const addVenue = () => {
    if(!form.name||!form.area) return;
    const nv = {id:Date.now(),name:form.name,area:form.area,city:"London",capacity:form.capacity?parseInt(form.capacity):null,genres:form.genres.split(",").map(g=>g.trim()).filter(Boolean),website:form.website,email:form.email,tier:form.tier,description:""};
    setVenues(prev=>[...prev,nv]);
    setForm({name:"",area:"",capacity:"",genres:"",website:"",email:"",tier:"grassroots"});
    setAdding(false);
    showToast("Venue added!");
  };

  return(
    <div className="page fade">
      <div className="ph"><h1>London Venue Database</h1><p>Browse and manage all 55+ London venues.</p></div>

      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <input className="inp" placeholder="Search venues, areas, genres…" value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:280}}/>
        <select className="inp" value={tierF} onChange={e=>setTierF(e.target.value)} style={{maxWidth:150}}>
          <option value="all">All tiers</option>
          <option value="grassroots">Grassroots</option>
          <option value="mid">Mid-size</option>
          <option value="specialist">Specialist</option>
          <option value="iconic">Iconic</option>
          <option value="large">Major</option>
        </select>
        <div style={{marginLeft:"auto"}}><button className="btn btn-gold btn-sm" onClick={()=>setAdding(true)}>+ Add venue</button></div>
      </div>

      {adding&&(
        <div className="card" style={{marginBottom:20,borderColor:"rgba(232,184,75,.25)"}}>
          <h3 style={{fontFamily:"var(--font-d)",fontWeight:700,marginBottom:16,fontSize:15}}>Add new venue</h3>
          <div className="g2" style={{gap:12,marginBottom:12}}>
            <div className="field"><label className="label">Venue name *</label><input className="inp" placeholder="The Windmill" value={form.name} onChange={e=>up("name",e.target.value)}/></div>
            <div className="field"><label className="label">Area *</label><input className="inp" placeholder="Brixton" value={form.area} onChange={e=>up("area",e.target.value)}/></div>
            <div className="field"><label className="label">Capacity</label><input className="inp" type="number" placeholder="150" value={form.capacity} onChange={e=>up("capacity",e.target.value)}/></div>
            <div className="field"><label className="label">Tier</label>
              <select className="inp" value={form.tier} onChange={e=>up("tier",e.target.value)}>
                <option value="grassroots">Grassroots</option>
                <option value="mid">Mid-size</option>
                <option value="specialist">Specialist</option>
                <option value="iconic">Iconic</option>
                <option value="large">Major</option>
              </select>
            </div>
            <div className="field"><label className="label">Genres (comma separated)</label><input className="inp" placeholder="indie, folk, jazz" value={form.genres} onChange={e=>up("genres",e.target.value)}/></div>
            <div className="field"><label className="label">Website</label><input className="inp" placeholder="venue.co.uk" value={form.website} onChange={e=>up("website",e.target.value)}/></div>
            <div className="field"><label className="label">Booking email</label><input className="inp" placeholder="bookings@venue.co.uk" value={form.email} onChange={e=>up("email",e.target.value)}/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-gold" onClick={addVenue}>Add venue</button>
            <button className="btn btn-outline" onClick={()=>setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{color:"var(--text3)",fontSize:12,marginBottom:12}}>{filtered.length} venues</div>

      <div className="card" style={{padding:0,overflowX:"auto"}}>
        <table className="tbl">
          <thead><tr><th>Venue</th><th>Area</th><th>Tier</th><th>Capacity</th><th>Genres</th><th>Contact</th></tr></thead>
          <tbody>
            {filtered.map(v=>(
              <tr key={v.id}>
                <td style={{fontWeight:600,fontSize:13}}>{v.name}</td>
                <td style={{color:"var(--text2)"}}>{v.area}</td>
                <td><span className={`badge ${tierColor(v.tier)}`}>{tierLabel(v.tier)}</span></td>
                <td style={{color:"var(--text2)"}}>{v.capacity?.toLocaleString()||"—"}</td>
                <td><div style={{display:"flex",flexWrap:"wrap",gap:2,maxWidth:200}}>{v.genres.slice(0,3).map(g=><span key={g} className="tag">{g}</span>)}{v.genres.length>3&&<span className="tag">+{v.genres.length-3}</span>}</div></td>
                <td style={{color:"var(--text3)",fontSize:11}}>{v.email||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ACCOUNT ──────────────────────────────────────────────────────────────────
function Account({user, profile, plan, onUpgrade, onLogout, showToast}) {
  const [editing, setEditing] = useState(false);
  const [p, setP] = useState({...profile});
  const up = (k,v) => setP(x=>({...x,[k]:v}));

  const save = async () => {
    if(supabase&&user.id!=="demo") {
      await supabase.from("profiles").upsert({user_id:user.id,...p});
    }
    setEditing(false);
    showToast("Profile saved!");
  };

  return(
    <div className="page fade">
      <div className="ph"><h1>Account</h1><p>Manage your profile and subscription.</p></div>
      <div className="g2" style={{gap:24,alignItems:"start"}}>
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <h3 style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:15}}>Artist profile</h3>
            {!editing&&<button className="btn btn-outline btn-sm" onClick={()=>setEditing(true)}>Edit</button>}
          </div>
          {editing?(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[["artistName","Artist name"],["area","Area"],["genre","Genre"],["similarArtists","Sounds like"],["bio","Bio"],["spotify","Spotify"],["instagram","Instagram"]].map(([k,l])=>(
                <div className="field" key={k}><label className="label">{l}</label>
                  {k==="bio"?<textarea className="inp" value={p[k]||""} onChange={e=>up(k,e.target.value)}/>:<input className="inp" value={p[k]||""} onChange={e=>up(k,e.target.value)}/>}
                </div>
              ))}
              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-gold" onClick={save}>Save changes</button>
                <button className="btn btn-outline" onClick={()=>setEditing(false)}>Cancel</button>
              </div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["Artist name",profile.artistName],["Area",profile.area],["Genre",profile.genre],["Sounds like",profile.similarArtists||"—"],["Bio",profile.bio||"—"]].map(([l,v])=>(
                <div key={l}>
                  <div className="label" style={{marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13}}>{v}</div>
                  <hr className="div" style={{margin:"8px 0 0"}}/>
                </div>
              ))}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                {profile.spotify&&<a href={profile.spotify} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">🎵 Spotify</a>}
                {profile.soundcloud&&<a href={profile.soundcloud} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">☁ SoundCloud</a>}
                {profile.instagram&&<a href={profile.instagram} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">📸 Instagram</a>}
              </div>
            </div>
          )}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div className="card">
            <h3 style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:15,marginBottom:16}}>Subscription</h3>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div style={{fontWeight:600,marginBottom:2,fontSize:14}}>{plan==="free"?"Free plan":plan==="artist"?"Artist plan — £15/mo":"Pro plan — £39/mo"}</div>
                <div style={{color:"var(--text3)",fontSize:12}}>{plan==="free"?"5 matches · 3 emails/month":plan==="artist"?"Unlimited matches · 50 emails/month":"Unlimited everything"}</div>
              </div>
              <span className={`badge ${plan==="pro"?"b-gold":plan==="artist"?"b-emerald":"b-dim"}`}>{plan.charAt(0).toUpperCase()+plan.slice(1)}</span>
            </div>
            {plan==="free"&&(
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text3)",marginBottom:5}}><span>Monthly usage</span><span>3 / 5 matches</span></div>
                <div className="pbar"><div className="pfill" style={{width:"60%"}}/></div>
              </div>
            )}
            {plan!=="pro"&&<button className="btn btn-gold btn-block" onClick={onUpgrade}>{plan==="free"?"Upgrade to Artist — £15/mo":"Upgrade to Pro — £39/mo"}</button>}
            {DEMO_MODE&&<p style={{fontSize:11,color:"var(--text3)",marginTop:8,textAlign:"center"}}>Stripe not configured — payments are simulated</p>}
          </div>

          <div className="card">
            <h3 style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:15,marginBottom:14}}>Account</h3>
            <div style={{marginBottom:3,color:"var(--text3)",fontSize:10,textTransform:"uppercase",letterSpacing:".08em",fontFamily:"var(--font-d)"}}>Signed in as</div>
            <div style={{fontWeight:600,marginBottom:3,fontSize:14}}>{user.name}</div>
            <div style={{color:"var(--text3)",fontSize:12,marginBottom:16}}>{user.email}</div>
            <button className="btn btn-danger btn-sm" onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({onClose, onUpgrade, user}) {
  const [loading, setLoading] = useState(null);

  const select = async (plan) => {
    setLoading(plan);
    const ok = await openStripeCheckout(plan, user.email);
    if(!ok) {
      // Simulated upgrade in demo mode
      onUpgrade(plan);
      onClose();
    }
    setLoading(null);
  };

  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <button className="modal-x" onClick={onClose}>×</button>
        <div style={{fontFamily:"var(--font-d)",fontSize:22,fontWeight:800,marginBottom:6,letterSpacing:"-.02em"}}>Unlock the full platform</div>
        <p style={{color:"var(--text2)",fontSize:13,marginBottom:26,fontWeight:300}}>Choose a plan to start reaching more London venues.</p>
        {DEMO_MODE&&<div className="demo-banner" style={{marginBottom:20}}>🎭 Demo mode — plan selection is simulated. Add Stripe keys to enable real payments.</div>}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[
            {name:"Artist",price:"£15/mo",perks:"Unlimited matches · 50 emails/mo · Full tracking · AI emails",plan:"artist",popular:true},
            {name:"Pro",price:"£39/mo",perks:"Unlimited everything · Analytics · Priority support",plan:"pro",popular:false},
          ].map(p=>(
            <div key={p.name} className="card2" style={{display:"flex",alignItems:"center",gap:14,border:p.popular?"1px solid rgba(232,184,75,.3)":""}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:15}}>{p.name}</span>
                  {p.popular&&<span className="badge b-gold">Popular</span>}
                </div>
                <div style={{fontFamily:"var(--font-d)",fontWeight:800,fontSize:18,color:"var(--gold)",margin:"2px 0"}}>{p.price}</div>
                <div style={{color:"var(--text2)",fontSize:12,fontWeight:300}}>{p.perks}</div>
              </div>
              <button className="btn btn-gold btn-sm" onClick={()=>select(p.plan)} disabled={!!loading}>
                {loading===p.plan?"…":"Select"}
              </button>
            </div>
          ))}
        </div>
        <div style={{background:"var(--surface)",borderRadius:8,padding:"12px 14px",marginTop:18,fontSize:11,color:"var(--text3)"}}>
          💳 Payments processed by Stripe · Cancel anytime · Prices include VAT
        </div>
      </div>
    </div>
  );
}

// ─── MOBILE NAV ───────────────────────────────────────────────────────────────
function MobileNav({page, setPage}) {
  const items = [["dashboard","⚡","Home"],["discover","🎯","Venues"],["outreach","📬","Outreach"],["account","👤","Account"]];
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--surface)",borderTop:"1px solid var(--border)",display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
      {items.map(([id,icon,label])=>(
        <button key={id} onClick={()=>setPage(id)} style={{flex:1,padding:"10px 0",background:"none",border:"none",color:page===id?"var(--gold)":"var(--text3)",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:9,fontFamily:"var(--font-d)",fontWeight:700,cursor:"pointer",letterSpacing:".04em"}}>
          <span style={{fontSize:19}}>{icon}</span>{label.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [authMode, setAuthMode] = useState("signup");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [plan, setPlan] = useState("free");
  const [outreach, setOutreach] = useState(SAMPLE_OUTREACH);
  const [venues, setVenues] = useState(UK_VENUES);
  const [matchedVenues, setMatchedVenues] = useState([]);
  const [emailVenue, setEmailVenue] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(()=>{
    initSupabase().then(sb=>{
      if(!sb) return;
      // Check for existing session
      sb.auth.getSession().then(({data:{session}})=>{
        if(session?.user) {
          const u = session.user;
          setUser({email:u.email,name:u.user_metadata?.full_name||u.email.split("@")[0],provider:u.app_metadata?.provider||"email",id:u.id});
          // Load profile from DB
          sb.from("profiles").select("*").eq("user_id",u.id).single().then(({data})=>{
            if(data) {
              setProfile({artistName:data.artist_name,area:data.area,genre:data.genre,similarArtists:data.similar_artists,bio:data.bio,spotify:data.spotify,soundcloud:data.soundcloud,instagram:data.instagram});
              setScreen("app");
            } else {
              setScreen("onboarding");
            }
          });
        }
      });
      // Auth state listener
      sb.auth.onAuthStateChange((_event,session)=>{
        if(session?.user&&screen==="landing") {
          const u = session.user;
          setUser({email:u.email,name:u.user_metadata?.full_name||u.email.split("@")[0],provider:u.app_metadata?.provider||"email",id:u.id});
          setScreen("onboarding");
        }
      });
    });
    const check=()=>setIsMobile(window.innerWidth<768);
    check();
    window.addEventListener("resize",check);
    return()=>window.removeEventListener("resize",check);
  },[]);

  useEffect(()=>{
    if(profile) setMatchedVenues(matchVenues(profile,venues));
  },[profile,venues]);

  const showToast = (msg,type="ok") => setToast({msg,type});
  const handleAuth = (u) => {setUser(u);setScreen("onboarding");};
  const handleOnboarding = (p) => {setProfile(p);setScreen("app");showToast(`Welcome to GigPilot, ${p.artistName}! 🎵`);};
  const handleSendEmail = (venue) => setEmailVenue(venue);
  const handleEmailSent = ({venue,subject}) => {
    setOutreach(prev=>[{id:Date.now(),venueId:venue.id,venue:venue.name,area:venue.area,date:new Date().toISOString().split("T")[0],status:"sent",subject,notes:""},...prev]);
  };

  const navItems = [
    {id:"dashboard",icon:"⚡",label:"Dashboard"},
    {id:"discover",icon:"🎯",label:"Discover Venues"},
    {id:"outreach",icon:"📬",label:"Outreach"},
    {id:"venues",icon:"🗺",label:"Venue Database"},
    {id:"account",icon:"👤",label:"Account"},
  ];

  if(screen==="landing") return(
    <><style>{G}</style>
    <Landing onSignup={()=>{setAuthMode("signup");setScreen("auth");}} onLogin={()=>{setAuthMode("login");setScreen("auth");}}/>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}</>
  );

  if(screen==="auth") return(
    <><style>{G}</style>
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
      <Auth initMode={authMode} onClose={()=>setScreen("landing")} onAuth={handleAuth} showToast={showToast}/>
    </div>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}</>
  );

  if(screen==="onboarding") return(
    <><style>{G}</style>
    <Onboarding user={user} onComplete={handleOnboarding}/>
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}</>
  );

  return(
    <><style>{G}</style>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="nav-logo">Gig<em>Pilot</em> AI<small>London Booking Assistant</small></div>
        <div className="nav-sect">Menu</div>
        {navItems.map(n=>(
          <button key={n.id} className={`nav-item ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
            <span className="ni">{n.icon}</span>{n.label}
          </button>
        ))}
        <hr className="nav-div"/>
        <div className="nav-sect">Account</div>
        <button className="nav-item" onClick={()=>setPage("account")}>
          <span className="ni">👤</span>{user?.name||"Account"}
        </button>
        <div style={{marginTop:"auto",padding:"14px 10px"}}>
          <div className="plan-widget">
            <div style={{fontFamily:"var(--font-d)",fontWeight:700,fontSize:12,color:"var(--gold)",marginBottom:4}}>
              {plan==="pro"?"Pro Plan":plan==="artist"?"Artist Plan":"Free Plan"}
            </div>
            {plan==="free"?(
              <>
                <div className="pbar" style={{marginBottom:5}}><div className="pfill" style={{width:"60%"}}/></div>
                <div style={{fontSize:10,color:"var(--text3)",marginBottom:10}}>3/5 matches · 0/3 emails</div>
                <button className="btn btn-gold btn-sm btn-block" style={{fontSize:11}} onClick={()=>setShowUpgrade(true)}>Upgrade from £15/mo</button>
              </>
            ):<div style={{fontSize:10,color:"var(--text3)"}}>Unlimited matches and emails</div>}
          </div>
        </div>
      </aside>

      <main className="main" style={{paddingBottom:isMobile?80:0}}>
        {page==="dashboard"&&<Dashboard profile={profile} outreach={outreach} matchedVenues={matchedVenues} onGoDiscover={()=>setPage("discover")} plan={plan}/>}
        {page==="discover"&&<Discover profile={profile} plan={plan} matchedVenues={matchedVenues} outreach={outreach} onSendEmail={handleSendEmail} onUpgrade={()=>setShowUpgrade(true)}/>}
        {page==="outreach"&&<OutreachPage outreach={outreach} setOutreach={setOutreach} plan={plan} onUpgrade={()=>setShowUpgrade(true)}/>}
        {page==="venues"&&<VenueDB venues={venues} setVenues={setVenues} showToast={showToast}/>}
        {page==="account"&&<Account user={user} profile={profile} plan={plan} onUpgrade={()=>setShowUpgrade(true)} onLogout={async()=>{if(supabase)await supabase.auth.signOut();setUser(null);setProfile(null);setScreen("landing");}} showToast={showToast}/>}
      </main>
    </div>

    {isMobile&&<MobileNav page={page} setPage={setPage}/>}
    {emailVenue&&<EmailModal venue={emailVenue} profile={profile} plan={plan} outreachCount={outreach.filter(o=>o.date>=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split("T")[0]).length} onClose={()=>setEmailVenue(null)} onSend={handleEmailSent} showToast={showToast}/>}
    {showUpgrade&&<UpgradeModal onClose={()=>setShowUpgrade(false)} onUpgrade={p=>{setPlan(p);showToast(`Upgraded to ${p.charAt(0).toUpperCase()+p.slice(1)} plan! 🎉`);}} user={user}/>}
    {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
