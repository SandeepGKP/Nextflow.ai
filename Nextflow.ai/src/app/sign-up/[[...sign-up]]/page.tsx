import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}
