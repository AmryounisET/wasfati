-- =============================================================================
-- WASFATI — Demo seed data
--
-- ⚠️  FOR LOCAL DEVELOPMENT AND UI TESTING ONLY. ⚠️
-- The `interactions` rows below are simplified, illustrative examples used
-- to exercise the app's UI (banners, severity badges, chat flow) during
-- development. They are NOT a clinically validated dataset and MUST NOT be
-- used, referenced, or trusted for real medical decisions. Before any real
-- user relies on Wasfati, replace this table's contents entirely with data
-- licensed from a validated source (DrugBank, FDB MedKnowledge, Micromedex,
-- or an equivalent national formulary interaction API), reviewed and signed
-- off by a licensed pharmacist, per Project Rule #1 "Patient safety first."
--
-- Each row carries two wordings of the same validated finding:
--   summary          — full scientific detail, shown to student/provider users
--   patient_summary   — brief plain-language alert, shown to patient users
-- Both describe the identical underlying risk; patient_summary is not a
-- separate (weaker) assessment, only a simpler rendering of it.
-- =============================================================================

insert into public.interactions (substance_a, substance_b, interaction_type, severity, summary, patient_summary, citation) values
  ('lisinopril', 'metformin', 'drug_drug', 'low',
   'لا يوجد تفاعل مباشر معروف بين هذين الدواءين، لكن يُنصح بمراقبة وظائف الكلى بشكل دوري عند استخدامهما معاً.',
   'تفاعل بسيط، استشر طبيبك للحصول على المشورة الطبية بخصوص هذين الدوائين.',
   'DEMO-DATA — replace with licensed source before production'),

  ('lisinopril', null, 'pregnancy', 'high',
   'مثبطات الإنزيم المحول للأنجيوتنسين (مثل ليسينوبريل) قد تسبب ضرراً جنينياً خطيراً ولا يُنصح باستخدامها أثناء الحمل.',
   'تفاعل خطير، استشر طبيبك فوراً للحصول على المشورة الطبية بخصوص هذا الدواء أثناء الحمل.',
   'DEMO-DATA — replace with licensed source before production'),

  ('atorvastatin', 'grapefruit', 'food', 'moderate',
   'قد يزيد عصير الجريب فروت من تركيز أتورفاستاتين في الدم، مما يرفع خطر الآثار الجانبية العضلية.',
   'تفاعل متوسط، استشر طبيبك للحصول على المشورة الطبية بخصوص هذا الدواء.',
   'DEMO-DATA — replace with licensed source before production'),

  ('metformin', 'alcohol', 'alcohol', 'moderate',
   'تناول الكحول مع ميتفورمين قد يزيد من خطر الحماض اللبني، وهي حالة نادرة لكنها خطيرة.',
   'تفاعل متوسط، استشر طبيبك للحصول على المشورة الطبية بخصوص هذا الدواء.',
   'DEMO-DATA — replace with licensed source before production'),

  ('amoxicillin', 'penicillin', 'contraindication', 'high',
   'مضاد استطباب لدى الأشخاص الذين لديهم حساسية معروفة تجاه البنسلين.',
   'تفاعل خطير، استشر طبيبك فوراً للحصول على المشورة الطبية بخصوص هذا الدواء.',
   'DEMO-DATA — replace with licensed source before production'),

  ('lisinopril', null, 'elderly', 'moderate',
   'قد يزيد خطر انخفاض ضغط الدم والدوخة لدى كبار السن؛ يُنصح ببدء الجرعة بحذر ومراقبة الضغط.',
   'تفاعل متوسط، استشر طبيبك للحصول على المشورة الطبية بخصوص هذا الدواء.',
   'DEMO-DATA — replace with licensed source before production');

-- Note: no demo `auth.users` / `profiles` / `medications` rows are seeded
-- here — create test accounts through Supabase Auth locally (magic link
-- or the Studio's "Add user" UI) and add medications through the app UI
-- so you're exercising the real insert path, not a shortcut around it.
