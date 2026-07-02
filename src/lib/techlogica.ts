export const TECHLOGICA_WEBSITE = "https://techlogica.com/";
export const TECHLOGICA_EMAIL = "info@techlogica.com";
export const TECHLOGICA_LOGO = "/images/techlogica-logo.png";

export const TECHLOGICA_OFFICES = [
  {
    id: "india",
    regionKey: "india" as const,
    company: "Techlogica IT DT Solutions",
    addressLines: [
      "2nd Floor, Sahya Building,",
      "Govt. Cyber Park",
      "Kozhikode – 673 016",
    ],
    phone: "+91 735 6630 756",
  },
  {
    id: "dubai",
    regionKey: "dubai" as const,
    company: "Techorbit IT DT Solutions",
    addressLines: [
      "Dubai Investment Park – 1",
      "Green Community Village,",
      "Dubai",
    ],
    phone: "+9 71 567 99 1234",
  },
] as const;
