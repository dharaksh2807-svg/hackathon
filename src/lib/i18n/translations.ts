/**
 * FairShift Internationalization (i18n) System
 * Centralized translation dictionaries for worker-facing flows.
 * Supports: English, Hindi, Tamil, Telugu (P0)
 * Architecture: Local dictionaries — no paid API, no server dependency.
 */

export type LangCode = "en" | "hi" | "ta" | "te";

export interface LangMeta {
  code: LangCode;
  nativeLabel: string;
  englishLabel: string;
  rtl: boolean;
  fontHint: string; // Suggestion for CSS font family stacking
}

export const SUPPORTED_LANGUAGES: LangMeta[] = [
  { code: "en", nativeLabel: "English", englishLabel: "English", rtl: false, fontHint: "sans-serif" },
  { code: "hi", nativeLabel: "हिंदी", englishLabel: "Hindi", rtl: false, fontHint: "'Noto Sans Devanagari', sans-serif" },
  { code: "ta", nativeLabel: "தமிழ்", englishLabel: "Tamil", rtl: false, fontHint: "'Noto Sans Tamil', sans-serif" },
  { code: "te", nativeLabel: "తెలుగు", englishLabel: "Telugu", rtl: false, fontHint: "'Noto Sans Telugu', sans-serif" },
];

export type TranslationKey =
  // App shell
  | "appName"
  | "appTagline"
  // Language selector
  | "selectLanguage"
  | "languageLabel"
  // Onboarding
  | "onboardingStep1Title"
  | "onboardingStep1Desc"
  | "onboardingStep2Title"
  | "onboardingStep2Desc"
  | "onboardingStep3Title"
  | "onboardingStep3Desc"
  | "onboardingStart"
  | "onboardingSkip"
  | "onboardingNext"
  | "onboardingBack"
  // Worker home — 4 actions
  | "actionMyWork"
  | "actionMyWorkDesc"
  | "actionMyMoney"
  | "actionMyMoneyDesc"
  | "actionMissingMoney"
  | "actionMissingMoneyDesc"
  | "actionGetHelp"
  | "actionGetHelpDesc"
  // Navigation
  | "navDashboard"
  | "navComplaints"
  | "navAdminPanel"
  | "navApiStatus"
  // Worker section labels
  | "myShifts"
  | "myEarnings"
  | "moneyIShouldGet"
  | "moneyMyEmployerEntered"
  | "moneyStillMissing"
  | "allShifts"
  | "unpaidShifts"
  | "activeShifts"
  | "completedShifts"
  | "noShiftsFound"
  | "noMissingMoney"
  | "allMatchedMessage"
  // Shift actions
  | "checkIn"
  | "checkOut"
  | "viewPayDetails"
  | "reportMissingMoney"
  | "viewComplaint"
  // Shift status labels
  | "statusPlanned"
  | "statusCheckedIn"
  | "statusCompleted"
  | "statusMatchedPay"
  | "statusUnderpaid"
  | "statusOverpaid"
  | "statusNotRecorded"
  // Earnings breakdown
  | "earningsBreakdown"
  | "howWasThisCalculated"
  | "regularPay"
  | "overtimePay"
  | "siteAllowance"
  | "weekendBonus"
  | "totalExpected"
  | "employerRecorded"
  | "difference"
  | "shiftsThisMonth"
  | "completedShiftsCount"
  | "recordedShiftsCount"
  | "missingMoneyShifts"
  // Dispute / complaint flow
  | "complaintTitle"
  | "complaintDescription"
  | "complaintReason"
  | "complaintReasonPlaceholder"
  | "complaintReasonHint"
  | "complaintSubmit"
  | "complaintCancel"
  | "complaintSubmitting"
  | "complaintSuccess"
  | "complaintStatus"
  | "complaintOpen"
  | "complaintApproved"
  | "complaintRejected"
  | "complaintViewDetail"
  | "complaintShortfall"
  | "complaintEmployerResponse"
  | "complaintFiledOn"
  // Voice
  | "voiceReadAloud"
  | "voicePlaying"
  | "voiceNotAvailable"
  // Help page
  | "helpTitle"
  | "helpStep1"
  | "helpStep2"
  | "helpStep3"
  | "helpStep4"
  // Errors / validation
  | "errorNetworkFailed"
  | "errorCheckInFailed"
  | "errorCheckOutFailed"
  | "errorComplaintFailed"
  | "errorMinChars"
  | "errorMaxChars"
  | "validCharsRemaining"
  // Misc
  | "loading"
  | "close"
  | "cancel"
  | "submit"
  | "back"
  | "workedTime"
  | "unpaidBreak"
  | "scheduledStart"
  | "scheduledEnd"
  | "actualCheckIn"
  | "actualCheckOut"
  | "shiftLocation"
  | "sector"
  | "construction"
  | "campus"
  | "openComplaints"
  | "totalComplaints"
  | "actionNeeded"
  | "checkedInSuccess"
  | "checkedOutSuccess"
  | "organization"
  | "employerPortal"
  | "workerPortal"
  // Daily Earnings Tracker
  | "dailyEarningsTitle"
  | "dailyEarningsSubtitle"
  | "timeframeWeekly"
  | "timeframeMonthly"
  | "expectedLegend"
  | "recordedLegend"
  | "differenceLegend"
  | "tapBarHint"
  | "workedHours"
  | "shiftSite"
  | "statusMatched"
  | "statusPendingEntry"
  | "statusShortfall"
  | "noEarningsData"
  | "noEarningsDesc";

