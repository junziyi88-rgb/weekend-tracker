import {
  CATEGORIES,
  type Category,
  type WeekendRecord,
} from "./types";

export const STATS_RANGES = [
  { value: "current-month", label: "本月" },
  { value: "last-three-months", label: "最近三个月" },
  { value: "current-year", label: "本年" },
  { value: "all-time", label: "使用以来" },
] as const;

export type StatsRange = (typeof STATS_RANGES)[number]["value"];

export type CategoryStat = {
  category: Category;
  weight: number;
  percentage: number;
};

export type WeekendProfileStats = {
  range: StatsRange;
  records: WeekendRecord[];
  totalRecords: number;
  totalTimeBlockWeight: number;
  categoryStats: CategoryStat[];
};

export const TREND_RANGES = [
  { value: "last-month", label: "最近一个月", months: 1 },
  { value: "last-three-months", label: "最近 3 个月", months: 3 },
  { value: "last-year", label: "最近一年", months: 12 },
] as const;

export type TrendRange = (typeof TREND_RANGES)[number]["value"];

export type TrendSummary = {
  range: TrendRange;
  currentStartDate: string;
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
  currentStats: Omit<WeekendProfileStats, "range">;
  previousStats: Omit<WeekendProfileStats, "range">;
  hasEnoughRecords: boolean;
  sentences: string[];
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const MIN_TREND_CURRENT_WEIGHT = 2;
const MIN_TREND_COMPARISON_WEIGHT = 3;
const MEANINGFUL_DELTA_PERCENTAGE = 5;
const TENDENCY_PERCENTAGE = 35;

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const addMonths = (date: Date, monthOffset: number) => {
  const targetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + monthOffset,
    1,
  );
  const lastDayOfTargetMonth = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate();

  return new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    Math.min(date.getDate(), lastDayOfTargetMonth),
  );
};

const formatPercentage = (percentage: number) =>
  `${percentage.toFixed(percentage >= 10 ? 0 : 1)}%`;

const formatDelta = (delta: number) => {
  const value = Math.abs(delta).toFixed(Math.abs(delta) >= 10 ? 0 : 1);
  return `${delta > 0 ? "上升" : "下降"} ${value} 个百分点`;
};

const getRangeStartDate = (range: StatsRange, now: Date) => {
  const year = now.getFullYear();
  const month = now.getMonth();

  if (range === "current-month") {
    return toLocalDateString(new Date(year, month, 1));
  }

  if (range === "last-three-months") {
    return toLocalDateString(new Date(year, month - 2, 1));
  }

  if (range === "current-year") {
    return toLocalDateString(new Date(year, 0, 1));
  }

  return null;
};

const isInRange = (record: WeekendRecord, range: StatsRange, now: Date) => {
  if (range === "all-time") {
    return true;
  }

  if (!datePattern.test(record.record_date)) {
    return false;
  }

  const rangeStart = getRangeStartDate(range, now);
  const today = toLocalDateString(now);
  return Boolean(
    rangeStart &&
      record.record_date >= rangeStart &&
      record.record_date <= today,
  );
};

const getTimeBlockKey = (record: WeekendRecord) =>
  `${record.record_date}::${record.weekend_slot}`;

const calculateWeightedStats = (records: WeekendRecord[]) => {
  const timeBlocks = new Map<string, WeekendRecord[]>();

  for (const record of records) {
    const key = getTimeBlockKey(record);
    const blockRecords = timeBlocks.get(key);

    if (blockRecords) {
      blockRecords.push(record);
    } else {
      timeBlocks.set(key, [record]);
    }
  }

  const categoryWeights = new Map<Category, number>(
    CATEGORIES.map((category) => [category, 0]),
  );

  for (const blockRecords of timeBlocks.values()) {
    const recordWeight = 1 / blockRecords.length;

    for (const record of blockRecords) {
      categoryWeights.set(
        record.category,
        (categoryWeights.get(record.category) ?? 0) + recordWeight,
      );
    }
  }

  const totalTimeBlockWeight = timeBlocks.size;
  const categoryStats = CATEGORIES.map((category) => {
    const weight = categoryWeights.get(category) ?? 0;
    return {
      category,
      weight,
      percentage:
        totalTimeBlockWeight > 0 ? (weight / totalTimeBlockWeight) * 100 : 0,
    };
  }).filter((stat) => stat.weight > 0);

  return {
    records,
    totalRecords: records.length,
    totalTimeBlockWeight,
    categoryStats,
  };
};

export const calculateCategoryStats = (
  records: WeekendRecord[],
  range: StatsRange,
  now = new Date(),
): WeekendProfileStats => {
  const rangedRecords = records.filter((record) => isInRange(record, range, now));
  const weightedStats = calculateWeightedStats(rangedRecords);

  return {
    range,
    ...weightedStats,
  };
};

const getTrendRangeConfig = (range: TrendRange) =>
  TREND_RANGES.find((item) => item.value === range) ?? TREND_RANGES[0];

