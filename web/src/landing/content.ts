/**
 * Bilingual copy for the landing page. Keyed by language; the shape is
 * identical for `en` and `bn` so components can index either safely.
 */
import type { Lang } from "../prefs";

export interface LandingCopy {
  nav: { grow: string; how: string; useWell: string; features: string; signIn: string; startFree: string };
  hero: {
    badge: string;
    titleLead: string;
    titleHighlight: string;
    titleTail: string;
    subtitle: string;
    ctaGuest: string;
    ctaSignIn: string;
    starting: string;
    perks: string[];
  };
  domains: { title: string; subtitle: string; items: { title: string; body: string }[] };
  how: { title: string; subtitle: string; step: string; steps: { title: string; body: string }[] };
  features: { title: string; subtitle: string; items: { title: string; body: string }[] };
  efficient: {
    title: string;
    subtitle: string;
    tips: string[];
    preview: {
      name: string;
      health: string;
      stageLabel: string;
      stage: string;
      pestsLabel: string;
      pests: string;
      wateringLabel: string;
      watering: string;
      careLabel: string;
      care: string[];
    };
  };
  cta: { title: string; subtitle: string; ctaGuest: string; ctaSignIn: string };
  footer: {
    blurb: string;
    modules: { title: string; links: string[] };
    product: { title: string; links: string[] };
    resources: { title: string; links: string[] };
    rights: string;
    cta: string;
  };
}

const en: LandingCopy = {
  nav: { grow: "What you can grow", how: "How it works", useWell: "Use it well", features: "Features", signIn: "Sign in", startFree: "Start free" },
  hero: {
    badge: "Grow gardens, trees, homes & rooms — from one place",
    titleLead: "Help everything around you ",
    titleHighlight: "grow",
    titleTail: "",
    subtitle:
      "Newell is your AI guide for planting, building, and decorating. Snap a photo, get clear advice anyone can follow, and watch your plants, trees, home, and rooms get better over time.",
    ctaGuest: "Try it free — as guest",
    ctaSignIn: "Sign in",
    starting: "Starting your demo…",
    perks: ["Made for total beginners", "English & বাংলা", "Private — try before you sign up"],
  },
  domains: {
    title: "One app for everything you want to nurture",
    subtitle: "Whatever you're growing or improving, Newell meets you where you are.",
    items: [
      { title: "Grow gardens", body: "Diagnose plant health, spot pests early, and get watering and care steps tuned to each plant." },
      { title: "Plant trees", body: "Green your street or community — pick the right species and learn how to help young trees thrive." },
      { title: "Improve your home", body: "Turn a photo or sketch into step-by-step building guidance, materials, and design principles." },
      { title: "Decorate rooms", body: "Get layout ideas, color palettes, and style improvements for any room from a single photo." },
    ],
  },
  how: {
    title: "How Newell works",
    subtitle: "Three simple steps. No expertise required — just curiosity.",
    step: "STEP",
    steps: [
      { title: "Snap a photo", body: "Point your camera at a plant, a wall, or a room. No forms, no jargon — just a picture." },
      { title: "Get AI guidance", body: "Newell reads the image and returns clear, specific, doable advice in seconds." },
      { title: "Track your progress", body: "Save it and watch things grow over time on a simple timeline you actually enjoy." },
    ],
  },
  features: {
    title: "Everything Newell gives you",
    subtitle: "A complete toolkit for growing and improving the world around you.",
    items: [
      { title: "AI photo diagnosis", body: "Health, growth stage, pests, watering, and care steps from a single picture." },
      { title: "Growth timeline", body: "Every check is saved so you can see real change week over week." },
      { title: "Guest mode", body: "Try a full analysis instantly — no signup, no commitment." },
      { title: "Secure accounts", body: "Phone sign-in with encrypted tokens; your demo carries over when you join." },
      { title: "English & বাংলা", body: "Use Newell comfortably in your language, switch anytime." },
      { title: "Works everywhere", body: "A fast, responsive experience on phones, tablets, and desktops." },
      { title: "Privacy first", body: "Explore freely before you ever create an account." },
      { title: "One place for all", body: "Gardens, trees, home, and rooms — no more juggling apps." },
    ],
  },
  efficient: {
    title: "Get the most out of Newell",
    subtitle: "A few habits turn quick answers into steady progress.",
    tips: [
      "Take clear, well-lit photos — close enough to see leaves, walls, or corners.",
      "Save each result so your timeline shows real change week to week.",
      "Act on one care step at a time; small consistent moves beat big rare ones.",
      "Switch between English and বাংলা anytime from your profile.",
    ],
    preview: {
      name: "Demo Basil",
      health: "Needs attention",
      stageLabel: "Growth stage",
      stage: "Mature",
      pestsLabel: "Pests",
      pests: "Spider mites",
      wateringLabel: "Watering",
      watering: "Keep the current schedule — moisture looks well balanced.",
      careLabel: "Care steps",
      care: ["Move to brighter, indirect sunlight.", "Feed a balanced liquid fertilizer biweekly.", "Check leaf undersides for early pests."],
    },
  },
  cta: {
    title: "Start growing today",
    subtitle: "Try a full plant diagnosis as a guest — no signup needed. Create an account whenever you want to save your progress.",
    ctaGuest: "Try it free — as guest",
    ctaSignIn: "Sign in",
  },
  footer: {
    blurb: "AI-powered guidance to grow gardens, plant trees, and make your home and rooms nicer — all from one place.",
    modules: { title: "Modules", links: ["Grow gardens", "Plant trees", "Improve your home", "Decorate rooms"] },
    product: { title: "Product", links: ["How it works", "Use it well", "Guest demo", "Sign in"] },
    resources: { title: "Resources", links: ["Getting started", "Care tips", "Languages", "Support"] },
    rights: "Grow well.",
    cta: "Get started",
  },
};

