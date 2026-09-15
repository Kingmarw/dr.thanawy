<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamAttemptAnswer;
use Illuminate\Http\Request;

class ExamAttemptController extends Controller
{
    public function store(Request $request, Exam $exam)
    {
        $user = auth()->user();

        $enrolled = $exam->course->users()->where('user_id', $user->id)->exists();
        abort_unless($enrolled, 403, 'يجب التسجيل في الصف أولاً.');

        // ✅ الحماية الفعلية: التحقق من عدد المحاولات المكتملة يحصل في السيرفر
        // باستخدام قيمة max_attempts من قاعدة البيانات بدل الرقم الثابت
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

        // ✅ تم تعديل selected_option_id ليكون nullable عشان لو الوقت خلص والطالب لم يجب على سؤال، يتم تسجيله كإجابة خاطئة بدلاً من رفض الطلب
        $validated = $request->validate([
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|exists:questions,id',
            'answers.*.selected_option_id' => 'nullable|exists:question_options,id',
        ]);

        $questions = $exam->questions()->with(['correctOption', 'options'])->get();
        $totalQuestions = $questions->count();
        $correctCount = 0;

        $attempt = ExamAttempt::create([
            'user_id' => $user->id,
            'exam_id' => $exam->id,
            'total_questions' => $totalQuestions,
            'correct_answers' => 0,
            'score_percent' => 0,
            'status' => 'completed',
            'started_at' => now(),
            'finished_at' => now(),
        ]);

        foreach ($validated['answers'] as $answerData) {
            $question = $questions->firstWhere('id', $answerData['question_id']);
            if (! $question) continue;

            $selectedOptionId = $answerData['selected_option_id'];

            // ✅ تحقق إضافي: لو اتبعت selected_option_id، لازم يكون فعلاً
            // من ضمن اختيارات نفس السؤال ده — مش أي option_id عشوائي من سؤال تاني.
            if ($selectedOptionId !== null && ! $question->options->contains('id', $selectedOptionId)) {
                $selectedOptionId = null;
            }

            $isCorrect = $question->correctOption
                && $selectedOptionId !== null
                && $question->correctOption->id == $selectedOptionId;

            if ($isCorrect) {
                $correctCount++;
            }

            ExamAttemptAnswer::create([
                'exam_attempt_id' => $attempt->id,
                'question_id' => $answerData['question_id'],
                'selected_option_id' => $selectedOptionId,
                'is_correct' => $isCorrect,
            ]);
        }

        $scorePercent = $totalQuestions > 0
            ? round(($correctCount / $totalQuestions) * 100, 2)
            : 0;

        $attempt->update([
            'correct_answers' => $correctCount,
            'score_percent' => $scorePercent,
        ]);

        return back()->with('examResult', [
            'exam_id' => $exam->id,
            'score' => $scorePercent,
            'correct' => $correctCount,
            'total' => $totalQuestions,
            'passed' => $exam->passing_score !== null && $scorePercent >= $exam->passing_score,
        ]);
    }
}