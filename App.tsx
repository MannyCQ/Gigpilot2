/*
██████╗ ██╗ ██████╗ ██████╗ ██╗██╗      ██████╗ ████████╗     █████╗ ██╗
██╔════╝ ██║██╔════╝ ██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝    ██╔══██╗██║
██║  ███╗██║██║  ███╗██████╔╝██║██║     ██║   ██║   ██║       ███████║██║
██║   ██║██║██║   ██║██╔═══╝ ██║██║     ██║   ██║   ██║       ██╔══██║██║
╚██████╔╝██║╚██████╔╝██║     ██║███████╗╚██████╔╝   ██║       ██║  ██║██║
 ╚═════╝ ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝       ╚═╝  ╚═╝╚═╝

COMPLETE PRODUCTION SAAS — LONDON MUSIC BOOKING ASSISTANT
==========================================================

ENVIRONMENT VARIABLES (set in Vercel → Settings → Environment Variables):

  VITE_SUPABASE_URL          Your Supabase project URL
  VITE_SUPABASE_ANON_KEY     Your Supabase anon/public key
  VITE_ANTHROPIC_KEY         Your Anthropic API key
  VITE_STRIPE_PUBLISHABLE_KEY  Your Stripe publishable key (pk_live_...)

  Server-side (for api/ routes):
  RESEND_API_KEY             Your Resend API key
  STRIPE_SECRET_KEY          Your Stripe secret key (sk_live_...)
  STRIPE_WEBHOOK_SECRET      Your Stripe webhook signing secret

SUPABASE SETUP:
  1. Go to supabase.com → New project
  2. SQL Editor → paste contents of SUPABASE_SETUP.sql → Run
  3. Authentication → Providers → Google → Enable
     Add your Google OAuth credentials (from console.cloud.google.com)
  4. Authentication → URL Configuration:
     Site URL: https://your-vercel-app.vercel.app
     Redirect URLs: https://your-vercel-app.vercel.app/**

STRIPE SETUP:
  1. stripe.com → Products → Add product
     "Artist Plan" → £15/month recurring → copy Price ID → VITE_STRIPE_ARTIST_PRICE_ID
     "Pro Plan" → £39/month recurring → copy Price ID → VITE_STRIPE_PRO_PRICE_ID
  2. Developers → Webhooks → Add endpoint
     URL: https://your-vercel-app.vercel.app/api/stripe-webhook
     Events: checkout.session.completed, customer.subscription.deleted

RESEND SETUP:
  1. resend.com → API Keys → Create key → RESEND_API_KEY
  2. Domains → Add domain → verify DNS
  3. Update FROM_EMAIL below with your verified domain

*/

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CFG = {
  supabaseUrl:  (import.meta as any).env?.VITE_SUPABASE_URL        || "",
  supabaseKey:  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY   || "",
  anthropicKey: (import.meta as any).env?.VITE_ANTHROPIC_KEY        || "",
  stripeKey:    (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || "",
  artistPriceId:(import.meta as any).env?.VITE_STRIPE_ARTIST_PRICE_ID || "price_artist_gbp",
  proPriceId:   (import.meta as any).env?.VITE_STRIPE_PRO_PRICE_ID   || "price_pro_gbp",
  fromEmail:    "bookings@gigpilot.co.uk", // Update after verifying domain in Resend
};

const DEMO = !CFG.supabaseUrl;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface User { id: string; email: string; name: string; provider: string; }
interface Profile {
  artistName: string; area: string; genre: string;
  similarArtists: string; bio: string;
  spotify: string; soundcloud: string; instagram: string; website: string;
}
interface Venue {
  id: number; name: string; area: string; borough: string;
  capacity: number | null; genres: string[]; tier: string;
  email: string; website: string; description: string; phone?: string;
  score?: number; reason?: string; genreMatch?: string; locMatch?: string;
}
interface OutreachEntry {
  id: string; venueId: number; venue: string; area: string;
  date: string; status: "sent"|"replied"|"booked"|"no_response";
  subject: string; body: string; notes: string;
}
type Plan = "free"|"artist"|"pro";
type Screen = "landing"|"auth"|"onboarding"|"app";
type Page = "dashboard"|"discover"|"outreach"|"venues"|"account";
type ToastType = "ok"|"err"|"info";

// ─────────────────────────────────────────────────────────────────────────────
// LONDON VENUES DATABASE — 65 real UK London music venues
// ─────────────────────────────────────────────────────────────────────────────

const VENUES: Venue[] = [
  // ── ICONIC / LEGENDARY ────────────────────────────────────────────────────
  { id:1,  name:"100 Club",                  area:"Oxford Street",   borough:"Westminster",    capacity:350,  genres:["jazz","blues","punk","indie","rock","swing"],            tier:"iconic",    email:"info@the100club.co.uk",          website:"the100club.co.uk",          description:"One of the world's most historic live music venues, open since 1942. Hosted the Sex Pistols, The Who and countless jazz legends." },
  { id:2,  name:"Ronnie Scott's Jazz Club",  area:"Soho",            borough:"Westminster",    capacity:200,  genres:["jazz","blues","soul","funk","fusion","bebop"],          tier:"iconic",    email:"bookings@ronniescotts.co.uk",     website:"ronniescotts.co.uk",        description:"World-famous jazz club in the heart of Soho since 1959. Arguably the most prestigious jazz room in Europe." },
  { id:3,  name:"The Marquee Club",          area:"Soho",            borough:"Westminster",    capacity:700,  genres:["rock","indie","metal","alternative","blues rock"],      tier:"iconic",    email:"bookings@marqueeclub.com",        website:"marqueeclub.com",           description:"Legendary venue that launched The Rolling Stones, Jimi Hendrix and David Bowie. Reopened in Soho with a rich history." },
  { id:4,  name:"606 Club",                  area:"Chelsea",         borough:"Kensington",    capacity:120,  genres:["jazz","soul","blues","funk","latin"],                   tier:"iconic",    email:"info@606club.co.uk",             website:"606club.co.uk",             description:"Chelsea's underground jazz gem. Strictly live music every single night with some of the UK's finest jazz musicians." },
  { id:5,  name:"Pizza Express Jazz Club",   area:"Soho",            borough:"Westminster",    capacity:120,  genres:["jazz","soul","funk","blues","fusion","latin"],          tier:"specialist",email:"jazz@pizzaexpress.com",           website:"pizzaexpresslive.com",      description:"Beloved basement jazz venue beneath a Soho pizzeria. One of London's most intimate and atmospheric jazz rooms." },

  // ── GRASSROOTS — EAST LONDON ──────────────────────────────────────────────
  { id:6,  name:"Cafe Oto",                  area:"Dalston",         borough:"Hackney",       capacity:120,  genres:["experimental","noise","free jazz","electronic","avant-garde","drone"], tier:"grassroots", email:"info@cafeoto.co.uk",    website:"cafeoto.co.uk",             description:"Internationally celebrated hub for experimental and adventurous music. Artists from all over the world make Cafe Oto a pilgrimage." },
  { id:7,  name:"Vortex Jazz Club",          area:"Dalston",         borough:"Hackney",       capacity:120,  genres:["jazz","experimental","world","free jazz","contemporary"], tier:"grassroots", email:"info@vortexjazz.co.uk",  website:"vortexjazz.co.uk",          description:"Premier destination for contemporary and experimental jazz. Nurtures new voices alongside established names." },
  { id:8,  name:"Moth Club",                 area:"Hackney",         borough:"Hackney",       capacity:300,  genres:["indie","alternative","electronic","experimental","pop","art pop"], tier:"grassroots", email:"bookings@mothclub.co.uk", website:"mothclub.co.uk",        description:"Stunning art deco ballroom in Hackney with exceptional sound. A firm favourite for adventurous indie and alternative bookings." },
  { id:9,  name:"Oslo Hackney",              area:"Hackney Central", borough:"Hackney",       capacity:250,  genres:["indie","electronic","pop","r&b","alternative","hip-hop"], tier:"grassroots", email:"music@oslohackney.com",   website:"oslohackney.com",           description:"Stylish multi-room venue above Hackney Central station. Known for breaking emerging artists across genres." },
  { id:10, name:"Birthdays",                 area:"Dalston",         borough:"Hackney",       capacity:200,  genres:["electronic","indie","alternative","post-punk","experimental","techno"], tier:"grassroots", email:"bookings@birthdays-bar.co.uk", website:"birthdays-bar.co.uk", description:"Dalston's coolest small venue for cutting-edge underground music. Raw, unpretentious and beloved." },
  { id:11, name:"Paper Dress Vintage",       area:"Hackney",         borough:"Hackney",       capacity:100,  genres:["indie","pop","electronic","alternative","art pop","queer"], tier:"grassroots", email:"events@paperdressvintage.co.uk", website:"paperdressvintage.co.uk", description:"Boutique vintage shop by day, eclectic music venue by night. Known for curated, creative programming." },
  { id:12, name:"The Sebright Arms",         area:"Bethnal Green",   borough:"Tower Hamlets", capacity:200,  genres:["indie","alternative","experimental","art rock","post-punk","noise"], tier:"grassroots", email:"gigs@sebrightarms.co.uk", website:"sebrightarms.co.uk",       description:"Beloved East London institution for emerging and DIY artists. Unpretentious, community-driven and creatively vital." },
  { id:13, name:"The Jago",                  area:"Stoke Newington", borough:"Hackney",       capacity:180,  genres:["indie","alternative","electronic","post-punk","dream pop","shoegaze"], tier:"grassroots", email:"bookings@thejago.com", website:"thejago.com",              description:"Stoke Newington's underground favourite with a loyal local following. Great for atmospheric, left-of-centre sounds." },
  { id:14, name:"Passing Clouds",            area:"Dalston",         borough:"Hackney",       capacity:200,  genres:["world","reggae","jazz","soul","folk","afrobeat","electronic"], tier:"grassroots", email:"events@passingclouds.org", website:"passingclouds.org",        description:"Vibrant community arts space celebrating diversity. One of London's most welcoming and eclectic venues." },

  // ── GRASSROOTS — SOUTH LONDON ─────────────────────────────────────────────
  { id:15, name:"The Windmill Brixton",      area:"Brixton",         borough:"Lambeth",       capacity:150,  genres:["indie","punk","alternative","experimental","post-punk","noise rock"], tier:"grassroots", email:"bookings@windmillbrixton.co.uk", website:"windmillbrixton.co.uk", description:"The spiritual home of London DIY music. Every major indie and punk act of the last decade has played here." },
  { id:16, name:"Hootananny Brixton",        area:"Brixton",         borough:"Lambeth",       capacity:400,  genres:["reggae","world","folk","acoustic","indie","ska","dub"],  tier:"grassroots", email:"gigs@hootanannybrixton.co.uk",   website:"hootanannybrixton.co.uk",   description:"Vibrant Brixton venue celebrating global music. Three floors, three bars, and reggae roots running deep." },
  { id:17, name:"The Half Moon Putney",      area:"Putney",          borough:"Wandsworth",    capacity:200,  genres:["blues","rock","indie","americana","folk","country","roots"], tier:"grassroots", email:"bookings@halfmoon.co.uk",      website:"halfmoon.co.uk",            description:"Historic South West London venue with over 50 years of live music heritage. Launched countless careers." },
  { id:18, name:"The Amersham Arms",         area:"New Cross",       borough:"Lewisham",      capacity:150,  genres:["indie","punk","alternative","folk","acoustic","emo"],    tier:"grassroots", email:"gigs@amershamarms.co.uk",        website:"amershamarms.co.uk",        description:"New Cross institution loved by students and musicians alike. Genuinely DIY and community-spirited." },
  { id:19, name:"The Birds Nest",            area:"Deptford",        borough:"Lewisham",      capacity:150,  genres:["folk","acoustic","singer-songwriter","indie","bluegrass","country"], tier:"grassroots", email:"music@birdsnestpub.co.uk", website:"birdsnestpub.co.uk",       description:"Deptford's favourite acoustic music spot. Warm, unpretentious, and reliably great programming." },
  { id:20, name:"The Ivy House",             area:"Nunhead",         borough:"Southwark",     capacity:120,  genres:["folk","acoustic","jazz","blues","singer-songwriter","roots"], tier:"grassroots", email:"music@ivyhousenunhead.com",    website:"ivyhousenunhead.com",       description:"Community-owned pub with a strong tradition of folk and acoustic music nights." },

  // ── GRASSROOTS — NORTH LONDON ─────────────────────────────────────────────
  { id:21, name:"Nambucca",                  area:"Holloway",        borough:"Islington",     capacity:200,  genres:["rock","punk","indie","metal","hardcore","emo"],          tier:"grassroots", email:"bookings@nambucca.co.uk",        website:"nambucca.co.uk",            description:"North London's beloved rock and punk institution. Raw, loud and utterly unpretentious." },
  { id:22, name:"The Boston Arms",           area:"Tufnell Park",    borough:"Islington",     capacity:250,  genres:["indie","rock","punk","alternative","pop","folk rock"],   tier:"grassroots", email:"music@thebostonarms.com",        website:"thebostonarms.com",         description:"Iconic North London venue with a rich musical pedigree and a loyal local crowd." },
  { id:23, name:"The Boogaloo",              area:"Highgate",        borough:"Haringey",      capacity:150,  genres:["americana","country","folk","rock","singer-songwriter","roots"], tier:"specialist", email:"bookings@theboogaloo.co.uk", website:"theboogaloo.co.uk",        description:"North London's spiritual home of Americana and roots music. Intimate and always excellent." },
  { id:24, name:"The Unicorn",               area:"Camden",          borough:"Camden",        capacity:100,  genres:["folk","acoustic","singer-songwriter","blues","roots","country"], tier:"grassroots", email:"music@theunicorncamden.co.uk", website:"theunicorncamden.co.uk",  description:"Intimate Camden local for acoustic and folk. The crowd is attentive and the vibe is magical." },
  { id:25, name:"The Star of Kings",         area:"Kings Cross",     borough:"Islington",     capacity:180,  genres:["indie","alternative","electronic","post-punk","experimental"], tier:"grassroots", email:"bookings@starofkings.co.uk",  website:"starofkings.co.uk",         description:"Atmospheric Kings Cross venue with moody lighting and a taste for the unconventional." },

  // ── GRASSROOTS — WEST LONDON ──────────────────────────────────────────────
  { id:26, name:"The Finsbury",              area:"Finsbury Park",   borough:"Islington",     capacity:200,  genres:["indie","rock","folk","alternative","singer-songwriter","pop"], tier:"grassroots", email:"gigs@thefinsbury.co.uk",      website:"thefinsbury.co.uk",         description:"Community pub venue with a reputation for giving emerging artists a real platform." },
  { id:27, name:"The Lexington",             area:"Angel",           borough:"Islington",     capacity:200,  genres:["indie","alternative","americana","country","folk rock","psychedelic"], tier:"grassroots", email:"bookings@thelexington.co.uk", website:"thelexington.co.uk",      description:"Americana-inspired bar and music venue that punches well above its weight for bookings." },
  { id:28, name:"The Harrison",              area:"Kings Cross",     borough:"Islington",     capacity:120,  genres:["singer-songwriter","folk","indie","acoustic","jazz","classical"], tier:"grassroots", email:"bookings@harrisonbar.co.uk", website:"harrisonbar.co.uk",       description:"Charming pub venue near Kings Cross with a long history of nurturing songwriters and performers." },
  { id:29, name:"Spice of Life",             area:"Soho",            borough:"Westminster",   capacity:100,  genres:["jazz","folk","indie","singer-songwriter","acoustic","blues"], tier:"specialist", email:"music@spiceoflifesoho.com",   website:"spiceoflifesoho.com",       description:"Historic Soho pub with a wonderfully eclectic live music policy. Totally unpretentious." },
  { id:30, name:"The Fighting Cocks",        area:"Kingston",        borough:"Kingston",      capacity:200,  genres:["metal","rock","punk","hardcore","indie","alternative"],    tier:"grassroots", email:"bookings@fightingcocksmusic.co.uk", website:"fightingcocksmusic.co.uk", description:"Kingston's leading rock and metal venue, deeply embedded in the local music community." },

  // ── MID-SIZE ──────────────────────────────────────────────────────────────
  { id:31, name:"Jazz Cafe",                 area:"Camden",          borough:"Camden",        capacity:440,  genres:["jazz","soul","hip-hop","funk","r&b","neo-soul","afrobeat"], tier:"mid",       email:"bookings@jazzcafelondon.com",    website:"jazzcafelondon.com",        description:"Camden's iconic venue bridging classic jazz with contemporary urban sounds. One of London's most important stages." },
  { id:32, name:"Electric Brixton",          area:"Brixton",         borough:"Lambeth",       capacity:1400, genres:["electronic","pop","indie","alternative","dance","house","grime"], tier:"mid",  email:"bookings@electricbrixton.com",   website:"electricbrixton.com",       description:"Stunning art deco venue and one of South London's finest. Recently refurbished and sounding better than ever." },
  { id:33, name:"Scala Kings Cross",         area:"Kings Cross",     borough:"Islington",     capacity:1100, genres:["electronic","indie","alternative","rock","hip-hop","metal"], tier:"mid",     email:"bookings@scala.co.uk",           website:"scala.co.uk",               description:"Grand Victorian building transformed into one of London's best-loved live music spaces." },
  { id:34, name:"Underworld Camden",         area:"Camden",          borough:"Camden",        capacity:500,  genres:["metal","rock","punk","hardcore","alternative","industrial"], tier:"mid",      email:"bookings@theunderworldcamden.co.uk", website:"theunderworldcamden.co.uk", description:"Camden's premier destination for heavy music. Dark, loud and perfectly calibrated for the underground." },
  { id:35, name:"Koko",                      area:"Camden",          borough:"Camden",        capacity:1500, genres:["pop","indie","rock","electronic","alternative","r&b"],     tier:"mid",       email:"bookings@koko.uk.com",           website:"koko.uk.com",               description:"Spectacular Grade II listed Victorian theatre. Newly restored to its former glory, one of London's crown jewels." },
  { id:36, name:"The Garage",                area:"Highbury",        borough:"Islington",     capacity:600,  genres:["indie","rock","alternative","punk","electronic","grunge"], tier:"mid",      email:"bookings@thegarage.co.uk",       website:"thegarage.co.uk",           description:"North London's favourite mid-size venue with a legendary atmosphere and decades of history." },
  { id:37, name:"Omeara London",             area:"London Bridge",   borough:"Southwark",     capacity:300,  genres:["indie","soul","r&b","electronic","pop","alternative","funk"], tier:"mid",    email:"bookings@omearalondon.com",      website:"omearalondon.com",          description:"Perfectly intimate railway arch venue run by Mercury Prize-winning artist Ben Howard's team." },
  { id:38, name:"Village Underground",       area:"Shoreditch",      borough:"Hackney",       capacity:700,  genres:["electronic","indie","alternative","experimental","pop","techno"], tier:"mid",  email:"bookings@villageunderground.co.uk", website:"villageunderground.co.uk",  description:"Built from recycled London Underground carriages. One of Shoreditch's most iconic and beloved venues." },
  { id:39, name:"Cargo",                     area:"Shoreditch",      borough:"Hackney",       capacity:600,  genres:["electronic","indie","house","techno","alternative","disco"], tier:"mid",     email:"bookings@cargo-london.com",      website:"cargo-london.com",          description:"Iconic Shoreditch venue under the railway arches. Multiple spaces and a real London institution." },
  { id:40, name:"EartH Hackney",             area:"Hackney",         borough:"Hackney",       capacity:2000, genres:["indie","electronic","world","alternative","experimental","folk"], tier:"mid",  email:"bookings@earthackney.co.uk",     website:"earthackney.co.uk",         description:"Magnificent art deco former cinema now championing independent music on a grand scale." },
  { id:41, name:"Bush Hall",                 area:"Shepherd's Bush", borough:"Hammersmith",   capacity:350,  genres:["indie","folk","pop","singer-songwriter","alternative","chamber pop"], tier:"mid",  email:"bookings@bushhall.co.uk",      website:"bushhall.co.uk",            description:"Ornate Edwardian ballroom with chandeliers and perfect acoustics. Intimate despite its grandeur." },
  { id:42, name:"Shapes",                    area:"Hackney Wick",    borough:"Hackney",       capacity:600,  genres:["electronic","techno","house","experimental","dance","drum and bass"], tier:"mid", email:"bookings@shapeslondon.com",   website:"shapeslondon.com",          description:"Hackney Wick's creative hub in a converted warehouse. Exceptional sound system and late licensing." },
  { id:43, name:"Tufnell Park Dome",         area:"Tufnell Park",    borough:"Islington",     capacity:400,  genres:["indie","rock","alternative","metal","punk","grunge"],     tier:"mid",       email:"bookings@thetufnellparkdome.com", website:"thetufnellparkdome.com",  description:"North London's historic dome. A proper rock venue with excellent production values." },
  { id:44, name:"The Islington",             area:"Angel",           borough:"Islington",     capacity:200,  genres:["indie","alternative","electronic","pop","r&b","soul"],    tier:"grassroots",email:"bookings@theislington.com",      website:"theislington.com",          description:"Sleek underground venue in Angel. Focus on breaking new artists with strong promotion behind each show." },
  { id:45, name:"Servant Jazz Quarters",     area:"Dalston",         borough:"Hackney",       capacity:100,  genres:["jazz","soul","funk","r&b","neo-soul","afrobeat"],          tier:"specialist",email:"book@servantjazzquarters.com",    website:"servantjazzquarters.com",   description:"Intimate basement jazz bar in Dalston. The perfect room for soulful, groovy sounds." },

  // ── MID-SIZE / SPECIALIST (continued) ────────────────────────────────────
  { id:46, name:"Iklectik Art Lab",          area:"Waterloo",        borough:"Lambeth",       capacity:150,  genres:["experimental","improvised","electronic","contemporary classical","world"], tier:"specialist", email:"info@iklectikartlab.com", website:"iklectikartlab.com",        description:"Converted railway arch arts space with a fearless programming ethos. Beloved by the avant-garde community." },
  { id:47, name:"Rich Mix",                  area:"Shoreditch",      borough:"Tower Hamlets", capacity:200,  genres:["world","jazz","folk","indie","spoken word","experimental"], tier:"mid",     email:"music@richmix.org.uk",           website:"richmix.org.uk",            description:"Multicultural arts centre with excellent live music programming and a diverse, engaged audience." },
  { id:48, name:"The Victoria",              area:"Dalston",         borough:"Hackney",       capacity:150,  genres:["indie","folk","singer-songwriter","acoustic","alternative","country"], tier:"grassroots", email:"book@thevictoriamusic.com", website:"thevictoriamusic.com",    description:"Cosy, friendly pub venue with a warm atmosphere. Reliably good bookings and an engaged crowd." },
  { id:49, name:"The Lexington (Basement)",  area:"Angel",           borough:"Islington",     capacity:80,   genres:["country","americana","folk","singer-songwriter","roots"],  tier:"specialist",email:"bookings@thelexington.co.uk",   website:"thelexington.co.uk",        description:"The intimate basement room of The Lexington. Legendary for country and Americana in London." },
  { id:50, name:"Total Refreshment Centre", area:"Stoke Newington",  borough:"Hackney",       capacity:120,  genres:["jazz","soul","funk","experimental","electronic","afrobeat"], tier:"specialist",email:"info@totalrefreshmentcentre.com", website:"totalrefreshmentcentre.com", description:"Independent arts venue and recording space. Champions the new wave of UK jazz and soul." },

  // ── LARGE / MAJOR ─────────────────────────────────────────────────────────
  { id:51, name:"O2 Academy Brixton",        area:"Brixton",         borough:"Lambeth",       capacity:4921, genres:["rock","pop","indie","electronic","hip-hop","r&b","dance"], tier:"large",    email:"bookings@o2academybrixton.co.uk", website:"o2academybrixton.co.uk",   description:"London's most iconic large venue. The Brixton Academy atmosphere is unlike anywhere else on earth." },
  { id:52, name:"O2 Forum Kentish Town",     area:"Kentish Town",    borough:"Camden",        capacity:2300, genres:["indie","rock","pop","electronic","alternative","hip-hop"], tier:"large",    email:"bookings@o2forumkentishtown.co.uk", website:"o2forumkentishtown.co.uk", description:"North London's leading large venue. Beautiful Victorian architecture and superb production." },
  { id:53, name:"The Roundhouse",            area:"Camden",          borough:"Camden",        capacity:3300, genres:["rock","indie","pop","electronic","alternative","world","classical"], tier:"large",  email:"bookings@roundhouse.org.uk",    website:"roundhouse.org.uk",         description:"Grade II listed Victorian engine shed. One of the world's truly great concert spaces." },
  { id:54, name:"Eventim Apollo",            area:"Hammersmith",     borough:"Hammersmith",   capacity:5039, genres:["pop","rock","indie","soul","r&b","comedy","country"],     tier:"large",    email:"bookings@eventimapollo.com",     website:"eventimapollo.com",         description:"Art deco masterpiece. One of London's most beautiful and atmospheric large venues." },
  { id:55, name:"Alexandra Palace",          area:"Wood Green",      borough:"Haringey",      capacity:10000,genres:["pop","rock","electronic","indie","hip-hop","dance","metal"], tier:"large",  email:"events@alexandrapalace.com",     website:"alexandrapalace.com",       description:"Magnificent Victorian palace with breathtaking panoramic views over London. An unforgettable venue." },
  { id:56, name:"Barbican Centre",           area:"Barbican",        borough:"City",          capacity:1949, genres:["classical","jazz","world","experimental","electronic","contemporary"], tier:"large", email:"boxoffice@barbican.org.uk",   website:"barbican.org.uk",           description:"World-class arts centre in the City. One of Europe's most prestigious and adventurous programming institutions." },
  { id:57, name:"Cadogan Hall",              area:"Chelsea",         borough:"Kensington",    capacity:950,  genres:["classical","jazz","folk","acoustic","singer-songwriter","world"], tier:"large", email:"info@cadoganhall.com",         website:"cadoganhall.com",           description:"Elegant Chelsea concert hall. Superb acoustics and a beautiful setting for more refined performances." },

  // ── MORE GRASSROOTS / DIVERSE ─────────────────────────────────────────────
  { id:58, name:"Thousand Island",           area:"Peckham",         borough:"Southwark",     capacity:200,  genres:["jazz","soul","r&b","neo-soul","funk","hip-hop","afrobeat"], tier:"grassroots", email:"info@thousandisland.co.uk", website:"thousandisland.co.uk",       description:"Peckham's lively music and arts bar. Part of South London's thriving jazz and soul scene." },
  { id:59, name:"Bussey Building",           area:"Peckham",         borough:"Southwark",     capacity:500,  genres:["electronic","indie","alternative","house","techno","pop"], tier:"mid",     email:"bookings@busseybuilding.com",    website:"busseybuilding.com",        description:"Multi-storey warehouse venue in the heart of Peckham's creative district. Exceptional atmosphere." },
  { id:60, name:"The Montague Arms",         area:"New Cross",       borough:"Lewisham",      capacity:150,  genres:["folk","punk","indie","acoustic","experimental","metal"],   tier:"grassroots", email:"music@montaguearms.com",     website:"montaguearms.com",          description:"Eccentric and beloved New Cross pub with decades of eclectic live music history." },
  { id:61, name:"Ronnie's Bar (Upstairs)",   area:"Soho",            borough:"Westminster",   capacity:60,   genres:["jazz","acoustic","soul","blues","singer-songwriter"],      tier:"specialist",email:"upstairs@ronniescotts.co.uk",    website:"ronniescotts.co.uk",        description:"The intimate upstairs room at the legendary Ronnie Scott's. Perfect for emerging jazz artists." },
  { id:62, name:"Dalston Jazz Bar",          area:"Dalston",         borough:"Hackney",       capacity:80,   genres:["jazz","soul","blues","funk","afrobeat","latin"],           tier:"specialist",email:"info@dalstonjazz.co.uk",          website:"dalstonjazz.co.uk",         description:"Late-night Dalston jazz bar with a commitment to live music every weekend." },
  { id:63, name:"The Victoria Dalston",      area:"Dalston",         borough:"Hackney",       capacity:200,  genres:["indie","electronic","alternative","pop","r&b","grime"],   tier:"grassroots",email:"bookings@victoriandalston.com",  website:"victoriandalston.com",      description:"Central Dalston venue with a broad musical taste and a young, energetic crowd." },
  { id:64, name:"Corsica Studios",           area:"Elephant and Castle", borough:"Southwark", capacity:400,  genres:["electronic","techno","house","experimental","noise","industrial"], tier:"mid", email:"bookings@corsicastudios.com",  website:"corsicastudios.com",        description:"Underground arts club in tunnels beneath Elephant & Castle. Legendary for underground electronic music." },
  { id:65, name:"Bermondsey Social Club",    area:"Bermondsey",      borough:"Southwark",     capacity:200,  genres:["electronic","house","disco","soul","funk","jazz"],         tier:"grassroots",email:"bookings@bermondseysc.com",       website:"bermondseysc.com",          description:"Converted Bermondsey railway arch. Warm, eclectic and beloved by the local music community." },
];

// ─────────────────────────────────────────────────────────────────────────────
// PLAN CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PLANS = {
  free:   { name:"Free",   price:0,  matchLimit:5,  emailLimit:3,  label:"£0/month",   color:"var(--muted)" },
  artist: { name:"Artist", price:15, matchLimit:999, emailLimit:50, label:"£15/month", color:"var(--orangeHi)"  },
  pro:    { name:"Pro",    price:39, matchLimit:999, emailLimit:999,label:"£39/month", color:"var(--green)"   },
};