const bn: LandingCopy = {
  nav: { grow: "যা যা গড়তে পারেন", how: "যেভাবে কাজ করে", useWell: "কার্যকরভাবে ব্যবহার", features: "বৈশিষ্ট্য", signIn: "সাইন ইন", startFree: "ফ্রি শুরু করুন" },
  hero: {
    badge: "বাগান, গাছ, বাড়ি ও ঘর — সবকিছু এক জায়গা থেকে",
    titleLead: "আপনার চারপাশের সবকিছুকে ",
    titleHighlight: "বাড়তে",
    titleTail: " সাহায্য করুন",
    subtitle:
      "নিওয়েল আপনার এআই সহায়ক — গাছ লাগানো, ঘর তৈরি আর সাজানোর জন্য। একটি ছবি তুলুন, সহজ পরামর্শ পান, আর আপনার গাছ, বাড়ি ও ঘর দিন দিন সুন্দর হতে দেখুন।",
    ctaGuest: "ফ্রি ব্যবহার করুন — গেস্ট হিসেবে",
    ctaSignIn: "সাইন ইন",
    starting: "ডেমো শুরু হচ্ছে…",
    perks: ["একদম নতুনদের জন্যও", "English ও বাংলা", "প্রাইভেট — সাইন আপের আগেই দেখুন"],
  },
  domains: {
    title: "যা কিছু যত্ন করতে চান, সবই এক অ্যাপে",
    subtitle: "আপনি যা-ই গড়ছেন বা সুন্দর করছেন, নিওয়েল আপনার পাশে আছে।",
    items: [
      { title: "বাগান গড়ুন", body: "গাছের স্বাস্থ্য নির্ণয় করুন, আগেভাগে পোকা চিনুন, আর প্রতিটি গাছের জন্য পানি ও যত্নের ধাপ পান।" },
      { title: "গাছ লাগান", body: "আপনার রাস্তা বা এলাকা সবুজ করুন — সঠিক প্রজাতি বেছে নিন আর চারা বড় করার উপায় শিখুন।" },
      { title: "বাড়ি উন্নত করুন", body: "একটি ছবি বা স্কেচ থেকে ধাপে ধাপে নির্মাণ নির্দেশনা, উপকরণ ও ডিজাইন নীতি পান।" },
      { title: "ঘর সাজান", body: "একটি ছবি থেকেই যেকোনো ঘরের লেআউট, রঙের প্যালেট ও স্টাইলের পরামর্শ পান।" },
    ],
  },
  how: {
    title: "নিওয়েল যেভাবে কাজ করে",
    subtitle: "তিনটি সহজ ধাপ। কোনো দক্ষতা লাগে না — শুধু আগ্রহ।",
    step: "ধাপ",
    steps: [
      { title: "একটি ছবি তুলুন", body: "গাছ, দেয়াল বা ঘরের দিকে ক্যামেরা ধরুন। কোনো ফর্ম বা জটিলতা নেই — শুধু একটি ছবি।" },
      { title: "এআই পরামর্শ নিন", body: "নিওয়েল ছবিটি পড়ে কয়েক সেকেন্ডে স্পষ্ট ও কার্যকর পরামর্শ দেয়।" },
      { title: "অগ্রগতি রাখুন", body: "সেভ করুন আর একটি সহজ টাইমলাইনে সময়ের সাথে বেড়ে ওঠা দেখুন।" },
    ],
  },
  features: {
    title: "নিওয়েল আপনাকে যা যা দেয়",
    subtitle: "চারপাশের জগৎ গড়া ও সুন্দর করার সম্পূর্ণ টুলকিট।",
    items: [
      { title: "এআই ছবি নির্ণয়", body: "একটি ছবি থেকেই স্বাস্থ্য, বৃদ্ধির ধাপ, পোকা, পানি ও যত্নের ধাপ।" },
      { title: "বৃদ্ধির টাইমলাইন", body: "প্রতিটি পরীক্ষা সেভ থাকে, তাই সপ্তাহে সপ্তাহে পরিবর্তন দেখা যায়।" },
      { title: "গেস্ট মোড", body: "সাইন আপ ছাড়াই সঙ্গে সঙ্গে সম্পূর্ণ বিশ্লেষণ চেষ্টা করুন।" },
      { title: "নিরাপদ অ্যাকাউন্ট", body: "ফোন সাইন-ইন ও এনক্রিপ্টেড টোকেন; যোগ দিলে আপনার ডেমো থেকে যায়।" },
      { title: "English ও বাংলা", body: "নিজের ভাষায় স্বাচ্ছন্দ্যে ব্যবহার করুন, যখন খুশি পাল্টান।" },
      { title: "সব জায়গায় চলে", body: "ফোন, ট্যাবলেট ও ডেস্কটপে দ্রুত ও রেসপনসিভ অভিজ্ঞতা।" },
      { title: "প্রাইভেসি আগে", body: "অ্যাকাউন্ট তৈরির আগেই স্বাধীনভাবে ঘুরে দেখুন।" },
      { title: "সব এক জায়গায়", body: "বাগান, গাছ, বাড়ি ও ঘর — আর অ্যাপ বদলানোর ঝামেলা নেই।" },
    ],
  },
  efficient: {
    title: "নিওয়েল থেকে সর্বোচ্চটা নিন",
    subtitle: "কয়েকটি অভ্যাস দ্রুত উত্তরকে ধারাবাহিক অগ্রগতিতে পরিণত করে।",
    tips: [
      "পরিষ্কার, ভালো আলোয় ছবি তুলুন — পাতা, দেয়াল বা কোণা যেন স্পষ্ট দেখা যায়।",
      "প্রতিটি ফলাফল সেভ করুন যাতে টাইমলাইনে প্রকৃত পরিবর্তন দেখা যায়।",
      "একবারে একটি যত্নের ধাপ নিন; ছোট নিয়মিত পদক্ষেপই বড় কাজ করে।",
      "প্রোফাইল থেকে যখন খুশি English ও বাংলার মধ্যে পাল্টান।",
    ],
    preview: {
      name: "ডেমো বেসিল",
      health: "মনোযোগ দরকার",
      stageLabel: "বৃদ্ধির ধাপ",
      stage: "পরিণত",
      pestsLabel: "পোকা",
      pests: "মাকড়সা মাইট",
      wateringLabel: "পানি",
      watering: "বর্তমান রুটিন রাখুন — আর্দ্রতা ঠিকঠাক আছে।",
      careLabel: "যত্নের ধাপ",
      care: ["উজ্জ্বল, পরোক্ষ আলোয় সরান।", "প্রতি দুই সপ্তাহে ব্যালান্সড তরল সার দিন।", "পাতার নিচে পোকা আছে কিনা দেখুন।"],
    },
  },
  cta: {
    title: "আজই বাড়তে শুরু করুন",
    subtitle: "গেস্ট হিসেবে সম্পূর্ণ গাছ নির্ণয় চেষ্টা করুন — সাইন আপ লাগে না। অগ্রগতি সেভ করতে চাইলে যখন খুশি অ্যাকাউন্ট খুলুন।",
    ctaGuest: "ফ্রি ব্যবহার করুন — গেস্ট হিসেবে",
    ctaSignIn: "সাইন ইন",
  },
  footer: {
    blurb: "বাগান গড়া, গাছ লাগানো এবং বাড়ি ও ঘর সুন্দর করার এআই-চালিত সহায়তা — সব এক জায়গায়।",
    modules: { title: "মডিউল", links: ["বাগান গড়ুন", "গাছ লাগান", "বাড়ি উন্নত করুন", "ঘর সাজান"] },
    product: { title: "প্রোডাক্ট", links: ["যেভাবে কাজ করে", "কার্যকর ব্যবহার", "গেস্ট ডেমো", "সাইন ইন"] },
    resources: { title: "রিসোর্স", links: ["শুরু করা", "যত্নের টিপস", "ভাষা", "সহায়তা"] },
    rights: "ভালোভাবে বেড়ে উঠুন।",
    cta: "শুরু করুন",
  },
};

export const LANDING_COPY: Record<Lang, LandingCopy> = { en, bn };
