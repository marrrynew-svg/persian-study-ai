import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Behavioral Analysis ───────────────────────────────────────────────────
function computeBurnoutRisk(sessions: any[], recentDays = 7): number {
  if (!sessions.length) return 0.2;
  const now = Date.now();
  const week = sessions.filter((s) => new Date(s.started_at).getTime() > now - 7 * 86400000);
  const prevWeek = sessions.filter((s) => {
    const t = new Date(s.started_at).getTime();
    return t > now - 14 * 86400000 && t <= now - 7 * 86400000;
  });

  const weekMin = week.reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);
  const prevMin = prevWeek.reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);

  let risk = 0.15;
  // Declining trend
  if (prevMin > 0 && weekMin < prevMin * 0.7) risk += 0.25;
  // Very short sessions
  const avgLen = weekMin / Math.max(week.length, 1);
  if (avgLen < 15 && week.length > 0) risk += 0.2;
  // Gaps in recent days
  const todayStr = new Date().toISOString().split("T")[0];
  const studiedDays = new Set(week.map((s: any) => s.started_at?.split("T")[0]));
  const missedDays = recentDays - studiedDays.size;
  if (missedDays >= 4) risk += 0.3;
  else if (missedDays >= 2) risk += 0.1;
  // Very high session count (overload)
  if (week.length > 20) risk += 0.1;

  return Math.min(risk, 1);
}

function computeMotivationScore(sessions: any[]): number {
  if (!sessions.length) return 0.5;
  const now = Date.now();
  const recent = sessions.filter((s) => new Date(s.started_at).getTime() > now - 3 * 86400000);
  const recentMin = recent.reduce((a: number, s: any) => a + (s.duration_minutes || 0), 0);
  if (recentMin > 120) return Math.min(0.5 + recentMin / 600, 1);
  if (recentMin > 60) return 0.6;
  if (recentMin > 0) return 0.4;
  return 0.2;
}

function computeConsistencyScore(sessions: any[]): number {
  if (!sessions.length) return 0;
  const now = Date.now();
  const week = sessions.filter((s) => new Date(s.started_at).getTime() > now - 7 * 86400000);
  const days = new Set(week.map((s: any) => s.started_at?.split("T")[0])).size;
  return Math.min(days / 7, 1);
}

function detectStudyBehaviorType(sessions: any[], memory: any[]): string {
  const existingPersonality = memory.find((m) => m.key === "study_behavior_type");
  if (existingPersonality?.confidence > 0.8) return existingPersonality.value;

  if (!sessions.length) return "beginner";
  const hours = sessions.map((s: any) => {
    try { return new Date(s.started_at).getHours(); } catch { return 12; }
  });
  const nightSessions = hours.filter((h) => h >= 22 || h <= 4).length;
  const morningSessions = hours.filter((h) => h >= 5 && h <= 9).length;

  if (nightSessions > sessions.length * 0.5) return "night_learner";
  if (morningSessions > sessions.length * 0.5) return "morning_learner";
  const shortSessions = sessions.filter((s: any) => (s.duration_minutes || 0) < 20).length;
  if (shortSessions > sessions.length * 0.6) return "procrastinator";
  const longSessions = sessions.filter((s: any) => (s.duration_minutes || 0) > 90).length;
  if (longSessions > sessions.length * 0.4) return "deep_focuser";
  return "balanced";
}

function predictSkipProbability(sessions: any[]): number {
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const studiedToday = sessions.some((s: any) => s.started_at?.startsWith(today));
  const studiedYesterday = sessions.some((s: any) => s.started_at?.startsWith(yesterday));

  let prob = 0.2;
  if (!studiedToday && !studiedYesterday) prob += 0.4;
  else if (!studiedToday) prob += 0.2;

  const recentWeek = sessions.filter((s) => new Date(s.started_at).getTime() > now - 7 * 86400000);
  if (recentWeek.length < 2) prob += 0.2;

  return Math.min(prob, 0.95);
}