type TranslationDict = Record<TranslationKey, string>;

const en: TranslationDict = {
  appName: "FairShift",
  appTagline: "Your wages, your rights",
  selectLanguage: "Choose your language",
  languageLabel: "Language",
  onboardingStep1Title: "See your working days",
  onboardingStep1Desc: "Check when you worked and when your next shift is.",
  onboardingStep2Title: "Check how much you should receive",
  onboardingStep2Desc: "See the exact money you are owed for every day of work.",
  onboardingStep3Title: "Report missing money",
  onboardingStep3Desc: "If the money you received is less than what you should get, raise a complaint here.",
  onboardingStart: "Get Started",
  onboardingSkip: "Skip",
  onboardingNext: "Next",
  onboardingBack: "Back",
  actionMyWork: "My Work",
  actionMyWorkDesc: "View shifts & attendance",
  actionMyMoney: "My Money",
  actionMyMoneyDesc: "Understand your earnings",
  actionMissingMoney: "Missing Money",
  actionMissingMoneyDesc: "See money still owed",
  actionGetHelp: "Get Help",
  actionGetHelpDesc: "Complaints & support",
  navDashboard: "Home",
  navComplaints: "Complaints",
  navAdminPanel: "Admin",
  navApiStatus: "API Status",
  myShifts: "My Shifts",
  myEarnings: "My Earnings",
  moneyIShouldGet: "Money I Should Get",
  moneyMyEmployerEntered: "Money My Employer Entered",
  moneyStillMissing: "Money Still Missing",
  allShifts: "All",
  unpaidShifts: "Underpaid",
  activeShifts: "Active",
  completedShifts: "Completed",
  noShiftsFound: "No shifts found",
  noMissingMoney: "No missing money found",
  allMatchedMessage: "Your recorded pay matches what you should get. Great!",
  checkIn: "Check In",
  checkOut: "Check Out",
  viewPayDetails: "View Pay Details",
  reportMissingMoney: "Report Missing Money",
  viewComplaint: "View Complaint",
  statusPlanned: "Planned",
  statusCheckedIn: "At Work",
  statusCompleted: "Done",
  statusMatchedPay: "Pay Correct",
  statusUnderpaid: "Money Missing",
  statusOverpaid: "Overpaid",
  statusNotRecorded: "Not Yet Entered",
  earningsBreakdown: "Pay Breakdown",
  howWasThisCalculated: "How was this calculated?",
  regularPay: "Regular Pay",
  overtimePay: "Extra Hours Pay",
  siteAllowance: "Site Allowance",
  weekendBonus: "Weekend Bonus",
  totalExpected: "Money I Should Get",
  employerRecorded: "Money My Employer Entered",
  difference: "Money Still Missing",
  shiftsThisMonth: "Shifts this month",
  completedShiftsCount: "Completed shifts",
  recordedShiftsCount: "Shifts with pay entered",
  missingMoneyShifts: "Shifts with missing money",
  complaintTitle: "Report Missing Money",
  complaintDescription: "Tell us why the pay is wrong",
  complaintReason: "What is the problem?",
  complaintReasonPlaceholder: "Example: I worked extra hours but they were not paid. I worked on Saturday but no weekend bonus was added.",
  complaintReasonHint: "Please give at least 10 characters explaining the problem.",
  complaintSubmit: "Submit Complaint",
  complaintCancel: "Cancel",
  complaintSubmitting: "Submitting...",
  complaintSuccess: "Complaint submitted",
  complaintStatus: "Complaint Status",
  complaintOpen: "Waiting for review",
  complaintApproved: "Approved — pay adjusted",
  complaintRejected: "Not approved",
  complaintViewDetail: "View Details",
  complaintShortfall: "Amount you are claiming",
  complaintEmployerResponse: "Employer's response",
  complaintFiledOn: "Filed on",
  voiceReadAloud: "Read aloud",
  voicePlaying: "Playing...",
  voiceNotAvailable: "Read-aloud not available",
  helpTitle: "How FairShift Works",
  helpStep1: "1. Open the app and look at your shifts.",
  helpStep2: "2. Check if the money entered by your employer matches what you should get.",
  helpStep3: "3. If money is missing, tap Report Missing Money and explain the problem.",
  helpStep4: "4. Check back to see if your employer has responded to your complaint.",
  errorNetworkFailed: "Could not connect. Please try again.",
  errorCheckInFailed: "Check-in failed. Please try again.",
  errorCheckOutFailed: "Check-out failed. Please try again.",
  errorComplaintFailed: "Could not submit complaint. Please try again.",
  errorMinChars: "Please write at least 10 characters.",
  errorMaxChars: "Maximum 1000 characters allowed.",
  validCharsRemaining: "characters",
  loading: "Loading...",
  close: "Close",
  cancel: "Cancel",
  submit: "Submit",
  back: "Back",
  workedTime: "Time Worked",
  unpaidBreak: "Break",
  scheduledStart: "Start Time",
  scheduledEnd: "End Time",
  actualCheckIn: "Checked In At",
  actualCheckOut: "Checked Out At",
  shiftLocation: "Location",
  sector: "Work Type",
  construction: "Construction",
  campus: "Campus",
  openComplaints: "Open Complaints",
  totalComplaints: "Total Complaints",
  actionNeeded: "Action Needed",
  checkedInSuccess: "Checked in successfully",
  checkedOutSuccess: "Shift completed",
  organization: "Organization",
  employerPortal: "Employer Portal",
  workerPortal: "Worker Portal",
  dailyEarningsTitle: "Daily Earnings Tracker",
  dailyEarningsSubtitle: "See which day you worked and how much you earned",
  timeframeWeekly: "This Week",
  timeframeMonthly: "This Month",
  expectedLegend: "Expected Pay",
  recordedLegend: "Employer Entered",
  differenceLegend: "Missing Money",
  tapBarHint: "Tap any day to see worked hours and full pay breakdown",
  workedHours: "Hours Worked",
  shiftSite: "Work Site",
  statusMatched: "Pay Correct",
  statusPendingEntry: "Awaiting Employer Entry",
  statusShortfall: "Missing from Record",
  noEarningsData: "No completed shifts found",
  noEarningsDesc: "When you finish your shifts, your daily earnings will appear here.",
};

