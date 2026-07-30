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
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {!contacts.length ? (
          <div className="px-6 py-12 text-center text-sm text-muted">
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
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted">{c.email}</p>
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
        className="h-fit rounded-xl border border-border bg-surface p-5"
      >
        <h2 className="font-semibold">Add contact</h2>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium">Name</span>
          <input
            {...register("name")}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-accent"
          />
          {errors.name && (
            <span className="mt-1 block text-xs text-danger">
              {errors.name.message}
            </span>
          )}
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-accent"
          />
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
          className="mt-4 w-full rounded-md bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save contact"}
        </button>
      </form>
    </div>
  );
}