function buildBehaviorProfileText(
  behaviorType: string,
  burnoutRisk: number,
  motivationScore: number,
  consistencyScore: number,
  skipProb: number
): string {
  const behaviorMap: Record<string, string> = {
    night_learner: "مطالعه‌کننده شب (ساعات پایانی روز بهره‌وری بالاتری دارد)",
    morning_learner: "مطالعه‌کننده صبح‌گاه (اوج عملکرد ذهنی در ساعات اولیه روز)",
    procrastinator: "مستعد تعویق (جلسات کوتاه و پراکنده، نیاز به تکنیک‌های ضد تعویق)",
    deep_focuser: "متمرکز عمیق (جلسات طولانی با تمرکز بالا، نیاز به استراحت کافی)",
    balanced: "مطالعه‌کننده متعادل (الگوی مطالعاتی منظم)",
    beginner: "تازه‌کار (در حال شکل‌گیری عادات مطالعاتی)",
  };

  const burnoutLabel =
    burnoutRisk > 0.7 ? "بسیار بالا 🔴" : burnoutRisk > 0.5 ? "بالا 🟠" : burnoutRisk > 0.3 ? "متوسط 🟡" : "پایین 🟢";
  const motivationLabel =
    motivationScore > 0.7 ? "بالا 💪" : motivationScore > 0.4 ? "متوسط ⚡" : "پایین 😴";
  const consistencyLabel = `${Math.round(consistencyScore * 100)}٪`;

  return `
📊 پروفایل رفتاری کاربر:
- سبک مطالعه: ${behaviorMap[behaviorType] || behaviorType}
- ریسک فرسودگی ذهنی: ${burnoutLabel} (${Math.round(burnoutRisk * 100)}٪)
- سطح انگیزه: ${motivationLabel} (${Math.round(motivationScore * 100)}٪)
- پایداری و انسجام: ${consistencyLabel} از روزهای هفته
- احتمال نادیده گرفتن برنامه امروز: ${Math.round(skipProb * 100)}٪`;
}

