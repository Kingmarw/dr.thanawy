<?php

namespace App\Filament\Resources\Exams\Schemas;

use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class ExamForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                // بيانات الامتحان الأساسية
                Select::make('course_id')
                    ->relationship('course', 'name')
                    ->required()
                    ->searchable()
                    ->preload()
                    ->label('الصف'),

                TextInput::make('title')
                    ->required()
                    ->maxLength(255)
                    ->label('عنوان الامتحان'),

                Select::make('type')
                    ->options([
                        'exam' => 'اختبار رسمي',
                        'practice' => 'تدريب / تمرين',
                    ])
                    ->default('practice')
                    ->required()
                    ->label('نوع الاختبار')
                    ->live(),

                TextInput::make('duration_minutes')
                    ->numeric()
                    ->suffix('دقيقة')
                    ->label('مدة الامتحان'),

                TextInput::make('passing_score')
                    ->numeric()
                    ->suffix('%')
                    ->label('درجة النجاح'),

                TextInput::make('max_attempts')
                    ->numeric()
                    ->minValue(1)
                    ->default(1)
                    ->label('عدد المحاولات المسموح بها')
                    ->visible(fn (callable $get): bool => $get('type') === 'exam'),

                TextInput::make('order')
                    ->numeric()
                    ->default(0)
                    ->label('الترتيب'),

                Toggle::make('is_active')
                    ->default(true)
                    ->label('مفعل'),

                Textarea::make('description')
                    ->columnSpanFull()
                    ->label('الوصف'),

                // أسئلة الامتحان
                Repeater::make('questions')
                    ->relationship()
                    ->schema([
                        Textarea::make('question_text')
                            ->required()
                            ->rows(2)
                            ->label('نص السؤال'),

                        Repeater::make('options')
                            ->relationship()
                            ->schema([
                                TextInput::make('option_text')
                                    ->required()
                                    ->label('نص الاختيار'),

                                Toggle::make('is_correct')
                                    ->label('إجابة صحيحة؟'),
                            ])
                            ->columns(2)
                            ->defaultItems(4)
                            ->minItems(2)
                            ->label('الخيارات'),

                        Textarea::make('explanation')
                            ->rows(2)
                            ->label('توضيح / شرح الإجابة'),
                    ])
                    ->orderColumn('order')
                    ->defaultItems(1)
                    ->collapsible()
                    ->cloneable()
                    ->itemLabel(fn (array $state): ?string => $state['question_text'] ?? null)
                    ->label('قائمة الأسئلة')
                    ->columnSpanFull(),
            ]);
    }
}