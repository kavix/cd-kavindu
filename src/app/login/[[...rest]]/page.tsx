import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full">
                <SignIn
                    path="/login"
                    routing="path"
                    signUpUrl="/sign-up"
                    redirectUrl="/dashboard"
                />
            </div>
        </div>
    );
}