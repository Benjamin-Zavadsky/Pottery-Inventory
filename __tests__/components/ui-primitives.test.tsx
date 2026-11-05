// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, renderWithToast, screen } from '../support/render';
import { Button, buttonClass } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Badge, RegionChip } from '@/components/ui/Badge';
import { CardGridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PieceImage } from '@/components/ui/PieceImage';
import { Sheet } from '@/components/ui/Sheet';
import { Lightbox } from '@/components/ui/Lightbox';
import { useToast } from '@/components/ui/Toast';
import { Icon, Spinner } from '@/components/ui/Icon';

afterEach(() => vi.useRealTimers());

describe('Button', () => {
  it('shows a spinner and disables while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(buttonClass('danger', 'lg', 'x')).toContain('x');
  });
});

describe('Field', () => {
  it('links the label to its control and shows hints and required marks', () => {
    render(
      <Field label="Name" htmlFor="n" required hint="Use the catalog name" badge={<span>AI</span>}>
        <input id="n" />
      </Field>,
    );
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByText('Use the catalog name')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

describe('small display primitives', () => {
  it('render without crashing', () => {
    render(
      <>
        <Badge tone="warn">Warn</Badge>
        <RegionChip region="Europe" />
        <Skeleton />
        <CardGridSkeleton count={2} />
        <EmptyState title="Empty" body="Nothing" action={<button>Act</button>} />
        <Icon name="star" />
        <Spinner />
      </>,
    );
    expect(screen.getByText('Europe')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading pieces' })).toBeInTheDocument();
    expect(screen.getByText('Nothing')).toBeInTheDocument();
  });
});

describe('PieceImage', () => {
  it('falls back to the full photo, then a placeholder', () => {
    const { container } = render(<PieceImage src="thumb.jpg" fallbackSrc="full.jpg" alt="Jar" />);
    const img = screen.getByAltText('Jar');
    fireEvent.error(img);
    expect(screen.getByAltText('Jar')).toHaveAttribute('src', 'full.jpg');
    fireEvent.error(screen.getByAltText('Jar'));
    expect(screen.queryByAltText('Jar')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders a placeholder with no source at all, and eager loading when asked', () => {
    render(<PieceImage alt="none" />);
    expect(screen.queryByAltText('none')).not.toBeInTheDocument();
    render(<PieceImage src="a.jpg" alt="eager" eager />);
    expect(screen.getByAltText('eager')).toHaveAttribute('loading', 'eager');
  });
});

describe('Sheet', () => {
  it('renders nothing when closed and closes on Escape, backdrop, and button', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Sheet open={false} onClose={onClose} title="Filters">
        body
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(
      <Sheet open onClose={onClose} title="Filters" footer={<span>footer</span>}>
        body
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('dialog').previousSibling as Element);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe('Lightbox', () => {
  it('navigates with buttons, keys and swipes; zooms; closes', () => {
    const onIndex = vi.fn();
    const onClose = vi.fn();
    render(
      <Lightbox
        images={['a', 'b', 'c']}
        index={0}
        alt="Jar"
        onClose={onClose}
        onIndexChange={onIndex}
      />,
    );
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'x' });
    expect(onIndex.mock.calls.map((c) => c[0])).toEqual([1, 2, 1, 2]);

    const img = screen.getByAltText('Jar — photo 1 of 3');
    const stage = img.parentElement as HTMLElement;
    fireEvent.touchStart(stage, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 50 }] });
    fireEvent.touchStart(stage, { touches: [{ clientX: 50 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 200 }] });
    fireEvent.touchStart(stage, { touches: [{ clientX: 50 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 60 }] });
    expect(onIndex).toHaveBeenCalledTimes(6);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom to full size' }));
    expect(screen.getByRole('button', { name: 'Fit to screen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 500 }] });
    fireEvent.click(img);
    expect(screen.getByRole('button', { name: 'Zoom to full size' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close photo viewer' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('hides navigation for a single photo', () => {
    render(
      <Lightbox images={['a']} index={0} alt="Jar" onClose={vi.fn()} onIndexChange={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
  });
});

describe('Toast', () => {
  function Trigger() {
    const toast = useToast();
    return (
      <>
        <button onClick={() => toast.success('Saved')}>ok</button>
        <button onClick={() => toast.error('Failed')}>bad</button>
        <button onClick={() => toast.info('FYI')}>info</button>
      </>
    );
  }

  it('shows messages, dismisses on click, and expires', () => {
    vi.useFakeTimers();
    renderWithToast(<Trigger />);
    fireEvent.click(screen.getByText('ok'));
    fireEvent.click(screen.getByText('bad'));
    fireEvent.click(screen.getByText('info'));
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    expect(screen.getAllByRole('status')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('is a safe no-op outside a provider', () => {
    render(<Trigger />);
    expect(() => fireEvent.click(screen.getByText('ok'))).not.toThrow();
  });
});
