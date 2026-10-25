/**
 * The few strings error screens need, kept out of the full dictionaries so the error boundary
 * (which ships with every page) stays tiny. error-copy.test.ts keeps them equal to en/bn.ts.
 */
export const ERROR_COPY = {
  en: {
    error: 'Something went wrong on our side. Please try again.',
    tryAgain: 'Try again',
    backHome: 'Back to home',
  },
  bn: {
    error: 'আমাদের দিক থেকে একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    tryAgain: 'আবার চেষ্টা করুন',
    backHome: 'হোমে ফিরে যান',
  },
} as const;
