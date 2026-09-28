import type { LandingLocale, LandingPageContentData } from "@/lib/supabase/types";

/** Fallback copy shown when no admin-edited row exists yet for a locale —
 * this is the copy the user approved in the design review, so the page
 * looks right from the first deploy, before anyone touches the CMS. */
export const DEFAULT_LANDING_CONTENT: Record<LandingLocale, LandingPageContentData> = {
  en: {
    nav: { brand: "Wasfati", features: "Features", how: "How it works", cta: "Get the App" },
    hero: {
      eyebrow: "AI Medication Safety Assistant",
      headlineLine1: "Know what's safe",
      headlineHighlight: "before you take it.",
      lede: "Wasfati checks every medicine you take against a clinical interaction database, reminds you when doses are due, and keeps your whole family's care in one place — in Arabic and 7 other languages.",
      ctaPrimary: "Get Wasfati — it's free",
      ctaLink: "See how it works ↓",
      note: "No account needed to look up an interaction — sign up to save your medicines and get reminders.",
    },
    phone: {
      greet: "Good morning 👋",
      name: "Sameer",
      heroTitle: "Quick Interaction Check",
      heroSub: "Check a new medicine before you take it",
      heroBtn: "+ Check a New Medicine",
      ringTitle: "Today's Meds Tracker",
      ringSub: "3 of 4 doses taken",
      chip: "✓ Taken",
    },
    stats: {
      medsValue: "4,000+",
      medsLabel: "Medicines in database",
      interactionsValue: "560,000+",
      interactionsLabel: "Known interaction pairs",
      langsValue: "8",
      langsLabel: "Languages supported",
    },
    features: {
      eyebrow: "What Wasfati does",
      h2: "Everything you need to take medicine safely",
      p: "Built around the four things that actually cause medication mistakes at home.",
      items: [
        {
          title: "Interaction safety checks",
          body: "Scan, search, or type a medicine and get an instant check against every drug you're already taking, with the severity explained in plain language.",
        },
        {
          title: "Dose reminders",
          body: "Wasfati tracks your schedule through the day and flags a missed dose the moment it's overdue, so nothing quietly slips.",
        },
        {
          title: "Family Care Circle",
          body: "Link a parent or child's account to quietly watch over their medicines and get alerted if their doses or interactions need attention.",
        },
        {
          title: "AI health assistant",
          body: "Ask in plain language whether it's safe to take something with food, what the side effects are, or whether there's a milder alternative.",
        },
      ],
    },
    how: {
      eyebrow: "Getting started",
      h2: "Three steps to a safer medicine cabinet",
      steps: [
        {
          title: "Add your medicines",
          body: "Search Wasfati's database, scan the box, upload a prescription, or type it in by hand — whatever's fastest.",
        },
        {
          title: "Get an instant safety check",
          body: "Every new medicine is checked against everything else you're taking before it's added to your list.",
        },
        {
          title: "Stay on track",
          body: "Confirm doses as you take them and watch your daily adherence right from the home screen.",
        },
      ],
    },
    final: {
      h2: "Ready to check your medicines?",
      p: "Free to use, available in Arabic, English, Spanish, French, Italian, Russian, Turkish and Chinese.",
      cta: "Get Wasfati — it's free",
    },
    install: {
      h3: "Add Wasfati to your home screen",
      steps: [
        "Open this page on your phone's browser.",
        "Tap your browser's menu (Safari: Share icon · Chrome: ⋮ menu).",
        'Choose "Add to Home Screen" and confirm.',
      ],
    },
    footer: {
      brand: "Wasfati",
      disclaimer: "Wasfati is a guidance tool and does not replace consulting a doctor or pharmacist.",
      copy: "© 2026 Wasfati. All rights reserved.",
    },
  },
  ar: {
    nav: { brand: "وصفتي", features: "المميزات", how: "كيف يعمل", cta: "حمّل التطبيق" },
    hero: {
      eyebrow: "مساعد سلامة الأدوية بالذكاء الاصطناعي",
      headlineLine1: "اعرف ما هو آمن",
      headlineHighlight: "قبل أن تتناوله.",
      lede: "تراجع وصفتي كل دواء تتناوله مقابل قاعدة بيانات سريرية للتداخلات الدوائية، وتذكّرك بمواعيد الجرعات، وتجمع رعاية عائلتك بأكملها في مكان واحد — بالعربية و٧ لغات أخرى.",
      ctaPrimary: "حمّل وصفتي — مجاناً",
      ctaLink: "شاهد كيف يعمل ↓",
      note: "لا حاجة لحساب للاطلاع على تداخل دوائي — أنشئ حساباً لحفظ أدويتك والحصول على التذكيرات.",
    },
    phone: {
      greet: "صباح الخير 👋",
      name: "سمير",
      heroTitle: "فحص سريع للتداخلات الدوائية",
      heroSub: "تحقق من دواء جديد قبل تناوله",
      heroBtn: "+ فحص دواء جديد",
      ringTitle: "متتبع أدوية اليوم",
      ringSub: "3 من 4 جرعات تم تناولها",
      chip: "✓ تم",
    },
    stats: {
      medsValue: "+4,000",
      medsLabel: "دواء في قاعدة البيانات",
      interactionsValue: "+560,000",
      interactionsLabel: "أزواج تداخلات دوائية موثّقة",
      langsValue: "8",
      langsLabel: "لغة مدعومة",
    },
    features: {
      eyebrow: "ماذا تقدّم وصفتي",
      h2: "كل ما تحتاجه لتناول أدويتك بأمان",
      p: "مصمم حول الأسباب الأربعة الحقيقية لأخطاء الأدوية في المنزل.",
      items: [
        {
          title: "فحص التداخلات الدوائية",
          body: "امسح الدواء ضوئياً أو ابحث عنه أو اكتبه، واحصل على فحص فوري مقابل كل الأدوية التي تتناولها، مع شرح واضح لمستوى الخطورة.",
        },
        {
          title: "تذكير بالجرعات",
          body: "تتابع وصفتي جدولك اليومي وتنبّهك فور تأخر أي جرعة، حتى لا تفوتك دون أن تشعر.",
        },
        {
          title: "دائرة رعاية العائلة",
          body: "اربط حساب أحد والديك أو أبنائك لمتابعة أدويتهم، وتلقّي تنبيه إذا احتاجت جرعاتهم أو تداخلاتهم الدوائية إلى انتباه.",
        },
        {
          title: "المساعد الصحي الذكي",
          body: "اسأل بلغة بسيطة إن كان تناول الدواء مع الطعام آمناً، أو ما هي آثاره الجانبية، أو إن كان هناك بديل أخف.",
        },
      ],
    },
    how: {
      eyebrow: "البدء",
      h2: "ثلاث خطوات لخزانة أدوية أكثر أماناً",
      steps: [
        {
          title: "أضف أدويتك",
          body: "ابحث في قاعدة بيانات وصفتي، أو امسح علبة الدواء، أو ارفع الوصفة الطبية، أو اكتبها يدوياً — أياً كان الأسرع.",
        },
        {
          title: "احصل على فحص سلامة فوري",
          body: "يتم فحص كل دواء جديد مقابل كل ما تتناوله قبل إضافته إلى قائمتك.",
        },
        {
          title: "حافظ على الالتزام",
          body: "وثّق جرعاتك أولاً بأول وتابع التزامك اليومي مباشرة من الشاشة الرئيسية.",
        },
      ],
    },
    final: {
      h2: "جاهز للتحقق من أدويتك؟",
      p: "مجاني الاستخدام، ومتوفر بالعربية والإنجليزية والإسبانية والفرنسية والإيطالية والروسية والتركية والصينية.",
      cta: "حمّل وصفتي — مجاناً",
    },
    install: {
      h3: "أضف وصفتي إلى شاشتك الرئيسية",
      steps: [
        "افتح هذه الصفحة من متصفح هاتفك.",
        "اضغط على قائمة المتصفح (سفاري: أيقونة المشاركة · كروم: قائمة ⋮).",
        "اختر «إضافة إلى الشاشة الرئيسية» وأكّد.",
      ],
    },
    footer: {
      brand: "وصفتي",
      disclaimer: "وصفتي أداة إرشادية، لا تُعوّض استشارة الطبيب أو الصيدلاني.",
      copy: "© 2026 وصفتي. جميع الحقوق محفوظة.",
    },
  },
};
