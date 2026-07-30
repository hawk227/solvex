'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/input';
import { updateServiceContent } from '../actions';

export function ContentEditor({
  serviceId,
  aboutMd,
  includedText,
  notIncludedText,
  faqsText,
}: {
  serviceId: number;
  aboutMd: string;
  includedText: string;
  notIncludedText: string;
  faqsText: string;
}) {
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setSaved(false);

    const result = await updateServiceContent(serviceId, new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="About this service" htmlFor="aboutMd" hint="Markdown. Shown as the main body.">
        <Textarea id="aboutMd" name="aboutMd" defaultValue={aboutMd} className="min-h-40" />
      </Field>

      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="What's included" htmlFor="included" hint="One item per line.">
          <Textarea
            id="included"
            name="included"
            defaultValue={includedText}
            placeholder={'Filter cleaning\nCoil wash\nDrain line flush'}
          />
        </Field>

        <Field label="Not included" htmlFor="notIncluded" hint="One item per line.">
          <Textarea
            id="notIncluded"
            name="notIncluded"
            defaultValue={notIncludedText}
            placeholder={'Gas refill\nSpare parts'}
          />
        </Field>
      </div>

      <Field
        label="Frequently asked questions"
        htmlFor="faqs"
        hint="Question on the first line, answer below it. Separate each pair with a blank line."
      >
        <Textarea
          id="faqs"
          name="faqs"
          defaultValue={faqsText}
          className="min-h-40"
          placeholder={'How long does it take?\nAbout an hour per unit.\n\nDo I need to be home?\nYes, someone must let the technician in.'}
        />
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-[13px] text-[var(--color-success)]">
          Content saved.
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save content'}
        </Button>
      </div>
    </form>
  );
}