const filterRecordsByDateWindow = (
  records: WeekendRecord[],
  startDate: string,
  endDateExclusive: string,
) =>
  records.filter(
    (record) =>
      datePattern.test(record.record_date) &&
      record.record_date >= startDate &&
      record.record_date < endDateExclusive,
  );

const getCategoryPercentage = (
  stats: Omit<WeekendProfileStats, "range">,
  category: Category,
) =>
  stats.categoryStats.find((stat) => stat.category === category)?.percentage ??
  0;

const getTopCategory = (stats: Omit<WeekendProfileStats, "range">) =>
  [...stats.categoryStats].sort((a, b) => b.percentage - a.percentage)[0] ??
  null;

const getMostChangedCategory = (
  currentStats: Omit<WeekendProfileStats, "range">,
  previousStats: Omit<WeekendProfileStats, "range">,
  direction: "up" | "down",
) => {
  const changes = CATEGORIES.map((category) => ({
    category,
    delta:
      getCategoryPercentage(currentStats, category) -
      getCategoryPercentage(previousStats, category),
  })).filter(({ delta }) =>
    direction === "up"
      ? delta >= MEANINGFUL_DELTA_PERCENTAGE
      : delta <= -MEANINGFUL_DELTA_PERCENTAGE,
  );

  return changes.sort((a, b) =>
    direction === "up" ? b.delta - a.delta : a.delta - b.delta,
  )[0] ?? null;
};

const getTendencyCategories = (stats: Omit<WeekendProfileStats, "range">) =>
  stats.categoryStats
    .filter(
      (stat) =>
        ["休息", "社交", "学习", "工作"].includes(stat.category) &&
        stat.percentage >= TENDENCY_PERCENTAGE,
    )
    .map((stat) => stat.category);

export const calculateTrendSummary = (
  records: WeekendRecord[],
  range: TrendRange,
  now = new Date(),
): TrendSummary => {
  const rangeConfig = getTrendRangeConfig(range);
  const currentEndExclusive = addDays(now, 1);
  const currentStart = addMonths(currentEndExclusive, -rangeConfig.months);
  const previousStart = addMonths(currentStart, -rangeConfig.months);

  const currentStartDate = toLocalDateString(currentStart);
  const currentEndExclusiveDate = toLocalDateString(currentEndExclusive);
  const currentEndDate = toLocalDateString(now);
  const previousStartDate = toLocalDateString(previousStart);
  const previousEndDate = toLocalDateString(addDays(currentStart, -1));

  const currentStats = calculateWeightedStats(
    filterRecordsByDateWindow(records, currentStartDate, currentEndExclusiveDate),
  );
  const previousStats = calculateWeightedStats(
    filterRecordsByDateWindow(records, previousStartDate, currentStartDate),
  );

  const hasEnoughRecords =
    currentStats.totalTimeBlockWeight >= MIN_TREND_CURRENT_WEIGHT &&
    currentStats.totalTimeBlockWeight + previousStats.totalTimeBlockWeight >=
      MIN_TREND_COMPARISON_WEIGHT;

  if (!hasEnoughRecords) {
    return {
      range,
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate,
      currentStats,
      previousStats,
      hasEnoughRecords,
      sentences: ["暂时没有足够记录形成趋势。"],
    };
  }

  const topCategory = getTopCategory(currentStats);
  const risingCategory = getMostChangedCategory(
    currentStats,
    previousStats,
    "up",
  );
  const fallingCategory = getMostChangedCategory(
    currentStats,
    previousStats,
    "down",
  );
  const tendencyCategories = getTendencyCategories(currentStats);

  const sentences: string[] = [];

  if (topCategory) {
    sentences.push(
      `${rangeConfig.label}内，${topCategory.category}占比最高，约 ${formatPercentage(
        topCategory.percentage,
      )}。`,
    );
  }

  if (risingCategory && fallingCategory) {
    sentences.push(
      `相比上一等长周期，${risingCategory.category}占比${formatDelta(
        risingCategory.delta,
      )}，${fallingCategory.category}占比${formatDelta(fallingCategory.delta)}。`,
    );
  } else if (risingCategory) {
    sentences.push(
      `相比上一等长周期，${risingCategory.category}占比${formatDelta(
        risingCategory.delta,
      )}。`,
    );
  } else if (fallingCategory) {
    sentences.push(
      `相比上一等长周期，${fallingCategory.category}占比${formatDelta(
        fallingCategory.delta,
      )}。`,
    );
  } else {
    sentences.push("相比上一等长周期，各分类占比变化不明显。");
  }

  if (tendencyCategories.length > 0) {
    sentences.push(
      `整体看，周末时间呈现${tendencyCategories.join("、")}倾向。`,
    );
  } else {
    sentences.push("整体看，分类分布较均衡，暂时没有单一明显倾向。");
  }

  return {
    range,
    currentStartDate,
    currentEndDate,
    previousStartDate,
    previousEndDate,
    currentStats,
    previousStats,
    hasEnoughRecords,
    sentences,
  };
};
