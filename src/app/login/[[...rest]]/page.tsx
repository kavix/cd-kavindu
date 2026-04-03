import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
            <div className="w-full max-w-md">
                <SignIn
                    routing="hash"
                    redirectUrl="/selection"
                    signUpUrl="/sign-up"
                />
            </div>
        </div>
    );
}