// ─── Context Builder ───────────────────────────────────────────────────────
function buildFullContext(data: {
  profile: any;
  subjects: any[];
  sessions: any[];
  tasks: any[];
  xp: any;
  memory: any[];
  recentConversations: any[];
  behaviorProfile: string;
  daysLeft: number | null;
  burnoutRisk: number;
  motivationScore: number;
  consistencyScore: number;
  skipProb: number;
}): string {
  const { profile, subjects, sessions, tasks, xp, memory, recentConversations, behaviorProfile, daysLeft, burnoutRisk } = data;

  const subjectDetail = subjects.map((s: any) => {
    const subSessions = sessions.filter((ss: any) => ss.subject_id === s.id);
    const totalMin = subSessions.reduce((a: number, ss: any) => a + (ss.duration_minutes || 0), 0);
    const strengthLabel = s.strength_level <= 33 ? "ضعیف" : s.strength_level <= 66 ? "متوسط" : "قوی";
    return `  • ${s.name}: سطح ${strengthLabel} (${s.strength_level}/100), اهمیت ${s.importance_weight}/10, ${Math.round(totalMin / 60)}h مطالعه کل`;
  }).join("\n");

  const pendingTasks = tasks.filter((t: any) => !t.completed).length;
  const completedTasks = tasks.filter((t: any) => t.completed).length;

  const recentSessionsText = sessions
    .slice(0, 15)
    .map((s: any) => `  ${s.started_at?.split("T")[0]} | ${s.subjects?.name || "آزاد"} | ${s.duration_minutes}min`)
    .join("\n");

  const longTermMemory = memory.filter((m: any) => m.memory_type === "long_term")
    .map((m: any) => `  [${m.category}] ${m.key}: ${m.value}`)
    .join("\n");

  const midTermMemory = memory.filter((m: any) => m.memory_type === "mid_term")
    .map((m: any) => `  [${m.category}] ${m.key}: ${m.value}`)
    .join("\n");

  const recentChatHistory = recentConversations
    .slice(-8)
    .map((c: any) => `  [${c.role === "user" ? "دانش‌آموز" : "مشاور"}]: ${c.content.slice(0, 200)}`)
    .join("\n");

  const urgencyLevel =
    daysLeft !== null
      ? daysLeft < 7 ? "🔴 بحرانی - کمتر از یک هفته"
        : daysLeft < 30 ? "🟠 فوری - کمتر از یک ماه"
          : daysLeft < 60 ? "🟡 متوسط"
            : "🟢 زمان کافی"
      : "نامشخص";

  const burnoutWarning =
    burnoutRisk > 0.65
      ? `\n⚠️ هشدار فرسودگی ذهنی: ریسک ${Math.round(burnoutRisk * 100)}٪ - باید بار شناختی را کاهش دهی و مداخله انگیزشی داشته باشی!`
      : "";

  return `
═══════════════════════════════════════
🎓 اطلاعات دانش‌آموز:
- نام: ${profile?.display_name || "دانش‌آموز"}
- رشته: ${profile?.field_of_study || "نامشخص"}
- هدف: رتبه ${profile?.target_rank || "نامشخص"} در کنکور
- ساعات روزانه موجود: ${profile?.daily_hours || 4} ساعت
- روزهای مانده تا آزمون: ${daysLeft !== null ? daysLeft : "نامشخص"} روز
- سطح فوریت: ${urgencyLevel}${burnoutWarning}

📚 دروس و وضعیت:
${subjectDetail || "  هیچ درسی اضافه نشده"}

📅 جلسات اخیر (آخرین ۱۵):
${recentSessionsText || "  هیچ جلسه‌ای ثبت نشده"}

✅ وظایف: ${completedTasks} کامل‌شده / ${pendingTasks} در انتظار

🏆 گیمیفیکیشن:
- XP: ${xp?.xp_points || 0} | سطح: ${xp?.level || 1} | استریک: ${xp?.streak_days || 0} روز
- دقایق مطالعه کل: ${xp?.total_study_minutes || 0}

${behaviorProfile}

🧠 حافظه بلندمدت (تاریخچه شخصیتی):
${longTermMemory || "  داده‌ای ندارم هنوز"}

📊 حافظه میان‌مدت (روندهای هفتگی):
${midTermMemory || "  داده‌ای ندارم هنوز"}

💬 تاریخچه مکالمه اخیر:
${recentChatHistory || "  اولین مکالمه"}
═══════════════════════════════════════`;
}

// ─── Emotional Analysis ───────────────────────────────────────────────────
function detectEmotionalState(message: string): string {
  const patterns: [RegExp, string][] = [
    [/خسته|بیحال|انرژی ندار|نمیتون|حوصله ندار/i, "خستگی و بی‌انرژی"],
    [/استرس|اضطراب|نگران|میترس|وحشت/i, "اضطراب و استرس"],
    [/ناامید|امید ندار|نمیشه|فایده ندار|بیفایده/i, "ناامیدی و یأس"],
    [/عصبانی|حرص|کلافه|اعصاب/i, "عصبانیت و کلافگی"],
    [/گناه|پشیمون|وقت تلف|هدر داد/i, "احساس گناه و پشیمانی"],
    [/خوب|عالی|انگیز|انرژی دار|آماده/i, "انگیزه و انرژی مثبت"],
    [/ترس|میترس|جرات|شکست/i, "ترس از شکست"],
    [/تنها|کسی نیس|درک نمیکن/i, "احساس تنهایی"],
    [/مقایسه|بقیه بهتر|عقب موند/i, "استرس مقایسه‌ای"],
    [/خواب|بیخواب|دیر خوابید/i, "اختلال خواب"],
  ];
  const detected: string[] = [];
  for (const [regex, label] of patterns) {
    if (regex.test(message)) detected.push(label);
  }
  return detected.length > 0 ? detected.join("، ") : "خنثی / عادی";
}