const hi: TranslationDict = {
  appName: "फेयरशिफ्ट",
  appTagline: "आपकी मजदूरी, आपका अधिकार",
  selectLanguage: "अपनी भाषा चुनें",
  languageLabel: "भाषा",
  onboardingStep1Title: "अपने काम के दिन देखें",
  onboardingStep1Desc: "देखें कि आपने कब काम किया और अगली शिफ्ट कब है।",
  onboardingStep2Title: "देखें आपको कितना पैसा मिलना चाहिए",
  onboardingStep2Desc: "हर काम के दिन के लिए आपको मिलने वाली सटीक राशि जानें।",
  onboardingStep3Title: "कम पैसे की शिकायत करें",
  onboardingStep3Desc: "अगर आपको मिला पैसा आपके हक से कम है, तो यहाँ शिकायत दर्ज करें।",
  onboardingStart: "शुरू करें",
  onboardingSkip: "छोड़ें",
  onboardingNext: "आगे",
  onboardingBack: "पीछे",
  actionMyWork: "मेरा काम",
  actionMyWorkDesc: "शिफ्ट और हाजिरी देखें",
  actionMyMoney: "मेरा पैसा",
  actionMyMoneyDesc: "अपनी कमाई समझें",
  actionMissingMoney: "कम पैसा",
  actionMissingMoneyDesc: "बकाया पैसा देखें",
  actionGetHelp: "मदद लें",
  actionGetHelpDesc: "शिकायत और सहायता",
  navDashboard: "होम",
  navComplaints: "शिकायतें",
  navAdminPanel: "एडमिन",
  navApiStatus: "API स्थिति",
  myShifts: "मेरी शिफ्ट",
  myEarnings: "मेरी कमाई",
  moneyIShouldGet: "मुझे मिलने वाला पैसा",
  moneyMyEmployerEntered: "मालिक द्वारा दर्ज पैसा",
  moneyStillMissing: "अभी भी बाकी पैसा",
  allShifts: "सभी",
  unpaidShifts: "कम भुगतान",
  activeShifts: "सक्रिय",
  completedShifts: "पूरी हुई",
  noShiftsFound: "कोई शिफ्ट नहीं मिली",
  noMissingMoney: "कोई बकाया पैसा नहीं",
  allMatchedMessage: "आपकी कमाई सही है। बहुत अच्छा!",
  checkIn: "हाजिरी लगाएं",
  checkOut: "काम समाप्त करें",
  viewPayDetails: "पैसे का विवरण देखें",
  reportMissingMoney: "कम पैसे की शिकायत",
  viewComplaint: "शिकायत देखें",
  statusPlanned: "आने वाली",
  statusCheckedIn: "काम पर",
  statusCompleted: "हो गई",
  statusMatchedPay: "पैसा सही",
  statusUnderpaid: "पैसा कम",
  statusOverpaid: "ज्यादा पैसा",
  statusNotRecorded: "अभी दर्ज नहीं",
  earningsBreakdown: "पैसे का हिसाब",
  howWasThisCalculated: "यह कैसे जोड़ा गया?",
  regularPay: "सामान्य मजदूरी",
  overtimePay: "ओवरटाइम मजदूरी",
  siteAllowance: "साइट भत्ता",
  weekendBonus: "वीकेंड बोनस",
  totalExpected: "मुझे मिलने वाला पैसा",
  employerRecorded: "मालिक द्वारा दर्ज पैसा",
  difference: "बाकी पैसा",
  shiftsThisMonth: "इस महीने की शिफ्ट",
  completedShiftsCount: "पूरी हुई शिफ्ट",
  recordedShiftsCount: "दर्ज पैसे वाली शिफ्ट",
  missingMoneyShifts: "कम पैसे वाली शिफ्ट",
  complaintTitle: "कम पैसे की शिकायत",
  complaintDescription: "बताएं पैसा क्यों गलत है",
  complaintReason: "क्या समस्या है?",
  complaintReasonPlaceholder: "उदाहरण: मैंने ओवरटाइम काम किया लेकिन पैसा नहीं मिला। शनिवार को काम किया पर वीकेंड बोनस नहीं जोड़ा गया।",
  complaintReasonHint: "कृपया कम से कम 10 अक्षरों में समस्या बताएं।",
  complaintSubmit: "शिकायत दर्ज करें",
  complaintCancel: "रद्द करें",
  complaintSubmitting: "भेज रहे हैं...",
  complaintSuccess: "शिकायत दर्ज हो गई",
  complaintStatus: "शिकायत की स्थिति",
  complaintOpen: "समीक्षा की प्रतीक्षा",
  complaintApproved: "स्वीकृत — पैसा ठीक किया गया",
  complaintRejected: "अस्वीकृत",
  complaintViewDetail: "विवरण देखें",
  complaintShortfall: "आपका दावा",
  complaintEmployerResponse: "मालिक का जवाब",
  complaintFiledOn: "दर्ज की तारीख",
  voiceReadAloud: "सुनें",
  voicePlaying: "चल रहा है...",
  voiceNotAvailable: "आवाज़ उपलब्ध नहीं",
  helpTitle: "फेयरशिफ्ट कैसे काम करता है",
  helpStep1: "1. ऐप खोलें और अपनी शिफ्ट देखें।",
  helpStep2: "2. देखें कि मालिक का दर्ज पैसा आपके हक के बराबर है या नहीं।",
  helpStep3: "3. अगर पैसा कम है, तो 'कम पैसे की शिकायत' पर जाएं और समस्या बताएं।",
  helpStep4: "4. वापस आकर देखें कि आपके मालिक ने शिकायत का क्या जवाब दिया।",
  errorNetworkFailed: "कनेक्ट नहीं हो पाया। फिर कोशिश करें।",
  errorCheckInFailed: "हाजिरी नहीं लग पाई। फिर कोशिश करें।",
  errorCheckOutFailed: "काम पूरा दर्ज नहीं हुआ। फिर कोशिश करें।",
  errorComplaintFailed: "शिकायत नहीं हो पाई। फिर कोशिश करें।",
  errorMinChars: "कम से कम 10 अक्षर लिखें।",
  errorMaxChars: "अधिकतम 1000 अक्षर।",
  validCharsRemaining: "अक्षर",
  loading: "लोड हो रहा है...",
  close: "बंद करें",
  cancel: "रद्द करें",
  submit: "दर्ज करें",
  back: "वापस",
  workedTime: "काम का समय",
  unpaidBreak: "ब्रेक",
  scheduledStart: "शुरू का समय",
  scheduledEnd: "खत्म का समय",
  actualCheckIn: "हाजिरी का समय",
  actualCheckOut: "काम खत्म का समय",
  shiftLocation: "जगह",
  sector: "काम का प्रकार",
  construction: "निर्माण",
  campus: "कैंपस",
  openComplaints: "खुली शिकायतें",
  totalComplaints: "कुल शिकायतें",
  actionNeeded: "कार्रवाई जरूरी",
  checkedInSuccess: "हाजिरी सफलतापूर्वक लग गई",
  checkedOutSuccess: "शिफ्ट पूरी हो गई",
  organization: "संगठन",
  employerPortal: "मालिक पोर्टल",
  workerPortal: "मजदूर पोर्टल",
  dailyEarningsTitle: "दैनिक कमाई ट्रैकर",
  dailyEarningsSubtitle: "देखें कि आपने किस दिन काम किया और कितना कमाया",
  timeframeWeekly: "इस हफ़्ते",
  timeframeMonthly: "इस महीने",
  expectedLegend: "हक़ की कमाई (अपेक्षित)",
  recordedLegend: "मालिक द्वारा दर्ज",
  differenceLegend: "कम पैसा",
  tapBarHint: "घंटे और कमाई देखने के लिए किसी भी दिन पर टैप करें",
  workedHours: "काम के घंटे",
  shiftSite: "काम की जगह",
  statusMatched: "सही भुगतान",
  statusPendingEntry: "मालिक की एंट्री बाकी है",
  statusShortfall: "खाते में कम दर्ज",
  noEarningsData: "इस अवधि का कोई काम दर्ज नहीं है",
  noEarningsDesc: "शिफ्ट पूरी होने पर आपकी हर दिन की कमाई यहां दिखेगी।",
};

