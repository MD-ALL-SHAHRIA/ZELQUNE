/**
 * The few strings error screens need, kept out of the full dictionaries so the error boundary
 * (which ships with every page) stays tiny. error-copy.test.ts keeps them equal to en/bn.ts.
 */
export const ERROR_COPY = {
  en: {
    error: 'Something went wrong on our side. Please try again.',
    errorHelp:
      "This page didn't load because of a problem on our side, not anything you did. Try again; if it keeps happening, message us on WhatsApp and we'll help.",
    errorOffline:
      "You seem to be offline, so this page couldn't load. Check your internet connection, then try again.",
    tryAgain: 'Try again',
    loading: 'Loading…',
    backHome: 'Back to home',
  },
  bn: {
    error: 'আমাদের দিক থেকে একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    errorHelp:
      'আমাদের দিকের একটা সমস্যার কারণে পাতাটি লোড হয়নি, আপনার কোনো ভুলে নয়। আবার চেষ্টা করুন; বারবার হলে WhatsApp-এ মেসেজ করুন, আমরা সাহায্য করব।',
    errorOffline:
      'মনে হচ্ছে আপনি অফলাইনে আছেন, তাই পাতাটি লোড হয়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
    tryAgain: 'আবার চেষ্টা করুন',
    loading: 'লোড হচ্ছে…',
    backHome: 'হোমে ফিরে যান',
  },
} as const;