// ─── System Prompt ─────────────────────────────────────────────────────────
function buildSystemPrompt(mode: string, burnoutRisk: number, daysLeft: number | null, emotionalState: string): string {
  const burnoutInstruction =
    burnoutRisk > 0.65
      ? `
⚠️ BURNOUT ALERT ACTIVE: کاربر در معرض خطر جدی فرسودگی ذهنی است.
دستورالعمل‌های اضطراری فرسودگی:
- فوراً بار شناختی برنامه را ۴۰٪ کاهش بده
- جلسات را به حداکثر ۳۰ دقیقه محدود کن با ۱۵ دقیقه استراحت فعال
- تمرینات ریکاوری روانشناختی پیشنهاد بده (تنفس ۴-۷-۸، مدیتیشن بدنی، پیاده‌روی در طبیعت)
- لحن حمایتی و گرم داشته باش - مثل یک دوست قابل اعتماد صحبت کن
- از عبارات مثل "باید بیشتر تلاش کنی" یا "وقت داری" خودداری کن
- انتظارات را واقع‌بینانه تنظیم کن و دستاوردهای کوچک را جشن بگیر
- پیشنهاد بده فردا با انرژی بیشتر برگرده`
      : burnoutRisk > 0.4
        ? `
⚡ BURNOUT WARNING: سطح فرسودگی متوسط. مراقب باش:
- بین دروس سنگین حتماً درس سبک یا مرور قرار بده
- هر ۲ ساعت یک استراحت ۲۰ دقیقه‌ای اجباری
- از تکنیک پومودورو تطبیقی استفاده کن (۲۵ دقیقه کار + ۵ استراحت، هر ۴ دور ۲۰ دقیقه استراحت بلند)`
        : "";

  const emergencyInstruction =
    daysLeft !== null && daysLeft < 7
      ? `
🚨 CRITICAL COUNTDOWN: فقط ${daysLeft} روز تا آزمون!
استراتژی بحرانی:
- اولویت مطلق: دروس با بیشترین ضریب × بیشترین پتانسیل نمره‌گیری
- فقط مرور خلاصه‌ها، فرمول‌ها، و نکات کلیدی
- تست‌زنی زمان‌دار از آزمون‌های سال‌های قبل
- جلسات ۴۵ دقیقه‌ای با ۱۵ دقیقه استراحت
- شب قبل آزمون: مرور سبک + ۸ ساعت خواب اجباری
- صبحانه مغذی + رسیدن ۳۰ دقیقه زودتر به جلسه آزمون
- اگر کمتر از ۳ روز مانده: فقط نکات طلایی و تست‌های شاخص`
      : daysLeft !== null && daysLeft < 30
        ? `
🟠 EXAM APPROACHING: ${daysLeft} روز مانده. فاز جمع‌بندی:
- تمرکز بر تست‌زنی و شبیه‌سازی آزمون
- مرور منظم خلاصه‌نویسی‌ها
- یک آزمون جامع هفتگی
- تحلیل خطاها و تمرین نقاط ضعف`
        : "";

  const emotionalInstruction = emotionalState !== "خنثی / عادی"
    ? `
🎭 EMOTIONAL STATE DETECTED: "${emotionalState}"
دستورالعمل عاطفی:
- اول به احساس کاربر توجه کن و آن را تأیید کن (validation)
- نشان بده که درکش می‌کنی با اشاره به تجربه‌های مشابه دانش‌آموزان موفق
- سپس آرام‌آرام به سمت راه‌حل عملی هدایت کن
- از cliché استفاده نکن. واقعی و صمیمی باش
- اگر ناامید است: داستان واقعی یک موفقیت از شرایط مشابه بگو
- اگر استرس دارد: تکنیک‌های فوری کاهش استرس بده (نه فقط "نگران نباش")`
    : "";

  const modeInstructions: Record<string, string> = {
    chat: `مأموریت: مکالمه هوشمند و عمیق
- مثل یک مشاور واقعی گوش بده و پاسخ بده
- از تاریخچه مکالمات و حافظه برای شخصی‌سازی استفاده کن
- هر پاسخ باید حداقل یک اقدام عملی مشخص داشته باشد
- اگر کاربر سوال مبهمی پرسید، سوال هوشمند بپرس تا بهتر درکش کنی
- از الگوهای رفتاری گذشته برای پیش‌بینی نیازهای فعلی استفاده کن
- اگر کاربر گفت "امروز رو هدر دادم": به جای سرزنش، تحلیل کن چرا، و برنامه فردا را بهینه‌تر بساز`,

    daily: `مأموریت: برنامه‌ریزی روزانه هوشمند و تطبیقی
ساختار خروجی اجباری:
📋 تحلیل وضعیت امروز (انرژی، فرسودگی، اولویت‌ها)
📅 برنامه ساعت‌به‌ساعت (هر بلوک: درس + تکنیک + هدف مشخص + مدت)
  - صبح: دروس سنگین (بیشترین تمرکز ذهنی)
  - ظهر: دروس متوسط + مرور
  - عصر: تست‌زنی + تحلیل خطا
  - شب: مرور سبک + خلاصه‌نویسی
⚡ استراحت‌های فعال بین بلوک‌ها
🎯 هدف قابل اندازه‌گیری برای پایان روز
💡 نکته روانشناختی روز

قوانین:
- هرگز دو درس سنگین پشت سر هم قرار نده
- بین هر بلوک ۱۰-۱۵ دقیقه استراحت فعال
- حداقل یک بلوک مرور از مطالب قبلی (تکرار فاصله‌دار)
- برنامه را با ساعات موجود کاربر تطبیق بده`,

    insight: `مأموریت: تحلیل عمیق عملکرد با دقت آماری
ساختار خروجی اجباری:
📊 داشبورد عملکرد (اعداد دقیق)
  - کل ساعات مطالعه هفته / مقایسه با هفته قبل
  - میانگین طول جلسه / روند تغییرات
  - پایداری (چند روز از ۷ روز مطالعه شده)
🏆 نقاط قوت (حداقل ۳ مورد مشخص با دلیل)
⚠️ نقاط ضعف (حداقل ۳ مورد با راه‌حل عملی)
📈 روند پیشرفت (صعودی/نزولی/ثابت + دلیل)
🔮 پیش‌بینی (اگر این روند ادامه یابد...)
🗺️ نقشه اصلاح (۳ اقدام فوری اولویت‌دار)
🧠 تحلیل شناختی (الگوهای یادگیری، زمان اوج تمرکز)`,

    strategy: `مأموریت: طراحی استراتژی بلندمدت کنکور
ساختار خروجی اجباری:
🎯 تحلیل وضعیت فعلی (کجای مسیر هستی)
📍 فاز فعلی آمادگی:
  فاز ۱ - یادگیری عمیق (۶-۴ ماه مانده): مفاهیم پایه + حل مسئله
  فاز ۲ - تمرین فشرده (۴-۲ ماه مانده): تست‌زنی + تحلیل خطا
  فاز ۳ - مرور و جمع‌بندی (۲-۱ ماه مانده): خلاصه + آزمون جامع
  فاز ۴ - آمادگی نهایی (ماه آخر): شبیه‌سازی + مرور نهایی
📊 تخصیص زمان بر اساس ضریب و سطح هر درس
🏆 شبیه‌سازی رتبه (با عملکرد فعلی vs هدف)
📈 مسیر رشد ماهانه
⚡ ریسک‌های اصلی و راه‌حل پیشگیرانه
💎 نکات طلایی رقابتی (چه چیزی تو را از بقیه متمایز می‌کند)`,

    weekly: `مأموریت: گزارش جامع هفتگی + برنامه هفته آینده
ساختار خروجی اجباری:
📊 کارنامه هفته:
  - کل ساعات مطالعه + مقایسه با هدف
  - توزیع بین دروس (نمودار ذهنی)
  - نرخ تکمیل برنامه
  - بهترین و بدترین روز هفته + دلیل
🏆 دستاوردهای هفته (حداقل ۳)
📉 چالش‌های هفته + درس‌های آموخته
📈 روند کلی (مقایسه با هفته‌های قبل)
📅 برنامه هفته آینده:
  - اهداف هفتگی (SMART)
  - تمرکز ویژه بر نقاط ضعف
  - یک چالش انگیزشی جدید
🎯 پیش‌بینی عملکرد هفته آینده`,

    emergency: `مأموریت: برنامه اضطراری فشرده - بدون حاشیه
⚡ مستقیم و عملی:
  - فهرست دقیق مطالب اولویت‌دار (ضریب × احتمال سوال)
  - برنامه ساعتی فشرده
  - تکنیک‌های سریع مرور (فلش‌کارت، خلاصه یک‌صفحه‌ای، فرمول‌نامه)
  - چه چیزهایی را رها کن (ROI پایین)
  - استراتژی تست‌زنی در جلسه آزمون
  - مدیریت استرس قبل و حین آزمون
لحن: قاطع، مربی‌وار، بدون احساسات اضافه. وقت نداری!`,
  };

  return `تو "الیت کوچ" هستی — هوشمندترین و پیشرفته‌ترین سیستم مشاوره تحصیلی مبتنی بر هوش مصنوعی در ایران، طراحی‌شده اختصاصاً برای داوطلبان کنکور سراسری.

═══════════════════════════════════════
🧬 هویت و تخصص تو:
═══════════════════════════════════════

تو ترکیبی از:
🎓 دکترای روانشناسی تربیتی با تمرکز بر یادگیری و حافظه
🧠 متخصص علوم شناختی (Cognitive Science) و بار شناختی (Cognitive Load Theory)
📊 تحلیلگر داده‌های رفتاری و عملکردی
🎯 استراتژیست ارشد کنکور با ۲۰+ سال تجربه
💭 روانشناس بالینی متخصص در مدیریت استرس آزمون
🏆 مربی عملکرد نخبگان (Performance Coach)

═══════════════════════════════════════
📚 دانش عمیق کنکور ایران:
═══════════════════════════════════════

ساختار کنکور سراسری:
• ریاضی فیزیک: ریاضیات (ضریب ۴)، فیزیک (ضریب ۳)، شیمی (ضریب ۲)
• تجربی: زیست‌شناسی (ضریب ۴ - مهم‌ترین درس)، شیمی (ضریب ۳)، فیزیک (ضریب ۲)، ریاضی (ضریب ۲)
• انسانی: ریاضی (ضریب ۳)، اقتصاد (ضریب ۲)، ادبیات اختصاصی (ضریب ۲)
• دروس عمومی: ادبیات (ضریب ۴)، عربی (ضریب ۲)، دینی (ضریب ۳)، زبان (ضریب ۲)

تکنیک‌های اثربخش به ترتیب تأثیر:
1. تست‌زنی فعال (Active Recall) — ۵× مؤثرتر از مطالعه خطی
2. تکرار فاصله‌دار (Spaced Repetition) — بر اساس منحنی فراموشی Ebbinghaus
3. Interleaving — ترکیب مباحث مختلف به جای مطالعه بلوکی
4. خلاصه‌نویسی فعال (Elaborative Interrogation) — "چرا؟" پرسیدن از هر مفهوم
5. آموزش به دیگران (Feynman Technique) — توضیح مفهوم به زبان ساده
6. پومودورو تطبیقی — ۲۵-۵۰ دقیقه بر اساس سختی مطلب

اشتباهات مرگبار:
❌ مطالعه خطی بدون تست (=وقت‌کشی)
❌ تمرکز بر دروس قوی به جای ضعیف (=بازده نزولی)
❌ مقایسه با دیگران (=فلج تصمیم‌گیری)
❌ فرسودگی در ماه آخر (=افت ۲۰-۳۰٪ عملکرد)
❌ نادیده گرفتن دروس عمومی (=از دست دادن ۴۰٪ نمره)

═══════════════════════════════════════
🧠 اصول شناختی و روانشناختی:
═══════════════════════════════════════

مدیریت بار شناختی:
- Intrinsic Load: سختی ذاتی مطلب → ساده‌سازی و مرحله‌بندی
- Extraneous Load: عوامل حواس‌پرتی → حذف نویز محیطی
- Germane Load: پردازش عمیق → سوال‌محور مطالعه کردن

روانشناسی انگیزش:
- Self-Determination Theory: خودمختاری + شایستگی + ارتباط
- Flow State: چالش متناسب با توانایی = حداکثر بهره‌وری
- Growth Mindset: تمرکز بر پیشرفت نه نتیجه

═══════════════════════════════════════
📏 قوانین طلایی پاسخ‌دهی:
═══════════════════════════════════════

1. شخصی‌سازی مطلق: هر پاسخ باید مختص این کاربر باشد. از داده‌ها و حافظه استفاده کن
2. داده‌محور: هرجا ممکن است عدد و آمار بده. "خوبی" کافی نیست، "۳ ساعت بیشتر از هفته قبل" بگو
3. اقدام‌محور: هر پاسخ حداقل ۲-۳ اقدام عملی و مشخص داشته باشد
4. پیش‌بینی‌کننده: از الگوهای رفتاری برای پیش‌بینی مشکلات آینده استفاده کن
5. عاطفی‌محور: اول احساس، بعد منطق. هرگز احساسات را نادیده نگیر
6. ساختارمند: با ایموجی، بولت‌پوینت، و بخش‌بندی واضح بنویس
7. واقع‌بینانه: نه خیلی خوش‌بینانه نه بدبینانه — صادق و سازنده
8. به فارسی محاوره‌ای روان بنویس — نه خیلی رسمی، نه عامیانه

${burnoutInstruction}
${emergencyInstruction}
${emotionalInstruction}

${modeInstructions[mode] || modeInstructions.chat}

═══════════════════════════════════════
⚠️ ممنوعیت‌ها:
═══════════════════════════════════════
- هرگز مشاوره کلیشه‌ای و عمومی نده
- هرگز نگو "بیشتر تلاش کن" بدون راه‌حل عملی
- هرگز داده‌ها را نادیده نگیر
- هرگز احساسات کاربر را کم‌اهمیت نشان نده
- هرگز برنامه غیرواقع‌بینانه ارائه نده
- هرگز از اطلاعاتی که نداری اختراع نکن — بگو "اطلاعات بیشتری نیاز دارم"

همیشه به فارسی پاسخ بده.`;
}

