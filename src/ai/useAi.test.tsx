import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAi } from './useAi';
import { cacheClear } from './cache';
import { renderScreen } from '../../tests/renderApp';
import { AI_INPUTS, AI_OUTPUTS } from '../../tests/fixtures/ai';

function Harness() {
  const ai = useAi('checklist', { loading: 'Writing checklist…', success: (d) => `Wrote ${d.items.length} items.` });
  return (
    <div>
      <button type="button" onClick={() => void ai.run(AI_INPUTS.checklist)}>Run</button>
      <button type="button" onClick={() => void ai.retry()}>Retry</button>
      <button type="button" onClick={ai.reset}>Reset</button>
      <p>status: {ai.status}</p>
      {ai.error ? <p>{ai.error.message}</p> : null}
    </div>
  );
}

describe('useAi', () => {
  afterEach(() => cacheClear());

  it('announces loading and success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: AI_OUTPUTS.checklist }))));
    renderScreen(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByText('status: success')).toBeInTheDocument();
    expect(screen.getByTestId('live-polite')).toHaveTextContent('Wrote 3 items.');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByText('status: idle')).toBeInTheDocument();
  });

  it('announces errors assertively and can retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'upstream' }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: AI_OUTPUTS.checklist })));
    vi.stubGlobal('fetch', fetchMock);
    renderScreen(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' })); // nothing to retry yet
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(await screen.findByText('status: error')).toBeInTheDocument();
    expect(screen.getByTestId('live-assertive')).toHaveTextContent(/unavailable/i);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('status: success')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