// ─────────────────────────────────────────────────────────────────────────────
// STYLES — Deep charcoal + warm orange, Space Grotesk + DM Sans
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&display=swap');

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #0f0d0b;
  --surface:   #161310;
  --card:      #1c1815;
  --card2:     #221e1a;
  --border:    #2d2721;
  --border2:   #3a332b;
  --orange:    #c2580a;
  --orange2:   #e06b12;
  --orangeHi:  #f5a623;
  --orangeDim: rgba(194,88,10,.12);
  --orangeGlow:rgba(194,88,10,.22);
  --green:     #4ade80;
  --greenDim:  rgba(74,222,128,.1);
  --red:       #f87171;
  --redDim:    rgba(248,113,113,.1);
  --blue:      #93c5fd;
  --blueDim:   rgba(147,197,253,.1);
  --text:      #ede8e1;
  --text2:     #8a7f74;
  --text3:     #4a443d;
  --fd: 'Space Grotesk', sans-serif;
  --fb: 'DM Sans', sans-serif;
  --r: 10px; --r2: 14px; --r3: 20px;
  --shadow: 0 2px 8px rgba(0,0,0,.5);
  --shadow-md: 0 4px 16px rgba(0,0,0,.5);
  --shadow-lg: 0 8px 32px rgba(0,0,0,.6);
  --shadow-glow: 0 0 32px rgba(194,88,10,.25);
  --gradient-primary: linear-gradient(135deg, #c2580a, #e06b12);
}

