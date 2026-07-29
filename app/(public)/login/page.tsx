export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        action="/api/login"
        method="POST"
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-900"
      >
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          가족 아카이브
        </h1>
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          required
          autoFocus
          className="rounded-md border border-black/10 bg-transparent px-4 py-2 text-black dark:border-white/10 dark:text-zinc-50"
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            비밀번호가 맞지 않아요.
          </p>
        )}
        <button
          type="submit"
          className="rounded-full bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
        >
          입장
        </button>
      </form>
    </div>
  );
}
