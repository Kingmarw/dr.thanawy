<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\LessonController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\ExamAttemptController;
use App\Http\Controllers\ExamController;
use Illuminate\Support\Facades\DB; // ✅ أضف هذا السطر
use App\Models\Course;
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'latestCourses' => Course::query()
            ->active()
            ->latest()
            ->take(4)
            ->get(['id', 'name', 'description', 'price', 'thumbnail']),
    ]);
});

// راوتات الكورسات - المحمية تتطلب تسجيل دخول
Route::middleware(['auth'])->group(function () {
    // قائمة الكورسات وإنشاء كورس جديد
    Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');
    Route::post('/courses', [CourseController::class, 'store'])->name('courses.store');
    
    // عرض تفاصيل الكورس (محمي - يتطلب تسجيل دخول)
    Route::get('/courses/{course}', [CourseController::class, 'show'])->name('courses.show');
    
    // عرض درس معين داخل كورس (محمي - يتطلب تسجيل دخول)
    Route::get('/courses/{course}/lessons/{lesson}', [LessonController::class, 'show'])
        ->name('lessons.show');
    
    // صفحة التعلم والاشتراك في الكورس
    Route::get('/courses/{course}/learn', [CourseController::class, 'learn'])->name('courses.learn');
    Route::post('/courses/{course}/enroll', [CourseController::class, 'enroll'])->name('courses.enroll');
});

Route::middleware(['auth'])->group(function () {
    Route::post('/orders', [EnrollmentController::class, 'store'])->name('orders.store');
    Route::get('/orders', [EnrollmentController::class, 'index'])->name('orders.index');
    Route::get('/orders/create', [EnrollmentController::class, 'create'])->name('orders.create');
    Route::get('/orders/{id}/pay', [EnrollmentController::class, 'initiatePayment'])->name('order.pay');
    Route::post('/lessons/{lesson}/complete', [LessonController::class, 'complete'])->name('lessons.complete');
    
    // راوتات أسئلة الدروس
    Route::post('/lessons/{lesson}/questions', [LessonController::class, 'askQuestion'])->name('lessons.questions.ask');
    Route::get('/lessons/{lesson}/questions', [LessonController::class, 'getQuestions'])->name('lessons.questions.index');
    Route::post('/questions/{question}/answer', [LessonController::class, 'answerQuestion'])->name('questions.answer');
});

// الراوتات دي لازم تكون بره الـ auth middleware:
// التحقق من الأمان بيتم عن طريق توقيع HMAC (signature) جوه الكونترولر نفسه،
// مش عن طريق تسجيل الدخول. لو حطيناها جوه auth، أي إشعار server-to-server من Kashier
// أو أي حالة ضاع فيها الـ session أثناء التحويل هترفض قبل ما توصل للكود أصلاً.
Route::get('/payment/callback', [EnrollmentController::class, 'handleCallback'])->name('order.callback');
Route::get('/payment/failure', [EnrollmentController::class, 'failure'])->name('order.failure');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        $user = auth()->user();


        $enrolledCourses = $user->courses()->withCount('lessons')->get();

        $coursesData = $enrolledCourses->map(function ($course) use ($user) {
            $totalLessons = $course->lessons_count;
            
            $completedLessons = DB::table('lesson_completions')
                ->where('user_id', $user->id)
                ->whereIn('lesson_id', function ($query) use ($course) {
                    $query->select('id')->from('lessons')->where('course_id', $course->id);
                })
                ->count();

            $progress = $totalLessons > 0 ? round(($completedLessons / $totalLessons) * 100) : 0;

            return [
                'id' => $course->id,
                'name' => $course->name, // اسم الحقل الصحيح في موديل Course حسب ما أرسلته
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

        // 4. إرسال البيانات إلى واجهة React
        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'courses' => $coursesData,
            'recentResults' => [], // يمكن ملؤها لاحقاً ببيانات حقيقية
        ]);
    })->middleware('verified')->name('dashboard');
});


Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/exams/{exam}/attempt', [ExamAttemptController::class, 'store'])->name('exams.attempt');
    Route::get('/courses/{course}/exams/{exam}', [ExamController::class, 'show'])
        ->name('courses.exams.show');
});

require __DIR__.'/auth.php';