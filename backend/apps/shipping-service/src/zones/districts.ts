import { type DistrictView, type ShippingZoneCode } from '@zelqune/contracts';

/** The 64 districts of Bangladesh (slug, Bangla, English, division). */
export const DISTRICTS: readonly DistrictView[] = [
  // Dhaka
  { code: 'dhaka', nameBn: 'ঢাকা', nameEn: 'Dhaka', division: 'Dhaka' },
  { code: 'faridpur', nameBn: 'ফরিদপুর', nameEn: 'Faridpur', division: 'Dhaka' },
  { code: 'gazipur', nameBn: 'গাজীপুর', nameEn: 'Gazipur', division: 'Dhaka' },
  { code: 'gopalganj', nameBn: 'গোপালগঞ্জ', nameEn: 'Gopalganj', division: 'Dhaka' },
  { code: 'kishoreganj', nameBn: 'কিশোরগঞ্জ', nameEn: 'Kishoreganj', division: 'Dhaka' },
  { code: 'madaripur', nameBn: 'মাদারীপুর', nameEn: 'Madaripur', division: 'Dhaka' },
  { code: 'manikganj', nameBn: 'মানিকগঞ্জ', nameEn: 'Manikganj', division: 'Dhaka' },
  { code: 'munshiganj', nameBn: 'মুন্সীগঞ্জ', nameEn: 'Munshiganj', division: 'Dhaka' },
  { code: 'narayanganj', nameBn: 'নারায়ণগঞ্জ', nameEn: 'Narayanganj', division: 'Dhaka' },
  { code: 'narsingdi', nameBn: 'নরসিংদী', nameEn: 'Narsingdi', division: 'Dhaka' },
  { code: 'rajbari', nameBn: 'রাজবাড়ী', nameEn: 'Rajbari', division: 'Dhaka' },
  { code: 'shariatpur', nameBn: 'শরীয়তপুর', nameEn: 'Shariatpur', division: 'Dhaka' },
  { code: 'tangail', nameBn: 'টাঙ্গাইল', nameEn: 'Tangail', division: 'Dhaka' },
  // Chattogram
  { code: 'bandarban', nameBn: 'বান্দরবান', nameEn: 'Bandarban', division: 'Chattogram' },
  {
    code: 'brahmanbaria',
    nameBn: 'ব্রাহ্মণবাড়িয়া',
    nameEn: 'Brahmanbaria',
    division: 'Chattogram',
  },
  { code: 'chandpur', nameBn: 'চাঁদপুর', nameEn: 'Chandpur', division: 'Chattogram' },
  { code: 'chattogram', nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram', division: 'Chattogram' },
  { code: 'cumilla', nameBn: 'কুমিল্লা', nameEn: 'Cumilla', division: 'Chattogram' },
  { code: 'coxs-bazar', nameBn: 'কক্সবাজার', nameEn: "Cox's Bazar", division: 'Chattogram' },
  { code: 'feni', nameBn: 'ফেনী', nameEn: 'Feni', division: 'Chattogram' },
  { code: 'khagrachhari', nameBn: 'খাগড়াছড়ি', nameEn: 'Khagrachhari', division: 'Chattogram' },
  { code: 'lakshmipur', nameBn: 'লক্ষ্মীপুর', nameEn: 'Lakshmipur', division: 'Chattogram' },
  { code: 'noakhali', nameBn: 'নোয়াখালী', nameEn: 'Noakhali', division: 'Chattogram' },
  { code: 'rangamati', nameBn: 'রাঙ্গামাটি', nameEn: 'Rangamati', division: 'Chattogram' },
  // Rajshahi
  { code: 'bogura', nameBn: 'বগুড়া', nameEn: 'Bogura', division: 'Rajshahi' },
  {
    code: 'chapainawabganj',
    nameBn: 'চাঁপাইনবাবগঞ্জ',
    nameEn: 'Chapainawabganj',
    division: 'Rajshahi',
  },
  { code: 'joypurhat', nameBn: 'জয়পুরহাট', nameEn: 'Joypurhat', division: 'Rajshahi' },
  { code: 'naogaon', nameBn: 'নওগাঁ', nameEn: 'Naogaon', division: 'Rajshahi' },
  { code: 'natore', nameBn: 'নাটোর', nameEn: 'Natore', division: 'Rajshahi' },
  { code: 'pabna', nameBn: 'পাবনা', nameEn: 'Pabna', division: 'Rajshahi' },
  { code: 'rajshahi', nameBn: 'রাজশাহী', nameEn: 'Rajshahi', division: 'Rajshahi' },
  { code: 'sirajganj', nameBn: 'সিরাজগঞ্জ', nameEn: 'Sirajganj', division: 'Rajshahi' },
  // Khulna
  { code: 'bagerhat', nameBn: 'বাগেরহাট', nameEn: 'Bagerhat', division: 'Khulna' },
  { code: 'chuadanga', nameBn: 'চুয়াডাঙ্গা', nameEn: 'Chuadanga', division: 'Khulna' },
  { code: 'jashore', nameBn: 'যশোর', nameEn: 'Jashore', division: 'Khulna' },
  { code: 'jhenaidah', nameBn: 'ঝিনাইদহ', nameEn: 'Jhenaidah', division: 'Khulna' },
  { code: 'khulna', nameBn: 'খুলনা', nameEn: 'Khulna', division: 'Khulna' },
  { code: 'kushtia', nameBn: 'কুষ্টিয়া', nameEn: 'Kushtia', division: 'Khulna' },
  { code: 'magura', nameBn: 'মাগুরা', nameEn: 'Magura', division: 'Khulna' },
  { code: 'meherpur', nameBn: 'মেহেরপুর', nameEn: 'Meherpur', division: 'Khulna' },
  { code: 'narail', nameBn: 'নড়াইল', nameEn: 'Narail', division: 'Khulna' },
  { code: 'satkhira', nameBn: 'সাতক্ষীরা', nameEn: 'Satkhira', division: 'Khulna' },
  // Barishal
  { code: 'barguna', nameBn: 'বরগুনা', nameEn: 'Barguna', division: 'Barishal' },
  { code: 'barishal', nameBn: 'বরিশাল', nameEn: 'Barishal', division: 'Barishal' },
  { code: 'bhola', nameBn: 'ভোলা', nameEn: 'Bhola', division: 'Barishal' },
  { code: 'jhalokati', nameBn: 'ঝালকাঠি', nameEn: 'Jhalokati', division: 'Barishal' },
  { code: 'patuakhali', nameBn: 'পটুয়াখালী', nameEn: 'Patuakhali', division: 'Barishal' },
  { code: 'pirojpur', nameBn: 'পিরোজপুর', nameEn: 'Pirojpur', division: 'Barishal' },
  // Sylhet
  { code: 'habiganj', nameBn: 'হবিগঞ্জ', nameEn: 'Habiganj', division: 'Sylhet' },
  { code: 'moulvibazar', nameBn: 'মৌলভীবাজার', nameEn: 'Moulvibazar', division: 'Sylhet' },
  { code: 'sunamganj', nameBn: 'সুনামগঞ্জ', nameEn: 'Sunamganj', division: 'Sylhet' },
  { code: 'sylhet', nameBn: 'সিলেট', nameEn: 'Sylhet', division: 'Sylhet' },
  // Rangpur
  { code: 'dinajpur', nameBn: 'দিনাজপুর', nameEn: 'Dinajpur', division: 'Rangpur' },
  { code: 'gaibandha', nameBn: 'গাইবান্ধা', nameEn: 'Gaibandha', division: 'Rangpur' },
  { code: 'kurigram', nameBn: 'কুড়িগ্রাম', nameEn: 'Kurigram', division: 'Rangpur' },
  { code: 'lalmonirhat', nameBn: 'লালমনিরহাট', nameEn: 'Lalmonirhat', division: 'Rangpur' },
  { code: 'nilphamari', nameBn: 'নীলফামারী', nameEn: 'Nilphamari', division: 'Rangpur' },
  { code: 'panchagarh', nameBn: 'পঞ্চগড়', nameEn: 'Panchagarh', division: 'Rangpur' },
  { code: 'rangpur', nameBn: 'রংপুর', nameEn: 'Rangpur', division: 'Rangpur' },
  { code: 'thakurgaon', nameBn: 'ঠাকুরগাঁও', nameEn: 'Thakurgaon', division: 'Rangpur' },
  // Mymensingh
  { code: 'jamalpur', nameBn: 'জামালপুর', nameEn: 'Jamalpur', division: 'Mymensingh' },
  { code: 'mymensingh', nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh', division: 'Mymensingh' },
  { code: 'netrokona', nameBn: 'নেত্রকোণা', nameEn: 'Netrokona', division: 'Mymensingh' },
  { code: 'sherpur', nameBn: 'শেরপুর', nameEn: 'Sherpur', division: 'Mymensingh' },
];

export const DISTRICTS_BY_CODE = new Map(DISTRICTS.map((d) => [d.code, d]));

/** Districts that are not OUTSIDE (owner-approved placeholders; adjust here). */
const DISTRICT_ZONES: Record<string, ShippingZoneCode> = {
  dhaka: 'DHAKA',
  gazipur: 'SUBURB',
  narayanganj: 'SUBURB',
};

/** Areas inside Dhaka district that couriers treat as sub-Dhaka (English and Bangla spellings). */
const DHAKA_SUBURB_AREAS = [
  'savar',
  'সাভার',
  'ashulia',
  'আশুলিয়া',
  'keraniganj',
  'কেরানীগঞ্জ',
  'dhamrai',
  'ধামরাই',
  'dohar',
  'দোহার',
  'nawabganj',
  'নবাবগঞ্জ',
];

export function zoneFor(districtCode: string, area?: string): ShippingZoneCode {
  const zone = DISTRICT_ZONES[districtCode] ?? 'OUTSIDE';
  if (zone === 'DHAKA' && area) {
    const normalized = area.trim().toLowerCase();
    if (DHAKA_SUBURB_AREAS.some((a) => normalized.includes(a))) return 'SUBURB';
  }
  return zone;
}
