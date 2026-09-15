<?php

namespace App\Http\Controllers;

use App\Models\Course;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // 1. جلب الصفات التي اشترك فيها المستخدم
        // ملاحظة: تأكد أن موديل Course يحتوي على دالة: public function lessons() { return $this->hasMany(Lesson::class); }
        $enrolledCourses = $user->courses()->withCount('lessons')->get();

        // 2. تجهيز البيانات لتناسب الـ Frontend
        $coursesData = $enrolledCourses->map(function ($course) use ($user) {
            $totalLessons = $course->lessons_count;
            
            // حساب الدروس المكتملة بأمان (حتى لو الجدول فاضي مش هيطلع خطأ)
            $completedLessons = DB::table('lesson_completions')
                ->where('user_id', $user->id)
                ->whereIn('lesson_id', function ($query) use ($course) {
                    $query->select('id')->from('lessons')->where('course_id', $course->id);
                })
                ->count();

            $progress = $totalLessons > 0 ? round(($completedLessons / $totalLessons) * 100) : 0;

            return [
                'id' => $course->id,
                // نأخذ title أو name حسب ما هو موجود فعلياً في جدول courses
                'name' => $course->title ?? $course->name ?? 'كورس بدون اسم', 
                'progress' => $progress,
                'lessonsDone' => $completedLessons,
                'lessonsTotal' => $totalLessons,
            ];
        });

        $stats = [
            ['label' => 'مواد جارٍ مذاكرتها', 'value' => $coursesData->count()],
            ['label' => 'دروس مكتملة', 'value' => DB::table('lesson_completions')->where('user_id', $user->id)->count()],
            ['label' => 'اختبارات مكتملة', 'value' => DB::table('exam_attempts')->where('user_id', $user->id)->count()],
            ['label' => 'متوسط الدرجات', 'value' => round(DB::table('exam_attempts')->where('user_id', $user->id)->avg('score_percent') ?? 0) . '%'],
        ];

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'courses' => $coursesData,
            'recentResults' => [],
        ]);
    }
}