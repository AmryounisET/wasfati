// Best-effort Arabic -> Latin script romanization for DISPLAY only, used when
// a non-Arabic UI language is active. This is not translation — a person's
// name isn't semantically translatable — it's just letting an Arabic-script
// name read naturally on a Latin-script screen. The stored `full_name`
// itself is never modified; this only affects what's rendered.

// Common name components get their conventional spelling rather than a
// literal letter-by-letter transliteration (e.g. "محمد" -> "Mohammed", not
// "Mhmd"). Falls back to a generic per-letter transliteration for anything
// not in this list.
const COMMON_NAME_MAP: Record<string, string> = {
  "محمد": "Mohammed",
  "أحمد": "Ahmed",
  "احمد": "Ahmed",
  "علي": "Ali",
  "عمر": "Omar",
  "عثمان": "Othman",
  "خالد": "Khaled",
  "سمير": "Samir",
  "سامي": "Sami",
  "ياسر": "Yasser",
  "يوسف": "Youssef",
  "إبراهيم": "Ibrahim",
  "ابراهيم": "Ibrahim",
  "عبدالله": "Abdullah",
  "عبد الله": "Abdullah",
  "عبدالرحمن": "Abdulrahman",
  "فيصل": "Faisal",
  "سلطان": "Sultan",
  "ماجد": "Majed",
  "طارق": "Tarek",
  "حسن": "Hassan",
  "حسين": "Hussein",
  "منصور": "Mansour",
  "فهد": "Fahad",
  "بندر": "Bandar",
  "نايف": "Nayef",
  "سعد": "Saad",
  "سعود": "Saud",
  "زياد": "Ziad",
  "وليد": "Waleed",
  "مروان": "Marwan",
  "فاطمة": "Fatima",
  "عائشة": "Aisha",
  "خديجة": "Khadija",
  "مريم": "Maryam",
  "نورة": "Noura",
  "سارة": "Sarah",
  "منى": "Mona",
  "هند": "Hind",
  "ريم": "Reem",
  "لينا": "Lina",
  "رنا": "Rana",
  "الرشيدي": "Al-Rashidi",
  "المنصوري": "Al-Mansouri",
  "القحطاني": "Al-Qahtani",
  "العتيبي": "Al-Otaibi",
  "الغامدي": "Al-Ghamdi",
  "الحربي": "Al-Harbi",
  "الزهراني": "Al-Zahrani",
  "الشمري": "Al-Shammari",
  "السبيعي": "Al-Subaie",
  "الدوسري": "Al-Dosari",
};

// Generic fallback: approximate letter-by-letter romanization.
const LETTER_MAP: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "aa", "ء": "'",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh",
  "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "'", "غ": "gh",
  "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m", "ن": "n",
  "ه": "h", "و": "w", "ي": "y", "ة": "a", "ى": "a",
  "َ": "", "ِ": "", "ُ": "", "ّ": "", "ْ": "", "ٌ": "", "ٍ": "", "ً": "",
};

function transliterateWord(word: string): string {
  const chars = [...word].map((c) => LETTER_MAP[c] ?? c);
  const joined = chars.join("");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

const ARABIC_PATTERN = /[؀-ۿ]/;

/** Romanizes an Arabic-script name for display in a Latin-script UI. Leaves non-Arabic names untouched. */
export function displayName(name: string, locale: string): string {
  if (locale === "ar" || !name || !ARABIC_PATTERN.test(name)) return name;

  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => COMMON_NAME_MAP[word] ?? transliterateWord(word))
    .join(" ");
}
