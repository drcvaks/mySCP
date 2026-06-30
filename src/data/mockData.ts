import { Announcement, Chaburah, LearningFile, ReviewQuestion, UserProfile } from "../shared/types";

export const chaburos: Chaburah[] = [
  {
    id: "chaburah_ohel_moshe",
    name: "Ohel Moshe",
    status: "active",
    address: "2808 Smith Avenue, Baltimore, MD 21209",
    city: "Baltimore",
    country: "United States",
    rabbiName: "Rav Shmuel Kimche",
    schedule: "Sunday 9:15 AM",
    memberCount: 42,
    discussionEnabled: false,
    joinRequiresApproval: false
  },
  {
    id: "chaburah_shomrei_emunah",
    name: "Shomrei Emunah",
    status: "active",
    address: "6221 Greenspring Ave, Baltimore, MD 21209",
    city: "Baltimore",
    country: "United States",
    rabbiName: "Rav Binyamin Marwick",
    schedule: "Wednesday 8:00 PM",
    memberCount: 36,
    discussionEnabled: false,
    joinRequiresApproval: false
  },
  {
    id: "chaburah_suburban_orthodox",
    name: "Suburban Orthodox Congregation Toras Chaim",
    status: "active",
    address: "7504 Seven Mile Lane, Baltimore, MD 21208",
    city: "Baltimore",
    country: "United States",
    rabbiName: "Rav Shmuel Silber",
    schedule: "Monday 8:00 PM",
    memberCount: 58,
    discussionEnabled: false,
    joinRequiresApproval: false
  },
  {
    id: "chaburah_vaks_test",
    name: "Vaks Test Chaburah",
    status: "active",
    address: "Wonderful Place, Baltimore, MD 21208",
    city: "Baltimore",
    country: "United States",
    rabbiName: "Rav Chaim Vaks",
    schedule: "Sunday 8:00 PM",
    memberCount: 12,
    discussionEnabled: false,
    joinRequiresApproval: false
  }
];

export const users: UserProfile[] = [
  {
    id: "user_chaim_vaks",
    fullName: "Chaim Vaks",
    email: "chaim.vaks@example.com",
    phone: "410-555-0147",
    country: "United States",
    city: "Baltimore",
    role: "global_admin",
    roleRequestStatus: "approved",
    chaburahId: "chaburah_ohel_moshe"
  }
];

export const currentUser = users[0];

export const announcements: Announcement[] = [
  {
    id: "announcement_global_zman",
    title: "Practical Kashrus zman has begun",
    body: "This zman focuses on kitchen kashrus, Nat Bar Nat, and the wine sugya.",
    postedBy: "SCP Headquarters",
    postedAt: "2026-06-07T09:00:00Z",
    isGlobal: true,
    isPinned: true
  },
  {
    id: "announcement_ohel_moshe_source",
    chaburahId: "chaburah_ohel_moshe",
    title: "Week 1 source sheet is ready",
    body: "Please review the mareh mekomos before Sunday's chaburah.",
    postedBy: "Rav Shmuel Kimche",
    postedAt: "2026-06-08T13:00:00Z",
    isGlobal: false
  },
  {
    id: "announcement_ohel_moshe_bechina",
    chaburahId: "chaburah_ohel_moshe",
    title: "Bechina review begins after Week 6",
    body: "Short review questions are available each week to help keep the material fresh.",
    postedBy: "Local Admin",
    postedAt: "2026-06-08T18:30:00Z",
    isGlobal: false
  }
];

export const learningFiles: LearningFile[] = [
  {
    id: "file_week_1_source",
    title: "Week 1 Source Sheet: Nat Bar Nat Foundations",
    coverage: "week",
    week: 1,
    topic: "Nat Bar Nat & Kitchen Kashrus",
    visibility: "everyone",
    uploadedBy: "SCP Headquarters",
    fileType: "source_sheet"
  },
  {
    id: "file_week_1_review",
    title: "Week 1 Review Summary",
    coverage: "week",
    week: 1,
    topic: "Nat Bar Nat & Kitchen Kashrus",
    visibility: "everyone",
    uploadedBy: "SCP Headquarters",
    fileType: "review_sheet"
  },
  {
    id: "file_ohel_recording",
    title: "Ohel Moshe Week 1 Recording",
    coverage: "week",
    week: 1,
    topic: "Nat Bar Nat & Kitchen Kashrus",
    visibility: "chaburah",
    chaburahId: "chaburah_ohel_moshe",
    uploadedBy: "Rav Shmuel Kimche",
    fileType: "recording"
  },
  {
    id: "file_wine_intro",
    title: "Stam Yeinam Intro Link",
    coverage: "week",
    week: 7,
    topic: "Stam Yeinam & Wine",
    visibility: "everyone",
    uploadedBy: "SCP Headquarters",
    fileType: "link"
  }
];

export const reviewQuestions: ReviewQuestion[] = [
  {
    id: "review_w1_q1",
    week: 1,
    topic: "Nat Bar Nat & Kitchen Kashrus",
    prompt: "Nat Bar Nat discussions often begin with which general kitchen scenario?",
    kind: "multiple_choice",
    choices: ["Clean pareve food cooked in a clean meat pot", "Wine touched by a non-Jew", "Checking lettuce", "Lighting candles"],
    visibility: "everyone",
    correctChoiceIndex: 0,
    explanation: "The core kitchen case starts with transferred taste from clean utensils and pareve food.",
    enabled: true
  },
  {
    id: "review_w1_q2",
    week: 1,
    topic: "Nat Bar Nat & Kitchen Kashrus",
    prompt: "A chaburah review quiz should show feedback after an answer.",
    kind: "true_false",
    choices: ["True", "False"],
    visibility: "everyone",
    correctChoiceIndex: 0,
    explanation: "Immediate feedback helps participants review before the bechina.",
    enabled: true
  },
  {
    id: "review_w7_q1",
    week: 7,
    topic: "Stam Yeinam & Wine",
    prompt: "Week 7 begins the wine section of the zman.",
    kind: "true_false",
    choices: ["True", "False"],
    visibility: "everyone",
    correctChoiceIndex: 0,
    explanation: "The roadmap places Stam Yeinam and wine from Week 7 onward.",
    enabled: true
  }
];
