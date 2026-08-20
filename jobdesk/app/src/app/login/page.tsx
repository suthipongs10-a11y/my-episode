"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions";
import { Submit } from "@/components/submit";

export default function LoginPage() {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-3xl font-bold tracking-tight">JobDesk</h1>
      <p className="mt-1 mb-6 text-sm text-muted">ระบบจัดการงานรับทำเว็บ</p>

      <form action={action} className="flex flex-col gap-3">
        <label className="block">
          <span className="label">รหัสผ่าน</span>
          <input
            className="field"
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-crit">
            {state.error}
          </p>
        ) : null}
        <Submit>เข้าระบบ</Submit>
      </form>
    </main>
  );
}
