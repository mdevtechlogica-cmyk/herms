import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { getPostLoginPath, isAllowedAppUser } from "@/lib/auth-access";
import { readOAuthErrorFromUrl, clearOAuthParamsFromUrl, getOAuthReturnKind } from "@/lib/google-auth";
import { useLocale } from "@/lib/locale-context";
import { COUNTRIES, type CountryCode, type LanguageCode } from "@/lib/locale/countries";
import { SUBSCRIPTION_MONTHLY_PRICE } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Construction,
  Menu,
  X,
  ArrowRight,
  Check,
  Layers,
  Calendar,
  Wrench,
  FileText,
  Users,
  TrendingUp,
  Smartphone,
  ShieldCheck,
  Info,
  Building,
  CreditCard,
  Crown,
  ChevronDown,
  Globe,
  Languages
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HERMS — Heavy Equipment Rental Management System" },
      { name: "description", content: "Enterprise cloud platform for managing construction machinery fleets, rental bookings, preventative maintenance, and automated invoicing." },
      { property: "og:title", content: "HERMS — Heavy Equipment Rental Management System" },
      { property: "og:description", content: "Enterprise cloud platform for managing construction machinery fleets, rental bookings, preventative maintenance, and automated invoicing." },
    ],
  }),
  component: Index,
});

