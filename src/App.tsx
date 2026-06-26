import { type CSSProperties, FormEvent, useMemo, useState } from "react";
import {
  createRecords,
  deleteRecord,
  getRecords,
  updateRecord,
} from "./storage";
import {
  calculateCategoryStats,
  calculateTrendSummary,
  STATS_RANGES,
  type StatsRange,
  TREND_RANGES,
  type TrendRange,
} from "./stats";
import {
  CATEGORIES,
  type Category,
  type RecordInput,
  type WeekendRecord,
  WEEKEND_SLOT_ORDER,
  WEEKEND_SLOTS,
  type WeekendSlot,
} from "./types";

type FormState = RecordInput;
type CalendarDay = {
  key: string;
  date: Date;
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isRecordableWeekend: boolean;
  records: WeekendRecord[];
};

const CATEGORY_COLORS: Record<Category, string> = {
  休息: "#3b82f6",
  社交: "#f97316",
  运动: "#16a34a",
  学习: "#8b5cf6",
  娱乐: "#ec4899",
  家务: "#14b8a6",
  出行: "#eab308",
  工作: "#64748b",
  陪伴家人: "#ef4444",
};

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const getCurrentWeekendEnd = (today = new Date()) => {
  const day = today.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  return addDays(today, daysUntilSunday);
};

const getDefaultSelectedDate = () => {
  const today = new Date();
  const day = today.getDay();

  if (day === 0 || day === 6) {
    return toLocalDateString(today);
  }

  return toLocalDateString(addDays(today, 6 - day));
};

const isWeekendDate = (dateString: string) => {
  if (!datePattern.test(dateString)) {
    return false;
  }

  const day = parseDateString(dateString).getDay();
  return day === 0 || day === 6;
};

const getAvailableSlots = (dateString: string): WeekendSlot[] => {
  if (!datePattern.test(dateString)) {
    return [];
  }

  const day = parseDateString(dateString).getDay();

  if (day === 6) {
    return ["周六上午", "周六下午", "周六晚上"];
  }

  if (day === 0) {
    return ["周日上午", "周日下午", "周日晚上"];
  }

  return [];
};

const createInitialFormState = (dateString: string): FormState => {
  const availableSlots = getAvailableSlots(dateString);

  return {
    title: "",
    record_date: dateString,
    weekend_slots: availableSlots.length > 0 ? [availableSlots[0]] : [],
    category: CATEGORIES[0],
  };
};

const validateForm = (form: FormState) => {
  const errors: Partial<Record<keyof FormState, string>> = {};
  const availableSlots = getAvailableSlots(form.record_date);

  if (!form.title.trim()) {
    errors.title = "请输入事件名称";
  }

  if (!datePattern.test(form.record_date) || !isWeekendDate(form.record_date)) {
    errors.record_date = "请选择周末日期";
  }

  if (
    form.weekend_slots.length === 0 ||
    !form.weekend_slots.every((slot) => availableSlots.includes(slot))
  ) {
    errors.weekend_slots = "请选择至少一个当前日期的时间块";
  }

  if (!CATEGORIES.includes(form.category)) {
    errors.category = "请选择分类";
  }

  return errors;
};

const formatPercentage = (percentage: number) =>
  `${percentage.toFixed(percentage >= 10 ? 0 : 1)}%`;

const formatWeight = (weight: number) =>
  Number.isInteger(weight) ? `${weight}` : weight.toFixed(2);

