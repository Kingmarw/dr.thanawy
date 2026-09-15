import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Award, Check, X, Clock, FileText, RotateCcw, AlertTriangle, Eye, Lock } from 'lucide-react';

// ✅ Toast خفيف بيظهر فوق الشاشة لحظة تصحيح كل سؤال
const answerToast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
});

export default function OfficialExam({ exam, attempts, lastAttemptAnswers, enrolled, canAttempt, maxAttempts }) {
    const hasPreviousAttempt = Object.keys(lastAttemptAnswers || {}).length > 0;

    const [answers, setAnswers] = useState({});
    // ✅ نتيجة كل سؤال اتصحح فورًا أثناء الحل الحالي:
    // { [questionId]: { is_correct, correct_option_id, explanation, selected_option_id } }
    const [checkedResults, setCheckedResults] = useState({});
    const [checkingQuestionId, setCheckingQuestionId] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    // ✅ لو فيه محاولة سابقة، نبدأ بوضع المراجعة
    const [reviewMode, setReviewMode] = useState(hasPreviousAttempt);
    // ✅ حالة عشان نمنع التايمر يشتغل بعد ما الامتحان يتبعت
    const [examEnded, setExamEnded] = useState(false);

    const initialTime = exam.duration_minutes ? exam.duration_minutes * 60 : null;
    const [timeLeft, setTimeLeft] = useState(initialTime);

    const answersRef = useRef(answers);
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    const questions = exam.questions || [];

    useEffect(() => {
        // ✅ التايمر بيقف خالص لما الوقت يخلص أو الامتحان ينتهي بأي طريقة
        if (!timeLeft || timeLeft <= 0 || submitted || reviewMode || examEnded) return;
        const timerId = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft, submitted, reviewMode, examEnded]);

    useEffect(() => {
        if (timeLeft === 0 && !submitted && !reviewMode && !examEnded) {
            handleSubmit(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, submitted, reviewMode, examEnded]);

    // ✅ تنبيه قبل انتهاء الوقت بـ 30 ثانية
    const [timeWarningShown, setTimeWarningShown] = useState(false);
    useEffect(() => {
        if (timeLeft && timeLeft <= 30 && timeLeft > 0 && !timeWarningShown && !submitted && !reviewMode && !examEnded) {
            setTimeWarningShown(true);
            Swal.fire({
                icon: 'warning',
                title: 'تنبيه: وقت الامتحان يوشك على الانتهاء!',
                text: `تبقى ${timeLeft} ثانية فقط من وقت الامتحان. أسرع بتسليم إجابتك!`,
                timer: 5000,
                timerProgressBar: true,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, timeWarningShown, submitted, reviewMode, examEnded]);

    // ✅ تصحيح فوري: بيتبعت للسيرفر لحظة اختيار الإجابة، وبيرجع صح/غلط
    // لهذا السؤال بس - من غير ما نعرف إجابات باقي الأسئلة مقدمًا.
    const handleSelect = async (questionId, optionId) => {
        if (submitted || reviewMode || !canAttempt) return;
        if (checkedResults[questionId]) return; // السؤال ده اتصحح بالفعل
        if (checkingQuestionId) return; // في تصحيح شغال بالفعل لسؤال تاني

        setAnswers(prev => ({ ...prev, [questionId]: optionId }));
        setCheckingQuestionId(questionId);

        try {
            const { data } = await axios.post(route('exams.check-answer', exam.id), {
                question_id: questionId,
                selected_option_id: optionId,
            });

            setCheckedResults(prev => ({ ...prev, [questionId]: data }));

            answerToast.fire({
                icon: data.is_correct ? 'success' : 'error',
                title: data.is_correct ? 'إجابة صحيحة! 🎉' : 'إجابة خاطئة',
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'حدث خطأ',
                text: 'تعذر تصحيح الإجابة، حاول مرة أخرى.',
            });
            setAnswers(prev => {
                const next = { ...prev };
                delete next[questionId];
                return next;
            });
        } finally {
            setCheckingQuestionId(null);
        }
    };

    const handleSubmit = (isAuto = false) => {
        if (!enrolled || submitting) return;

        // لو مش تسليم تلقائي، نعرض رسالة تأكيد
        if (!isAuto) {
            Swal.fire({
                title: 'هل أنت متأكد من تسليم الامتحان؟',
                text: 'لن تتمكن من تعديل إجاباتك بعد التسليم!',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'نعم، تسليم',
                cancelButtonText: 'إلغاء',
                confirmButtonColor: '#1769AA',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
            }).then((result) => {
                if (result.isConfirmed) {
                    performSubmit();
                }
            });
            return;
        }

        // تسليم تلقائي بدون تأكيد
        performSubmit();
    };

    const performSubmit = () => {
        const currentAnswers = answersRef.current;
        const formattedAnswers = questions.map(q => ({
            question_id: q.id,
            selected_option_id: currentAnswers[q.id] || null,
        }));

        setSubmitting(true);
        // ✅ نمنع التايمر يشتغل تاني بعد التسليم
        setExamEnded(true);

        router.post(
            route('exams.attempt', exam.id),
            { answers: formattedAnswers },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const examResult = page.props.flash?.examResult;
                    if (examResult && examResult.exam_id === exam.id) {
                        setResult(examResult);
                        setSubmitted(true);
                        setReviewMode(false);

                        Swal.fire({
                            icon: examResult.passed ? 'success' : 'info',
                            title: examResult.passed ? '🎉 مبروك! اجتزت الامتحان' : 'للأسف لم تجتز الامتحان',
                            html: `أجبت بشكل صحيح على <b>${examResult.correct}</b> من <b>${examResult.total}</b> — النتيجة: <b>${examResult.score}%</b>`,
                        });
                    }
                },
                onError: () => {
                    Swal.fire({
                        icon: 'error',
                        title: 'حدث خطأ',
                        text: 'تعذر إرسال الامتحان، حاول مرة أخرى.',
                    });
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    const handleRetry = () => {
        if (!canAttempt) return;
        setAnswers({});
        setCheckedResults({});
        setSubmitted(false);
        setResult(null);
        setReviewMode(false);
        setExamEnded(false); // ✅ نعيد التايمر يشتغل تاني
        if (initialTime) setTimeLeft(initialTime);
    };

    const allChecked = questions.length > 0 && questions.every(q => checkedResults[q.id]);
    const lastAttempt = attempts && attempts.length > 0 ? attempts[0] : null;

    const formatTime = (seconds) => {
        if (!seconds && seconds !== 0) return '';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isTimeRunningOut = timeLeft !== null && timeLeft <= 300 && timeLeft > 0;

    // ✅ خريطة موحدة للنتائج: وضع المراجعة بيستخدم آخر محاولة محفوظة،
    // وأثناء الحل الحالي بيستخدم التصحيح اللحظي
    const resultsMap = reviewMode ? (lastAttemptAnswers || {}) : checkedResults;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-white/10 p-6">
            {/* رأس الامتحان */}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1769AA]/10 dark:bg-gold/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#1769AA] dark:text-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{exam.title}</h3>
                        {exam.description && (
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">{exam.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* بادج وضع المراجعة */}
                    {reviewMode && (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                            <Eye className="w-3.5 h-3.5" />
                            مراجعة الحل السابق
                        </span>
                    )}
                    {/* ✅ بادج استنفاد المحاولات */}
                    {!reviewMode && !canAttempt && (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300">
                            <Lock className="w-3.5 h-3.5" />
                            استنفدت المحاولات المتاحة
                        </span>
                    )}
                    {timeLeft !== null && !reviewMode && canAttempt && (
                        <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full transition-all ${
                            timeLeft === 0
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : isTimeRunningOut
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 animate-pulse'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-gray-300'
                        }`}>
                            <Clock className={`w-4 h-4 ${timeLeft === 0 ? 'hidden' : 'block'}`} />
                            {timeLeft === 0 ? (
                                <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> انتهى الوقت</span>
                            ) : (
                                formatTime(timeLeft)
                            )}
                        </span>
                    )}
                </div>
            </div>

            {exam.passing_score && !reviewMode && (
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                    درجة النجاح المطلوبة: {exam.passing_score}%
                    {maxAttempts && <> · المحاولات المسموح بها: {maxAttempts}</>}
                </p>
            )}

            {lastAttempt && !submitted && !reviewMode && (
                <div className="mb-6 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm text-slate-600 dark:text-gray-300">
                        آخر محاولة: {lastAttempt.correct_answers}/{lastAttempt.total_questions}
                    </span>
                    <span className="text-sm font-bold text-[#1769AA] dark:text-gold">
                        {lastAttempt.score_percent}%
                    </span>
                </div>
            )}

            {!reviewMode && !canAttempt && !submitted && (
                <div className="mb-6 p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-gray-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0" />
                    لقد استخدمت كل المحاولات المتاحة لهذا الامتحان.
                </div>
            )}

            {/* الأسئلة */}
            <div className="space-y-6">
                {questions.map((q, qIndex) => {
                    const questionResult = resultsMap[q.id];
                    const isChecking = checkingQuestionId === q.id;
                    const isLocked = submitted || reviewMode || !!questionResult || !canAttempt;

                    return (
                        <div key={q.id} className="p-4 rounded-lg border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-gray-950/50">
                            <p className="font-semibold text-slate-900 dark:text-white mb-3 flex gap-2">
                                <span className="text-gold font-bold shrink-0">{qIndex + 1}.</span>
                                <span>{q.question_text}</span>
                            </p>

                            <div className="space-y-2 mr-6">
                                {q.options.map((opt) => {
                                    const isSelected = answers[q.id] === opt.id;
                                    const prevSelected = reviewMode && questionResult?.selected_option_id === opt.id;
                                    const isCorrectOption = questionResult && questionResult.correct_option_id === opt.id;
                                    const wasWrongSelection = questionResult && !questionResult.is_correct
                                        && (reviewMode ? prevSelected : isSelected)
                                        && !isCorrectOption;

                                    let optionClass = "w-full text-right p-3 rounded border transition flex items-center gap-3 ";

                                    if (questionResult) {
                                        if (isCorrectOption) {
                                            optionClass += "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400";
                                        } else if (wasWrongSelection) {
                                            optionClass += "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400";
                                        } else {
                                            optionClass += "bg-slate-50 dark:bg-gray-900 border-slate-200 dark:border-white/10 opacity-60";
                                        }
                                    } else {
                                        optionClass += isSelected
                                            ? "bg-[#1769AA]/10 dark:bg-gold/10 border-[#1769AA] dark:border-gold text-[#1769AA] dark:text-gold"
                                            : "bg-white dark:bg-gray-900 border-slate-200 dark:border-white/10 hover:border-[#1769AA]/50 dark:hover:border-gold/50 cursor-pointer";
                                    }

                                    if (isChecking) optionClass += " opacity-70 pointer-events-none";

                                    const showCheck = isCorrectOption;
                                    const showX = wasWrongSelection;
                                    const showDot = !questionResult && isSelected;

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleSelect(q.id, opt.id)}
                                            disabled={isLocked || isChecking}
                                            className={optionClass}
                                        >
                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                                showCheck || showX || showDot ? 'border-current' : 'border-slate-300 dark:border-gray-600'
                                            }`}>
                                                {showCheck && <Check className="w-3.5 h-3.5" />}
                                                {showX && <X className="w-3.5 h-3.5" />}
                                                {showDot && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                                            </span>
                                            <span className="flex-1">{opt.option_text}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* ✅ الشرح: يظهر بس بعد ما السؤال ده يتصحح فعليًا */}
                            {questionResult?.explanation && (
                                <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 flex gap-2 items-start">
                                    <span className="shrink-0 mt-0.5">💡</span>
                                    <span><strong>توضيح:</strong> {questionResult.explanation}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* أزرار الإرسال والنتيجة */}
            <div className="mt-8 border-t border-slate-100 dark:border-white/5 pt-6">
                {reviewMode ? (
                    canAttempt && (
                        <button
                            onClick={handleRetry}
                            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#1769AA] dark:bg-gold text-white dark:text-primary font-bold hover:brightness-110 transition flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            حل الامتحان من جديد
                        </button>
                    )
                ) : !submitted ? (
                    canAttempt && (
                        <button
                            onClick={() => handleSubmit(false)}
                            disabled={!enrolled || submitting}
                            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#1769AA] dark:bg-gold text-white dark:text-primary font-bold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {timeLeft === 0
                                ? 'جاري التسليم التلقائي...'
                                : submitting
                                    ? 'جاري الإرسال...'
                                    : `تسليم الامتحان (${Object.keys(checkedResults).length}/${questions.length})`}
                        </button>
                    )
                ) : result ? (
                    <div className={`p-4 rounded-lg flex items-center justify-between flex-wrap gap-4 ${
                        result.passed
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                        <div>
                            <p className="font-bold text-lg">
                                {result.passed ? '🎉 مبروك! اجتزت الاختبار' : 'للأسف لم تجتز الاختبار'}
                            </p>
                            <p className="text-sm opacity-80 mt-1">
                                أجبت بشكل صحيح على {result.correct} من {result.total} أسئلة.
                                {exam.passing_score && (
                                    <span> (درجة النجاح المطلوبة: {exam.passing_score}%)</span>
                                )}
                            </p>
                        </div>
                        <div className="text-3xl font-black">{result.score}%</div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}