// Landing page translations
const landingTranslations = {
  en: {
    // Navigation
    navFeatures: "Features",
    navPricing: "Pricing",
    navMobile: "Mobile App",
    navFaq: "FAQ",
    navSignIn: "Sign In",
    navStartTrial: "Start Free Trial",
    
    // Hero Section
    heroBadge: "NEW",
    heroBadgeText: "Sign-On-Glass & Digital Contracts",
    heroTitle: "The Modern Operating System for",
    heroTitleHighlight: "Heavy Equipment Rentals",
    heroDescription: "Seamlessly manage your fleet, automate customer bookings, schedule maintenance, dispatch machinery, and collect payments in real-time.",
    heroStartTrial: "Start 15-Day Free Trial",
    heroExplore: "Explore Features",
    
    // Dashboard Mockup
    dashboardUrl: "dashboard.herms.io",
    dashboardActiveRentals: "Active Rentals",
    dashboardFleetUtilization: "85.7% fleet utilization this week",
    dashboardRevenue: "Revenue (June)",
    dashboardRevenueBadge: "Payments",
    dashboardRevenueValue: "₹3,42,800",
    dashboardRevenueNote: "94% invoiced and collected on time",
    dashboardAutoReconciled: "Auto-reconciled invoices",
    dashboardPendingMaintenance: "Pending Maintenance",
    dashboardMaintenanceAlerts: "3 Alerts",
    dashboardMachines: "4 Machines",
    dashboardMaintenanceNote: "CAT 320 excavator due for 500h service",
    dashboardServiceScheduled: "Service scheduled for branch #1",
    dashboardRecentBookings: "Recent Booking Schedules",
    dashboardUpdated: "Updated just now",
    
    // Stats
    stat1Value: "99.9%",
    stat1Label: "Fleet Availability & Uptime Tracked",
    stat2Value: "10k+",
    stat2Label: "Equipment Bookings Managed",
    stat3Value: "50+",
    stat3Label: "Machinery Categories Supported",
    
    // Features
    featuresBadge: "Built for Enterprises & SMBs",
    featuresTitle: "Streamline your entire rental operation",
    featuresDescription: "A comprehensive set of tools tailored specifically for the heavy equipment rental industry, allowing you to scale without operational bottlenecks.",
    feature1Title: "Fleet Inventory Management",
    feature1Desc: "Track physical machinery availability, catalog detailed technical specifications, group by category, and update status codes (Available, Rented, Maintenance, Down) instantly.",
    feature2Title: "Scheduling & Dispatch",
    feature2Desc: "Visualize booking calendars, allocate appropriate machinery, sign digital rental contracts, and manage equipment check-out/return sequences with strict status controls.",
    feature3Title: "Preventive Maintenance",
    feature3Desc: "Never miss an oil change or critical inspection. Log machine service hours, schedule recurring servicing alerts, track repairs, and log total maintenance costs.",
    feature4Title: "Smart Billing & Invoices",
    feature4Desc: "Generate professional rental invoices automatically. Auto-calculate tax rules, track late return fees, and send invoice links to customers instantly.",
    feature5Title: "Multi-Branch Operations",
    feature5Desc: "Manage multiple physical yards and branches from a single account. Transfer equipment inventories between locations, and restrict employees to their specific home branch.",
    feature6Title: "Analytics & Utilization",
    feature6Desc: "Examine profitability per machine, analyze average fleet utilization rates, track monthly recurring revenue, and identify high-performing customer accounts.",
    
    // Mobile
    mobileBadge: "Capacitor Mobile Built",
    mobileTitle: "Optimized for Drivers and Yard Operators in the Field",
    mobileDescription: "Equip your transport drivers and yard personnel with a web-first mobile solution. Built to package seamlessly as an Android or iOS application, HERMS provides tools optimized for touch controls.",
    mobileFeature1Title: "Sign-on-Glass Checkouts",
    mobileFeature1Desc: "Customers sign directly on the mobile screen to accept rental terms during delivery.",
    mobileFeature2Title: "Camera & Damage Logs",
    mobileFeature2Desc: "Inspect equipment and snap/upload photos on-site before and after rentals.",
    mobileFeature3Title: "Offline Readiness",
    mobileFeature3Desc: "Access essential customer lists and equipment files even when cellular reception is weak.",
    mobileFieldApp: "HERMS Field",
    mobileOnline: "Online",
    mobileBranch: "BRANCH #1",
    mobileDispatch: "DISPATCH",
    mobileCheckoutTitle: "Checkout Checklist",
    mobileJobsite: "Jobsite: Sector 45 Construction",
    mobileCheck1: "Verify Fuel Level (Full)",
    mobileCheck2: "Inspect Hydraulic Lines",
    mobileCheck3: "Take Photo of Exterior",
    mobileSignTitle: "Sign-on-Glass",
    mobileSignPlaceholder: "Draw Customer Signature Here",
    mobileComplete: "Complete Dispatch",
    
    // Pricing
    pricingBadge: "Subscription Options",
    pricingTitle: "Plans that grow with your fleet",
    pricingDescription: "Start with our 15-day free trial on any tier. Pay securely online or settle via bank transfers. Change plans as your inventory scales.",
    pricingBasic: "Basic Plan",
    pricingBasicDesc: "For local machinery owners.",
    pricingIntermediate: "Intermediate Plan",
    pricingIntermediateDesc: "For growing regional rental yards.",
    pricingPremium: "Premium Plan",
    pricingPremiumDesc: "For full scale construction operators.",
    pricingRecommended: "Recommended",
    pricingPerMonth: "/mo",
    pricingChooseBasic: "Choose Basic",
    pricingChooseIntermediate: "Choose Intermediate",
    pricingChoosePremium: "Choose Premium",
    pricingBenefit1: "1 Operating Branch",
    pricingBenefit2: "Up to 30 Equipment Items",
    pricingBenefit3: "Contracts & Digital Signatures",
    pricingBenefit4: "Automated Invoicing",
    pricingBenefit5: "Up to 5 Operating Branches",
    pricingBenefit6: "Up to 100 Equipment Items",
    pricingBenefit7: "Preventive Maintenance Logging",
    pricingBenefit8: "Online Payment Collection",
    pricingBenefit9: "Team Role Permissions",
    pricingBenefit10: "Unlimited Operating Branches",
    pricingBenefit11: "Unlimited Equipment Items",
    pricingBenefit12: "Advanced Utilization & Revenue Reports",
    pricingBenefit13: "Dedicated Support Manager",
    
    // FAQ
    faqBadge: "Support & Help",
    faqTitle: "Frequently Asked Questions",
    faq1Question: "What is HERMS?",
    faq1Answer: "HERMS (Heavy Equipment Rental Management System) is an enterprise cloud application designed specifically for construction and industrial equipment rental companies. It brings together inventory control, branch partitioning, customer contract signing, vehicle maintenance diaries, and billing workflows into a single dashboard.",
    faq2Question: "How does the 15-day free trial work?",
    faq2Answer: "When you create a HERMS account, you are automatically enrolled in a 15-day trial, granting you full access to all platform features, branch controls, and equipment tracking tools. No credit card is required to sign up. Once the trial ends, you can select one of our affordable subscription tiers.",
    faq3Question: "Can I partition my fleet by physical branch locations?",
    faq3Answer: "Yes. Under our Intermediate and Premium plans, you can register multiple branches. Your team members can be assigned specific home branches, restricting their workspace views so that they only coordinate bookings and inventory native to their respective yard.",
    faq4Question: "Does HERMS support digital payment gateways?",
    faq4Answer: "Yes. HERMS helps you track and reconcile customer payments. Record online and offline payments, send invoice links, and keep rental billing organized in one place.",
    faq5Question: "Can I install HERMS as a mobile app?",
    faq5Answer: "Absolutely. HERMS includes built-in Capacitor scripts allowing you to build and package it as a native Android or iOS application. This empowers transport drivers and mechanics to log inspection photos, sign delivery receipt waivers, and check items off dispatch sheets directly from the field.",
    
    // CTA
    ctaTitle: "Ready to modernize your heavy equipment fleet operations?",
    ctaDescription: "Start tracking machinery utilization, automate recurring maintenance schedules, and speed up client dispatches.",
    ctaStartTrial: "Start Your Free Trial",
    ctaSignIn: "Sign In to Dashboard",
    ctaNoCard: "No credit card required · Cancel or switch plans anytime",
    
    // Footer
    footerCopyright: "© {year} HERMS Inc. All rights reserved.",
  },
  hi: {
    // Navigation
    navFeatures: "विशेषताएं",
    navPricing: "मूल्य निर्धारण",
    navMobile: "मोबाइल ऐप",
    navFaq: "सामान्य प्रश्न",
    navSignIn: "साइन इन",
    navStartTrial: "मुफ्त परीक्षण शुरू करें",
    
    // Hero Section
    heroBadge: "नया",
    heroBadgeText: "साइन-ऑन-ग्लास और डिजिटल अनुबंध",
    heroTitle: "भारी उपकरण किराये के लिए",
    heroTitleHighlight: "आधुनिक ऑपरेटिंग सिस्टम",
    heroDescription: "अपने बेड़े का प्रबंधन करें, ग्राहक बुकिंग को स्वचालित करें, रखरखाव का समय निर्धारित करें, मशीनरी भेजें, और रियल-टाइम में भुगतान एकत्र करें।",
    heroStartTrial: "15-दिन का मुफ्त परीक्षण शुरू करें",
    heroExplore: "विशेषताएं देखें",
    
    // Dashboard Mockup
    dashboardUrl: "dashboard.herms.io",
    dashboardActiveRentals: "सक्रिय किराये",
    dashboardFleetUtilization: "इस सप्ताह 85.7% बेड़ा उपयोग",
    dashboardRevenue: "राजस्व (जून)",
    dashboardRevenueBadge: "भुगतान",
    dashboardRevenueValue: "₹3,42,800",
    dashboardRevenueNote: "94% चालान जारी और समय पर एकत्र",
    dashboardAutoReconciled: "स्वचालित-समाधान चालान",
    dashboardPendingMaintenance: "लंबित रखरखाव",
    dashboardMaintenanceAlerts: "3 अलर्ट",
    dashboardMachines: "4 मशीनें",
    dashboardMaintenanceNote: "CAT 320 एक्सकावेटर 500h सेवा के लिए देय",
    dashboardServiceScheduled: "शाखा #1 के लिए सेवा निर्धारित",
    dashboardRecentBookings: "हाल की बुकिंग अनुसूची",
    dashboardUpdated: "अभी अपडेट किया गया",
    
    // Stats
    stat1Value: "99.9%",
    stat1Label: "बेड़ा उपलब्धता और अपटाइम ट्रैक किया गया",
    stat2Value: "10k+",
    stat2Label: "उपकरण बुकिंग प्रबंधित",
    stat3Value: "50+",
    stat3Label: "मशीनरी श्रेणियां समर्थित",
    
    // Features
    featuresBadge: "उद्यमों और SMBs के लिए बनाया गया",
    featuresTitle: "अपने पूरे किराये के संचालन को सुव्यवस्थित करें",
    featuresDescription: "भारी उपकरण किराये उद्योग के लिए विशेष रूप से तैयार किए गए उपकरणों का एक व्यापक सेट, जो आपको ऑपरेशनल बाधाओं के बिना स्केल करने की अनुमति देता है।",
    feature1Title: "बेड़ा इन्वेंटरी प्रबंधन",
    feature1Desc: "भौतिक मशीनरी उपलब्धता को ट्रैक करें, विस्तृत तकनीकी विनिर्देशों को कैटलॉग करें, श्रेणी के अनुसार समूहित करें, और स्थिति कोड (उपलब्ध, किराये पर, रखरखाव, डाउन) को तुरंत अपडेट करें।",
    feature2Title: "अनुसूची और भेजना",
    feature2Desc: "बुकिंग कैलेंडर को विज़ुअलाइज़ करें, उपयुक्त मशीनरी आवंटित करें, डिजिटल किराया अनुबंधों पर हस्ताक्षर करें, और कड़े स्थिति नियंत्रणों के साथ उपकरण चेक-आउट/रिटर्न अनुक्रमों का प्रबंधन करें।",
    feature3Title: "निवारक रखरखाव",
    feature3Desc: "ऑयल चेंज या महत्वपूर्ण निरीक्षण को कभी न याद करें। मशीन सेवा घंटे लॉग करें, आवर्ती सेवा अलर्ट निर्धारित करें, मरम्मतों को ट्रैक करें, और कुल रखरखाव लागत लॉग करें।",
    feature4Title: "स्मार्ट बिलिंग और चालान",
    feature4Desc: "स्वचालित रूप से पेशेवर किराया चालान उत्पन्न करें। कर नियमों की स्वचालित गणना करें, देर से वापसी शुल्क ट्रैक करें, और ग्राहकों को तुरंत चालान लिंक भेजें।",
    feature5Title: "मल्टी-ब्रांच ऑपरेशन",
    feature5Desc: "एक ही खाते से कई भौतिक यार्ड और शाखाओं का प्रबंधन करें। स्थानों के बीच उपकरण इन्वेंटरी स्थानांतरित करें, और कर्मचारियों को उनकी विशिष्ट होम शाखा तक सीमित रखें।",
    feature6Title: "विश्लेषिकी और उपयोग",
    feature6Desc: "प्रति मशीन लाभप्रदता की जांच करें, औसत बेड़ा उपयोग दरों का विश्लेषण करें, मासिक आवर्ती राजस्व ट्रैक करें, और उच्च-प्रदर्शन ग्राहक खातों की पहचान करें।",
    
    // Mobile
    mobileBadge: "Capacitor मोबाइल बनाया गया",
    mobileTitle: "क्षेत्र में ड्राइवरों और यार्ड ऑपरेटरों के लिए अनुकूलित",
    mobileDescription: "अपने परिवहन ड्राइवरों और यार्ड कर्मियों को एक वेब-पहले मोबाइल समाधान से लैस करें। Android या iOS एप्लिकेशन के रूप में सहजता से पैकेज करने के लिए बनाया गया, HERMS टच नियंत्रणों के लिए अनुकूलित उपकरण प्रदान करता है।",
    mobileFeature1Title: "साइन-ऑन-ग्लास चेकआउट",
    mobileFeature1Desc: "ग्राहक डिलीवरी के दौरान किराया शर्तों को स्वीकार करने के लिए सीधे मोबाइल स्क्रीन पर हस्ताक्षर करते हैं।",
    mobileFeature2Title: "कैमरा और क्षति लॉग",
    mobileFeature2Desc: "किराये से पहले और बाद में साइट पर उपकरणों का निरीक्षण करें और फोटो लें/अपलोड करें।",
    mobileFeature3Title: "ऑफलाइन तैयारी",
    mobileFeature3Desc: "सेलुलर रिसेप्शन कमजोर होने पर भी आवश्यक ग्राहक सूचियों और उपकरण फाइलों तक पहुंचें।",
    mobileFieldApp: "HERMS फील्ड",
    mobileOnline: "ऑनलाइन",
    mobileBranch: "शाखा #1",
    mobileDispatch: "भेजना",
    mobileCheckoutTitle: "चेकआउट चेकलिस्ट",
    mobileJobsite: "जॉबसाइट: सेक्टर 45 निर्माण",
    mobileCheck1: "ईंधन स्तर सत्यापित करें (पूर्ण)",
    mobileCheck2: "हाइड्रॉलिक लाइनों का निरीक्षण करें",
    mobileCheck3: "बाहरी फोटो लें",
    mobileSignTitle: "साइन-ऑन-ग्लास",
    mobileSignPlaceholder: "यहां ग्राहक हस्ताक्षर बनाएं",
    mobileComplete: "भेजना पूरा करें",
    
    // Pricing
    pricingBadge: "सदस्यता विकल्प",
    pricingTitle: "योजनाएं जो आपके बेड़े के साथ बढ़ती हैं",
    pricingDescription: "किसी भी स्तर पर हमारे 15-दिन के मुफ्त परीक्षण के साथ शुरू करें। सुरक्षित रूप से ऑनलाइन भुगतान करें या बैंक ट्रांसफर के माध्यम से निपटाएं। अपने इन्वेंटरी के स्केल के अनुसार योजनाएं बदलें।",
    pricingBasic: "बेसिक योजना",
    pricingBasicDesc: "स्थानीय मशीनरी मालिकों के लिए।",
    pricingIntermediate: "इंटरमीडिएट योजना",
    pricingIntermediateDesc: "बढ़ते क्षेत्रीय किराया यार्ड के लिए।",
    pricingPremium: "प्रीमियम योजना",
    pricingPremiumDesc: "पूर्ण पैमाने निर्माण ऑपरेटरों के लिए।",
    pricingRecommended: "अनुशंसित",
    pricingPerMonth: "/माह",
    pricingChooseBasic: "बेसिक चुनें",
    pricingChooseIntermediate: "इंटरमीडिएट चुनें",
    pricingChoosePremium: "प्रीमियम चुनें",
    pricingBenefit1: "1 संचालन शाखा",
    pricingBenefit2: "30 तक उपकरण आइटम",
    pricingBenefit3: "अनुबंध और डिजिटल हस्ताक्षर",
    pricingBenefit4: "स्वचालित चालान",
    pricingBenefit5: "5 तक संचालन शाखाएं",
    pricingBenefit6: "100 तक उपकरण आइटम",
    pricingBenefit7: "निवारक रखरखाव लॉगिंग",
    pricingBenefit8: "ऑनलाइन भुगतान संग्रह",
    pricingBenefit9: "टीम भूमिका अनुमतियां",
    pricingBenefit10: "असीमित संचालन शाखाएं",
    pricingBenefit11: "असीमित उपकरण आइटम",
    pricingBenefit12: "उन्नत उपयोग और राजस्व रिपोर्ट",
    pricingBenefit13: "समर्पित समर्थन प्रबंधक",
    
    // FAQ
    faqBadge: "सहायता और मदद",
    faqTitle: "अक्सर पूछे जाने वाले प्रश्न",
    faq1Question: "HERMS क्या है?",
    faq1Answer: "HERMS (हेवी इक्विपमेंट रेंटल मैनेजमेंट सिस्टम) निर्माण और औद्योगिक उपकरण किराया कंपनियों के लिए विशेष रूप से डिज़ाइन किया गया एक एंटरप्राइज़ क्लाउड एप्लिकेशन है। यह इन्वेंटरी नियंत्रण, शाखा विभाजन, ग्राहक अनुबंध हस्ताक्षर, वाहन रखरखाव डायरी, और बिलिंग वर्कफ़्लो को एक एकल डैशबोर्ड में लाता है।",
    faq2Question: "15-दिन का मुफ्त परीक्षण कैसे काम करता है?",
    faq2Answer: "जब आप HERMS खाता बनाते हैं, तो आप स्वचालित रूप से 15-दिन के परीक्षण में नामांकित हो जाते हैं, जो आपको सभी प्लेटफ़ॉर्म सुविधाओं, शाखा नियंत्रणों, और उपकरण ट्रैकिंग उपकरणों तक पूर्ण पहुंच प्रदान करता है। साइन अप करने के लिए कोई क्रेडिट कार्ड की आवश्यकता नहीं है। परीक्षण समाप्त होने के बाद, आप हमारी सस्ती सदस्यता टियर में से एक चुन सकते हैं।",
    faq3Question: "क्या मैं अपने बेड़े को भौतिक शाखा स्थानों के अनुसार विभाजित कर सकता हूं?",
    faq3Answer: "हां। हमारी इंटरमीडिएट और प्रीमियम योजनाओं के तहत, आप कई शाखाएं पंजीकृत कर सकते हैं। आपके टीम सदस्यों को विशिष्ट होम शाखाएं सौंपी जा सकती हैं, उनके वर्कस्पेस विचारों को प्रतिबंधित करके ताकि वे केवल अपने संबंधित यार्ड के मूल बुकिंग और इन्वेंटरी का समन्वय करें।",
    faq4Question: "क्या HERMS डिजिटल भुगतान गेटवे का समर्थन करता है?",
    faq4Answer: "हां। HERMS ग्राहक भुगतानों को ट्रैक और समाधान करने में मदद करता है। ऑनलाइन और ऑफलाइन भुगतान रिकॉर्ड करें, चालान लिंक भेजें, और किराया बिलिंग को एक जगह व्यवस्थित रखें।",
    faq5Question: "क्या मैं HERMS को मोबाइल ऐप के रूप में स्थापित कर सकता हूं?",
    faq5Answer: "बिल्कुल। HERMS में बिल्ट-इन Capacitor स्क्रिप्ट्स हैं जो आपको इसे एक नेटिव Android या iOS एप्लिकेशन के रूप में बनाने और पैकेज करने की अनुमति देते हैं। यह परिवहन ड्राइवरों और यांत्रिकों को निरीक्षण फोटो लॉग करने, डिलीवरी रसीद वाइवर पर हस्ताक्षर करने, और सीधे क्षेत्र से डिस्पैच शीट्स से आइटम्स को चेक करने की शक्ति देता है।",
    
    // CTA
    ctaTitle: "अपने भारी उपकरण बेड़े संचालन को आधुनिक बनाने के लिए तैयार हैं?",
    ctaDescription: "मशीनरी उपयोग को ट्रैक करना शुरू करें, आवर्ती रखरखाव अनुसूचियों को स्वचालित करें, और ग्राहक भेजने को तेज करें।",
    ctaStartTrial: "अपना मुफ्त परीक्षण शुरू करें",
    ctaSignIn: "डैशबोर्ड में साइन इन करें",
    ctaNoCard: "कोई क्रेडिट कार्ड की आवश्यकता नहीं · किसी भी समय रद्द करें या योजनाएं बदलें",
    
    // Footer
    footerCopyright: "© {year} HERMS Inc. सर्वाधिकार सुरक्षित।",
  },
  ar: {
    // Navigation
    navFeatures: "المميزات",
    navPricing: "التسعير",
    navMobile: "تطبيق الجوال",
    navFaq: "الأسئلة الشائعة",
    navSignIn: "تسجيل الدخول",
    navStartTrial: "ابدأ التجربة المجانية",
    
    // Hero Section
    heroBadge: "جديد",
    heroBadgeText: "التوقيع على الشاشة والعقود الرقمية",
    heroTitle: "نظام التشغيل الحديث لـ",
    heroTitleHighlight: "إيجارات المعدات الثقيلة",
    heroDescription: "أدر أسطولك بسلاسة، وأتمتة حجوزات العملاء، وجدول الصيانة، وأرسل الآلات، واجمع المدفوعات في الوقت الفعلي.",
    heroStartTrial: "ابدأ التجربة المجانية 15 يومًا",
    heroExplore: "استكشف المميزات",
    
    // Dashboard Mockup
    dashboardUrl: "dashboard.herms.io",
    dashboardActiveRentals: "الإيجارات النشطة",
    dashboardFleetUtilization: "استخدام الأسطول 85.7% هذا الأسبوع",
    dashboardRevenue: "الإيرادات (يونيو)",
    dashboardRevenueBadge: "مدفوعات",
    dashboardRevenueValue: "₹3,42,800",
    dashboardRevenueNote: "94% تم إصدار الفواتير وجمعها في الوقت المحدد",
    dashboardAutoReconciled: "الفواتير المتوافقة تلقائيًا",
    dashboardPendingMaintenance: "الصيانة المعلقة",
    dashboardMaintenanceAlerts: "3 تنبيهات",
    dashboardMachines: "4 آلات",
    dashboardMaintenanceNote: "حفار CAT 320 مستحق لخدمة 500 ساعة",
    dashboardServiceScheduled: "الخدمة مجدولة للفرع #1",
    dashboardRecentBookings: "جداول الحجز الأخيرة",
    dashboardUpdated: "تم التحديث للتو",
    
    // Stats
    stat1Value: "99.9%",
    stat1Label: "توفر الأسطول وتتبع وقت التشغيل",
    stat2Value: "10k+",
    stat2Label: "حجوزات المعدات المُدارة",
    stat3Value: "50+",
    stat3Label: "فئات الآلات المدعومة",
    
    // Features
    featuresBadge: "مبني للمؤسسات والشركات الصغيرة",
    featuresTitle: "سير عملية التأجير بالكامل",
    featuresDescription: "مجموعة شاملة من الأدوات المصممة خصيصًا لصناعة تأجير المعدات الثقيلة، مما يسمح لك بالتوسع دون اختناقات تشغيلية.",
    feature1Title: "إدارة مخزون الأسطول",
    feature1Desc: "تتبع توفر الآلات المادية، وفهرس المواصفات التقنية التفصيلية، وتجميع حسب الفئة، وتحديث رموز الحالة (متاح، مؤجر، صيانة، معطل) فورًا.",
    feature2Title: "الجدولة والإرسال",
    feature2Desc: "تصور تقويمات الحجز، وتخصيص الآلات المناسبة، وتوقيع عقود الإيجار الرقمية، وإدارة تسلسلات استلام/إرجاع المعدات مع ضوابط صارمة للحالة.",
    feature3Title: "الصيانة الوقائية",
    feature3Desc: "لا تفوت أبدًا تغيير الزيت أو الفحص الحرج. سجل ساعات خدمة الآلة، وجدول تنبيهات الصيانة المتكررة، وتتبع الإصلاحات، وسجل إجمالي تكاليف الصيانة.",
    feature4Title: "الفواتير الذكية",
    feature4Desc: "إنشاء فواتير إيجار احترافية تلقائيًا. حساب قواعد الضرائب تلقائيًا، وتتبع رسوم التأخير، وإرسال روابط الفواتير للعملاء فورًا.",
    feature5Title: "عمليات متعددة الفروع",
    feature5Desc: "أدر عدة ساحات مادية وفروع من حساب واحد. انقل مخزونات المعدات بين المواقع، وقيد الموظفين بفرعهم الرئيسي المحدد.",
    feature6Title: "التحليلات والاستخدام",
    feature6Desc: "فحص الربحية لكل آلة، وتحليل متوسط معدلات استخدام الأسطول، وتتبع الإيرادات الشهرية المتكررة، وتحديد حسابات العملاء عالية الأداء.",
    
    // Mobile
    mobileBadge: "تم بناء Capacitor Mobile",
    mobileTitle: "محسّن للسائقين ومشغلي الساحة في الميدان",
    mobileDescription: "زوّد سائقي النقل وموظفي الساحة بحل جوال يركز على الويب. مبني ليتم حزمه بسلاسة كتطبيق Android أو iOS، يوفر HERMS أدوات محسّنة لعناصر التحكم باللمس.",
    mobileFeature1Title: "إصدارات التوقيع على الشاشة",
    mobileFeature1Desc: "يوقع العملاء مباشرة على شاشة الجوال لقبول شروط الإيجار أثناء التسليم.",
    mobileFeature2Title: "الكاميرا وسجلات الضرر",
    mobileFeature2Desc: "افحص المعدات والتقط/ارفع الصور على الموقع قبل وبعد الإيجارات.",
    mobileFeature3Title: "الجاهزية دون اتصال",
    mobileFeature3Desc: "الوصول إلى قوائم العملاء الأساسية وملفات المعدات حتى عندما يكون استقبال الخلوي ضعيفًا.",
    mobileFieldApp: "HERMS Field",
    mobileOnline: "متصل",
    mobileBranch: "الفرع #1",
    mobileDispatch: "إرسال",
    mobileCheckoutTitle: "قائمة التحقق من الإصدار",
    mobileJobsite: "موقع العمل: قطاع 45 البناء",
    mobileCheck1: "تحقق من مستوى الوقود (ممتلئ)",
    mobileCheck2: "افحص خطوط الهيدروليك",
    mobileCheck3: "التقط صورة للخارج",
    mobileSignTitle: "التوقيع على الشاشة",
    mobileSignPlaceholder: "ارسم توقيع العميل هنا",
    mobileComplete: "أكمل الإرسال",
    
    // Pricing
    pricingBadge: "خيارات الاشتراك",
    pricingTitle: "خطط تنمو مع أسطولك",
    pricingDescription: "ابدأ بتجربتنا المجانية 15 يومًا على أي مستوى. ادفع بأمان عبر الإنترنت أو ساوِي عبر التحويلات البنكية. غيّر الخطط مع توسع مخزونك.",
    pricingBasic: "الخطة الأساسية",
    pricingBasicDesc: "لمالكي الآلات المحليين.",
    pricingIntermediate: "الخطة المتوسطة",
    pricingIntermediateDesc: "للساحات الإيجار الإقليمية المتنامية.",
    pricingPremium: "الخطة المتميزة",
    pricingPremiumDesc: "لمشغلي البناء على نطاق كامل.",
    pricingRecommended: "موصى به",
    pricingPerMonth: "/شهر",
    pricingChooseBasic: "اختر الأساسية",
    pricingChooseIntermediate: "اختر المتوسطة",
    pricingChoosePremium: "اختر المتميزة",
    pricingBenefit1: "فرع تشغيلي واحد",
    pricingBenefit2: "حتى 30 عنصر معدات",
    pricingBenefit3: "العقود والتوقيعات الرقمية",
    pricingBenefit4: "الفواتير المؤتمتة",
    pricingBenefit5: "حتى 5 فروع تشغيلية",
    pricingBenefit6: "حتى 100 عنصر معدات",
    pricingBenefit7: "تسجيل الصيانة الوقائية",
    pricingBenefit8: "تحصيل المدفوعات عبر الإنترنت",
    pricingBenefit9: "أذونات أدوار الفريق",
    pricingBenefit10: "فروع تشغيلية غير محدودة",
    pricingBenefit11: "عناصر معدات غير محدودة",
    pricingBenefit12: "تقارير الاستخدام والإيرادات المتقدمة",
    pricingBenefit13: "مدير دعم مخصص",
    
    // FAQ
    faqBadge: "الدعم والمساعدة",
    faqTitle: "الأسئلة المتداولة",
    faq1Question: "ما هو HERMS؟",
    faq1Answer: "HERMS (نظام إدارة تأجير المعدات الثقيلة) هو تطبيق سحابي للمؤسسات مصمم خصيصًا لشركات تأجير المعدات للإنشاءات والصناعات. يجمع معًا التحكم في المخزون، وتقسيم الفروع، وتوقيع عقود العملاء، ومذكرات صيانة المركبات، وسير عمل الفوترة في لوحة تحكم واحدة.",
    faq2Question: "كيف تعمل التجربة المجانية 15 يومًا؟",
    faq2Answer: "عند إنشاء حساب HERMS، يتم تسجيلك تلقائيًا في تجربة مدتها 15 يومًا، مما يمنحك الوصول الكامل إلى جميع ميزات المنصة، وضوابط الفروع، وأدوات تتبع المعدات. لا تتطلب بطاقة ائتمان للتسجيل. بعد انتهاء التجربة، يمكنك اختيار أحد مستويات الاشتراك الميسرة لدينا.",
    faq3Question: "هل يمكنني تقسيم أسطولي حسب مواقع الفروع المادية؟",
    faq3Answer: "نعم. ضمن خططنا المتوسطة والمتميزة، يمكنك تسجيل فروع متعددة. يمكن تعيين أعضاء فريقك لفروع رئيسية محددة، مما يقيد مشاهدات مساحة العمل الخاصة بهم بحيث ينسقون فقط الحجوزات والمخزون الأصلي لساحتهم الخاصة.",
    faq4Question: "هل يدعم HERMS بوابات الدفع الرقمية؟",
    faq4Answer: "نعم. يساعدك HERMS على تتبع مدفوعات العملاء ومطابقتها. سجّل المدفوعات عبر الإنترنت وخارجها، وأرسل روابط الفواتير، واحتفظ بفوترة الإيجار منظمة في مكان واحد.",
    faq5Question: "هل يمكنني تثبيت HERMS كتطبيق جوال؟",
    faq5Answer: "بالتأكيد. يتضمن HERMS نصوص Capacitor المدمجة التي تسمح لك ببنائها وتغليفها كتطبيق Android أو iOS أصلي. هذا يمكّن سائقي النقل والميكانيكيين من تسجيل صور الفحص، وتوقيع إيصالات التسليم، وفحص العناصر من أوراق الإرسال مباشرة من الميدان.",
    
    // CTA
    ctaTitle: "هل أنت مستعد لتحديث عمليات أسطول المعدات الثقيلة الخاصة بك؟",
    ctaDescription: "ابدأ تتبع استخدام الآلات، وأتمتة جداول الصيانة المتكررة، وتسريع عمليات إرسال العملاء.",
    ctaStartTrial: "ابدأ تجربتك المجانية",
    ctaSignIn: "سجّل الدخول إلى لوحة التحكم",
    ctaNoCard: "لا تتطلب بطاقة ائتمان · ألغِ أو غيّر الخطط في أي وقت",
    
    // Footer
    footerCopyright: "© {year} HERMS Inc. جميع الحقوق محفوظة.",
  },
};

