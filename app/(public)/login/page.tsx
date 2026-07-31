import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <form
        action="/api/login"
        method="POST"
        className="card flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-xl font-semibold text-foreground">
          가족 아카이브
        </h1>
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          required
          autoFocus
          className="input"
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            비밀번호가 맞지 않아요.
          </p>
        )}
        <button type="submit" className="btn-primary">
          입장
        </button>
      </form>
    </div>
  );
}