const formatMonthTitle = (date: Date) =>
  `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;

const getShortSlotLabel = (slot: WeekendSlot) =>
  slot.replace("周六", "").replace("周日", "");

const getPieGradient = (
  categoryStats: ReturnType<typeof calculateCategoryStats>["categoryStats"],
) => {
  let cursor = 0;

  return categoryStats
    .map((stat) => {
      const start = cursor;
      const end = cursor + stat.percentage;
      cursor = end;
      return `${CATEGORY_COLORS[stat.category]} ${start}% ${end}%`;
    })
    .join(", ");
};

const buildCalendarDays = (
  calendarMonth: Date,
  records: WeekendRecord[],
): CalendarDay[] => {
  const monthStart = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  );
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -mondayOffset);
  const todayString = toLocalDateString(new Date());
  const recordableEnd = toLocalDateString(getCurrentWeekendEnd());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateString = toLocalDateString(date);
    const day = date.getDay();
    const dateRecords = records.filter(
      (record) => record.record_date === dateString,
    );

    return {
      key: dateString,
      date,
      dateString,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === calendarMonth.getMonth(),
      isToday: dateString === todayString,
      isWeekend: day === 0 || day === 6,
      isRecordableWeekend: (day === 0 || day === 6) && dateString <= recordableEnd,
      records: dateRecords,
    };
  });
};

const sortSelectedDateRecords = (records: WeekendRecord[]) =>
  [...records].sort((a, b) => {
    const slotCompare =
      WEEKEND_SLOT_ORDER[a.weekend_slot] - WEEKEND_SLOT_ORDER[b.weekend_slot];
    if (slotCompare !== 0) {
      return slotCompare;
    }

    return a.created_at.localeCompare(b.created_at);
  });

function App() {
  const initialSelectedDate = useMemo(() => getDefaultSelectedDate(), []);
  const [records, setRecords] = useState<WeekendRecord[]>(() => getRecords());
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    parseDateString(initialSelectedDate),
  );
  const [form, setForm] = useState<FormState>(() =>
    createInitialFormState(initialSelectedDate),
  );
  const [statsRange, setStatsRange] = useState<StatsRange>("current-month");
  const [trendRange, setTrendRange] = useState<TrendRange>("last-month");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  const editingRecord = useMemo(
    () => records.find((record) => record.id === editingId) ?? null,
    [editingId, records],
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, records),
    [calendarMonth, records],
  );

  const selectedDateRecords = useMemo(
    () =>
      sortSelectedDateRecords(
        records.filter((record) => record.record_date === selectedDate),
      ),
    [records, selectedDate],
  );

  const availableSlots = useMemo(
    () => getAvailableSlots(form.record_date),
    [form.record_date],
  );

  const profileStats = useMemo(
    () => calculateCategoryStats(records, statsRange),
    [records, statsRange],
  );

  const trendSummary = useMemo(
    () => calculateTrendSummary(records, trendRange),
    [records, trendRange],
  );

  const pieGradient = useMemo(
    () => getPieGradient(profileStats.categoryStats),
    [profileStats.categoryStats],
  );

  const refreshRecords = () => {
    setRecords(getRecords());
  };

  const resetForm = (dateString = selectedDate) => {
    setForm(createInitialFormState(dateString));
    setEditingId(null);
    setErrors({});
  };

  const selectCalendarDate = (dateString: string) => {
    setSelectedDate(dateString);
    setCalendarMonth(parseDateString(dateString));
    resetForm(dateString);
  };

  const toggleSlot = (slot: WeekendSlot) => {
    setForm((current) => {
      const isSelected = current.weekend_slots.includes(slot);
      return {
        ...current,
        weekend_slots: isSelected
          ? current.weekend_slots.filter((currentSlot) => currentSlot !== slot)
          : [...current.weekend_slots, slot],
      };
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (editingId) {
      updateRecord(editingId, form);
    } else {
      createRecords(form);
    }

    refreshRecords();
    setSelectedDate(form.record_date);
    setCalendarMonth(parseDateString(form.record_date));
    resetForm(form.record_date);
  };

  const handleEdit = (record: WeekendRecord) => {
    setEditingId(record.id);
    setSelectedDate(record.record_date);
    setCalendarMonth(parseDateString(record.record_date));
    setForm({
      title: record.title,
      record_date: record.record_date,
      weekend_slots: [record.weekend_slot],
      category: record.category,
    });
    setErrors({});
  };

  const handleDelete = (id: string) => {
    deleteRecord(id);
    refreshRecords();
    if (editingId === id) {
      resetForm();
    }
  };

  const titleLabel = editingRecord ? "编辑记录" : "新增记录";
  const submitLabel = editingRecord ? "保存修改" : "新增记录";

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="page-header">
          <div>
            <p className="eyebrow">Weekend Tracker</p>
            <h1>周末时间回顾</h1>
          </div>
          <p className="record-count">{records.length} 条记录</p>
        </header>

        <div className="planning-grid">
          <section className="calendar-panel" aria-labelledby="calendar-title">
            <div className="calendar-heading">
              <button
                type="button"
                className="icon-button"
                aria-label="上个月"
                onClick={() =>
                  setCalendarMonth((current) => addMonths(current, -1))
                }
              >
                ‹
              </button>
              <h2 id="calendar-title">{formatMonthTitle(calendarMonth)}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="下个月"
                onClick={() =>
                  setCalendarMonth((current) => addMonths(current, 1))
                }
              >
                ›
              </button>
            </div>

            <div className="calendar-grid" aria-label="周末日历">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="weekday-label">
                  {label}
                </div>
              ))}
              {calendarDays.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  className={[
                    "calendar-day",
                    day.isCurrentMonth ? "" : "outside-month",
                    day.isWeekend ? "weekend" : "",
                    day.isRecordableWeekend ? "recordable" : "",
                    day.isToday ? "today" : "",
                    day.dateString === selectedDate ? "selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (day.isRecordableWeekend) {
                      selectCalendarDate(day.dateString);
                    }
                  }}
                  disabled={!day.isRecordableWeekend}
                  aria-pressed={day.dateString === selectedDate}
                >
                  <span className="day-number">{day.dayNumber}</span>
                  <span className="calendar-records">
                    {day.records.slice(0, 3).map((record) => (
                      <span
                        key={record.id}
                        className="calendar-record-pill"
                        style={{
                          borderColor: CATEGORY_COLORS[record.category],
                        }}
                      >
                        {getShortSlotLabel(record.weekend_slot)} · {record.title}
                      </span>
                    ))}
                    {day.records.length > 3 ? (
                      <span className="calendar-more">
                        +{day.records.length - 3}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="form-panel" aria-labelledby="record-form-title">
            <div className="form-title-row">
              <div>
                <h2 id="record-form-title">{titleLabel}</h2>
                <p>{form.record_date}</p>
              </div>
              {editingRecord ? (
                <button type="button" className="text-button" onClick={() => resetForm()}>
                  取消编辑
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="field-group">
                <label htmlFor="record-title">事件名称</label>
                <input
                  id="record-title"
                  value={form.title}
                  maxLength={40}
                  placeholder="例如：晨跑、看电影、家庭晚餐"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  aria-invalid={Boolean(errors.title)}
                />
                {errors.title ? (
                  <span className="field-error">{errors.title}</span>
                ) : null}
              </div>

              <div className="field-group">
                <span className="field-label">时间块</span>
                <div className="slot-options" aria-label="时间块">
                  {availableSlots.map((slot) => (
                    <label key={slot} className="slot-option">
                      <input
                        type="checkbox"
                        checked={form.weekend_slots.includes(slot)}
                        onChange={() => toggleSlot(slot)}
                      />
                      <span>{getShortSlotLabel(slot)}</span>
                    </label>
                  ))}
                </div>
                {errors.weekend_slots ? (
                  <span className="field-error">{errors.weekend_slots}</span>
                ) : null}
              </div>

              <div className="field-group">
                <label htmlFor="record-category">分类</label>
                <select
                  id="record-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value as Category,
                    }))
                  }
                  aria-invalid={Boolean(errors.category)}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category ? (
                  <span className="field-error">{errors.category}</span>
                ) : null}
              </div>

              <div className="form-actions">
                <button type="submit">{submitLabel}</button>
              </div>
            </form>

            <div className="selected-records">
              <h3>当天记录</h3>
              {selectedDateRecords.length === 0 ? (
                <p>这个周末日期还没有记录。</p>
              ) : (
                <ul>
                  {selectedDateRecords.map((record) => (
                    <li key={record.id}>
                      <div>
                        <strong>{record.title}</strong>
                        <span>
                          {record.weekend_slot} · {record.category}
                        </span>
                      </div>
                      <div className="record-actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => handleEdit(record)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className="text-button danger"
                          onClick={() => handleDelete(record.id)}
                        >
                          删除
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="insight-grid">
          <div className="insight-main">
            <section className="profile-panel" aria-labelledby="profile-title">
              <div className="panel-header">
                <div>
                  <h2 id="profile-title">周末时间画像</h2>
                  <p>
                    {profileStats.totalRecords} 条记录 ·{" "}
                    {formatWeight(profileStats.totalTimeBlockWeight)} 个时间块权重
                  </p>
                </div>
                <div className="range-tabs" aria-label="统计范围">
                  {STATS_RANGES.map((range) => (
                    <button
                      key={range.value}
                      type="button"
                      className={range.value === statsRange ? "active" : ""}
                      onClick={() => setStatsRange(range.value)}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {profileStats.categoryStats.length === 0 ? (
                <div className="profile-empty">
                  <h3>当前范围还没有数据</h3>
                  <p>新增记录或切换统计范围后，这里会展示分类占比。</p>
                </div>
              ) : (
                <div className="profile-content">
                  <div
                    className="pie-chart"
                    role="img"
                    aria-label="分类时间块占比饼状图"
                    style={{ "--pie-gradient": pieGradient } as CSSProperties}
                  >
                    <div className="pie-chart-center">
                      <strong>
                        {formatWeight(profileStats.totalTimeBlockWeight)}
                      </strong>
                      <span>时间块</span>
                    </div>
                  </div>

                  <ul className="profile-legend" aria-label="分类占比明细">
                    {profileStats.categoryStats.map((stat) => (
                      <li key={stat.category}>
                        <span
                          className="legend-swatch"
                          style={{
                            backgroundColor: CATEGORY_COLORS[stat.category],
                          }}
                        />
                        <span className="legend-name">{stat.category}</span>
                        <span className="legend-percent">
                          {formatPercentage(stat.percentage)}
                        </span>
                        <span className="legend-weight">
                          {formatWeight(stat.weight)} 块
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="list-panel" aria-labelledby="record-list-title">
              <div className="section-heading">
                <h2 id="record-list-title">记录列表</h2>
                <span>按日期和时间块倒序</span>
              </div>

              {records.length === 0 ? (
                <div className="empty-state">
                  <h3>还没有周末记录</h3>
                  <p>添加第一条记录后，它会显示在这里。</p>
                </div>
              ) : (
                <ul className="record-list">
                  {records.map((record) => (
                    <li key={record.id} className="record-item">
                      <div className="record-main">
                        <h3>{record.title}</h3>
                        <p>
                          {record.record_date} · {record.weekend_slot}
                        </p>
                      </div>
                      <div className="record-meta">
                        <span>{record.category}</span>
                        <div className="record-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => handleEdit(record)}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className="text-button danger"
                            onClick={() => handleDelete(record.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="trend-panel" aria-labelledby="trend-title">
            <div className="panel-header stacked">
              <div>
                <h2 id="trend-title">趋势总结</h2>
                <p>
                  {trendSummary.currentStartDate} 至{" "}
                  {trendSummary.currentEndDate}
                </p>
              </div>
              <div className="range-tabs compact" aria-label="趋势范围">
                {TREND_RANGES.map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    className={range.value === trendRange ? "active" : ""}
                    onClick={() => setTrendRange(range.value)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={
                trendSummary.hasEnoughRecords
                  ? "trend-summary"
                  : "trend-summary muted"
              }
            >
              {trendSummary.sentences.map((sentence) => (
                <p key={sentence}>{sentence}</p>
              ))}
            </div>

            <div className="trend-footnote">
              <span>
                当前 {formatWeight(trendSummary.currentStats.totalTimeBlockWeight)}{" "}
                块
              </span>
              <span>
                上一周期{" "}
                {formatWeight(trendSummary.previousStats.totalTimeBlockWeight)} 块
              </span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
