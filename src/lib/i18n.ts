import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
  en: {
    translation: {
      "CivicLoop": "Citizen Desk",
      "Hyperlocal civic reports": "Hyperlocal civic reports",
      "Home": "Home",
      "Report": "Report",
      "Map": "Map",
      "Stats": "Stats",
      "Mine": "Mine",
      "Settings": "Settings",
      "Theme": "Theme",
      "Language": "Language",
      "Sign out": "Sign out",
      "English": "English",
      "Tamil": "Tamil",
      "Hindi": "Hindi",
      "Interface Language": "Interface Language",
      "Select your preferred language for the application interface.": "Select your preferred language for the application interface.",
      "Dark Mode": "Dark Mode",
      "Toggle between light, dark, and system themes.": "Toggle between light, dark, and system themes.",
      "Application Settings": "Application Settings",
      "Manage your preferences and accessibility settings.": "Manage your preferences and accessibility settings."
    }
  },
  ta: {
    translation: {
      "CivicLoop": "சிட்டிசன் டெஸ்க்",
      "Hyperlocal civic reports": "உள்ளூர் சிவில் புகார்கள்",
      "Home": "முகப்பு",
      "Report": "புகார் அளி",
      "Map": "வரைபடம்",
      "Stats": "புள்ளிவிவரம்",
      "Mine": "என்னுடையவை",
      "Settings": "அமைப்புகள்",
      "Theme": "வண்ணக்கலவை",
      "Language": "மொழி",
      "Sign out": "வெளியேறு",
      "English": "ஆங்கிலம்",
      "Tamil": "தமிழ்",
      "Hindi": "இந்தி",
      "Interface Language": "பயன்பாட்டு மொழி",
      "Select your preferred language for the application interface.": "பயன்பாட்டிற்கான உங்களுக்கு விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்.",
      "Dark Mode": "இருண்ட முறை",
      "Toggle between light, dark, and system themes.": "வெளிச்சம், இருண்ட மற்றும் கணினி கருப்பொருள்களுக்கு இடையே மாற்றவும்.",
      "Application Settings": "பயன்பாட்டு அமைப்புகள்",
      "Manage your preferences and accessibility settings.": "உங்கள் விருப்பங்கள் மற்றும் அணுகல்தன்மை அமைப்புகளை நிர்வகிக்கவும்."
    }
  },
  hi: {
    translation: {
      "CivicLoop": "सिटिज़न डेस्क",
      "Hyperlocal civic reports": "स्थानीय नागरिक रिपोर्ट",
      "Home": "होम",
      "Report": "रिपोर्ट",
      "Map": "नक्शा",
      "Stats": "आंकड़े",
      "Mine": "मेरे",
      "Settings": "सेटिंग्स",
      "Theme": "थीम",
      "Language": "भाषा",
      "Sign out": "लॉग आउट",
      "English": "अंग्रेज़ी",
      "Tamil": "तमिल",
      "Hindi": "हिंदी",
      "Interface Language": "इंटरफ़ेस भाषा",
      "Select your preferred language for the application interface.": "एप्लिकेशन इंटरफ़ेस के लिए अपनी पसंदीदा भाषा चुनें।",
      "Dark Mode": "डार्क मोड",
      "Toggle between light, dark, and system themes.": "लाइट, डार्क और सिस्टम थीम के बीच टॉगल करें।",
      "Application Settings": "एप्लिकेशन सेटिंग्स",
      "Manage your preferences and accessibility settings.": "अपनी प्राथमिकताओं और एक्सेसिबिलिटी सेटिंग्स को प्रबंधित करें।"
    }
  }
};

let initialLang = 'en';
try {
  initialLang = localStorage.getItem('i18nextLng') || 'en';
} catch (e) {
  console.warn('localStorage not accessible', e);
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang, // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
