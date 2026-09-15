// Login.jsx
import Checkbox from '@/Components/Checkbox';
import Divider from '@/Components/divider';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="تسجيل الدخول" />

            <div className="mb-11">
                <h1 className="text-3xl font-bold text-primary dark:text-white">
                    تسجيل الدخول
                </h1>
                <p className="mt-2.5 text-base text-primary/50 dark:text-white/50">
                    أهلاً بيك تاني، سجّل دخولك عشان تكمل رحلتك التعليمية.
                </p>
            </div>

            {status && (
                <div className="mb-7 rounded bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel
                        htmlFor="email"
                        value="البريد الإلكتروني"
                        className="text-base font-semibold"
                    />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-2.5 block w-full rounded border-2 border-primary/15 bg-offwhite/60 px-5 py-3.5 text-base font-semibold text-primary placeholder:font-normal focus:border-gold focus:ring-gold/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        autoComplete="username"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-6">
                    <InputLabel
                        htmlFor="password"
                        value="كلمة المرور"
                        className="text-base font-semibold"
                    />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-2.5 block w-full rounded border-2 border-primary/15 bg-offwhite/60 px-5 py-3.5 text-base font-semibold text-primary placeholder:font-normal focus:border-gold focus:ring-gold/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-6 block">
                    <label className="flex cursor-pointer items-center gap-3">
                        <Checkbox
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                            className="h-5 w-5 rounded border-2 border-primary/20 text-gold focus:ring-gold/40"
                        />
                        <span className="text-base text-primary/60 dark:text-white/60">
                            تذكرني
                        </span>
                    </label>
                </div>

                <div className="mt-10">
                    <PrimaryButton
                        disabled={processing}
                        type="submit"
                        className="py-4 text-lg"
                    >
                        تسجيل الدخول
                    </PrimaryButton>
                </div>
                {canResetPassword && (
                    <div className="mt-6 text-center">
                        <Link
                            href={route('password.request')}
                            className="rounded text-sm text-primary/55 underline decoration-primary/20 underline-offset-2 hover:text-primary focus:outline-none focus:ring-2 focus:ring-gold/40 focus:ring-offset-2 dark:text-white/50 dark:hover:text-white dark:focus:ring-offset-gray-900"
                        >
                            نسيت كلمة المرور؟
                        </Link>
                    </div>
                )}
                <Divider>أو</Divider>
                <div className="text-center">
                    <Link href={route('register')} className="rounded text-sm text-primary/55 underline decoration-primary/20 underline-offset-2 hover:text-primary focus:outline-none focus:ring-2 focus:ring-gold/40 focus:ring-offset-2 dark:text-white/50 dark:hover:text-white dark:focus:ring-offset-gray-900">
                        ليس لديك حساب؟ سجل الآن
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}