'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowLeftRight,
  MousePointerClick,
  ShieldAlert,
  PanelBottom,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Check,
} from 'lucide-react';

export const TOUR_COMPLETED_KEY = 'kraken-tour-completed';

interface TourStep {
  title: string;
  description: string;
  detail: string;
  icon: React.ElementType;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Dashboard',
    description: 'Your portfolio at a glance',
    detail:
      'This is your portfolio overview. Your starting capital was $10,000. Track your equity, daily P&L, open positions, and recent trades — all updating in real time.',
    icon: LayoutDashboard,
    color: 'text-blue-500',
  },
  {
    title: 'Trade',
    description: 'Execute trades with virtual funds',
    detail:
      'This is where you execute trades. Switch between Spot and Margin trading. Spot buys crypto directly with your cash balance, while Margin lets you leverage your position up to 5×.',
    icon: ArrowLeftRight,
    color: 'text-emerald-500',
  },
  {
    title: 'Order Entry',
    description: 'Choose your order type',
    detail:
      'Select an order type. Start with a Market order to buy instantly at the best available price. Limit orders let you set a target price.',
    icon: MousePointerClick,
    color: 'text-violet-500',
  },
  {
    title: 'Risk Management',
    description: 'Protect your capital',
    detail:
      'Always set a Stop Loss to protect your capital. The Risk Management panel (expanded automatically for margin trades) shows your risk amount, reward potential, and suggests position sizes based on your account risk percentage.',
    icon: ShieldAlert,
    color: 'text-amber-500',
  },
  {
    title: 'Bottom Panel',
    description: 'Monitor everything in one place',
    detail:
      'Monitor your open orders, positions, trade history, and even keep a trading journal — all in the bottom panel. Cancel orders, close positions, and review your performance without leaving the Trade page.',
    icon: PanelBottom,
    color: 'text-cyan-500',
  },
  {
    title: 'Education',
    description: 'Deepen your knowledge',
    detail:
      'Learn about all 8 order types with detailed explanations, examples, and trading tips. Complete the interactive 6-task tutorial to master Spot and Margin trading step by step.',
    icon: GraduationCap,
    color: 'text-rose-500',
  },
];

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingTour({ open, onClose, onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const totalSteps = TOUR_STEPS.length;
  const current = TOUR_STEPS[step];
  const isLast = step === totalSteps - 1;
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSkip = () => {
    onClose();
  };

  // Reset step when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className='max-w-md sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-start gap-4'>
            {/* Step icon */}
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted', current.color)}>
              <Icon className='h-6 w-6' />
            </div>
            <div className='min-w-0 flex-1 pt-1'>
              <DialogTitle className='text-base font-semibold'>
                {current.title}
              </DialogTitle>
              <DialogDescription className='mt-0.5 text-xs font-medium text-muted-foreground/70'>
                {current.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step body */}
        <div className='px-1'>
          <p className='text-sm leading-relaxed text-foreground/80'>
            {current.detail}
          </p>
        </div>

        {/* Progress indicator */}
        <div className='flex items-center justify-center gap-1.5'>
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step
                  ? 'w-6 bg-accent'
                  : i < step
                    ? 'w-1.5 bg-accent/40'
                    : 'w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40',
              )}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between border-t border-border pt-3'>
          <button
            onClick={handleSkip}
            className='flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
          >
            <SkipForward className='h-3 w-3' />
            Skip
          </button>

          <div className='flex items-center gap-2'>
            {step > 0 && (
              <button
                onClick={handlePrev}
                className='flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]'
              >
                <ChevronLeft className='h-3 w-3' />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className={cn(
                'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)]',
                isLast
                  ? 'bg-accent hover:bg-accent/90'
                  : 'bg-foreground/80 hover:bg-foreground',
              )}
            >
              {isLast ? (
                <>
                  <Check className='h-3 w-3' />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className='h-3 w-3' />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <p className='text-center text-[11px] text-muted-foreground/50'>
          {step + 1} of {totalSteps}
        </p>
      </DialogContent>
    </Dialog>
  );
}
