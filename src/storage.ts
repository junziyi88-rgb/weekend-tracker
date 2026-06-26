import {
  CATEGORIES,
  type RecordInput,
  type WeekendRecord,
  WEEKEND_SLOT_ORDER,
  WEEKEND_SLOTS,
} from "./types";

const STORAGE_KEY = "weekend-tracker.records";
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is WeekendRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as WeekendRecord;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.record_date === "string" &&
    WEEKEND_SLOTS.includes(item.weekend_slot) &&
    CATEGORIES.includes(item.category) &&
    typeof item.created_at === "string" &&
    typeof item.updated_at === "string"
  );
};

const sortRecords = (records: WeekendRecord[]) =>
  [...records].sort((a, b) => {
    const dateCompare = b.record_date.localeCompare(a.record_date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    const slotCompare =
      WEEKEND_SLOT_ORDER[b.weekend_slot] - WEEKEND_SLOT_ORDER[a.weekend_slot];
    if (slotCompare !== 0) {
      return slotCompare;
    }

    return b.created_at.localeCompare(a.created_at);
  });

const saveRecords = (records: WeekendRecord[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sortRecords(records)));
};

export const getRecords = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortRecords(parsed.filter(isRecord));
  } catch {
    return [];
  }
};

const normalizeRecordInput = (input: RecordInput) => {
  const weekendSlots = input.weekend_slots.filter((slot, index, slots) => {
    return WEEKEND_SLOTS.includes(slot) && slots.indexOf(slot) === index;
  });

  return {
    title: input.title.trim(),
    record_date: datePattern.test(input.record_date) ? input.record_date : "",
    weekend_slots: weekendSlots,
    category: input.category,
  };
};

export const createRecords = (input: RecordInput) => {
  const normalizedInput = normalizeRecordInput(input);
  const now = new Date().toISOString();
  const newRecords = normalizedInput.weekend_slots.map((weekendSlot) => ({
    id: crypto.randomUUID(),
    title: normalizedInput.title,
    record_date: normalizedInput.record_date,
    weekend_slot: weekendSlot,
    category: normalizedInput.category,
    created_at: now,
    updated_at: now,
  }));

  const records = [...newRecords, ...getRecords()];
  saveRecords(records);
  return newRecords;
};

export const updateRecord = (id: string, input: RecordInput) => {
  const normalizedInput = normalizeRecordInput(input);
  const records = getRecords();
  const targetRecord = records.find((record) => record.id === id);
  const [primarySlot, ...extraSlots] = normalizedInput.weekend_slots;

  if (!targetRecord || !primarySlot) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedRecords = records.map((record) =>
    record.id === id
      ? {
          ...record,
          title: normalizedInput.title,
          record_date: normalizedInput.record_date,
          weekend_slot: primarySlot,
          category: normalizedInput.category,
          updated_at: now,
        }
      : record,
  );

  const extraRecords = extraSlots.map((weekendSlot) => ({
    id: crypto.randomUUID(),
    title: normalizedInput.title,
    record_date: normalizedInput.record_date,
    weekend_slot: weekendSlot,
    category: normalizedInput.category,
    created_at: now,
    updated_at: now,
  }));

  saveRecords([...extraRecords, ...updatedRecords]);
  return updatedRecords.find((record) => record.id === id) ?? null;
};

export const deleteRecord = (id: string) => {
  saveRecords(getRecords().filter((record) => record.id !== id));
};