const ta: TranslationDict = {
  appName: "ஃபேர்ஷிஃப்ட்",
  appTagline: "உங்கள் ஊதியம், உங்கள் உரிமை",
  selectLanguage: "உங்கள் மொழியைத் தேர்வு செய்யுங்கள்",
  languageLabel: "மொழி",
  onboardingStep1Title: "உங்கள் வேலை நாட்களைப் பாருங்கள்",
  onboardingStep1Desc: "நீங்கள் எப்போது வேலை செய்தீர்கள், அடுத்த ஷிஃப்ட் எப்போது என்று பாருங்கள்.",
  onboardingStep2Title: "எவ்வளவு பணம் கிடைக்கும் என்று பாருங்கள்",
  onboardingStep2Desc: "ஒவ்வொரு வேலை நாளுக்கும் நீங்கள் பெற வேண்டிய சரியான தொகையை அறியுங்கள்.",
  onboardingStep3Title: "காணாமல் போன பணத்தை புகார் செய்யுங்கள்",
  onboardingStep3Desc: "கிடைத்த பணம் கிடைக்க வேண்டியதை விட குறைவாக இருந்தால், இங்கே புகார் செய்யுங்கள்.",
  onboardingStart: "தொடங்குங்கள்",
  onboardingSkip: "தவிர்",
  onboardingNext: "அடுத்து",
  onboardingBack: "பின்",
  actionMyWork: "என் வேலை",
  actionMyWorkDesc: "ஷிஃப்ட் மற்றும் வருகை",
  actionMyMoney: "என் பணம்",
  actionMyMoneyDesc: "வருவாயை புரிந்து கொள்ளுங்கள்",
  actionMissingMoney: "காணாமல் போன பணம்",
  actionMissingMoneyDesc: "இன்னும் கொடுக்க வேண்டிய பணம்",
  actionGetHelp: "உதவி பெறுங்கள்",
  actionGetHelpDesc: "புகார் மற்றும் ஆதரவு",
  navDashboard: "முகப்பு",
  navComplaints: "புகார்கள்",
  navAdminPanel: "நிர்வாகம்",
  navApiStatus: "API நிலை",
  myShifts: "என் ஷிஃப்ட்கள்",
  myEarnings: "என் வருவாய்",
  moneyIShouldGet: "எனக்கு கிடைக்க வேண்டிய பணம்",
  moneyMyEmployerEntered: "என் முதலாளி உள்ளிட்ட பணம்",
  moneyStillMissing: "இன்னும் கிடைக்காத பணம்",
  allShifts: "அனைத்தும்",
  unpaidShifts: "குறைந்த கொடுப்பனவு",
  activeShifts: "செயலில்",
  completedShifts: "முடிந்தவை",
  noShiftsFound: "ஷிஃப்ட் எதுவும் இல்லை",
  noMissingMoney: "காணாமல் போன பணம் இல்லை",
  allMatchedMessage: "உங்கள் ஊதியம் சரியாக உள்ளது. மிகவும் நல்லது!",
  checkIn: "வருகை பதிவு",
  checkOut: "வேலை முடித்தல்",
  viewPayDetails: "ஊதிய விவரம் காண",
  reportMissingMoney: "காணாமல் போன பணம் புகார்",
  viewComplaint: "புகாரைக் காண",
  statusPlanned: "திட்டமிட்டது",
  statusCheckedIn: "வேலையில்",
  statusCompleted: "முடிந்தது",
  statusMatchedPay: "ஊதியம் சரி",
  statusUnderpaid: "பணம் குறைவு",
  statusOverpaid: "அதிக பணம்",
  statusNotRecorded: "இன்னும் பதியவில்லை",
  earningsBreakdown: "ஊதிய விளக்கம்",
  howWasThisCalculated: "இது எவ்வாறு கணக்கிடப்பட்டது?",
  regularPay: "வழக்கமான ஊதியம்",
  overtimePay: "கூடுதல் நேர ஊதியம்",
  siteAllowance: "தள கொடுப்பனவு",
  weekendBonus: "வார இறுதி போனஸ்",
  totalExpected: "எனக்கு கிடைக்க வேண்டிய பணம்",
  employerRecorded: "முதலாளி உள்ளிட்ட பணம்",
  difference: "காணாமல் போன பணம்",
  shiftsThisMonth: "இந்த மாத ஷிஃப்ட்கள்",
  completedShiftsCount: "முடிந்த ஷிஃப்ட்கள்",
  recordedShiftsCount: "ஊதியம் பதிந்த ஷிஃப்ட்கள்",
  missingMoneyShifts: "பணம் குறைவான ஷிஃப்ட்கள்",
  complaintTitle: "காணாமல் போன பணம் புகார்",
  complaintDescription: "ஊதியம் ஏன் தவறு என்று சொல்லுங்கள்",
  complaintReason: "என்ன பிரச்சனை?",
  complaintReasonPlaceholder: "உதாரணம்: கூடுதல் நேரம் வேலை செய்தேன் ஆனால் பணம் கிடைக்கவில்லை. சனிக்கிழமை வேலை செய்தேன் ஆனால் வார இறுதி போனஸ் சேர்க்கவில்லை.",
  complaintReasonHint: "குறைந்தபட்சம் 10 எழுத்துகளில் பிரச்சனையை விளக்குங்கள்.",
  complaintSubmit: "புகார் சமர்ப்பி",
  complaintCancel: "ரத்துசெய்",
  complaintSubmitting: "சமர்ப்பிக்கிறது...",
  complaintSuccess: "புகார் சமர்ப்பிக்கப்பட்டது",
  complaintStatus: "புகார் நிலை",
  complaintOpen: "மதிப்பாய்வு காத்திருக்கிறது",
  complaintApproved: "அங்கீகரிக்கப்பட்டது — ஊதியம் சரிசெய்யப்பட்டது",
  complaintRejected: "நிராகரிக்கப்பட்டது",
  complaintViewDetail: "விவரங்கள் காண",
  complaintShortfall: "உங்கள் கோரிக்கை",
  complaintEmployerResponse: "முதலாளியின் பதில்",
  complaintFiledOn: "தாக்கல் செய்த தேதி",
  voiceReadAloud: "சத்தமாக படி",
  voicePlaying: "இயங்குகிறது...",
  voiceNotAvailable: "குரல் கிடைக்கவில்லை",
  helpTitle: "ஃபேர்ஷிஃப்ட் எவ்வாறு செயல்படுகிறது",
  helpStep1: "1. செயலியைத் திறந்து உங்கள் ஷிஃப்ட்களைப் பாருங்கள்.",
  helpStep2: "2. முதலாளி உள்ளிட்ட பணம் கிடைக்க வேண்டியதோடு ஒத்துப்போகிறதா என்று சரிபாருங்கள்.",
  helpStep3: "3. பணம் குறைவாக இருந்தால், 'காணாமல் போன பணம் புகார்' என்பதைத் தட்டுங்கள்.",
  helpStep4: "4. மீண்டும் வந்து முதலாளி என்ன பதில் சொன்னார் என்று பாருங்கள்.",
  errorNetworkFailed: "இணைக்க முடியவில்லை. மீண்டும் முயற்சி செய்யுங்கள்.",
  errorCheckInFailed: "வருகை பதிவு தோல்வி. மீண்டும் முயற்சி செய்யுங்கள்.",
  errorCheckOutFailed: "வேலை முடித்தல் தோல்வி. மீண்டும் முயற்சி செய்யுங்கள்.",
  errorComplaintFailed: "புகார் சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சி செய்யுங்கள்.",
  errorMinChars: "குறைந்தது 10 எழுத்துகள் எழுதுங்கள்.",
  errorMaxChars: "அதிகபட்சம் 1000 எழுத்துகள்.",
  validCharsRemaining: "எழுத்துகள்",
  loading: "ஏற்றுகிறது...",
  close: "மூடு",
  cancel: "ரத்துசெய்",
  submit: "சமர்ப்பி",
  back: "பின்",
  workedTime: "வேலை நேரம்",
  unpaidBreak: "இடைவேளை",
  scheduledStart: "தொடக்க நேரம்",
  scheduledEnd: "முடிவு நேரம்",
  actualCheckIn: "வருகை நேரம்",
  actualCheckOut: "வெளியேறிய நேரம்",
  shiftLocation: "இடம்",
  sector: "வேலை வகை",
  construction: "கட்டுமானம்",
  campus: "கேம்பஸ்",
  openComplaints: "திறந்த புகார்கள்",
  totalComplaints: "மொத்த புகார்கள்",
  actionNeeded: "நடவடிக்கை தேவை",
  checkedInSuccess: "வருகை வெற்றிகரமாக பதிவாகியது",
  checkedOutSuccess: "ஷிஃப்ட் முடிந்தது",
  organization: "நிறுவனம்",
  employerPortal: "முதலாளி போர்டல்",
  workerPortal: "தொழிலாளி போர்டல்",
  dailyEarningsTitle: "தினசரி வருமானக் கண்காணிப்பு",
  dailyEarningsSubtitle: "எந்த நாளில் வேலை செய்தீர்கள் மற்றும் எவ்வளவு சம்பாதித்தீர்கள் என்று பாருங்கள்",
  timeframeWeekly: "இந்த வாரம்",
  timeframeMonthly: "இந்த மாதம்",
  expectedLegend: "வர வேண்டிய ஊதியம்",
  recordedLegend: "முதலாளி பதிவு செய்தது",
  differenceLegend: "குறைந்த பணம்",
  tapBarHint: "நேரம் மற்றும் ஊதியத்தைப் பார்க்க ஏதேனும் ஒரு நாளைத் தட்டவும்",
  workedHours: "வேலை செய்த நேரம்",
  shiftSite: "வேலை செய்த இடம்",
  statusMatched: "சரியான ஊதியம்",
  statusPendingEntry: "முதலாளி பதிவு செய்ய வேண்டும்",
  statusShortfall: "பதிவில் விடுபட்டது",
  noEarningsData: "வேலை விவரங்கள் எதுவும் இல்லை",
  noEarningsDesc: "ஷிஃப்ட் முடிந்ததும் உங்கள் தினசரி வருமானம் இங்கு தோன்றும்.",
};