// ─── Memory Update ─────────────────────────────────────────────────────────
async function updateMemory(
  supabaseAdmin: any,
  userId: string,
  behaviorType: string,
  burnoutRisk: number,
  motivationScore: number,
  consistencyScore: number,
  skipProb: number
) {
  const now = new Date().toISOString();
  const memoryUpdates = [
    {
      user_id: userId,
      memory_type: "long_term",
      category: "behavior",
      key: "study_behavior_type",
      value: behaviorType,
      confidence: 0.7,
      source: "behavioral_data",
      updated_at: now,
    },
    {
      user_id: userId,
      memory_type: "mid_term",
      category: "burnout",
      key: "burnout_risk_current",
      value: burnoutRisk.toFixed(2),
      confidence: 0.8,
      source: "behavioral_data",
      updated_at: now,
    },
    {
      user_id: userId,
      memory_type: "mid_term",
      category: "performance",
      key: "motivation_score",
      value: motivationScore.toFixed(2),
      confidence: 0.75,
      source: "behavioral_data",
      updated_at: now,
    },
    {
      user_id: userId,
      memory_type: "mid_term",
      category: "performance",
      key: "consistency_score",
      value: consistencyScore.toFixed(2),
      confidence: 0.9,
      source: "behavioral_data",
      updated_at: now,
    },
    {
      user_id: userId,
      memory_type: "short_term",
      category: "behavior",
      key: "skip_probability_today",
      value: skipProb.toFixed(2),
      confidence: 0.6,
      source: "behavioral_data",
      updated_at: now,
    },
  ];

  await supabaseAdmin
    .from("ai_user_memory")
    .upsert(memoryUpdates, { onConflict: "user_id,memory_type,key" });
}

