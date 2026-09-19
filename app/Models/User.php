<?php

namespace App\Models;

use App\Enums\Grade;
use App\Models\Course;
use App\Models\Order;
use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements FilamentUser
{
    use HasFactory, Notifiable;

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->is_admin === true;
    }

    protected $fillable = [
        'name',
        'email',
        'phone',
        'grade',
        'password',
        'is_admin',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'grade' => Grade::class,
            'is_admin' => 'boolean',
        ];
    }

    // الطلبات / عمليات الشراء الخاصة بالطالب
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function courses()
    {
        return $this->belongsToMany(Course::class, 'course_user');
    }
    // الكورسات التي اشتراها الطالب عن طريق الطلبات
    public function purchasedCourses()
    {
        return $this->hasManyThrough(
            Course::class,
            Order::class,
            'user_id',
            'id',
            'id',
            'course_id'
        );
    }
}