# المعمارية التقنية للنظام (System Architecture)

نظام كشك متعدد الخدمات مبني وفق أفضل الممارسات الهندسية لتطبيقات الويب الحديثة (Modern Single-Page Application Architecture).

---

## 🏛️ 1. المكدس التقني (Tech Stack)

- **Frontend Core**: React 18+ مع TypeScript 5+
- **Build Tool**: Vite 6+
- **Styling**: Tailwind CSS (Utility-First Responsive UI, Dark/Light Mode)
- **Icons**: Lucide React
- **Animations**: CSS Transitions + Tailwind Animate
- **Audio Engine**: Web Audio API (Hardware-synthesized tones, zero network assets)
- **Testing**: Vitest + React Testing Library

---

## 📁 2. الهيكل البرمجي (Folder Structure)

```
src/
├── components/          # واجهات ومكونات التطبيق
│   ├── Auth/           # بوابات الدخول والتبديل بين الكاشير والمدير
│   ├── Common/         # مكونات قابلة لإعادة الاستخدام (StatCard, ConfirmModal, SearchInput, Numpad)
│   ├── Customers/      # إدارة دفتر العملاء وكشوف الحسابات والديون
│   ├── Inventory/      # إدارة المنتجات، التصنيفات، الباركود، وسلة المحذوفات
│   ├── POS/            # شاشة البيع، السلة، الحسابات، والطباعة الحرارية
│   ├── Reports/        # لوحة التحليلات والمؤشرات المالية
│   ├── Sales/          # سجل المبيعات، الإرجاع، والبحث
│   └── Settings/       # إعدادات النظام، المستخدمين، التخزين، وسجل التدقيق
├── hooks/              # خطافات React المخصصة (useSound, useKeyboardShortcuts, useDebounce)
├── services/           # طبقة الخدمات وإدارة البيانات (StorageService, Encryption)
├── utils/              # الدوال المساعدة (Formatters, Export Helpers, Security)
├── data/               # البيانات الأولية والتصنيفات الافتراضية
├── types.ts            # مخططات TypeScript والواجهات
└── App.tsx             # جذر التطبيق وإدارة الحالة الرئيسية
```

---

## 🔐 3. طبقة الأمان والتشفير (Security Layer)

1. **Envelope Encryption**:
   - تشفير البيانات الحساسة داخل `localStorage` لمنع التلاعب المباشر من أدوات المطورين (DevTools).
2. **Dynamic PIN Salting**:
   - استخدام ملح تشفير ديناميكي مرتبط بهوية المستخدم لمنع هجمات قواميس كلمات المرور (Rainbow Tables).
3. **Data Isolation**:
   - عزل كامل لبيانات حسابات الكاشير لمنع تداخل الجلسات أو كشف أرقام المبيعات العامة.
4. **Automated Audit Logging**:
   - توثيق لحظي لكافة العمليات الحساسة (إنشاء/إلغاء فواتير، تعديل الأسعار، استعادة النسخ الاحتياطية).
5. **Storage Quota Health & Pruning**:
   - حماية الذاكرة المحلية من التجاوز (Quota Exceeded) عبر تقليم آلي ذكي لسجلات التدقيق القديمة عند بلوغ الحدود الآمنة.

---

## 🧪 4. منظومة الاختبارات (Testing Strategy)

- **Storage Unit Tests**: اختبارات لعمليات التخزين والاسترجاع والتهجير (Migration).
- **Security Unit Tests**: اختبارات التشفير، تجزئة PIN، والتحقق من الصلاحيات.
- **Calculations Unit Tests**: اختبارات العمليات الحسابية لهوامش الربح والضرائب والخصومات.
