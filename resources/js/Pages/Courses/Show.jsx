import { useState, useEffect, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // تأكد من صحة المسار لديك
import IslamicPattern from '@/Components/IslamicPattern';
import {
    BookOpen,
    Video,
    FileQuestion,
    ClipboardList,
    FolderOpen,
    ChevronDown,
    Eye,
    Lock,
    PlayCircle,
    Rocket,
    RefreshCw,
    Smartphone,
    Clock,
    Sun,
    Moon,
    Layers,
    CalendarPlus,
    CalendarClock,
} from 'lucide-react';

/** بادچ دايري صغير لعرض عدّاد (فيديوهات / امتحانات / واجبات / ملفات) بلمسة الهوية الذهبية بدل الألوان العشوائية */
function StatPill({ icon: Icon, count, label }) {
    if (!count && count !== 0) return null;
    return (
        <div className="flex items-center gap-2 rounded bg-white/10 backdrop-blur-sm border border-white/15 pl-4 pr-1.5 py-1.5 shrink-0">
            <span className="flex items-center justify-center w-7 h-7 rounded bg-[#C99A2E] text-[#0B2A4A] font-black text-xs">
                {count}
            </span>
            <Icon className="w-4 h-4 text-[#E4C878]" />
            <span className="text-sm text-white/90 font-medium">{label}</span>
        </div>
    );
}

/** بادچ تاريخ بسيط (إنشاء / آخر تحديث) */
function DatePill({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5 text-white/70">
                <Icon className="w-4 h-4 text-[#E4C878]" />
                {label}
            </span>
            <span className="bg-white/15 text-white px-3 py-0.5 rounded font-medium">{value}</span>
        </div>
    );
}

export default function CourseShow({ course, lessons = [], enrolled }) {
    const { post, processing, errors } = useForm({
        course_id: course.id,
    });

    const totalLessons = lessons.length;
    const originalPrice = course.original_price ?? null;
    const hasDiscount = originalPrice && originalPrice > course.price;

    // تجميع الدروس في وحدات: لو كل درس معاه lesson.unit_title بيتقسّموا، لو لأ بيتحطوا في وحدة واحدة
    const units = useMemo(() => {
        if (!lessons.length) return [];
        const hasUnits = lessons.some((l) => l.unit_title);
        if (!hasUnits) {
            return [{ title: 'المحتوى الرئيسي', subtitle: course.title, lessons }];
        }
        const map = new Map();
        lessons.forEach((l) => {
            const key = l.unit_title || 'محتوى إضافي';
            if (!map.has(key)) map.set(key, { title: key, subtitle: l.unit_subtitle || '', lessons: [] });
            map.get(key).lessons.push(l);
        });
        return Array.from(map.values());
    }, [lessons, course.title]);

    const [openUnit, setOpenUnit] = useState(0);

    return (
        <AuthenticatedLayout>
            <Head title={course.title} />

            <div
                className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white font-sans selection:bg-[#1769AA] selection:text-white transition-colors duration-300"
                dir="rtl"
            >
                <div className="max-w-full mx-auto px-5 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-16 space-y-8">
                    {/* ===== Hero: بانر ملوّن كبير بأركان دائرية ===== */}
                    <div className="relative rounded overflow-hidden pt-10 sm:pt-14 px-6 sm:px-10 pb-40 sm:pb-56">
                        {/* خلفية متدرجة بهوية دكتور ثانوي */}
                        <div
                            className="absolute inset-0"
                            style={{ background: 'linear-gradient(135deg, #0B2A4A 0%, #123a63 55%, #1769AA 100%)' }}
                        />
                        {course.cover_image && (
                            <div
                                className="absolute inset-0 opacity-20"
                                style={{
                                    backgroundImage: `url(${course.cover_image})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center top',
                                }}
                            />
                        )}
                        <IslamicPattern className="absolute inset-0 w-full h-full text-[#C99A2E] [--pattern-opacity:0.12] pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A4A] via-transparent to-transparent" />

                        {/* محتوى الهيرو */}
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between gap-3">
                                <nav className="text-xs sm:text-sm text-white/60 flex items-center gap-2">
                                    <Link href="/courses" className="hover:text-[#E4C878] transition">
                                        الصفوف
                                    </Link>
                                    <span className="text-white/30">/</span>
                                    <span className="text-white/90 font-medium truncate max-w-[10rem] sm:max-w-xs">{course.title}</span>
                                </nav>
                            </div>

                            {/* شريط البادچات: فيديوهات / امتحانات / واجبات / ملفات */}
                            <div className="flex flex-wrap gap-3">
                                <StatPill icon={Video} count={course.videos_count ?? totalLessons} label="فيديوهات" />
                                <StatPill icon={FileQuestion} count={course.exams_count} label="امتحانات" />
                                <StatPill icon={ClipboardList} count={course.homeworks_count} label="واجبات" />
                                <StatPill icon={FolderOpen} count={course.files_count} label="ملفات" />
                            </div>

                            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white max-w-3xl">
                                {course.title}
                            </h1>

                            <p className="text-white/75 text-base sm:text-lg leading-relaxed max-w-2xl font-light">
                                {course.description}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-8 pt-2">
                                <DatePill icon={CalendarPlus} label="تاريخ إنشاء الصف" value={course.created_at_formatted} />
                                <DatePill icon={CalendarClock} label="آخر تحديث للكورس" value={course.updated_at_formatted} />
                            </div>
                        </div>
                    </div>

                    {/* ===== منطقة التداخل: الكارت العايم + عمود المحتوى ===== */}
                    <div className="relative -mt-8 sm:-mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* عمود المحتوى: صورة كبيرة + وصف + وحدات المنهج (أكورديون) */}
                        <div className="lg:col-span-2 lg:order-1 space-y-6">
                            {course.cover_image && (
                                <div className="rounded overflow-hidden shadow-xl shadow-black/10">
                                    <img src={course.cover_image} alt={course.title} className="w-full h-56 sm:h-72 object-cover" />
                                </div>
                            )}

                            <div className="roundedborder border-slate-200 dark:border-white/10 bg-white dark:bg-gray-900/80 backdrop-blur-sm shadow-xl shadow-slate-200/60 dark:shadow-2xl p-6 sm:p-8 space-y-6">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <span className="w-2 h-7 bg-[#C99A2E] rounded inline-block" />
                                    محتوى الصف
                                </h2>

                                {units.length > 0 ? (
                                    <div className="space-y-4">
                                        {units.map((unit, uIndex) => {
                                            const isOpen = openUnit === uIndex;
                                            return (
                                                <div
                                                    key={unit.title}
                                                    className="rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-gray-950/40 overflow-hidden"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenUnit(isOpen ? -1 : uIndex)}
                                                        aria-expanded={isOpen}
                                                        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-right hover:bg-slate-100 dark:hover:bg-white/[0.03] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                                                    >
                                                        <div className="flex items-center gap-3.5">
                                                            <span className="flex items-center justify-center w-10 h-10 rounded bg-[#1769AA]/10 dark:bg-[#1769AA]/20 text-[#1769AA] dark:text-[#C99A2E] shrink-0">
                                                                <Layers className="w-5 h-5" />
                                                            </span>
                                                            <div className="text-right">
                                                                <div className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                                                                    {unit.title}
                                                                </div>
                                                                {unit.subtitle && (
                                                                    <div className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                                                                        {unit.subtitle}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="text-xs text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded">
                                                                {unit.lessons.length} دروس
                                                            </span>
                                                            <ChevronDown
                                                                className={`w-5 h-5 text-slate-400 dark:text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                                            />
                                                        </div>
                                                    </button>

                                                    {isOpen && (
                                                        <div className="divide-y divide-slate-200 dark:divide-white/5 border-t border-slate-200 dark:border-white/10">
                                                            {unit.lessons.map((lesson, index) => {
                                                                const isPreview = lesson.is_preview ?? false;
                                                                const isUnlocked = enrolled || isPreview;

                                                                const rowContent = (
                                                                    <>
                                                                        <div className="flex items-center gap-3.5">
                                                                            <div className="w-8 h-8 rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-gray-400 group-hover:border-amber-400/60 dark:group-hover:border-amber-500/50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                                                                {index + 1}
                                                                            </div>
                                                                            <span className="text-sm sm:text-base text-slate-700 dark:text-gray-200 group-hover:text-slate-900 dark:group-hover:text-white transition font-medium">
                                                                                {lesson.title}
                                                                            </span>
                                                                        </div>

                                                                        {isPreview && !enrolled ? (
                                                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-[#C99A2E] border border-amber-400/30 dark:border-amber-500/20 font-semibold text-xs">
                                                                                <Eye className="w-3.5 h-3.5" />
                                                                                معاينة مجانية
                                                                            </span>
                                                                        ) : isUnlocked ? (
                                                                            <span className="flex items-center gap-1.5 text-slate-400 dark:text-gray-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                                                                <PlayCircle className="w-5 h-5" />
                                                                            </span>
                                                                        ) : (
                                                                            <span className="p-1.5 text-slate-400 dark:text-gray-500" title="مغلق - اشترك في الصف للدخول">
                                                                                <Lock className="w-4 h-4" />
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                );

                                                                return isUnlocked ? (
                                                                    <Link
                                                                        key={lesson.id}
                                                                        href={route('courses.learn', { course: course.id, lesson: lesson.id })}
                                                                        className="flex items-center justify-between p-4 sm:px-6 hover:bg-white dark:hover:bg-white/[0.03] transition group cursor-pointer"
                                                                    >
                                                                        {rowContent}
                                                                    </Link>
                                                                ) : (
                                                                    <div
                                                                        key={lesson.id}
                                                                        title="مغلق - اشترك في الصف للدخول"
                                                                        className="flex items-center justify-between p-4 sm:px-6 opacity-60 cursor-not-allowed group"
                                                                    >
                                                                        {rowContent}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-center py-12 bg-slate-50 dark:bg-white/[0.02] rounded border border-dashed border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400">
                                        <Clock className="w-7 h-7 text-amber-500 dark:text-amber-400/80" />
                                        سيتم إضافة دروس الصف قريباً.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* الكارت الزجاجي العايم: غلاف + سعر + اشتراك + إحصائيات سريعة */}
                        <div className="relative z-20 lg:col-span-1 lg:order-2 lg:translate-x-4 lg:-mt-48 lg:sticky lg:top-6 lg:self-start">
                            <div className="rounded overflow-hidden border border-white/20 dark:border-white/10 bg-white/90 dark:bg-gray-900/90 backdrop-blur ring-1 ring-black/5 dark:ring-white/5">
                                <div className="p-4 sm:p-5 space-y-5">
                                    {course.thumbnail ? (
                                        <div className="relative overflow-hidden rounded h-56 sm:h-64 w-full bg-slate-900">
                                            <img
                                                src={course.thumbnail}
                                                alt=""
                                                aria-hidden="true"
                                                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
                                            />
                                            <img
                                                src={course.thumbnail}
                                                alt={course.title}
                                                className="relative z-10 w-full h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-56 sm:h-64 rounded bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center text-slate-400 dark:text-gray-500 text-sm">
                                            لا يوجد صورة غلاف
                                        </div>
                                    )}

                                    {/* السعر */}
                                    <div className="flex-center-both flex justify-center">
                                        <div className="inline-flex items-center gap-2 rounded bg-[#1769AA] pl-4 pr-1.5 py-1.5">
                                            <span className="flex items-center justify-center rounded bg-[#0B2A4A] text-[#E4C878] font-black text-lg px-3 py-1">
                                                {course.price > 0 ? course.price : 'مجاني'}
                                            </span>
                                            {course.price > 0 && <span className="text-white text-sm font-medium">جنيهًا</span>}
                                            {hasDiscount && (
                                                <span className="text-white/60 line-through text-sm mr-1">{originalPrice}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* زر الاشتراك */}
                                    {enrolled ? (
                                        totalLessons > 0 ? (
                                            <Link
                                                href={route('courses.learn', course.id)}
                                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold active:scale-[0.98]"
                                            >
                                                <span>متابعة التعلم</span>
                                                <Rocket className="w-5 h-5" />
                                            </Link>
                                        ) : (
                                            <div className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-500 font-bold cursor-not-allowed">
                                                <Clock className="w-5 h-5" />
                                                <span>لا توجد دروس مضافة بعد</span>
                                            </div>
                                        )
                                    ) : (
                                        <form onSubmit={(e) => { e.preventDefault(); post(route('orders.store')); }} className="space-y-2">
                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full py-3.5 px-4 rounded bg-[#C99A2E] text-[#0B2A4A] hover:bg-[#E4C878] font-extrabold transition shadow-lg shadow-amber-900/20 disabled:opacity-50 active:scale-[0.98] text-base"
                                            >
                                                {processing ? 'جاري التسجيل...' : 'اشترك الآن !'}
                                            </button>
                                            {errors.course_id && (
                                                <p className="text-red-500 dark:text-red-400 text-xs text-center font-medium">{errors.course_id}</p>
                                            )}
                                        </form>
                                    )}

                                    {/* إحصائيات سريعة */}
                                    <div className="text-sm divide-y divide-slate-200 dark:divide-white/10 border-t border-slate-200 dark:border-white/10">
                                        <div className="flex items-center justify-between py-3">
                                            <span className="flex items-center gap-2 text-slate-700 dark:text-gray-200">
                                                <Clock className="w-4 h-4 text-[#1769AA] dark:text-[#C99A2E]" />
                                                المحتوى
                                            </span>
                                            <span className="text-slate-500 dark:text-gray-400">
                                                {course.duration_hours ? `+${course.duration_hours} ساعات` : `${totalLessons} درس`}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-3">
                                            <span className="flex items-center gap-2 text-slate-700 dark:text-gray-200">
                                                <FileQuestion className="w-4 h-4 text-[#1769AA] dark:text-[#C99A2E]" />
                                                إجمالي الأسئلة
                                            </span>
                                            <span className="text-slate-500 dark:text-gray-400">
                                                {course.questions_count ? `+${course.questions_count} سؤال` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}