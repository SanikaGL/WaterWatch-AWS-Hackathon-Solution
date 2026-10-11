// Shared demo seed data for cleaners + authorities (Karnataka > Hassan).
// Kept separate so both the DynamoDB-local seed and the in-memory seed reuse it.
import type { VolunteerProfile, VolunteerPost, AuthorityProfile } from "../domain/types.js";

type DaysAgo = (n: number) => string;

// Verified cleaners across Hassan taluks. Cleaners physically clean water bodies,
// submit before/after evidence, get verified, and earn rewards (payout deferred).
export function seedCleaners(daysAgo: DaysAgo): VolunteerProfile[] {
  return [
    { volunteerId: "cln-manjunath", role: "cleaner", name: "Manjunath Gowda", bio: "Full-time lake cleaner. Belur Lake and Yagachi banks. Before/after evidence on every drive.", instagram: "https://instagram.com/manju.cleans", youtube: "https://youtube.com/@manjucleans", links: [], homeStateId: "KA", homeDistrictId: "HASSAN", homeTalukId: "BELUR", eventsConducted: 0, badges: ["Verified Cleaner", "40 Drives"], createdAt: daysAgo(140) },
    { volunteerId: "cln-lakshmi", role: "cleaner", name: "Lakshmi Devi", bio: "Leads a women's cleaning collective in Hassan town. Focused on temple-tank restoration.", instagram: "https://instagram.com/lakshmi.cleanwater", links: [{ label: "Collective", url: "https://example.com/hassan-collective" }], homeStateId: "KA", homeDistrictId: "HASSAN", homeTalukId: "HASSAN", eventsConducted: 0, badges: ["Verified Cleaner"], createdAt: daysAgo(100) },
    { volunteerId: "cln-imran", role: "cleaner", name: "Imran Pasha", bio: "Cleans drains and canals before monsoon to prevent urban flooding in Arsikere.", youtube: "https://youtube.com/@imrandrains", links: [], homeStateId: "KA", homeDistrictId: "HASSAN", homeTalukId: "ARASIKERE", eventsConducted: 0, badges: ["Verified Cleaner", "Monsoon Ready"], createdAt: daysAgo(70) },
    { volunteerId: "cln-sahana", role: "cleaner", name: "Sahana Kumari", bio: "Sakleshpur stream cleaner. Removes plastic and devotional waste from flowing water.", instagram: "https://instagram.com/sahana.streams", links: [], homeStateId: "KA", homeDistrictId: "HASSAN", homeTalukId: "SAKLESHPUR", eventsConducted: 0, badges: ["Verified Cleaner"], createdAt: daysAgo(45) },
  ];
}

export function seedCleanerPosts(daysAgo: DaysAgo): VolunteerPost[] {
  return [
    { postId: "VP-cln-manju1", authorId: "cln-manjunath", authorName: "Manjunath Gowda", authorRole: "cleaner", title: "Belur Lake northern bank — before & after", description: "Six hours, two teams, 60 bags of plastic and silt cleared from the inlet. Submitted evidence to the taluk authority for verification.", media: [], stateId: "KA", districtId: "HASSAN", talukId: "BELUR", commentCount: 0, createdAt: daysAgo(3) },
    { postId: "VP-cln-lakshmi1", authorId: "cln-lakshmi", authorName: "Lakshmi Devi", authorRole: "cleaner", title: "Temple tank restored", description: "Our collective desilted the old temple tank in Hassan town. Water is holding clear again after years. Proud of the team.", media: [], stateId: "KA", districtId: "HASSAN", talukId: "HASSAN", commentCount: 0, createdAt: daysAgo(6) },
  ];
}

// One authority per Hassan taluk. SEEDED only — never self-signup. On AWS these
// map to Cognito users in the 'authority' group with the same ids.
export function seedAuthorities(daysAgo: DaysAgo): AuthorityProfile[] {
  const base = (talukId: string, name: string, designation: string, department: string, bio: string, extra: Partial<AuthorityProfile> = {}): AuthorityProfile => ({
    authorityId: `auth-${talukId.toLowerCase()}`,
    name,
    designation,
    department,
    bio,
    stateId: "KA",
    districtId: "HASSAN",
    talukId,
    createdAt: daysAgo(200),
    ...extra,
  });
  return [
    base("BELUR", "Suresh Hegde", "Taluk Water Officer", "Minor Irrigation Dept.", "Responsible for water bodies and flood response across Belur taluk.", { email: "water.belur@hassan.gov.example", phone: "+91 80000 10001" }),
    base("HASSAN", "Nagaraj B M", "Assistant Executive Engineer", "Public Works Dept.", "Oversees urban water supply and drainage in Hassan taluk.", { email: "water.hassan@hassan.gov.example", phone: "+91 80000 10002" }),
    base("ARASIKERE", "Chaitra Rao", "Taluk Water Officer", "Minor Irrigation Dept.", "Handles canal and tank maintenance in Arsikere taluk.", { email: "water.arasikere@hassan.gov.example" }),
    base("SAKLESHPUR", "Vinod Kumar", "Range Water Officer", "Minor Irrigation Dept.", "Monitors streams and catchment areas in Sakleshpur.", { email: "water.sakleshpur@hassan.gov.example" }),
    base("ARKALGUD", "Deepa Shivanna", "Taluk Water Officer", "Minor Irrigation Dept.", "Responsible for Hemavathi backwaters and local tanks in Arkalgud.", {}),
    base("ALUR", "Mahesh Patel", "Taluk Water Officer", "Minor Irrigation Dept.", "Oversees water bodies across Alur taluk.", {}),
    base("CHANNARAYAPATNA", "Rekha N", "Assistant Engineer", "Public Works Dept.", "Handles water supply and tank restoration in Channarayapatna.", {}),
    base("HOLENARASIPURA", "Girish Rao", "Taluk Water Officer", "Minor Irrigation Dept.", "Monitors Hemavathi river stretches in Holenarasipura.", {}),
  ];
}