const te: TranslationDict = {
  appName: "ఫెయిర్‌షిఫ్ట్",
  appTagline: "మీ వేతనం, మీ హక్కు",
  selectLanguage: "మీ భాషను ఎంచుకోండి",
  languageLabel: "భాష",
  onboardingStep1Title: "మీ పని రోజులు చూడండి",
  onboardingStep1Desc: "మీరు ఎప్పుడు పనిచేశారో, తదుపరి షిఫ్ట్ ఎప్పుడో చూడండి.",
  onboardingStep2Title: "మీకు ఎంత పైసలు రావాలో చూడండి",
  onboardingStep2Desc: "ప్రతి పని రోజుకు మీకు రావలసిన ఖచ్చితమైన మొత్తం తెలుసుకోండి.",
  onboardingStep3Title: "తక్కువ పైసల గురించి ఫిర్యాదు చేయండి",
  onboardingStep3Desc: "అందిన పైసలు రావలసిన దాని కంటే తక్కువగా ఉంటే ఇక్కడ ఫిర్యాదు చేయండి.",
  onboardingStart: "ప్రారంభించండి",
  onboardingSkip: "దాటు",
  onboardingNext: "తదుపరి",
  onboardingBack: "వెనుక",
  actionMyWork: "నా పని",
  actionMyWorkDesc: "షిఫ్టులు & హాజరు",
  actionMyMoney: "నా పైసలు",
  actionMyMoneyDesc: "సంపాదన అర్థం చేసుకోండి",
  actionMissingMoney: "తక్కువ పైసలు",
  actionMissingMoneyDesc: "ఇంకా రావలసిన పైసలు",
  actionGetHelp: "సహాయం పొందండి",
  actionGetHelpDesc: "ఫిర్యాదులు & మద్దతు",
  navDashboard: "హోమ్",
  navComplaints: "ఫిర్యాదులు",
  navAdminPanel: "అడ్మిన్",
  navApiStatus: "API స్థితి",
  myShifts: "నా షిఫ్టులు",
  myEarnings: "నా సంపాదన",
  moneyIShouldGet: "నాకు రావలసిన పైసలు",
  moneyMyEmployerEntered: "యజమాని నమోదు చేసిన పైసలు",
  moneyStillMissing: "ఇంకా రాని పైసలు",
  allShifts: "అన్నీ",
  unpaidShifts: "తక్కువ చెల్లింపు",
  activeShifts: "చురుకుగా",
  completedShifts: "పూర్తయినవి",
  noShiftsFound: "షిఫ్టులు కనుగొనబడలేదు",
  noMissingMoney: "తక్కువ పైసలు లేవు",
  allMatchedMessage: "మీ వేతనం సరిగ్గా ఉంది. చాలా బాగుంది!",
  checkIn: "హాజరు నమోదు",
  checkOut: "పని ముగించు",
  viewPayDetails: "వేతన వివరాలు చూడండి",
  reportMissingMoney: "తక్కువ పైసల ఫిర్యాదు",
  viewComplaint: "ఫిర్యాదు చూడండి",
  statusPlanned: "ప్లాన్ చేసింది",
  statusCheckedIn: "పనిలో",
  statusCompleted: "పూర్తయింది",
  statusMatchedPay: "వేతనం సరి",
  statusUnderpaid: "పైసలు తక్కువ",
  statusOverpaid: "ఎక్కువ పైసలు",
  statusNotRecorded: "ఇంకా నమోదు కాలేదు",
  earningsBreakdown: "వేతన వివరణ",
  howWasThisCalculated: "ఇది ఎలా లెక్కించారు?",
  regularPay: "సాధారణ వేతనం",
  overtimePay: "అదనపు గంటల వేతనం",
  siteAllowance: "సైట్ అలవెన్స్",
  weekendBonus: "వీకెండ్ బోనస్",
  totalExpected: "నాకు రావలసిన పైసలు",
  employerRecorded: "యజమాని నమోదు చేసిన పైసలు",
  difference: "ఇంకా రాని పైసలు",
  shiftsThisMonth: "ఈ నెల షిఫ్టులు",
  completedShiftsCount: "పూర్తయిన షిఫ్టులు",
  recordedShiftsCount: "వేతనం నమోదైన షిఫ్టులు",
  missingMoneyShifts: "తక్కువ పైసల షిఫ్టులు",
  complaintTitle: "తక్కువ పైసల ఫిర్యాదు",
  complaintDescription: "వేతనం ఎందుకు తప్పు అని చెప్పండి",
  complaintReason: "ఏమి సమస్య?",
  complaintReasonPlaceholder: "ఉదాహరణ: అదనపు గంటలు పనిచేశాను కానీ పైసలు రాలేదు. శనివారం పనిచేశాను కానీ వీకెండ్ బోనస్ జోడించలేదు.",
  complaintReasonHint: "కనీసం 10 అక్షరాలలో సమస్యను వివరించండి.",
  complaintSubmit: "ఫిర్యాదు దాఖలు చేయండి",
  complaintCancel: "రద్దు చేయండి",
  complaintSubmitting: "సమర్పిస్తోంది...",
  complaintSuccess: "ఫిర్యాదు దాఖలైంది",
  complaintStatus: "ఫిర్యాదు స్థితి",
  complaintOpen: "సమీక్ష కోసం వేచి ఉంది",
  complaintApproved: "ఆమోదించారు — వేతనం సరిదిద్దబడింది",
  complaintRejected: "తిరస్కరించారు",
  complaintViewDetail: "వివరాలు చూడండి",
  complaintShortfall: "మీ క్లెయిమ్",
  complaintEmployerResponse: "యజమాని స్పందన",
  complaintFiledOn: "దాఖలు చేసిన తేదీ",
  voiceReadAloud: "చదవండి",
  voicePlaying: "ప్లే అవుతోంది...",
  voiceNotAvailable: "వాయిస్ అందుబాటులో లేదు",
  helpTitle: "ఫెయిర్‌షిఫ్ట్ ఎలా పని చేస్తుందో",
  helpStep1: "1. యాప్ తెరిచి మీ షిఫ్టులు చూడండి.",
  helpStep2: "2. యజమాని నమోదు చేసిన పైసలు రావలసిన దానితో సరిపోతున్నాయో చూడండి.",
  helpStep3: "3. పైసలు తక్కువగా ఉంటే 'తక్కువ పైసల ఫిర్యాదు' నొక్కండి.",
  helpStep4: "4. తిరిగి వచ్చి యజమాని ఏం జవాబిచ్చారో చూడండి.",
  errorNetworkFailed: "కనెక్ట్ అవ్వలేదు. మళ్ళీ ప్రయత్నించండి.",
  errorCheckInFailed: "హాజరు నమోదు విఫలమైంది. మళ్ళీ ప్రయత్నించండి.",
  errorCheckOutFailed: "పని ముగింపు విఫలమైంది. మళ్ళీ ప్రయత్నించండి.",
  errorComplaintFailed: "ఫిర్యాదు దాఖలు కాలేదు. మళ్ళీ ప్రయత్నించండి.",
  errorMinChars: "కనీసం 10 అక్షరాలు రాయండి.",
  errorMaxChars: "గరిష్టంగా 1000 అక్షరాలు.",
  validCharsRemaining: "అక్షరాలు",
  loading: "లోడ్ అవుతోంది...",
  close: "మూసివేయండి",
  cancel: "రద్దు చేయండి",
  submit: "సమర్పించండి",
  back: "వెనుక",
  workedTime: "పని సమయం",
  unpaidBreak: "విరామం",
  scheduledStart: "ప్రారంభ సమయం",
  scheduledEnd: "ముగింపు సమయం",
  actualCheckIn: "హాజరు సమయం",
  actualCheckOut: "నిష్క్రమణ సమయం",
  shiftLocation: "స్థలం",
  sector: "పని రకం",
  construction: "నిర్మాణం",
  campus: "కాంపస్",
  openComplaints: "తెరిచిన ఫిర్యాదులు",
  totalComplaints: "మొత్తం ఫిర్యాదులు",
  actionNeeded: "చర్య అవసరం",
  checkedInSuccess: "హాజరు విజయవంతంగా నమోదైంది",
  checkedOutSuccess: "షిఫ్ట్ పూర్తయింది",
  organization: "సంస్థ",
  employerPortal: "యజమాని పోర్టల్",
  workerPortal: "కార్మికుల పోర్టల్",
  dailyEarningsTitle: "రోజువారీ సంపాదన ట్రాకర్",
  dailyEarningsSubtitle: "మీరు ఏ రోజు పనిచేశారు మరియు ఎంత సంపాదించారో ఇక్కడ చూడండి",
  timeframeWeekly: "ఈ వారం",
  timeframeMonthly: "ఈ నెల",
  expectedLegend: "రావాల్సిన సంపాదన",
  recordedLegend: "యజమాని నమోదు చేసినది",
  differenceLegend: "తక్కువ పైసలు",
  tapBarHint: "పని గంటలు మరియు సంపాదన చూడటానికి ఏదైనా రోజుపై నొక్కండి",
  workedHours: "పనిచేసిన గంటలు",
  shiftSite: "పని స్థలం",
  statusMatched: "సరైన చెల్లింపు",
  statusPendingEntry: "యజమాని నమోదు చేయాల్సి ఉంది",
  statusShortfall: "రికార్డులో తక్కువ నమోదైంది",
  noEarningsData: "పని రికార్డులు ఏవీ లేవు",
  noEarningsDesc: "మీరు షిఫ్ట్ పూర్తి చేసిన వెంటనే మీ రోజువారీ ఆదాయం ఇక్కడ కనిపిస్తుంది.",
};

export const TRANSLATIONS: Record<LangCode, TranslationDict> = { en, hi, ta, te };