html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--fb);
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}
h1,h2,h3,h4,h5 {
  font-family: var(--fd);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
a { color: inherit; text-decoration: none; }
button { cursor: pointer; font-family: var(--fb); letter-spacing: -0.01em; }
input, textarea, select { font-family: var(--fb); letter-spacing: -0.01em; }

::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px 20px; border-radius: var(--r); font-family: var(--fd);
  font-size: 13px; font-weight: 600; border: none; transition: all .18s;
  white-space: nowrap; letter-spacing: -0.01em; cursor: pointer;
}
.btn-primary {
  background: var(--gradient-primary);
  color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.4);
}
.btn-primary:hover {
  filter: brightness(1.12);
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}
.btn-outline {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border2);
}
.btn-outline:hover { border-color: var(--orange2); color: var(--orangeHi); }
.btn-ghost { background: transparent; color: var(--text2); padding: 8px 14px; border: none; }
.btn-ghost:hover { color: var(--text); background: rgba(255,255,255,.04); }
.btn-danger { background: var(--redDim); color: var(--red); border: 1px solid rgba(248,113,113,.2); }
.btn-danger:hover { background: rgba(248,113,113,.18); }
.btn-sm { padding: 6px 14px; font-size: 12px; }
.btn-lg { padding: 13px 32px; font-size: 15px; }
.btn-xl { padding: 16px 44px; font-size: 15px; }
.btn-block { width: 100%; }
.btn:disabled { opacity: .35; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

/* ── Inputs ── */
.field { display: flex; flex-direction: column; gap: 5px; }
.label {
  font-size: 11px; font-weight: 600; color: var(--text3);
  text-transform: uppercase; letter-spacing: .08em; font-family: var(--fd);
}
.inp {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 11px 13px; color: var(--text);
  font-size: 14px; outline: none; width: 100%;
  transition: border-color .15s, box-shadow .15s;
}
.inp:focus { border-color: var(--orange); box-shadow: 0 0 0 3px var(--orangeDim); }
.inp::placeholder { color: var(--text3); }
textarea.inp { resize: vertical; min-height: 80px; }
select.inp {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%234a443d' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 13px center; padding-right: 34px;
}

/* ── Cards ── */
.card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r2); padding: 22px;
  box-shadow: var(--shadow);
}
.card-hover {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.card2 { background: var(--card2); border: 1px solid var(--border); border-radius: var(--r); padding: 14px; }

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 9px; border-radius: 99px;
  font-size: 10px; font-weight: 600; font-family: var(--fd);
  letter-spacing: .04em; text-transform: uppercase; white-space: nowrap;
}
.b-orange { background: var(--orangeDim); color: var(--orangeHi); }
.b-green  { background: var(--greenDim);  color: var(--green); }
.b-red    { background: var(--redDim);    color: var(--red); }
.b-blue   { background: var(--blueDim);   color: var(--blue); }
.b-muted  { background: rgba(255,255,255,.05); color: var(--text2); }
.tag { display:inline-block; background: rgba(255,255,255,.04); color: var(--text2); border-radius:6px; padding:2px 8px; font-size:11px; margin:2px; }

/* ── Layout ── */
.shell { display: flex; min-height: 100vh; }
.sidebar {
  width: 224px; flex-shrink: 0;
  background: var(--surface); border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
}
.main { flex: 1; overflow-y: auto; min-height: 100vh; }
.page { padding: 40px; max-width: 1100px; }

/* ── Sidebar nav ── */
.logo { padding: 24px 18px 18px; font-family: var(--fd); font-size: 18px; font-weight: 700; letter-spacing: -0.03em; }
.logo em { color: var(--orangeHi); font-style: normal; }
.logo small { display:block; font-size:10px; font-weight:400; color:var(--text3); letter-spacing:.04em; margin-top:3px; font-family:var(--fb); }
.nav-sect { padding: 10px 16px 4px; font-size: 9px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: .1em; font-family: var(--fd); }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; margin: 1px 8px; width: calc(100% - 16px);
  color: var(--text2); border-radius: var(--r); background: none;
  border: none; text-align: left; font-size: 13px; font-weight: 500;
  font-family: var(--fb); transition: all .13s; cursor: pointer;
  letter-spacing: -0.01em;
}
.nav-item:hover { color: var(--text); background: rgba(255,255,255,.04); }
.nav-item.active { color: var(--orangeHi); background: var(--orangeDim); font-weight: 600; }
.nav-item .ni { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }
.nav-divider { border: none; border-top: 1px solid var(--border); margin: 8px 16px; }

/* ── Page header ── */
.ph { margin-bottom: 28px; }
.ph h1 { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
.ph p { color: var(--text2); font-size: 14px; }

/* ── Grids ── */
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 13px; }

/* ── Stats ── */
.stat {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r2); padding: 20px 22px;
  box-shadow: var(--shadow);
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}
.stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.stat-n { font-family: var(--fd); font-size: 30px; font-weight: 700; line-height: 1; letter-spacing: -0.03em; }
.stat-l { color: var(--text2); font-size: 12px; margin-top: 5px; font-weight: 500; }
.stat-d { font-size: 11px; margin-top: 4px; color: var(--text3); }

/* ── Venue card ── */
.vcard {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--r2); padding: 18px; display: flex;
  gap: 14px; align-items: flex-start;
  transition: border-color .18s, transform .18s, box-shadow .18s;
  box-shadow: var(--shadow);
}
.vcard:hover { border-color: rgba(194,88,10,.3); transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.score-ring {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--fd); font-weight: 700; font-size: 14px; flex-shrink: 0;
}

/* ── Modals ── */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.8);
  backdrop-filter: blur(12px); display: flex; align-items: center;
  justify-content: center; z-index: 1000; padding: 20px;
  animation: fadeIn .18s ease;
}
.modal {
  background: var(--card); border: 1px solid var(--border2);
  border-radius: var(--r3); width: 100%; max-width: 500px;
  max-height: 90vh; overflow-y: auto; padding: 32px;
  position: relative; animation: slideUp .22s ease;
  box-shadow: var(--shadow-lg);
}
.modal-x {
  position: absolute; top: 16px; right: 16px; width: 28px; height: 28px;
  background: var(--border); border: none; color: var(--text2);
  border-radius: 7px; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all .13s;
}
.modal-x:hover { color: var(--text); background: var(--border2); }

/* ── Toast ── */
.toast {
  position: fixed; bottom: 22px; right: 22px;
  background: var(--card2); border: 1px solid var(--border2);
  border-radius: 12px; padding: 13px 18px; font-size: 13px;
  z-index: 2000; display: flex; align-items: center; gap: 10px;
  box-shadow: var(--shadow-lg); animation: slideUp .25s ease; max-width: 340px;
}

