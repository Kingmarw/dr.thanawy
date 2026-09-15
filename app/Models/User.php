<?php

namespace App\Models;

use App\Enums\Grade;
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
        // السماح فقط للمستخدمين المسجلين واللي عندهم is_admin = true
        // أي حد تاني (Guest أو User عادي) هيظهر له 404
        return $this->is_admin === true;
    }

    protected $fillable = [
        'name',
        'email',
        'phone',
        'grade',
        'password',
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
            // ملحوظة أمنية: is_admin عمدًا مش موجود في $fillable فوق،
            // عشان محدش يقدر يبعته جوه فورم عادي (mass assignment) ويرفّع صلاحيته لأدمن.
            // أي تغيير في is_admin لازم يتم صراحة زي: $user->is_admin = true; $user->save();
            'is_admin' => 'boolean',
        ];
    }
    public function courses()
    {
        return $this->belongsToMany(Course::class, 'course_user');
    }
}