function Index() {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();
  const { country, language, setCountry, setLanguage, formatMoney } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [slow, setSlow] = useState(false);
  
  const t = landingTranslations[language];

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8_000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const kind = getOAuthReturnKind();
    if (kind === "callback") {
      const params = new URLSearchParams(window.location.search);
      nav({
        to: "/auth/callback",
        search: Object.fromEntries(params.entries()),
        replace: true,
      });
      return;
    }
    const oauthError = readOAuthErrorFromUrl();
    if (oauthError) {
      toast.error(oauthError);
      clearOAuthParamsFromUrl();
      nav({ to: "/auth", replace: true });
    }
  }, [nav]);

  useEffect(() => {
    if (loading) return;
    // Auto-redirect authenticated team members (admin/employee) to their workspace
    if (user && isAllowedAppUser(role)) {
      nav({ to: getPostLoginPath(), replace: true });
    }
  }, [user, role, loading, nav]);

  // Dynamic pricing based on selected country
  const prices = SUBSCRIPTION_MONTHLY_PRICE[country];

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading && user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <Construction className="h-10 w-10 text-primary animate-bounce mx-auto" />
          <p className="text-muted-foreground text-sm font-medium">Verifying session...</p>
          {slow && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Taking longer than usual. Check your internet connection or dev server.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">Go to sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 selection:text-foreground">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Construction className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-primary">HERMS</span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollToSection("features")} className="hover:text-primary transition-colors cursor-pointer">{t.navFeatures}</button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-primary transition-colors cursor-pointer">{t.navPricing}</button>
            <button onClick={() => scrollToSection("mobile")} className="hover:text-primary transition-colors cursor-pointer">{t.navMobile}</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-primary transition-colors cursor-pointer">{t.navFaq}</button>
          </nav>

          {/* Language & Region Selectors */}
          <div className="hidden md:flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                <Languages className="h-4 w-4" />
                <span>{language === 'en' ? 'English' : language === 'hi' ? 'हिंदी' : 'العربية'}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-background border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-1">
                  <button onClick={() => setLanguage('en')} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors">English</button>
                  <button onClick={() => setLanguage('hi')} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors">हिंदी</button>
                  <button onClick={() => setLanguage('ar')} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors">العربية</button>
                </div>
              </div>
            </div>

            {/* Region/Currency Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted transition-colors">
                <Globe className="h-4 w-4" />
                <span>{COUNTRIES[country].name}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-background border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 max-h-64 overflow-y-auto">
                <div className="py-1">
                  {Object.values(COUNTRIES).map((c) => (
                    <button 
                      key={c.code} 
                      onClick={() => setCountry(c.code)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                    >
                      {c.name} ({c.currency})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">{t.navSignIn}</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold">
              <Link to="/auth" search={{ mode: "signup" }}>{t.navStartTrial}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-muted focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-4">
            <div className="flex flex-col gap-3 font-medium text-muted-foreground">
              <button onClick={() => scrollToSection("features")} className="text-left py-2 hover:text-primary transition-colors">{t.navFeatures}</button>
              <button onClick={() => scrollToSection("pricing")} className="text-left py-2 hover:text-primary transition-colors">{t.navPricing}</button>
              <button onClick={() => scrollToSection("mobile")} className="text-left py-2 hover:text-primary transition-colors">{t.navMobile}</button>
              <button onClick={() => scrollToSection("faq")} className="text-left py-2 hover:text-primary transition-colors">{t.navFaq}</button>
            </div>
            
            {/* Mobile Language & Region Selectors */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    English
                  </button>
                  <button 
                    onClick={() => setLanguage('hi')}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      language === 'hi' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    हिंदी
                  </button>
                  <button 
                    onClick={() => setLanguage('ar')}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      language === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Region</label>
                <select 
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className="w-full px-3 py-2 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.values(COUNTRIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="border-t border-border pt-4 flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full justify-center">
                <Link to="/auth">{t.navSignIn}</Link>
              </Button>
              <Button asChild className="w-full justify-center bg-primary text-primary-foreground font-semibold">
                <Link to="/auth" search={{ mode: "signup" }}>{t.navStartTrial}</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide uppercase animate-fade-in">
            <Badge variant="outline" className="bg-primary/10 text-primary border-none text-[10px] px-2 py-0">{t.heroBadge}</Badge>
            {t.heroBadgeText}
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-primary">
              {t.heroTitle}{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t.heroTitleHighlight}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t.heroDescription}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 bg-primary hover:bg-primary/95 text-primary-foreground text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
              <Link to="/auth" search={{ mode: "signup" }}>
                {t.heroStartTrial} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button onClick={() => scrollToSection("features")} variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-medium transition-all hover:bg-muted">
              {t.heroExplore}
            </Button>
          </div>

          {/* Glassmorphic Mockup Dashboard */}
          <div className="mt-16 relative mx-auto max-w-5xl rounded-2xl border border-primary/10 bg-card p-4 sm:p-6 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/5 via-transparent to-primary/5 rounded-2xl pointer-events-none" />
            
            {/* Header window dots */}
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-xs text-muted-foreground ml-2 font-mono">{t.dashboardUrl}</span>
            </div>

            {/* Mock Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {/* Stat Card 1 */}
              <div className="bg-background/80 rounded-xl p-5 border border-border space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.dashboardActiveRentals}</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none">+12%</Badge>
                </div>
                <div className="text-3xl font-extrabold text-primary">24 / 28</div>
                <p className="text-xs text-muted-foreground">{t.dashboardFleetUtilization}</p>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-accent rounded-full" />
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-background/80 rounded-xl p-5 border border-border space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.dashboardRevenue}</span>
                  <Badge className="bg-accent/15 text-accent border-none font-semibold">{t.dashboardRevenueBadge}</Badge>
                </div>
                <div className="text-3xl font-extrabold text-primary">{formatMoney(342800)}</div>
                <p className="text-xs text-muted-foreground">{t.dashboardRevenueNote}</p>
                <div className="flex gap-1.5 items-center text-xs text-emerald-600 font-semibold">
                  <Check className="h-3 w-3" /> {t.dashboardAutoReconciled}
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-background/80 rounded-xl p-5 border border-border space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.dashboardPendingMaintenance}</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">{t.dashboardMaintenanceAlerts}</Badge>
                </div>
                <div className="text-3xl font-extrabold text-primary">{t.dashboardMachines}</div>
                <p className="text-xs text-muted-foreground">{t.dashboardMaintenanceNote}</p>
                <div className="flex gap-1 text-[11px] text-amber-600 font-medium items-center">
                  <Wrench className="h-3.5 w-3.5 shrink-0" /> {t.dashboardServiceScheduled}
                </div>
              </div>
            </div>

            {/* Mock Table */}
            <div className="mt-6 bg-background/80 rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                <span className="font-semibold text-sm text-primary">{t.dashboardRecentBookings}</span>
                <span className="text-xs text-muted-foreground">{t.dashboardUpdated}</span>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { id: "B-2081", customer: "BuildCorp Infrastructure", equipment: "Komatsu PC210 Excavator", duration: "15 Days", status: "Dispatched", val: "bg-blue-500/10 text-blue-600" },
                  { id: "B-2082", customer: "Apex Contractors Ltd", equipment: "JCB 3DX Backhoe", duration: "7 Days", status: "Active", val: "bg-emerald-500/10 text-emerald-600" },
                  { id: "B-2083", customer: "S&M Road Builders", equipment: "CAT 120M Motor Grader", duration: "30 Days", status: "Pending Pickup", val: "bg-amber-500/10 text-amber-600" },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-muted-foreground font-semibold">{item.id}</span>
                      <div>
                        <p className="font-semibold text-primary">{item.customer}</p>
                        <p className="text-muted-foreground">{item.equipment}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-muted-foreground">{item.duration}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${item.val}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:divide-x md:divide-border">
            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-primary">{t.stat1Value}</div>
              <p className="text-sm text-muted-foreground font-medium">{t.stat1Label}</p>
            </div>
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-3xl font-extrabold text-primary">{t.stat2Value}</div>
              <p className="text-sm text-muted-foreground font-medium">{t.stat2Label}</p>
            </div>
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="text-3xl font-extrabold text-primary">{t.stat3Value}</div>
              <p className="text-sm text-muted-foreground font-medium">{t.stat3Label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest">{t.featuresBadge}</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            {t.featuresTitle}
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.featuresDescription}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: <Layers className="h-6 w-6 text-primary" />,
              title: t.feature1Title,
              description: t.feature1Desc,
            },
            {
              icon: <Calendar className="h-6 w-6 text-primary" />,
              title: t.feature2Title,
              description: t.feature2Desc,
            },
            {
              icon: <Wrench className="h-6 w-6 text-primary" />,
              title: t.feature3Title,
              description: t.feature3Desc,
            },
            {
              icon: <FileText className="h-6 w-6 text-primary" />,
              title: t.feature4Title,
              description: t.feature4Desc,
            },
            {
              icon: <Users className="h-6 w-6 text-primary" />,
              title: t.feature5Title,
              description: t.feature5Desc,
            },
            {
              icon: <TrendingUp className="h-6 w-6 text-primary" />,
              title: t.feature6Title,
              description: t.feature6Desc,
            },
          ].map((feature, idx) => (
            <div key={idx} className="group relative bg-card p-6 rounded-xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-lg text-primary">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Capacitor Mobile Showcase Section */}
      <section id="mobile" className="py-20 bg-muted/20 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <Badge className="bg-accent/10 text-accent hover:bg-accent/15 border-none font-semibold">{t.mobileBadge}</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
              {t.mobileTitle}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t.mobileDescription}
            </p>
            <ul className="space-y-4">
              {[
                { title: t.mobileFeature1Title, desc: t.mobileFeature1Desc },
                { title: t.mobileFeature2Title, desc: t.mobileFeature2Desc },
                { title: t.mobileFeature3Title, desc: t.mobileFeature3Desc },
              ].map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-primary/5 flex items-center justify-center mt-0.5">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pure HTML CSS Mockup Mobile Phone */}
          <div className="relative justify-self-center w-[300px] h-[600px] rounded-[40px] border-[12px] border-primary bg-background shadow-2xl overflow-hidden flex flex-col">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-primary rounded-b-2xl z-20 flex items-center justify-center">
              <div className="w-12 h-1 bg-background/20 rounded-full" />
            </div>

            {/* Mobile Content */}
            <div className="flex-1 flex flex-col pt-8 bg-muted/40">
              <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-background">
                <span className="font-bold text-xs text-primary">{t.mobileFieldApp}</span>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-semibold">{t.mobileOnline}</span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="bg-background rounded-lg border border-border p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">{t.mobileBranch}</span>
                    <span className="text-[10px] font-bold text-primary">{t.mobileDispatch}</span>
                  </div>
                  <h4 className="font-bold text-xs text-primary">{t.mobileCheckoutTitle}</h4>
                  <p className="text-[10px] text-muted-foreground">{t.mobileJobsite}</p>
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    {[t.mobileCheck1, t.mobileCheck2, t.mobileCheck3].map((label, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-[10px]">
                        <input type="checkbox" defaultChecked={idx < 2} className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-background rounded-lg border border-border p-3 space-y-2">
                  <h4 className="font-bold text-xs text-primary">{t.mobileSignTitle}</h4>
                  <div className="h-20 rounded bg-muted/50 border border-dashed border-border flex items-center justify-center relative overflow-hidden">
                    <span className="text-[10px] text-muted-foreground/60 select-none">{t.mobileSignPlaceholder}</span>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 80">
                      <path d="M 30,50 Q 60,20 100,55 T 170,40" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/70" />
                    </svg>
                  </div>
                  <Button size="sm" className="w-full text-[10px] h-8 bg-primary text-primary-foreground font-semibold">
                    {t.mobileComplete}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest">{t.pricingBadge}</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            {t.pricingTitle}
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.pricingDescription}
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Basic Plan */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/20 transition-all duration-300 shadow-sm">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-primary">{t.pricingBasic}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.pricingBasicDesc}</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-primary">{formatMoney(prices.basic)}</span>
                <span className="text-muted-foreground text-sm font-medium ml-1">{t.pricingPerMonth}</span>
              </div>
              <ul className="space-y-3 text-sm">
                {[t.pricingBenefit1, t.pricingBenefit2, t.pricingBenefit3, t.pricingBenefit4].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="mt-8 w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold" size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>{t.pricingChooseBasic}</Link>
            </Button>
          </div>

          {/* Intermediate Plan (Recommended) */}
          <div className="relative rounded-2xl border-2 border-primary bg-card p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 shadow-md">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow">
              <Crown className="h-3 w-3" /> {t.pricingRecommended}
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-primary">{t.pricingIntermediate}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.pricingIntermediateDesc}</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-primary">{formatMoney(prices.intermediate)}</span>
                <span className="text-muted-foreground text-sm font-medium ml-1">{t.pricingPerMonth}</span>
              </div>
              <ul className="space-y-3 text-sm">
                {[t.pricingBenefit5, t.pricingBenefit6, t.pricingBenefit7, t.pricingBenefit8, t.pricingBenefit9].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="mt-8 w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold" size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>{t.pricingChooseIntermediate}</Link>
            </Button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/20 transition-all duration-300 shadow-sm">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-primary">{t.pricingPremium}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.pricingPremiumDesc}</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-primary">{formatMoney(prices.premium)}</span>
                <span className="text-muted-foreground text-sm font-medium ml-1">{t.pricingPerMonth}</span>
              </div>
              <ul className="space-y-3 text-sm">
                {[t.pricingBenefit10, t.pricingBenefit11, t.pricingBenefit12, t.pricingBenefit13].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="mt-8 w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold" size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>{t.pricingChoosePremium}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-28 bg-muted/20 border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-xs font-bold text-accent uppercase tracking-widest">{t.faqBadge}</h2>
            <p className="text-3xl font-extrabold text-primary tracking-tight">{t.faqTitle}</p>
          </div>

          <Accordion type="single" collapsible className="w-full bg-card rounded-xl border border-border p-6 divide-y divide-border">
            {[
              { value: "item-1", question: t.faq1Question, answer: t.faq1Answer },
              { value: "item-2", question: t.faq2Question, answer: t.faq2Answer },
              { value: "item-3", question: t.faq3Question, answer: t.faq3Answer },
              { value: "item-4", question: t.faq4Question, answer: t.faq4Answer },
              { value: "item-5", question: t.faq5Question, answer: t.faq5Answer },
            ].map((item) => (
              <AccordionItem key={item.value} value={item.value} className="border-none">
                <AccordionTrigger className="text-base font-bold text-primary hover:no-underline py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative bg-primary rounded-3xl p-8 sm:p-12 md:p-16 overflow-hidden shadow-2xl text-primary-foreground">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/25 rounded-full blur-3xl -z-0" />
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              {t.ctaTitle}
            </h2>
            <p className="text-primary-foreground/80 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              {t.ctaDescription}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 bg-accent hover:bg-accent/95 text-accent-foreground font-bold shadow-lg shadow-accent/20">
                <Link to="/auth" search={{ mode: "signup" }}>{t.ctaStartTrial}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground font-medium">
                <Link to="/auth">{t.ctaSignIn}</Link>
              </Button>
            </div>
            <p className="text-xs text-primary-foreground/60">
              {t.ctaNoCard}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded bg-primary text-primary-foreground">
              <Construction className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg text-primary tracking-tight">HERMS</span>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <button onClick={() => scrollToSection("features")} className="hover:text-primary transition-colors">{t.navFeatures}</button>
            <button onClick={() => scrollToSection("pricing")} className="hover:text-primary transition-colors">{t.navPricing}</button>
            <button onClick={() => scrollToSection("mobile")} className="hover:text-primary transition-colors">{t.navMobile}</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-primary transition-colors">{t.navFaq}</button>
          </div>

          <div className="text-xs text-muted-foreground">
            {t.footerCopyright.replace("{year}", String(new Date().getFullYear()))}
          </div>
        </div>
      </footer>
    </div>
  );
}