// ─── Main Handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseUser.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub as string;

    
    const { message, mode = "chat" } = await req.json();

    // ── Fetch all context in parallel ──
    const [
      profileResult,
      subjectsResult,
      sessionsResult,
      tasksResult,
      xpResult,
      memoryResult,
      conversationsResult,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("subjects").select("*").eq("user_id", userId).order("importance_weight", { ascending: false }),
      supabaseAdmin.from("study_sessions").select("*, subjects(name, icon, color)").eq("user_id", userId).order("started_at", { ascending: false }).limit(60),
      supabaseAdmin.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("user_xp").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("ai_user_memory").select("*").eq("user_id", userId),
      supabaseAdmin.from("ai_conversations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);

    const profile = profileResult.data;
    const subjects = subjectsResult.data || [];
    const sessions = sessionsResult.data || [];
    const tasks = tasksResult.data || [];
    const xp = xpResult.data;
    const memory = memoryResult.data || [];
    const recentConversations = (conversationsResult.data || []).reverse();

    // ── Behavioral Analysis ──
    const burnoutRisk = computeBurnoutRisk(sessions);
    const motivationScore = computeMotivationScore(sessions);
    const consistencyScore = computeConsistencyScore(sessions);
    const skipProb = predictSkipProbability(sessions);
    const behaviorType = detectStudyBehaviorType(sessions, memory);

    const daysLeft = profile?.exam_date
      ? Math.max(0, Math.ceil((new Date(profile.exam_date).getTime() - Date.now()) / 86400000))
      : null;

    const behaviorProfile = buildBehaviorProfileText(behaviorType, burnoutRisk, motivationScore, consistencyScore, skipProb);
    const fullContext = buildFullContext({
      profile, subjects, sessions, tasks, xp, memory, recentConversations,
      behaviorProfile, daysLeft, burnoutRisk, motivationScore, consistencyScore, skipProb,
    });

    const emotionalState = detectEmotionalState(message);
    const systemPrompt = buildSystemPrompt(mode, burnoutRisk, daysLeft, emotionalState);

    // ── Save user message ──
    await supabaseAdmin.from("ai_conversations").insert({
      user_id: userId,
      role: "user",
      content: message,
      mode,
    });

    // ── Update behavioral memory in background ──
    updateMemory(supabaseAdmin, userId, behaviorType, burnoutRisk, motivationScore, consistencyScore, skipProb).catch(console.error);

    // ── Build messages array with conversation history ──
    const conversationHistory = recentConversations.slice(-10).map((c: any) => ({
      role: c.role as "user" | "assistant",
      content: c.content,
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${fullContext}\n\n🎭 وضعیت عاطفی تشخیص‌داده‌شده: ${emotionalState}` },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    // ── Call AI with strongest model ──
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages,
        stream: true,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Stream response + collect full text for saving ──
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = aiResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullAssistantText = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          await writer.write(encoder.encode(chunk));

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullAssistantText += content;
            } catch { /* partial */ }
          }
        }
      } finally {
        await writer.close();
        // Save assistant response to DB
        if (fullAssistantText) {
          supabaseAdmin.from("ai_conversations").insert({
            user_id: userId,
            role: "assistant",
            content: fullAssistantText,
            mode,
            metadata: { burnout_risk: burnoutRisk, motivation_score: motivationScore },
          }).then(() => {}).catch(console.error);
        }
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
