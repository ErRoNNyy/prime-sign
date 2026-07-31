"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createContact, deleteContact } from "@/app/actions";
import type { Contact } from "@/lib/types/database";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required"),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "w-full border border-border bg-black/40 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-sage";

export function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onCreate(values: FormValues) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("email", values.email);
    const result = await createContact(fd);
    if (result?.error) {
      setError("root", { message: result.error });
      return;
    }
    reset();
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden border border-border bg-surface/70 backdrop-blur-sm">
        {!contacts.length ? (
          <div className="px-6 py-12 text-center text-sm text-ink-soft">
            No contacts yet. Add people you send envelopes to often.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-sm text-ink-soft">{c.email}</p>
                </div>
                <button
                  type="button"
                  className="text-sm text-danger hover:underline"
                  onClick={async () => {
                    await deleteContact(c.id);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSubmit(onCreate)}
        className="h-fit border border-border bg-surface/70 p-5 backdrop-blur-sm"
      >
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink">
          Add contact
        </h2>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Name
          </span>
          <input {...register("name")} className={inputClass} />
          {errors.name && (
            <span className="mt-1 block text-xs text-danger">
              {errors.name.message}
            </span>
          )}
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Email
          </span>
          <input type="email" {...register("email")} className={inputClass} />
          {errors.email && (
            <span className="mt-1 block text-xs text-danger">
              {errors.email.message}
            </span>
          )}
        </label>
        {errors.root && (
          <p className="mt-2 text-sm text-danger">{errors.root.message}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full bg-sage py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-on-accent transition-colors hover:bg-sage-hover disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save contact"}
        </button>
      </form>
    </div>
  );
}