/* ── Animations ── */
.animate-fade-in { animation: fadeIn 0.4s ease-out both; }
.animate-slide-up { animation: slideUp 0.5s ease-out both; }
.fade { animation: fadeIn .25s ease; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

/* ── Shimmer / skeleton ── */
.shimmer {
  background: linear-gradient(90deg, var(--card) 25%, var(--border) 50%, var(--card) 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--r);
}

/* ── Progress bar ── */
.pbar { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
.pfill { height: 100%; background: var(--gradient-primary); border-radius: 2px; transition: width .4s ease; }

/* ── Text gradient ── */
.text-gradient {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Onboarding steps ── */
.steps { display: flex; gap: 6px; margin-bottom: 28px; }
.step-dot { height: 2px; flex: 1; background: var(--border); border-radius: 1px; transition: all .25s; }
.step-dot.done { background: var(--green); }
.step-dot.cur  { background: var(--orangeHi); flex: 2; }

/* ── Table ── */
.tbl { width: 100%; border-collapse: collapse; }
.tbl th {
  padding: 10px 14px; text-align: left; color: var(--text3);
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .08em; border-bottom: 1px solid var(--border); font-family: var(--fd);
}
.tbl td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: rgba(255,255,255,.012); }

/* ── Divider ── */
hr.div { border: none; border-top: 1px solid var(--border); margin: 18px 0; }

/* ── Upgrade banner ── */
.up-banner {
  background: linear-gradient(135deg, rgba(194,88,10,.08), rgba(224,107,18,.04));
  border: 1px solid rgba(194,88,10,.2); border-radius: var(--r2);
  padding: 16px 20px; display: flex; align-items: center;
  justify-content: space-between; gap: 14px; margin-bottom: 22px;
  box-shadow: var(--shadow);
}

/* ── Social auth button ── */
.social-btn {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 11px; border-radius: var(--r);
  border: 1px solid var(--border2); background: var(--surface);
  color: var(--text); font-size: 14px; font-weight: 500; cursor: pointer;
  transition: all .15s; font-family: var(--fb);
}
.social-btn:hover { border-color: var(--orange); background: var(--orangeDim); }

/* ── Demo mode ── */
.demo-pill {
  background: rgba(147,197,253,.07); border: 1px solid rgba(147,197,253,.18);
  border-radius: var(--r); padding: 8px 14px; font-size: 12px;
  color: var(--blue); display: flex; align-items: center; gap: 7px;
}

/* ── Landing ── */
.l-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(194,88,10,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(194,88,10,.04) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 70% 55% at 50% 0%, black 20%, transparent 100%);
  pointer-events: none;
}
.l-glow {
  position: absolute; width: 720px; height: 420px; left: 50%; top: -100px;
  background: radial-gradient(ellipse, rgba(194,88,10,.07) 0%, transparent 65%);
  transform: translateX(-50%); pointer-events: none;
}

/* ── Plan sidebar widget ── */
.plan-box { margin: auto 0 0; padding: 14px 10px; }
.plan-inner {
  background: linear-gradient(135deg, var(--orangeDim), transparent);
  border: 1px solid rgba(194,88,10,.18);
  border-radius: var(--r2); padding: 13px;
}

/* ── Animate glow ── */
.animate-glow { box-shadow: var(--shadow-glow); }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .page { padding: 18px 14px; }
  .g2,.g3,.g4 { grid-template-columns: 1fr; }
  .ph h1 { font-size: 20px; }
}

/* ── Mobile bottom nav ── */
.mob-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--surface); border-top: 1px solid var(--border);
  display: none; z-index: 100; padding-bottom: env(safe-area-inset-bottom, 0px);
}
@media (max-width: 768px) { .mob-nav { display: flex; } }
.mob-nav-item {
  flex: 1; padding: 10px 0; background: none; border: none;
  color: var(--text3); display: flex; flex-direction: column;
  align-items: center; gap: 2px; font-size: 9px;
  font-family: var(--fd); font-weight: 600; cursor: pointer;
  letter-spacing: .04em; text-transform: uppercase; transition: color .13s;
}
.mob-nav-item.active { color: var(--orangeHi); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────────────────────────────────────

let sb: any = null;

async function initSB() {
  if (!CFG.supabaseUrl || !CFG.supabaseKey) return null;
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm" as any);
    sb = createClient(CFG.supabaseUrl, CFG.supabaseKey);
    return sb;
  } catch (e) { console.warn("Supabase init failed", e); return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// VENUE MATCHING ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────

function matchVenues(profile: Profile, all: Venue[]): Venue[] {
  const genre   = profile.genre.toLowerCase();
  const area    = profile.area.toLowerCase();
  const similar = profile.similarArtists.toLowerCase();

  return all.map(v => {
    let score = 0;
    const vg = v.genres.map(g => g.toLowerCase());
    const va = v.area.toLowerCase();
    const vb = v.borough.toLowerCase();

    // Location proximity (30 pts max)
    if (area && (va.includes(area.split(",")[0].trim()) || area.includes(va) || vb.includes(area.split(",")[0].trim()))) score += 30;
    else score += 8;

    // Genre matching (45 pts max)
    const gWords = genre.split(/[\s,/&+]+/).filter(g => g.length > 2);
    gWords.forEach(gw => { if (vg.some(x => x.includes(gw) || gw.includes(x))) score += 15; });
    score = Math.min(score, 75); // cap genre contribution

    // Similar artists inference (15 pts max)
    const sWords = similar.split(/[\s,]+/).filter(s => s.length > 3);
    sWords.forEach(sw => { if (vg.some(x => x.includes(sw.slice(0, 4)))) score += 5; });

    // Tier weighting — prefer grassroots/specialist for emerging artists
    if (v.tier === "grassroots") score += 12;
    else if (v.tier === "specialist") score += 10;
    else if (v.tier === "mid") score += 7;
    else if (v.tier === "iconic") score += 5;
    else score += 2; // large

    // Slight randomness for variety
    score += Math.floor(Math.random() * 5) - 2;
    score = Math.max(18, Math.min(99, score));

    const locMatch = (va.includes(area.split(",")[0].trim()) || area.includes(va)) ? "local" : "london-wide";
    const hits = gWords.filter(gw => vg.some(x => x.includes(gw) || gw.includes(x))).length;
    const genreMatch = hits >= 2 ? "high" : hits === 1 ? "medium" : "low";

    const reason = genreMatch === "high" && locMatch === "local"
      ? "Excellent match — strong genre alignment and local to your area."
      : genreMatch === "high"
      ? "Great genre fit for your sound."
      : locMatch === "local"
      ? "Local venue worth targeting as part of your outreach."
      : "Recommended for a wider London campaign.";

    return { ...v, score, reason, genreMatch, locMatch };
  }).sort((a, b) => (b.score! - a.score!));
}

// ─────────────────────────────────────────────────────────────────────────────
// AI EMAIL GENERATION
// ─────────────────────────────────────────────────────────────────────────────

async function generateEmail(profile: Profile, venue: Venue): Promise<{subject:string;body:string}|null> {
  if (!CFG.anthropicKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CFG.anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: `You are a UK music industry professional writing booking enquiry emails for artists approaching London venues. Write professional, warm, and concise emails (under 160 words). Be direct and specific. Never use clichés like "I hope this email finds you well". Sound like a real person, not a template. Return ONLY valid JSON with keys "subject" and "body". No markdown, no preamble.`,
        messages: [{
          role: "user",
          content: `Artist: ${profile.artistName}
Genre: ${profile.genre}
Area: ${profile.area || "London"}
Bio: ${profile.bio || "emerging artist"}
Similar artists: ${profile.similarArtists || "N/A"}
Spotify: ${profile.spotify || "N/A"}
Instagram: ${profile.instagram || "N/A"}
Website: ${profile.website || "N/A"}

Venue: ${venue.name}
Area: ${venue.area}, ${venue.borough}
Genres they book: ${venue.genres.join(", ")}
Description: ${venue.description}

Write a genuine, personalised booking enquiry email. The body should be signed off with the artist's name and include their links naturally. Return JSON only: {"subject":"...","body":"..."}`
        }]
      })
    });
    const d = await res.json();
    const text = d.content?.[0]?.text || "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE
// ─────────────────────────────────────────────────────────────────────────────

async function goStripe(plan: "artist"|"pro", email: string): Promise<boolean> {
  if (!CFG.stripeKey) return false;
  try {
    const { loadStripe } = await import("https://js.stripe.com/v3/" as any);
    const stripe = await loadStripe(CFG.stripeKey);
    const priceId = plan === "artist" ? CFG.artistPriceId : CFG.proPriceId;
    await stripe.redirectToCheckout({
      lineItems: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      successUrl: window.location.origin + "?payment=success&plan=" + plan,
      cancelUrl: window.location.origin + "?payment=cancelled",
      customerEmail: email,
    });
    return true;
  } catch (e) { console.warn("Stripe error:", e); return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND EMAIL via /api/send-email (Resend)
// ─────────────────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, body: string, fromName: string): Promise<boolean> {
  try {
    const r = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body, fromName }),
    });
    return r.ok;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const scoreStyle = (s: number) =>
  s >= 85 ? { bg: "rgba(45,212,191,.15)", c: "#2dd4bf", lbl: "Excellent" }
: s >= 70 ? { bg: "rgba(245,166,35,.15)", c: "#f5a623", lbl: "Good" }
: s >= 55 ? { bg: "rgba(96,165,250,.15)", c: "#60a5fa", lbl: "Fair" }
           : { bg: "rgba(239,68,68,.15)",  c: "#ef4444", lbl: "Low" };

const tierBadge = (t: string) =>
  t === "iconic"     ? { cls: "b-orange", lbl: "Iconic" }
: t === "large"      ? { cls: "b-blue",  lbl: "Major" }
: t === "mid"        ? { cls: "b-blue",  lbl: "Mid-size" }
: t === "specialist" ? { cls: "b-green",  lbl: "Specialist" }
                     : { cls: "b-muted", lbl: "Grassroots" };

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });

const thisMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg:string; type:ToastType; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 4200); return () => clearTimeout(t); }, [onClose]);
  const col = type === "ok" ? "var(--green)" : type === "err" ? "var(--red)" : "var(--orangeHi)";
  const icon = type === "ok" ? "✓" : type === "err" ? "✕" : "ℹ";
  return (
    <div className="toast" style={{ borderColor: col }}>
      <span style={{ color: col, fontWeight: 700, fontSize: 15 }}>{icon}</span>
      <span>{msg}</span>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  if (s === "replied")     return <span className="badge b-green">✓ Replied</span>;
  if (s === "booked")      return <span className="badge b-orange">★ Booked</span>;
  if (s === "sent")        return <span className="badge b-blue">→ Awaiting</span>;
  return <span className="badge b-muted">— No reply</span>;
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function Landing({ onOpen }: { onOpen:(m:string)=>void }) {
  const [typed, setTyped] = useState("");
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const phrases = ["book London venues.", "get more gigs.", "write booking emails.", "grow your fanbase.", "focus on your music."];
    let ci=0, li=0, del=false;
    const tick = () => {
      const p = phrases[ci];
      if (!del) { setTyped(p.slice(0, li+1)); li++; if (li === p.length) { del=true; setTimeout(tick,1800); return; } }
      else       { setTyped(p.slice(0, li-1)); li--; if (li === 0) { del=false; ci=(ci+1)%phrases.length; } }
      setTimeout(tick, del ? 38 : 72);
    };
    setTimeout(tick, 900);
    const c = setInterval(() => setBlink(x => !x), 520);
    return () => clearInterval(c);
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", position:"relative", overflow:"hidden" }}>
      <div className="l-grid" />
      <div className="l-glow" />

      {/* NAV */}
      <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 44px", position:"relative", zIndex:10, borderBottom:"1px solid rgba(255,255,255,.04)" }}>
        <div style={{ fontFamily:"var(--fd)", fontSize:18, fontWeight:700 }}>
          Gig<em style={{ color:"var(--orangeHi)", fontStyle:"normal" }}>Pilot</em>
          <span style={{ color:"var(--text3)", fontSize:11, fontWeight:400, marginLeft:6 }}>AI</span>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-ghost" onClick={() => onOpen("login")}>Sign in</button>
          <button className="btn btn-primary" onClick={() => onOpen("signup")}>Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ minHeight:"88vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"60px 24px 40px", position:"relative", zIndex:10 }}>
        <div className="badge b-orange" style={{ marginBottom:22, fontSize:11, padding:"5px 13px" }}>🎵 Built for London musicians</div>
        <h1 style={{ fontSize:"clamp(36px,5.5vw,70px)", fontWeight:700, maxWidth:780, marginBottom:20, lineHeight:1.06 }}>
          AI that helps you<br/>
          <span style={{ color:"var(--orangeHi)" }}>{typed}</span>
          <span style={{ color:"var(--orangeHi)", opacity:blink?1:0 }}>|</span>
        </h1>
        <p style={{ color:"var(--text2)", fontSize:"clamp(14px,1.8vw,17px)", maxWidth:500, marginBottom:40, lineHeight:1.8, fontWeight:400 }}>
          GigPilot matches you with the right London venues, writes personalised booking emails and tracks every conversation — so you can focus on making music.
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginBottom:14 }}>
          <button className="btn btn-primary btn-xl" onClick={() => onOpen("signup")}>Start for free →</button>
          <button className="btn btn-outline btn-lg" onClick={() => onOpen("login")}>Sign in</button>
        </div>
        <p style={{ color:"var(--text3)", fontSize:11 }}>No card required · Free forever · 65 London venues</p>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginTop:44 }}>
          {["🎯 AI venue matching","✉️ Personalised emails","📊 Outreach tracking","🇬🇧 65+ London venues","💷 From £0/month"].map(f => (
            <div key={f} style={{ background:"rgba(255,255,255,.03)", border:"1px solid var(--border)", borderRadius:99, padding:"6px 14px", fontSize:11, color:"var(--text2)" }}>{f}</div>
          ))}
        </div>
      </div>

      {/* STEPS */}
      <section style={{ padding:"70px 44px", borderTop:"1px solid var(--border)", position:"relative", zIndex:10 }}>
        <h2 style={{ textAlign:"center", fontSize:"clamp(24px,3.5vw,38px)", fontWeight:700, marginBottom:8 }}>From profile to booked</h2>
        <p style={{ textAlign:"center", color:"var(--text2)", marginBottom:46, fontSize:14 }}>Three steps. Minutes, not weeks.</p>
        <div className="g3" style={{ maxWidth:900, margin:"0 auto" }}>
          {[
            { n:"01", icon:"🎸", t:"Build your profile", d:"Your genre, influences, links, and bio. GigPilot uses this to personalise every email and match." },
            { n:"02", icon:"🎯", t:"Discover matched venues", d:"AI scores 65+ real London venues against your sound and location. See which ones are the right fit." },
            { n:"03", icon:"✉️", t:"Send AI-written emails", d:"One click writes a personalised booking email. Edit it, then send directly from GigPilot." },
          ].map(s => (
            <div key={s.n} className="card" style={{ position:"relative", overflow:"hidden" }}>
              <div style={{ fontSize:9, fontFamily:"var(--fd)", color:"var(--orangeHi)", letterSpacing:".12em", marginBottom:14, opacity:.6 }}>{s.n}</div>
              <div style={{ fontSize:28, marginBottom:12 }}>{s.icon}</div>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>{s.t}</h3>
              <p style={{ color:"var(--text2)", fontSize:13, lineHeight:1.65 }}>{s.d}</p>
              <div style={{ position:"absolute", bottom:-10, right:-10, fontSize:64, opacity:.025, lineHeight:1, fontFamily:"var(--fd)" }}>{s.n}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding:"70px 44px", borderTop:"1px solid var(--border)", position:"relative", zIndex:10 }}>
        <h2 style={{ textAlign:"center", fontSize:"clamp(24px,3.5vw,38px)", fontWeight:700, marginBottom:8 }}>Straightforward pricing</h2>
        <p style={{ textAlign:"center", color:"var(--text2)", marginBottom:46, fontSize:14 }}>Start free. Upgrade when you're ready.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:18, maxWidth:820, margin:"0 auto" }}>
          {[
            { name:"Free", price:"£0", sub:"/month", perks:["5 venue matches/month","3 booking emails/month","Artist profile","Basic dashboard"], cta:"Get started free", hot:false },
            { name:"Artist", price:"£15", sub:"/month", perks:["Unlimited venue matches","50 AI emails/month","Full outreach tracking","Real email delivery"], cta:"Start Artist plan", hot:true },
            { name:"Pro", price:"£39", sub:"/month", perks:["Everything in Artist","Unlimited emails","Priority support","Early access features"], cta:"Go Pro", hot:false },
          ].map(p => (
            <div key={p.name} className="card" style={{ border:p.hot?"1px solid var(--orangeHi)":"", position:"relative", padding:"26px 22px" }}>
              {p.hot && <div className="badge b-orange" style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", whiteSpace:"nowrap" }}>Most popular</div>}
              <div style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:17, marginBottom:5 }}>{p.name}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:2, marginBottom:5 }}>
                <span style={{ fontFamily:"var(--fd)", fontSize:32, fontWeight:700, color:p.hot?"var(--orangeHi)":"var(--text)" }}>{p.price}</span>
                <span style={{ color:"var(--text3)", fontSize:12 }}>{p.sub}</span>
              </div>
              <hr className="div" style={{ borderColor:"var(--border2)" }} />
              <ul style={{ listStyle:"none", marginBottom:22, display:"flex", flexDirection:"column", gap:8 }}>
                {p.perks.map(k => (
                  <li key={k} style={{ display:"flex", gap:8, color:"var(--text2)", fontSize:13 }}>
                    <span style={{ color:"var(--green)", flexShrink:0 }}>✓</span>{k}
                  </li>
                ))}
              </ul>
              <button className={`btn btn-block ${p.hot?"btn-primary":"btn-outline"}`} onClick={() => onOpen("signup")}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop:"1px solid var(--border)", padding:"24px 44px", display:"flex", justifyContent:"space-between", alignItems:"center", color:"var(--text3)", fontSize:11, flexWrap:"wrap", gap:10 }}>
        <div style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:14 }}>Gig<em style={{ color:"var(--orangeHi)", fontStyle:"normal" }}>Pilot</em> AI</div>
        <div>© {new Date().getFullYear()} GigPilot AI · Built for independent London musicians</div>
      </footer>
    </div>
  );
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onAuth, toast }: { mode:string; onClose:()=>void; onAuth:(u:User)=>void; toast:(m:string,t?:ToastType)=>void }) {
  const [m, setM] = useState(mode);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleGoogle = async () => {
    if (!sb) {
      // Demo mode — simulate Google auth
      onAuth({ id:"demo", email:"demo@gigpilot.co.uk", name:"Demo Musician", provider:"google" });
      return;
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setErr(error.message);
  };

  const submit = async () => {
    if (!email || !pass) { setErr("Please fill in all fields."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (m === "signup" && !name) { setErr("Please enter your name."); return; }
    setLoading(true); setErr("");

    if (!sb) {
      // Demo mode
      onAuth({ id:"demo", email, name:name||email.split("@")[0], provider:"email" });
      return;
    }

    try {
      if (m === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password:pass, options:{data:{full_name:name}} });
        if (error) throw error;
        if (data.user?.confirmed_at || data.user?.email_confirmed_at) {
          onAuth({ id:data.user.id, email, name, provider:"email" });
        } else {
          toast("Check your inbox to confirm your email!", "info");
          onClose();
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password:pass });
        if (error) throw error;
        onAuth({ id:data.user.id, email:data.user.email!, name:data.user.user_metadata?.full_name||email.split("@")[0], provider:"email" });
      }
    } catch (e: any) {
      setErr(e.message || "Something went wrong.");
    }
    setLoading(false);
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-x" onClick={onClose}>×</button>
        {DEMO && <div className="demo-pill" style={{ marginBottom:18 }}>🎭 Demo mode — Supabase not configured, auth is simulated.</div>}
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:4 }}>{m==="signup" ? "Create your account" : "Welcome back"}</h2>
        <p style={{ color:"var(--text2)", fontSize:13, marginBottom:26 }}>{m==="signup" ? "Start booking London venues with AI." : "Sign back in to GigPilot."}</p>

        <button className="social-btn" style={{ marginBottom:15 }} onClick={handleGoogle}>
          <svg width="17" height="17" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <hr className="div" style={{ flex:1, margin:0 }} />
          <span style={{ color:"var(--text3)", fontSize:11 }}>or</span>
          <hr className="div" style={{ flex:1, margin:0 }} />
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          {m === "signup" && <div className="field"><label className="label">Full name</label><input className="inp" placeholder="Your name" value={name} onChange={e=>{setName(e.target.value);setErr("")}} /></div>}
          <div className="field"><label className="label">Email</label><input className="inp" type="email" placeholder="you@example.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("")}} /></div>
          <div className="field"><label className="label">Password</label><input className="inp" type="password" placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setErr("")}} onKeyDown={e=>e.key==="Enter"&&submit()} /></div>
          {err && <div style={{ background:"var(--redDim)", border:"1px solid rgba(239,68,68,.2)", borderRadius:7, padding:"10px 13px", color:"var(--red)", fontSize:13 }}>{err}</div>}
          <button className="btn btn-primary btn-block" style={{ padding:12 }} onClick={submit} disabled={loading}>
            {loading ? "Please wait…" : m==="signup" ? "Create free account →" : "Sign in →"}
          </button>
        </div>

        <hr className="div" />
        <p style={{ textAlign:"center", color:"var(--text2)", fontSize:13 }}>
          {m==="signup" ? "Already have an account? " : "No account yet? "}
          <span style={{ color:"var(--orangeHi)", cursor:"pointer", fontWeight:600 }} onClick={() => { setM(m==="signup"?"login":"signup"); setErr(""); }}>
            {m==="signup" ? "Sign in" : "Sign up free"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ user, onDone }: { user:User; onDone:(p:Profile)=>void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Profile>({ artistName:user.name||"", area:"", genre:"", similarArtists:"", bio:"", spotify:"", soundcloud:"", instagram:"", website:"" });
  const up = (k: keyof Profile, v: string) => setP(x => ({ ...x, [k]:v }));

  const steps = [
    {
      title: "What's your artist name?",
      sub: "How you'll appear to venues.",
      ok: () => !!(p.artistName && p.area),
      body: (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="field"><label className="label">Artist / Band name *</label><input className="inp" placeholder="e.g. Maya Jones" value={p.artistName} onChange={e=>up("artistName",e.target.value)} /></div>
          <div className="field"><label className="label">Your area in London *</label><input className="inp" placeholder="e.g. Hackney, Brixton, Dalston…" value={p.area} onChange={e=>up("area",e.target.value)} /></div>
        </div>
      )
    },
    {
      title: "Tell us about your music",
      sub: "The AI uses this to score venue matches and write emails.",
      ok: () => !!p.genre,
      body: (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="field"><label className="label">Genre *</label><input className="inp" placeholder="e.g. Jazz, Indie Folk, Electronic, Neo-Soul…" value={p.genre} onChange={e=>up("genre",e.target.value)} /></div>
          <div className="field"><label className="label">Artists you sound like</label><input className="inp" placeholder="e.g. Jorja Smith, Tom Misch, Loyle Carner" value={p.similarArtists} onChange={e=>up("similarArtists",e.target.value)} /></div>
          <div className="field"><label className="label">Short bio</label><textarea className="inp" placeholder="A sentence or two about your music…" value={p.bio} onChange={e=>up("bio",e.target.value)} /></div>
        </div>
      )
    },
    {
      title: "Add your links",
      sub: "These are included automatically in every booking email.",
      ok: () => true,
      body: (
        <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
          <div className="field"><label className="label">Spotify</label><input className="inp" placeholder="https://open.spotify.com/artist/…" value={p.spotify} onChange={e=>up("spotify",e.target.value)} /></div>
          <div className="field"><label className="label">SoundCloud</label><input className="inp" placeholder="https://soundcloud.com/…" value={p.soundcloud} onChange={e=>up("soundcloud",e.target.value)} /></div>
          <div className="field"><label className="label">Instagram</label><input className="inp" placeholder="https://instagram.com/…" value={p.instagram} onChange={e=>up("instagram",e.target.value)} /></div>
          <div className="field"><label className="label">Website</label><input className="inp" placeholder="https://yourwebsite.com" value={p.website} onChange={e=>up("website",e.target.value)} /></div>
        </div>
      )
    }
  ];

  const finish = async () => {
    setSaving(true);
    if (sb && user.id !== "demo") {
      await sb.from("profiles").upsert({
        user_id: user.id, artist_name:p.artistName, area:p.area, genre:p.genre,
        similar_artists:p.similarArtists, bio:p.bio, spotify:p.spotify,
        soundcloud:p.soundcloud, instagram:p.instagram, website:p.website
      });
    }
    onDone(p);
  };

  const cur = steps[step];
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--bg)" }}>
      <div style={{ width:"100%", maxWidth:500 }} className="fade">
        <div style={{ fontFamily:"var(--fd)", fontSize:10, color:"var(--orangeHi)", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>Step {step+1} of {steps.length}</div>
        <h1 style={{ fontSize:24, fontWeight:700, marginBottom:5 }}>{cur.title}</h1>
        <p style={{ color:"var(--text2)", marginBottom:26, fontSize:13 }}>{cur.sub}</p>
        <div className="steps">{steps.map((_,i) => <div key={i} className={`step-dot${i<step?" done":i===step?" cur":""}`} />)}</div>
        {cur.body}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:26 }}>
          {step > 0 ? <button className="btn btn-outline" onClick={() => setStep(s=>s-1)}>← Back</button> : <div />}
          <button className="btn btn-primary" disabled={!cur.ok() || saving}
            onClick={() => step < steps.length-1 ? setStep(s=>s+1) : finish()}>
            {saving ? "Saving…" : step < steps.length-1 ? "Continue →" : "Let's go 🎵"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ profile, outreach, matched, plan, onDiscover }: { profile:Profile; outreach:OutreachEntry[]; matched:Venue[]; plan:Plan; onDiscover:()=>void }) {
  const replied = outreach.filter(o => o.status==="replied"||o.status==="booked").length;
  const top3 = matched.slice(0, 3);

  return (
    <div className="page fade">
      <div className="ph">
        <h1>Hey {profile.artistName} 👋</h1>
        <p>Your booking activity at a glance.</p>
      </div>

      {DEMO && (
        <div className="demo-pill" style={{ marginBottom:20 }}>
          🎭 Running in demo mode. Add <code>VITE_SUPABASE_URL</code>, <code>VITE_ANTHROPIC_KEY</code>, and <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in Vercel to go fully live.
        </div>
      )}

      <div className="g4" style={{ marginBottom:26 }}>
        {[
          { n:outreach.length,      l:"Emails sent",     d:"Total outreach",            c:"var(--text)" },
          { n:replied,              l:"Positive replies", d:`${outreach.length?Math.round(replied/outreach.length*100):0}% reply rate`, c:"var(--green)" },
          { n:matched.length,       l:"Venue matches",   d:"Scored across London",      c:"var(--orangeHi)" },
          { n:PLANS[plan].name,     l:"Current plan",    d:plan==="free"?"Upgrade for more →":"Active", c:"var(--blue)" },
        ].map(s => (
          <div className="stat" key={s.l}>
            <div className="stat-n" style={{ color:s.c }}>{s.n}</div>
            <div className="stat-l">{s.l}</div>
            <div className="stat-d">{s.d}</div>
          </div>
        ))}
      </div>

      <div className="g2" style={{ gap:22, alignItems:"start" }}>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"var(--fd)" }}>Top venue matches</h3>
            <button className="btn btn-ghost btn-sm" onClick={onDiscover}>See all →</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {top3.map(v => {
              const sc = scoreStyle(v.score!);
              const tb = tierBadge(v.tier);
              return (
                <div className="card2" key={v.id} style={{ display:"flex", gap:11, alignItems:"center" }}>
                  <div className="score-ring" style={{ background:sc.bg, color:sc.c, width:42, height:42, fontSize:13, fontFamily:"var(--fd)", fontWeight:700 }}>{v.score}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{v.name}</div>
                    <div style={{ color:"var(--text2)", fontSize:11, marginTop:1 }}>{v.area} · <span style={{ color:sc.c }}>{v.genreMatch} fit</span></div>
                  </div>
                  <span className={`badge ${tb.cls}`}>{tb.lbl}</span>
                </div>
              );
            })}
            {top3.length === 0 && <div className="card2" style={{ textAlign:"center", color:"var(--text3)", padding:"20px 0", fontSize:13 }}>Complete your profile to see matches</div>}
          </div>
        </div>

        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:13 }}>
            <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"var(--fd)" }}>Recent outreach</h3>
            <span style={{ color:"var(--text3)", fontSize:11 }}>Latest activity</span>
          </div>
          <div className="card" style={{ padding:0 }}>
            {outreach.slice(0,5).map((o,i) => (
              <div key={o.id} style={{ display:"flex", alignItems:"center", gap:11, padding:"12px 16px", borderBottom:i<Math.min(4,outreach.length-1)?"1px solid var(--border)":"" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{o.venue}</div>
                  <div style={{ color:"var(--text3)", fontSize:11, marginTop:1 }}>{fmtDate(o.date)}</div>
                </div>
                <StatusBadge s={o.status} />
              </div>
            ))}
            {outreach.length === 0 && <div style={{ padding:28, textAlign:"center", color:"var(--text3)", fontSize:13 }}>No outreach yet. Find venues and send your first email!</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop:22 }}>
        <h3 style={{ fontSize:14, fontWeight:700, fontFamily:"var(--fd)", marginBottom:14 }}>Your profile</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10 }}>
          {[{l:"Artist",v:profile.artistName},{l:"Area",v:profile.area},{l:"Genre",v:profile.genre},{l:"Sounds like",v:profile.similarArtists||"—"}].map(r => (
            <div key={r.l} style={{ background:"var(--surface)", borderRadius:"var(--r)", padding:"10px 12px" }}>
              <div className="label" style={{ marginBottom:3 }}>{r.l}</div>
              <div style={{ fontWeight:500, fontSize:13 }}>{r.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DISCOVER ─────────────────────────────────────────────────────────────────
function Discover({ matched, outreach, plan, onEmail, onUpgrade }: { matched:Venue[]; outreach:OutreachEntry[]; plan:Plan; onEmail:(v:Venue)=>void; onUpgrade:()=>void }) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [genre, setGenre] = useState("all");
  const [tier, setTier] = useState("all");
  const isFree = plan === "free";
  const areas = [...new Set(matched.map(v => v.area))].sort();
  const genres = [...new Set(matched.flatMap(v => v.genres))].sort();
  const contacted = new Set(outreach.map(o => o.venueId));

  const filtered = matched.filter(v => {
    const qq = q.toLowerCase();
    if (q && !v.name.toLowerCase().includes(qq) && !v.area.toLowerCase().includes(qq) && !v.genres.some(g => g.includes(qq))) return false;
    if (area !== "all" && v.area !== area) return false;
    if (genre !== "all" && !v.genres.includes(genre)) return false;
    if (tier !== "all" && v.tier !== tier) return false;
    return true;
  });

  return (
    <div className="page fade">
      <div className="ph"><h1>London Venue Matches</h1><p>65 real London venues scored by AI to match your sound.</p></div>

      {isFree && (
        <div className="up-banner">
          <div>
            <div style={{ fontFamily:"var(--fd)", fontWeight:600, marginBottom:2 }}>You're on the Free plan</div>
            <div style={{ color:"var(--text2)", fontSize:12 }}>Showing 5 of {matched.length} matches. Upgrade to unlock all.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onUpgrade}>Upgrade to Artist — £15/mo →</button>
        </div>
      )}

      <div style={{ display:"flex", gap:9, marginBottom:18, flexWrap:"wrap" }}>
        <input className="inp" placeholder="Search venues, areas, genres…" value={q} onChange={e=>setQ(e.target.value)} style={{ maxWidth:250 }} />
        <select className="inp" value={area} onChange={e=>setArea(e.target.value)} style={{ maxWidth:150 }}>
          <option value="all">All areas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="inp" value={genre} onChange={e=>setGenre(e.target.value)} style={{ maxWidth:150 }}>
          <option value="all">All genres</option>
          {genres.slice(0,28).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className="inp" value={tier} onChange={e=>setTier(e.target.value)} style={{ maxWidth:135 }}>
          <option value="all">All tiers</option>
          <option value="grassroots">Grassroots</option>
          <option value="mid">Mid-size</option>
          <option value="specialist">Specialist</option>
          <option value="iconic">Iconic</option>
          <option value="large">Major</option>
        </select>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", color:"var(--text3)", fontSize:12 }}>{filtered.length} venues</div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map((v, idx) => {
          const locked = isFree && idx >= 5;
          const sc = scoreStyle(v.score!);
          const tb = tierBadge(v.tier);
          const wasContacted = contacted.has(v.id);
          return (
            <div key={v.id} className="vcard" style={{ opacity:locked?.45:1, filter:locked?"blur(3px)":"none", pointerEvents:locked?"none":"auto" }}>
              <div className="score-ring" style={{ background:sc.bg, color:sc.c, fontFamily:"var(--fd)", fontWeight:700, fontSize:14 }}>{v.score}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:9, flexWrap:"wrap", marginBottom:5 }}>
                  <span style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:15 }}>{v.name}</span>
                  <span style={{ color:"var(--text3)", fontSize:12 }}>· {v.area}</span>
                  {v.capacity && <span className="badge b-muted">Cap. {v.capacity.toLocaleString()}</span>}
                  <span className={`badge ${tb.cls}`}>{tb.lbl}</span>
                  {wasContacted && <span className="badge b-orange">✓ Contacted</span>}
                </div>
                <p style={{ color:"var(--text2)", fontSize:12, marginBottom:6, lineHeight:1.55 }}>{v.reason}</p>
                <p style={{ color:"var(--text3)", fontSize:11, marginBottom:7, fontStyle:"italic" }}>{v.description}</p>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
                  {v.genres.slice(0,4).map(g => <span key={g} className="tag">{g}</span>)}
                  <span className={`badge ${v.genreMatch==="high"?"b-green":v.genreMatch==="medium"?"b-orange":"b-red"}`}>{v.genreMatch} genre fit</span>
                  <span className={`badge ${v.locMatch==="local"?"b-green":"b-blue"}`}>{v.locMatch==="local"?"Local to you":"London-wide"}</span>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:7, flexShrink:0, minWidth:116 }}>
                <button className="btn btn-primary btn-sm" onClick={() => onEmail(v)}>✉ Write email</button>
                {v.website && (
                  <a href={`https://${v.website}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ justifyContent:"center" }}>↗ Website</a>
                )}
                {v.email && <div style={{ fontSize:10, color:"var(--text3)", textAlign:"center", lineHeight:1.4, wordBreak:"break-all" }}>{v.email}</div>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:52, color:"var(--text3)" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
            No venues match these filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EMAIL MODAL ──────────────────────────────────────────────────────────────
function EmailModal({ venue, profile, plan, usedEmails, onClose, onSent, toast }: {
  venue:Venue; profile:Profile; plan:Plan; usedEmails:number;
  onClose:()=>void; onSent:(subject:string,body:string)=>void; toast:(m:string,t?:ToastType)=>void;
}) {
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const limit = PLANS[plan].emailLimit;
  const atLimit = usedEmails >= limit;

  const mockEmail = useCallback(() => {
    setSubj(`Booking enquiry – ${profile.artistName}`);
    const links = [profile.spotify, profile.soundcloud, profile.instagram, profile.website].filter(Boolean);
    setBody(`Hi ${venue.name} team,\n\nI'm ${profile.artistName}, a ${profile.genre} artist based in ${profile.area || "London"}${profile.similarArtists ? `, drawing comparisons to ${profile.similarArtists.split(",").slice(0,2).map(s=>s.trim()).join(" and ")}` : ""}.\n\n${profile.bio || "I've been building a strong following and am actively developing my live show schedule."}\n\nI'd love to explore performing at ${venue.name}. Your programming of ${venue.genres.slice(0,2).join(" and ")} feels like a natural home for my music.\n\n${links.length ? `You can hear my music here:\n${links.join("\n")}\n\n` : ""}I'm flexible on dates and happy to discuss whatever format works for you.\n\nBest,\n${profile.artistName}`);
  }, [profile, venue]);

  const gen = useCallback(async () => {
    setLoading(true);
    const res = await generateEmail(profile, venue);
    if (res?.subject && res?.body) { setSubj(res.subject); setBody(res.body); }
    else mockEmail();
    setLoading(false);
  }, [profile, venue, mockEmail]);

  useEffect(() => { gen(); }, [gen]);

  const send = async () => {
    if (atLimit) { toast("Monthly email limit reached. Upgrade for more.", "err"); return; }
    setSending(true);
    // Try Resend API first
    const ok = await sendEmail(venue.email, subj, body, profile.artistName);
    if (!ok && venue.email) {
      // Fallback to mailto
      window.open(`mailto:${venue.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
    }
    // Save to Supabase if connected
    onSent(subj, body);
    toast(`Email sent to ${venue.name}! 🎉`);
    setSending(false);
    onClose();
  };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:580 }}>
        <button className="modal-x" onClick={onClose}>×</button>
        <h2 style={{ fontSize:18, fontWeight:700, marginBottom:3 }}>Email to {venue.name}</h2>
        <p style={{ color:"var(--text3)", fontSize:12, marginBottom:20 }}>📧 {venue.email || "No booking email — use website"} · {venue.area}</p>

        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div className="shimmer" style={{ height:42 }} />
            <div className="shimmer" style={{ height:200 }} />
            <p style={{ textAlign:"center", color:"var(--text2)", fontSize:12, padding:"6px 0" }}>✨ Generating your personalised email…</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
            {atLimit && <div style={{ background:"var(--redDim)", border:"1px solid rgba(239,68,68,.2)", borderRadius:7, padding:"10px 13px", color:"var(--red)", fontSize:12 }}>Monthly limit reached ({limit} emails on {plan} plan). Upgrade for more.</div>}
            <div className="field"><label className="label">Subject</label><input className="inp" value={subj} onChange={e=>setSubj(e.target.value)} /></div>
            <div className="field"><label className="label">Email body</label><textarea className="inp" style={{ minHeight:220 }} value={body} onChange={e=>setBody(e.target.value)} /></div>
            <div style={{ display:"flex", gap:7, justifyContent:"flex-end", flexWrap:"wrap" }}>
              <button className="btn btn-ghost btn-sm" onClick={gen}>↺ Regenerate</button>
              <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={send} disabled={sending||atLimit}>
                {sending ? "Sending…" : "Send email →"}
              </button>
            </div>
            <p style={{ fontSize:11, color:"var(--text3)", textAlign:"center" }}>
              {venue.email ? "Sends via Resend API — or opens your email client as a fallback." : "No booking email listed — visit their website directly."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OUTREACH ─────────────────────────────────────────────────────────────────
function OutreachPage({ outreach, setOutreach, plan, onUpgrade }: { outreach:OutreachEntry[]; setOutreach:React.Dispatch<React.SetStateAction<OutreachEntry[]>>; plan:Plan; onUpgrade:()=>void }) {
  const [filter, setFilter] = useState<string>("all");
  const [noteId, setNoteId] = useState<string|null>(null);
  const [noteText, setNoteText] = useState("");

  if (plan === "free") return (
    <div className="page fade" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, textAlign:"center" }}>
      <div style={{ fontSize:46, marginBottom:16 }}>📊</div>
      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:7 }}>Outreach tracking is a paid feature</h2>
      <p style={{ color:"var(--text2)", maxWidth:360, marginBottom:26, lineHeight:1.65, fontSize:13 }}>Track every email, reply and follow-up — all in one place. Upgrade to start.</p>
      <button className="btn btn-primary btn-lg" onClick={onUpgrade}>Upgrade to Artist — £15/month</button>
    </div>
  );

  const counts: Record<string,number> = {
    all: outreach.length,
    replied: outreach.filter(o => o.status==="replied"||o.status==="booked").length,
    sent: outreach.filter(o => o.status==="sent").length,
    no_response: outreach.filter(o => o.status==="no_response").length,
  };

  const shown = filter === "all" ? outreach
    : outreach.filter(o => filter==="replied" ? (o.status==="replied"||o.status==="booked") : o.status===filter);

  const updateStatus = (id: string, status: OutreachEntry["status"]) =>
    setOutreach(prev => prev.map(o => o.id===id ? {...o,status} : o));

  const saveNote = (id: string) => {
    setOutreach(prev => prev.map(o => o.id===id ? {...o,notes:noteText} : o));
    setNoteId(null);
  };

  return (
    <div className="page fade">
      <div className="ph"><h1>Outreach Tracker</h1><p>Track every email, reply and follow-up.</p></div>

      <div className="g4" style={{ marginBottom:22 }}>
        {[
          { n:counts.all, l:"Total sent", c:"var(--text)" },
          { n:counts.replied, l:"Positive replies", c:"var(--green)" },
          { n:counts.sent, l:"Awaiting reply", c:"var(--blue)" },
          { n:counts.no_response, l:"No response", c:"var(--text3)" },
        ].map(s => (
          <div className="stat" key={s.l}><div className="stat-n" style={{ color:s.c }}>{s.n}</div><div className="stat-l">{s.l}</div></div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        {(["all","replied","sent","no_response"] as const).map(k => (
          <button key={k} className={`btn btn-sm ${filter===k?"btn-primary":"btn-outline"}`} onClick={() => setFilter(k)}>
            {k==="all"?"All":k==="replied"?"Replied":k==="sent"?"Sent":"No response"}
            <span style={{ background:"rgba(255,255,255,.07)", borderRadius:99, padding:"1px 6px", fontSize:10, marginLeft:4 }}>{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding:0, overflowX:"auto" }}>
        <table className="tbl">
          <thead>
            <tr><th>Venue</th><th>Area</th><th>Date</th><th>Status</th><th>Notes</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {shown.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight:600 }}>{o.venue}</td>
                <td style={{ color:"var(--text2)" }}>{o.area}</td>
                <td style={{ color:"var(--text2)" }}>{fmtDate(o.date)}</td>
                <td><StatusBadge s={o.status} /></td>
                <td style={{ maxWidth:180 }}>
                  {noteId === o.id ? (
                    <div style={{ display:"flex", gap:5 }}>
                      <input className="inp" style={{ padding:"4px 8px", fontSize:12 }} value={noteText} onChange={e=>setNoteText(e.target.value)} autoFocus />
                      <button className="btn btn-teal-gone btn-sm" style={{ padding:"4px 10px" }} onClick={() => saveNote(o.id)}>✓</button>
                    </div>
                  ) : (
                    <span style={{ color:"var(--text3)", fontSize:12, cursor:"pointer" }} onClick={() => { setNoteId(o.id); setNoteText(o.notes||""); }}>
                      {o.notes || <span style={{ color:"var(--border2)" }}>+ Add note</span>}
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display:"flex", gap:5 }}>
                    {(o.status==="sent"||o.status==="no_response") && (
                      <button style={{ background:"var(--greenDim)", color:"var(--green)", border:"1px solid rgba(45,212,191,.2)", borderRadius:6, padding:"3px 9px", fontSize:11, cursor:"pointer" }} onClick={() => updateStatus(o.id,"replied")}>Replied</button>
                    )}
                    {o.status==="replied" && (
                      <button style={{ background:"var(--orangeDim)", color:"var(--orangeHi)", border:"1px solid rgba(245,166,35,.2)", borderRadius:6, padding:"3px 9px", fontSize:11, cursor:"pointer" }} onClick={() => updateStatus(o.id,"booked")}>Booked!</button>
                    )}
                    {o.status==="sent" && (
                      <button style={{ background:"rgba(255,255,255,.04)", color:"var(--text3)", border:"1px solid var(--border)", borderRadius:6, padding:"3px 9px", fontSize:11, cursor:"pointer" }} onClick={() => updateStatus(o.id,"no_response")}>No response</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <div style={{ padding:36, textAlign:"center", color:"var(--text3)", fontSize:13 }}>No outreach for this filter.</div>
        )}
      </div>
    </div>
  );
}

// ─── VENUE DATABASE ───────────────────────────────────────────────────────────
function VenueDB({ venues, setVenues, toast }: { venues:Venue[]; setVenues:React.Dispatch<React.SetStateAction<Venue[]>>; toast:(m:string,t?:ToastType)=>void }) {
  const [q, setQ] = useState("");
  const [tierF, setTierF] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:"", area:"", borough:"", capacity:"", genres:"", website:"", email:"", tier:"grassroots" });
  const upF = (k: string, v: string) => setForm(x => ({ ...x, [k]:v }));

  const filtered = venues.filter(v => {
    const qq = q.toLowerCase();
    return (!q || v.name.toLowerCase().includes(qq) || v.area.toLowerCase().includes(qq) || v.genres.some(g=>g.includes(qq)))
      && (tierF === "all" || v.tier === tierF);
  });

  const addVenue = () => {
    if (!form.name || !form.area) return;
    const nv: Venue = {
      id: Date.now(), name:form.name, area:form.area, borough:form.borough||"London",
      capacity: form.capacity ? parseInt(form.capacity) : null,
      genres: form.genres.split(",").map(g=>g.trim()).filter(Boolean),
      tier: form.tier, email:form.email, website:form.website, description:"",
    };
    setVenues(p => [...p, nv]);
    setForm({ name:"", area:"", borough:"", capacity:"", genres:"", website:"", email:"", tier:"grassroots" });
    setAdding(false);
    toast("Venue added!");
  };

  return (
    <div className="page fade">
      <div className="ph"><h1>Venue Database</h1><p>All 65 London music venues.</p></div>

      <div style={{ display:"flex", gap:9, marginBottom:18, flexWrap:"wrap" }}>
        <input className="inp" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} style={{ maxWidth:260 }} />
        <select className="inp" value={tierF} onChange={e=>setTierF(e.target.value)} style={{ maxWidth:145 }}>
          <option value="all">All tiers</option>
          <option value="grassroots">Grassroots</option>
          <option value="mid">Mid-size</option>
          <option value="specialist">Specialist</option>
          <option value="iconic">Iconic</option>
          <option value="large">Major</option>
        </select>
        <div style={{ marginLeft:"auto" }}><button className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>+ Add venue</button></div>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom:18, borderColor:"rgba(245,166,35,.2)" }}>
          <h3 style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:14, marginBottom:14 }}>Add new venue</h3>
          <div className="g2" style={{ gap:11, marginBottom:11 }}>
            {[["name","Venue name *","The Windmill"],["area","Area *","Brixton"],["borough","Borough","Lambeth"],["capacity","Capacity","150"],["genres","Genres (comma-sep)","indie, punk, folk"],["website","Website","venue.co.uk"],["email","Booking email","bookings@venue.co.uk"]].map(([k,l,ph]) => (
              <div className="field" key={k}><label className="label">{l}</label><input className="inp" placeholder={ph} value={(form as any)[k]} onChange={e=>upF(k,e.target.value)} /></div>
            ))}
            <div className="field"><label className="label">Tier</label>
              <select className="inp" value={form.tier} onChange={e=>upF("tier",e.target.value)}>
                {["grassroots","mid","specialist","iconic","large"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-primary" onClick={addVenue}>Add venue</button>
            <button className="btn btn-outline" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ color:"var(--text3)", fontSize:12, marginBottom:11 }}>{filtered.length} venues</div>
      <div className="card" style={{ padding:0, overflowX:"auto" }}>
        <table className="tbl">
          <thead><tr><th>Venue</th><th>Area</th><th>Borough</th><th>Tier</th><th>Cap.</th><th>Genres</th><th>Email</th></tr></thead>
          <tbody>
            {filtered.map(v => {
              const tb = tierBadge(v.tier);
              return (
                <tr key={v.id}>
                  <td style={{ fontWeight:600, fontSize:13 }}>{v.name}</td>
                  <td style={{ color:"var(--text2)" }}>{v.area}</td>
                  <td style={{ color:"var(--text3)", fontSize:12 }}>{v.borough}</td>
                  <td><span className={`badge ${tb.cls}`}>{tb.lbl}</span></td>
                  <td style={{ color:"var(--text2)" }}>{v.capacity?.toLocaleString()||"—"}</td>
                  <td><div style={{ display:"flex", flexWrap:"wrap", gap:2, maxWidth:200 }}>{v.genres.slice(0,3).map(g=><span key={g} className="tag">{g}</span>)}{v.genres.length>3&&<span className="tag">+{v.genres.length-3}</span>}</div></td>
                  <td style={{ color:"var(--text3)", fontSize:11 }}>{v.email||"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ACCOUNT ──────────────────────────────────────────────────────────────────
function Account({ user, profile, plan, setPlan, onLogout, toast }: { user:User; profile:Profile; plan:Plan; setPlan:(p:Plan)=>void; onLogout:()=>void; toast:(m:string,t?:ToastType)=>void }) {
  const [editing, setEditing] = useState(false);
  const [p, setP] = useState({ ...profile });
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState<string|null>(null);
  const upP = (k: keyof Profile, v: string) => setP(x => ({ ...x, [k]:v }));

  const save = async () => {
    setSaving(true);
    if (sb && user.id !== "demo") {
      await sb.from("profiles").upsert({ user_id:user.id, artist_name:p.artistName, area:p.area, genre:p.genre, similar_artists:p.similarArtists, bio:p.bio, spotify:p.spotify, soundcloud:p.soundcloud, instagram:p.instagram, website:p.website });
    }
    setSaving(false); setEditing(false);
    toast("Profile saved!");
  };

  const upgrade = async (targetPlan: "artist"|"pro") => {
    setUpgrading(targetPlan);
    const ok = await goStripe(targetPlan, user.email);
    if (!ok) {
      // Demo: simulate upgrade
      setPlan(targetPlan);
      toast(`Upgraded to ${targetPlan.charAt(0).toUpperCase()+targetPlan.slice(1)} plan! 🎉`);
    }
    setUpgrading(null);
  };

  return (
    <div className="page fade">
      <div className="ph"><h1>Account</h1><p>Manage your profile and subscription.</p></div>
      <div className="g2" style={{ gap:22, alignItems:"start" }}>

        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:14 }}>Artist profile</h3>
            {!editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit</button>}
          </div>
          {editing ? (
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              {([ ["artistName","Artist name"], ["area","Area"], ["genre","Genre"], ["similarArtists","Sounds like"], ["bio","Bio"], ["spotify","Spotify"], ["soundcloud","SoundCloud"], ["instagram","Instagram"], ["website","Website"] ] as [keyof Profile, string][]).map(([k,l]) => (
                <div className="field" key={k}><label className="label">{l}</label>
                  {k==="bio" ? <textarea className="inp" value={p[k]||""} onChange={e=>upP(k,e.target.value)} /> : <input className="inp" value={p[k]||""} onChange={e=>upP(k,e.target.value)} />}
                </div>
              ))}
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?"Saving…":"Save changes"}</button>
                <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {([ ["Artist name",profile.artistName], ["Area",profile.area], ["Genre",profile.genre], ["Sounds like",profile.similarArtists||"—"], ["Bio",profile.bio||"—"] ] as [string,string][]).map(([l,v]) => (
                <div key={l}>
                  <div className="label" style={{ marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13 }}>{v}</div>
                  <hr className="div" style={{ margin:"7px 0 0" }} />
                </div>
              ))}
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginTop:4 }}>
                {profile.spotify && <a href={profile.spotify} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">🎵 Spotify</a>}
                {profile.soundcloud && <a href={profile.soundcloud} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">☁ SoundCloud</a>}
                {profile.instagram && <a href={profile.instagram} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">📸 Instagram</a>}
                {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">🌐 Website</a>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          {/* Subscription */}
          <div className="card">
            <h3 style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:14, marginBottom:14 }}>Subscription</h3>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <div style={{ fontWeight:600, marginBottom:2, fontSize:14 }}>{PLANS[plan].name} plan — {PLANS[plan].label}</div>
                <div style={{ color:"var(--text3)", fontSize:12 }}>
                  {plan==="free" ? "5 matches · 3 emails/month" : plan==="artist" ? "Unlimited matches · 50 emails/month" : "Unlimited everything"}
                </div>
              </div>
              <span className={`badge ${plan==="pro"?"b-orange":plan==="artist"?"b-green":"b-muted"}`}>{PLANS[plan].name}</span>
            </div>
            {plan !== "pro" && (
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {(["artist","pro"] as const).filter(tp => tp !== plan || plan === "free").map(tp => (
                  <button key={tp} className="btn btn-primary btn-block" disabled={!!upgrading} onClick={() => upgrade(tp)}>
                    {upgrading===tp ? "Redirecting to Stripe…" : `Upgrade to ${PLANS[tp].name} — ${PLANS[tp].label}`}
                  </button>
                ))}
                {DEMO && <p style={{ fontSize:11, color:"var(--text3)", textAlign:"center" }}>Add Stripe keys to Vercel to enable real payments.</p>}
              </div>
            )}
            {plan === "pro" && <p style={{ fontSize:13, color:"var(--green)" }}>✓ You're on the Pro plan. Enjoy unlimited access!</p>}
          </div>

          {/* Sign out */}
          <div className="card">
            <h3 style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:14, marginBottom:13 }}>Account</h3>
            <div style={{ marginBottom:3, color:"var(--text3)", fontSize:10, textTransform:"uppercase", letterSpacing:".08em" }}>Signed in as</div>
            <div style={{ fontWeight:600, marginBottom:2, fontSize:14 }}>{user.name}</div>
            <div style={{ color:"var(--text3)", fontSize:12, marginBottom:15 }}>{user.email}</div>
            <button className="btn btn-danger btn-sm" onClick={async () => { if(sb) await sb.auth.signOut(); onLogout(); }}>Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, user, setPlan, toast }: { onClose:()=>void; user:User; setPlan:(p:Plan)=>void; toast:(m:string,t?:ToastType)=>void }) {
  const [loading, setLoading] = useState<string|null>(null);

  const pick = async (plan: "artist"|"pro") => {
    setLoading(plan);
    const ok = await goStripe(plan, user.email);
    if (!ok) { setPlan(plan); toast(`Upgraded to ${plan.charAt(0).toUpperCase()+plan.slice(1)}! 🎉`); onClose(); }
    setLoading(null);
  };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-x" onClick={onClose}>×</button>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:5 }}>Unlock the full platform</h2>
        <p style={{ color:"var(--text2)", fontSize:13, marginBottom:24 }}>Choose a plan to reach more London venues.</p>
        {DEMO && <div className="demo-pill" style={{ marginBottom:18 }}>🎭 Demo mode — add Stripe keys to Vercel to take real payments.</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          {([
            { name:"Artist", price:"£15/month", perks:"Unlimited matches · 50 emails · Full tracking", plan:"artist" as const, hot:true },
            { name:"Pro", price:"£39/month", perks:"Unlimited everything · Priority support", plan:"pro" as const, hot:false },
          ]).map(p => (
            <div key={p.name} className="card2" style={{ display:"flex", alignItems:"center", gap:13, border:p.hot?"1px solid rgba(245,166,35,.3)":"" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:14 }}>{p.name}</span>
                  {p.hot && <span className="badge b-orange">Popular</span>}
                </div>
                <div style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:17, color:"var(--orangeHi)", margin:"2px 0" }}>{p.price}</div>
                <div style={{ color:"var(--text2)", fontSize:12 }}>{p.perks}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => pick(p.plan)} disabled={!!loading}>
                {loading===p.plan ? "…" : "Select"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ background:"var(--surface)", borderRadius:7, padding:"11px 13px", marginTop:16, fontSize:11, color:"var(--text3)" }}>
          💳 Secure payments via Stripe · Cancel anytime · Prices include VAT
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]   = useState<Screen>("landing");
  const [authMode, setAuthMode] = useState("signup");
  const [user, setUser]       = useState<User|null>(null);
  const [profile, setProfile] = useState<Profile|null>(null);
  const [page, setPage]       = useState<Page>("dashboard");
  const [plan, setPlan]       = useState<Plan>("free");
  const [outreach, setOutreach] = useState<OutreachEntry[]>([]);
  const [venues, setVenues]   = useState<Venue[]>(VENUES);
  const [matched, setMatched] = useState<Venue[]>([]);
  const [emailVenue, setEmailVenue] = useState<Venue|null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [toastData, setToastData] = useState<{msg:string;type:ToastType}|null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const toast = useCallback((msg: string, type: ToastType = "ok") => setToastData({ msg, type }), []);

  // Init: Supabase session check + URL param handling
  useEffect(() => {
    // Handle Stripe success redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const p = params.get("plan") as Plan || "artist";
      setPlan(p);
      toast(`Subscribed to ${p} plan! Welcome! 🎉`);
      window.history.replaceState({}, "", window.location.pathname);
    }

    // Init Supabase
    initSB().then(client => {
      if (!client) return;
      client.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) loadUser(session.user);
      });
      client.auth.onAuthStateChange((_: any, session: any) => {
        if (session?.user) loadUser(session.user);
      });
    });

    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const loadUser = async (u: any) => {
    const usr: User = { id:u.id, email:u.email, name:u.user_metadata?.full_name||u.email.split("@")[0], provider:u.app_metadata?.provider||"email" };
    setUser(usr);
    if (!sb) return;
    const { data } = await sb.from("profiles").select("*").eq("user_id", u.id).single();
    if (data) {
      const p: Profile = { artistName:data.artist_name, area:data.area, genre:data.genre, similarArtists:data.similar_artists, bio:data.bio, spotify:data.spotify, soundcloud:data.soundcloud, instagram:data.instagram, website:data.website };
      setProfile(p);
      // Load outreach from DB
      const { data: ow } = await sb.from("outreach").select("*").eq("user_id", u.id).order("sent_at", { ascending:false });
      if (ow) setOutreach(ow.map((o: any) => ({ id:o.id, venueId:o.venue_id, venue:o.venue_name, area:o.venue_area, date:o.sent_at.split("T")[0], status:o.status, subject:o.email_subject, body:o.email_body, notes:o.notes||"" })));
      // Load subscription
      const { data: sub } = await sb.from("subscriptions").select("*").eq("user_id", u.id).single();
      if (sub) setPlan(sub.plan);
      setScreen("app");
    } else {
      setScreen("onboarding");
    }
  };

  // Recalculate venue matches when profile or venues change
  useEffect(() => {
    if (profile) setMatched(matchVenues(profile, venues));
  }, [profile, venues]);

  const handleAuth = (u: User) => {
    setUser(u);
    setScreen("onboarding");
  };

  const handleOnboarding = (p: Profile) => {
    setProfile(p);
    setScreen("app");
    toast(`Welcome to GigPilot, ${p.artistName}! 🎵`);
  };

  const handleEmailSent = async (venue: Venue, subject: string, body: string) => {
    const entry: OutreachEntry = {
      id: Date.now().toString(), venueId:venue.id, venue:venue.name, area:venue.area,
      date: new Date().toISOString().split("T")[0], status:"sent", subject, body, notes:""
    };
    setOutreach(p => [entry, ...p]);
    if (sb && user?.id !== "demo") {
      await sb.from("outreach").insert({
        user_id:user!.id, venue_id:venue.id, venue_name:venue.name, venue_area:venue.area,
        email_subject:subject, email_body:body, status:"sent"
      });
    }
  };

  const openEmail = (mode: string) => { setAuthMode(mode); setScreen("auth"); };

  const usedEmailsThisMonth = outreach.filter(o => o.date >= thisMonth()).length;

  const NAV = [
    { id:"dashboard" as Page, icon:"⚡", label:"Dashboard" },
    { id:"discover"  as Page, icon:"🎯", label:"Discover Venues" },
    { id:"outreach"  as Page, icon:"📬", label:"Outreach" },
    { id:"venues"    as Page, icon:"🗺", label:"Venue Database" },
    { id:"account"   as Page, icon:"👤", label:"Account" },
  ];

  if (screen === "landing") return (
    <>
      <style>{CSS}</style>
      <Landing onOpen={openEmail} />
      {toastData && <Toast msg={toastData.msg} type={toastData.type} onClose={() => setToastData(null)} />}
    </>
  );

  if (screen === "auth") return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
        <AuthModal mode={authMode} onClose={() => setScreen("landing")} onAuth={handleAuth} toast={toast} />
      </div>
      {toastData && <Toast msg={toastData.msg} type={toastData.type} onClose={() => setToastData(null)} />}
    </>
  );

  if (screen === "onboarding" && user) return (
    <>
      <style>{CSS}</style>
      <Onboarding user={user} onDone={handleOnboarding} />
      {toastData && <Toast msg={toastData.msg} type={toastData.type} onClose={() => setToastData(null)} />}
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="logo">Gig<em>Pilot</em> <span style={{ color:"var(--text3)", fontSize:10, fontWeight:400 }}>AI</span>
            <small>London Booking Assistant</small>
          </div>
          <div className="nav-sect">Menu</div>
          {NAV.map(n => (
            <button key={n.id} className={`nav-item${page===n.id?" active":""}`} onClick={() => setPage(n.id)}>
              <span className="ni">{n.icon}</span>{n.label}
            </button>
          ))}
          <hr className="nav-divider" />
          <div className="plan-box">
            <div className="plan-inner">
              <div style={{ fontFamily:"var(--fd)", fontWeight:600, fontSize:12, color:"var(--orangeHi)", marginBottom:4 }}>
                {PLANS[plan].name} Plan
              </div>
              {plan === "free" ? (
                <>
                  <div className="pbar" style={{ marginBottom:5 }}><div className="pfill" style={{ width:`${Math.min(100, usedEmailsThisMonth/3*100)}%` }} /></div>
                  <div style={{ fontSize:10, color:"var(--text3)", marginBottom:9 }}>{usedEmailsThisMonth}/3 emails · {Math.min(matched.length,5)}/5 matches</div>
                  <button className="btn btn-primary btn-sm btn-block" style={{ fontSize:11 }} onClick={() => setShowUpgrade(true)}>Upgrade from £15/mo</button>
                </>
              ) : (
                <div style={{ fontSize:10, color:"var(--text3)" }}>Unlimited access · {PLANS[plan].label}</div>
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="main" style={{ paddingBottom: isMobile ? 72 : 0 }}>
          {page === "dashboard" && profile && (
            <Dashboard profile={profile} outreach={outreach} matched={matched} plan={plan} onDiscover={() => setPage("discover")} />
          )}
          {page === "discover" && profile && (
            <Discover matched={matched} outreach={outreach} plan={plan} onEmail={v => setEmailVenue(v)} onUpgrade={() => setShowUpgrade(true)} />
          )}
          {page === "outreach" && (
            <OutreachPage outreach={outreach} setOutreach={setOutreach} plan={plan} onUpgrade={() => setShowUpgrade(true)} />
          )}
          {page === "venues" && (
            <VenueDB venues={venues} setVenues={setVenues} toast={toast} />
          )}
          {page === "account" && user && profile && (
            <Account user={user} profile={profile} plan={plan} setPlan={setPlan} onLogout={() => { setUser(null); setProfile(null); setScreen("landing"); }} toast={toast} />
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav className="mob-nav">
          {NAV.filter(n => n.id !== "venues").map(n => (
            <button key={n.id} className={`mob-nav-item${page===n.id?" active":""}`} onClick={() => setPage(n.id)}>
              <span style={{ fontSize:18 }}>{n.icon}</span>{n.label.split(" ")[0]}
            </button>
          ))}
        </nav>
      )}

      {/* Modals */}
      {emailVenue && profile && user && (
        <EmailModal
          venue={emailVenue} profile={profile} plan={plan} usedEmails={usedEmailsThisMonth}
          onClose={() => setEmailVenue(null)}
          onSent={(subject, body) => handleEmailSent(emailVenue, subject, body)}
          toast={toast}
        />
      )}
      {showUpgrade && user && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} user={user} setPlan={setPlan} toast={toast} />
      )}
      {toastData && <Toast msg={toastData.msg} type={toastData.type} onClose={() => setToastData(null)} />}
    </>
  );
}
