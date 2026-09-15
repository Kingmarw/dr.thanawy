<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAttempt;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ExamController extends Controller
{
    public function show($courseId, Exam $exam)
    {
        $course = $exam->course;
        abort_if($course->id != $courseId, 404);

        $user = auth()->user();
        $enrolled = $course->users()->where('user_id', $user->id)->exists();
        abort_unless($enrolled, 403, 'يجب التسجيل في الصف أولاً لحل هذا الامتحان.');

        $examData = $exam->load(['questions.options', 'questions.correctOption']);

        $attempts = ExamAttempt::where('user_id', $user->id)
            ->where('exam_id', $exam->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($a) => [
                'id' => $a->id,
                'score_percent' => $a->score_percent,
                'status' => $a->status,
                'correct_answers' => $a->correct_answers,
                'total_questions' => $a->total_questions,
                'created_at' => $a->created_at->format('Y-m-d H:i'),
            ]);

        $completedAttemptsCount = $attempts->where('status', 'completed')->count();
        $maxAttempts = $examData->type === 'exam' ? ($examData->max_attempts ?? 1) : null;
        $canAttempt = $examData->type !== 'exam'
            || $completedAttemptsCount < ($maxAttempts ?? 1);

        // ✅ إجابات آخر محاولة لعرضها في وضع المراجعة. هنا فقط - بعد ما الطالب
        // خلّص محاولته فعلاً - آمن إننا نبعت correct_option_id والـ explanation،
        // لأن attempt limit أصلاً بيمنعه يستخدمهم في محاولة جديدة.
        $lastAttemptAnswers = [];
        $lastAttemptModel = ExamAttempt::where('user_id', $user->id)
            ->where('exam_id', $exam->id)
            ->latest()
            ->first();

        if ($lastAttemptModel) {
            $questionsById = $examData->questions->keyBy('id');

            $lastAttemptAnswers = $lastAttemptModel->answers()
                ->get()
                ->mapWithKeys(function ($answer) use ($questionsById) {
                    $question = $questionsById->get($answer->question_id);

                    return [
                        $answer->question_id => [
                            'selected_option_id' => $answer->selected_option_id,
                            'is_correct' => (bool) $answer->is_correct,
                            'correct_option_id' => $question?->correctOption?->id,
                            'explanation' => $question?->explanation,
                        ],
                    ];
                })
                ->toArray();
        }

        return Inertia::render('Courses/TakeExam', [
            'course' => [
                'id' => $course->id,
                'name' => $course->name,
            ],
            'exam' => [
                'id' => $examData->id,
                'title' => $examData->title,
                'description' => $examData->description,
                'type' => $examData->type,
                'duration_minutes' => $examData->duration_minutes,
                'passing_score' => $examData->passing_score,
                'questions' => $examData->questions->map(fn($q) => [
                    'id' => $q->id,
                    'question_text' => $q->question_text,
                    // ⚠️ 'explanation' اتشالت من هنا كمان. كانت بتتبعت لكل الأسئلة
                    // من الأول حتى قبل ما الطالب يجاوب، وده ممكن يدّي تلميح عن
                    // الإجابة الصح. دلوقتي بتتبعت بس لحظة ما السؤال يتصحح
                    // (checkAnswer) أو في وضع المراجعة بعد انتهاء المحاولة.
                    'options' => $q->options->map(fn($opt) => [
                        'id' => $opt->id,
                        'option_text' => $opt->option_text,
                        // ⚠️ 'is_correct' اتشالت من هنا من المرة اللي فاتت (تسريب الإجابة الأصلي)
                    ]),
                ]),
            ],
            'attempts' => $attempts,
            'lastAttemptAnswers' => $lastAttemptAnswers,
            'enrolled' => $enrolled,
            'canAttempt' => $canAttempt,
            'maxAttempts' => $maxAttempts,
        ]);
    }

    /**
     * ✅ تصحيح فوري لسؤال واحد بس، لحظة ما الطالب يختار إجابة له.
     * الرد بيرجع بيانات السؤال ده فقط (مش باقي الامتحان)، ومفيش أي حفظ في
     * الداتابيز هنا - الحفظ الفعلي والدرجة النهائية بيحصلوا في
     * ExamAttemptController::store لحظة التسليم النهائي.
     */
    public function checkAnswer(Request $request, Exam $exam)
    {
        $user = auth()->user();

        $enrolled = $exam->course->users()->where('user_id', $user->id)->exists();
        abort_unless($enrolled, 403, 'يجب التسجيل في الصف أولاً.');

        // ✅ نفس منطق الحد الأقصى للمحاولات، عشان محدش يقدر يستخدم الـ
        // endpoint ده للتحايل على القيد بعد ما يستنفد محاولاته.
        if ($exam->type === 'exam') {
            $maxAttempts = $exam->max_attempts ?? 1;
            $completedAttemptsCount = ExamAttempt::where('user_id', $user->id)
                ->where('exam_id', $exam->id)
                ->where('status', 'completed')
                ->count();

            abort_if(
                $completedAttemptsCount >= $maxAttempts,
                403,
                'لقد استنفدت عدد المحاولات المسموح بها لهذا الامتحان.'
            );
        }

        $validated = $request->validate([
            'question_id' => 'required|exists:questions,id',
            'selected_option_id' => 'required|exists:question_options,id',
        ]);

        $question = $exam->questions()
            ->with('correctOption')
            ->findOrFail($validated['question_id']);

        // ✅ تحقق إضافي: الاختيار المبعوت لازم يكون فعلاً تابع لنفس السؤال.
        $belongsToQuestion = $question->options()
            ->where('id', $validated['selected_option_id'])
            ->exists();

        abort_unless($belongsToQuestion, 422, 'اختيار غير صالح لهذا السؤال.');

        $isCorrect = $question->correctOption
            && $question->correctOption->id == $validated['selected_option_id'];

        return response()->json([
            'question_id' => $question->id,
            'selected_option_id' => (int) $validated['selected_option_id'],
            'is_correct' => $isCorrect,
            'correct_option_id' => $question->correctOption?->id,
            'explanation' => $question->explanation,
        ]);
    }
}