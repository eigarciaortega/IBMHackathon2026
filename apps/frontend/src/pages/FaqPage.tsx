import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatbotService } from '../services';
import { Spinner } from '../components/Spinner';
import { EmptyState, ErrorMessage } from '../components/ErrorMessage';
import { PageHeader } from '../components/PageHeader';
import { getApiErrorMessage } from '../lib/api';
import { Faq } from '../types';

interface AskResult {
  matched: boolean;
  results?: Faq[];
  message?: string;
  categories?: string[];
  suggestions?: { id: string; question: string; category: string }[];
}

export function FaqPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['faq'],
    queryFn: () => chatbotService.listFaq({ limit: 50 }),
  });

  const ask = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAskError(null);
    try {
      setResult(await chatbotService.ask(question.trim()));
    } catch (e) {
      setAskError(getApiErrorMessage(e));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Preguntas frecuentes" subtitle="Consulta el asistente o revisa el listado" />

      <div className="card card-pad">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="Escribe tu pregunta…"
            className="input"
          />
          <button onClick={ask} disabled={asking} className="btn btn-primary sm:w-auto">
            {asking ? '…' : 'Preguntar'}
          </button>
        </div>
        <div className="mt-3">
          <ErrorMessage message={askError} />
        </div>

        {result && (
          <div className="mt-4 text-sm">
            {result.matched ? (
              <ul className="space-y-3">
                {result.results?.map((r) => (
                  <li key={r.id} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-medium text-slate-900">{r.question}</p>
                    <p className="mt-0.5 text-slate-600">{r.answer}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                <p>{result.message}</p>
                {result.categories && result.categories.length > 0 && (
                  <p className="mt-2">
                    Categorías: <span className="font-medium">{result.categories.join(', ')}</span>
                  </p>
                )}
                {result.suggestions && result.suggestions.length > 0 && (
                  <ul className="mt-2 list-disc pl-5">
                    {result.suggestions.map((s) => (
                      <li key={s.id}>{s.question}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card card-pad">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Todas las preguntas</h2>
        {isLoading && <Spinner />}
        {error && <ErrorMessage message={getApiErrorMessage(error)} />}
        {data && data.items.length === 0 && <EmptyState message="No hay preguntas frecuentes." />}
        <ul className="divide-y divide-slate-100">
          {data?.items.map((f) => (
            <li key={f.id} className="py-3">
              <p className="font-medium text-slate-900">{f.question}</p>
              <p className="mt-0.5 text-sm text-slate-600">{f.answer}</p>
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {f.category}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
