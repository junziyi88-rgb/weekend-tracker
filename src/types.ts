export const WEEKEND_SLOTS = [
  "周六上午",
  "周六下午",
  "周六晚上",
  "周日上午",
  "周日下午",
  "周日晚上",
] as const;

export type WeekendSlot = (typeof WEEKEND_SLOTS)[number];

export const CATEGORIES = [
  "休息",
  "社交",
  "运动",
  "学习",
  "娱乐",
  "家务",
  "出行",
  "工作",
  "陪伴家人",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type WeekendRecord = {
  id: string;
  title: string;
  record_date: string;
  weekend_slot: WeekendSlot;
  category: Category;
  created_at: string;
  updated_at: string;
};

export type RecordInput = {
  title: string;
  record_date: string;
  weekend_slots: WeekendSlot[];
  category: Category;
};

export const WEEKEND_SLOT_ORDER: Record<WeekendSlot, number> = {
  周六上午: 1,
  周六下午: 2,
  周六晚上: 3,
  周日上午: 4,
  周日下午: 5,
  周日晚上: 6,
};
