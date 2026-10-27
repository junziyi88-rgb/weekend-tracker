import {
  type CSSProperties,
  FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
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
type StickerBurst = {
  id: number;
  x: number;
  y: number;
};

const CATEGORY_COLORS: Record<Category, string> = {
  休息: "#8ecbff",
  社交: "#ff9ab6",
  运动: "#8fdbb2",
  学习: "#c2a6ff",
  娱乐: "#ff6f9f",
  家务: "#86dce0",
  出行: "#ffd56a",
  工作: "#aeb9cf",
  陪伴家人: "#ff8a8a",
};

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const HELLO_KITTY_ASSET = `${import.meta.env.BASE_URL}assets/hello-kitty.svg`;
const HELLO_KITTY_BOW_ASSET = `${import.meta.env.BASE_URL}assets/hello-kitty-bow.png`;
const BOW_ASSET = `${import.meta.env.BASE_URL}assets/bow-icon.png`;
const USER_BOW_ASSET = `${import.meta.env.BASE_URL}assets/user-bow.png`;
const USER_KITTY_HEART_ASSET = `${import.meta.env.BASE_URL}assets/user-kitty-heart.jpg`;
const USER_BUNNY_ASSET = `${import.meta.env.BASE_URL}assets/user-bunny.jpg`;
const USER_KITTY_BIG_BOW_ASSET = `${import.meta.env.BASE_URL}assets/user-kitty-big-bow.jpg`;
const USER_KITTY_BEAR_ASSET = `${import.meta.env.BASE_URL}assets/user-kitty-bear.jpg`;
const OCEAN_JELLYFISH_1 = `${import.meta.env.BASE_URL}assets/jellyfish1.png`;
const OCEAN_JELLYFISH_2 = `${import.meta.env.BASE_URL}assets/jellyfish2.png`;
const OCEAN_BUBBLE = `${import.meta.env.BASE_URL}assets/bubble.png`;
const OCEAN_STARFISH = `${import.meta.env.BASE_URL}assets/starfish.png`;
const OCEAN_SEAHORSE = `${import.meta.env.BASE_URL}assets/seahorse.png`;
const OCEAN_BOTTLE = `${import.meta.env.BASE_URL}assets/bottle.png`;
const OCEAN_PEARL = `${import.meta.env.BASE_URL}assets/pearl.png`;
const OCEAN_MERMAID = `${import.meta.env.BASE_URL}assets/mermaid.png`;
const OCEAN_FISH_1 = `${import.meta.env.BASE_URL}assets/fish1.png`;
const OCEAN_FISH_2 = `${import.meta.env.BASE_URL}assets/fish2.png`;
const OCEAN_FISH_3 = `${import.meta.env.BASE_URL}assets/fish3.png`;
const FLOATING_SOUNDS = [
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-meow-1.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-meow-2.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-meow-3.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-meow-4.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-meow-6.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-meow-8.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-meow-9.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-meow-10.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-sleeping.mp3`,
  },
  {
    kind: "xiaohei",
    src: `${import.meta.env.BASE_URL}sounds/xiaohei-fluffed.mp3`,
  },
  {
    kind: "bidiu",
    src: `${import.meta.env.BASE_URL}sounds/bidiu-1.mp3`,
  },
  {
    kind: "bidiu",
    src: `${import.meta.env.BASE_URL}sounds/bidiu-5.mp3`,
  },
] as const;
const CLICK_SOUNDS = [
  `${import.meta.env.BASE_URL}sounds/click-cool-interface-tone.mp3`,
  `${import.meta.env.BASE_URL}sounds/click-modern-technology-select.mp3`,
];

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

const getInitialSelectedDate = (records: WeekendRecord[]) => {
  const latestRecord = records.find(
    (record) =>
      datePattern.test(record.record_date) && isWeekendDate(record.record_date),
  );

  return latestRecord?.record_date ?? getDefaultSelectedDate();
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

type PieSlice = {
  category: Category;
  color: string;
  percentage: number;
  path: string;
  labelX: number;
  labelY: number;
  isTiny: boolean;
};

const PIE_CENTER = 50;
const PIE_RADIUS = 46;

const getPiePoint = (angle: number, radius: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: PIE_CENTER + radius * Math.cos(radians),
    y: PIE_CENTER + radius * Math.sin(radians),
  };
};

const describePieSlice = (startAngle: number, endAngle: number) => {
  if (endAngle - startAngle >= 359.99) {
    return [
      `M ${PIE_CENTER} ${PIE_CENTER}`,
      `L ${PIE_CENTER} ${PIE_CENTER - PIE_RADIUS}`,
      `A ${PIE_RADIUS} ${PIE_RADIUS} 0 1 1 ${PIE_CENTER} ${PIE_CENTER + PIE_RADIUS}`,
      `A ${PIE_RADIUS} ${PIE_RADIUS} 0 1 1 ${PIE_CENTER} ${PIE_CENTER - PIE_RADIUS}`,
      "Z",
    ].join(" ");
  }

  const start = getPiePoint(startAngle, PIE_RADIUS);
  const end = getPiePoint(endAngle, PIE_RADIUS);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${PIE_CENTER} ${PIE_CENTER}`,
    `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${PIE_RADIUS} ${PIE_RADIUS} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
    "Z",
  ].join(" ");
};

const getPieSlices = (
  categoryStats: ReturnType<typeof calculateCategoryStats>["categoryStats"],
): PieSlice[] => {
  let cursorAngle = 0;

  return categoryStats
    .map((stat) => {
      const startAngle = cursorAngle;
      const endAngle = cursorAngle + stat.percentage * 3.6;
      const midAngle = startAngle + (endAngle - startAngle) / 2;
      const isTiny = stat.percentage < 8;
      const labelPoint = getPiePoint(midAngle, isTiny ? 36 : 28);
      cursorAngle = endAngle;

      return {
        category: stat.category,
        color: CATEGORY_COLORS[stat.category],
        percentage: stat.percentage,
        path: describePieSlice(startAngle, endAngle),
        labelX: labelPoint.x,
        labelY: labelPoint.y,
        isTiny,
      };
    });
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
  const monthEnd = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  );
  const trailingOffset = (7 - ((monthEnd.getDay() + 6) % 7) - 1) % 7;
  const gridStart = addDays(monthStart, -mondayOffset);
  const gridDays = mondayOffset + monthEnd.getDate() + trailingOffset;
  const todayString = toLocalDateString(new Date());
  const recordableEnd = toLocalDateString(getCurrentWeekendEnd());

  return Array.from({ length: gridDays }, (_, index) => {
    const date = addDays(gridStart, index);
    const dateString = toLocalDateString(date);
    const day = date.getDay();
    const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
    const dateRecords = records
      .filter((record) => isCurrentMonth && record.record_date === dateString)
      .sort((a, b) => {
        const slotCompare =
          WEEKEND_SLOT_ORDER[a.weekend_slot] -
          WEEKEND_SLOT_ORDER[b.weekend_slot];
        if (slotCompare !== 0) {
          return slotCompare;
        }

        return a.created_at.localeCompare(b.created_at);
      });

    return {
      key: dateString,
      date,
      dateString,
      dayNumber: date.getDate(),
      isCurrentMonth,
      isToday: dateString === todayString,
      isWeekend: day === 0 || day === 6,
      isRecordableWeekend:
        isCurrentMonth && (day === 0 || day === 6) && dateString <= recordableEnd,
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
  const meowAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const nextClickSoundRef = useRef(0);
  const initialRecords = useMemo(() => getRecords(), []);
  const initialSelectedDate = useMemo(
    () => getInitialSelectedDate(initialRecords),
    [initialRecords],
  );
  const [records, setRecords] = useState<WeekendRecord[]>(initialRecords);
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
  const [hasEntered, setHasEntered] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [activeStickerKey, setActiveStickerKey] = useState<string | null>(null);
  const [stickerBurst, setStickerBurst] = useState<StickerBurst | null>(null);
  const [saveBurstKey, setSaveBurstKey] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "default");
  const themeAssets = {
    main: theme === "ocean" ? OCEAN_MERMAID : HELLO_KITTY_ASSET,
    sticker: theme === "ocean" ? OCEAN_PEARL : HELLO_KITTY_BOW_ASSET,
    icon: theme === "ocean" ? OCEAN_STARFISH : BOW_ASSET,
    userIcon: theme === "ocean" ? OCEAN_SEAHORSE : USER_BOW_ASSET,
    heart: theme === "ocean" ? OCEAN_FISH_1 : USER_KITTY_HEART_ASSET,
    bunny: theme === "ocean" ? OCEAN_BOTTLE : USER_BUNNY_ASSET,
    bigBow: theme === "ocean" ? OCEAN_PEARL : USER_KITTY_BIG_BOW_ASSET,
    bear: theme === "ocean" ? OCEAN_STARFISH : USER_KITTY_BEAR_ASSET,
    burstText: theme === "ocean" ? "" : "喵",
  };

  const [pullDistance, setPullDistance] = useState(0);
  const [showJumpBg, setShowJumpBg] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const bgm1Ref = useRef<HTMLAudioElement | null>(null);
  const bgm2Ref = useRef<HTMLAudioElement | null>(null);
  const splashAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "ocean" && showJumpBg) {
      document.documentElement.classList.add("show-jump-bg");
    } else {
      document.documentElement.classList.remove("show-jump-bg");
    }
    localStorage.setItem("app-theme", theme);
  }, [theme, showJumpBg]);

  useEffect(() => {
    if (theme !== "ocean") {
      bgm1Ref.current?.pause();
      bgm2Ref.current?.pause();
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      const y = e.touches[0].clientY;
      const diff = y - touchStartY.current;
      if (diff > 0 && window.scrollY <= 0) {
        setPullDistance(diff);
      }
    };

    const handleTouchEnd = () => {
      setPullDistance((prev) => {
        if (prev > 100) {
          setShowJumpBg(prevBg => {
            const nextBg = !prevBg;
            if (splashAudioRef.current) {
              splashAudioRef.current.currentTime = 0;
              splashAudioRef.current.play().catch(e => console.log(e));
            }
            if (nextBg) {
              bgm2Ref.current?.pause();
              bgm1Ref.current?.play().catch(e => console.log(e));
            } else {
              bgm1Ref.current?.pause();
              bgm2Ref.current?.play().catch(e => console.log(e));
            }
            return nextBg;
          });
        }
        return 0;
      });
      touchStartY.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    // Initial BGM play if needed, usually requires user interaction first
    // so we rely on the user clicking the theme switcher or swiping

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [theme]);

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
    () => calculateCategoryStats(records, statsRange, calendarMonth),
    [records, statsRange, calendarMonth],
  );

  const trendSummary = useMemo(
    () => calculateTrendSummary(records, trendRange, calendarMonth),
    [records, trendRange, calendarMonth],
  );

  const pieSlices = useMemo(
    () => getPieSlices(profileStats.categoryStats),
    [profileStats.categoryStats],
  );

  const playAudio = (
    audioRef: typeof meowAudioRef,
    soundSource: string,
    volume = 0.78,
  ) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.pause();
    audio.src = soundSource;
    audio.currentTime = 0;
    audio.volume = volume;
    const playResult = audio.play();
    if (playResult) {
      void playResult.catch(() => undefined);
    }
  };

  const playClick = () => {
    const soundSource = CLICK_SOUNDS[nextClickSoundRef.current];
    nextClickSoundRef.current =
      (nextClickSoundRef.current + 1) % CLICK_SOUNDS.length;
    playAudio(clickAudioRef, soundSource, 0.54);
  };

  const playFloatingSound = () => {
    if (theme === "ocean") {
      return null;
    }
    const sound =
      FLOATING_SOUNDS[Math.floor(Math.random() * FLOATING_SOUNDS.length)];
    playAudio(meowAudioRef, sound.src, sound.kind === "xiaohei" ? 0.84 : 0.62);
    return sound.kind;
  };

  const refreshRecords = () => {
    setRecords(getRecords());
  };

  const resetForm = (dateString = selectedDate) => {
    setForm(createInitialFormState(dateString));
    setEditingId(null);
    setErrors({});
  };

  const selectCalendarDate = (dateString: string) => {
    playClick();
    setSelectedDate(dateString);
    setCalendarMonth(parseDateString(dateString));
    resetForm(dateString);
  };

  const toggleSlot = (slot: WeekendSlot) => {
    playClick();
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

    playClick();
    setSaveBurstKey(Date.now());
    refreshRecords();
    setSelectedDate(form.record_date);
    setCalendarMonth(parseDateString(form.record_date));
    resetForm(form.record_date);
  };

  const handleEdit = (record: WeekendRecord) => {
    playClick();
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
    playClick();
    deleteRecord(id);
    refreshRecords();
    if (editingId === id) {
      resetForm();
    }
  };

  const enterApp = () => {
    playClick();
    setIsEntering(true);
    window.setTimeout(() => setHasEntered(true), 620);
  };

  const handleStickerTap = (
    stickerKey: string,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const soundKind = playFloatingSound();

    setActiveStickerKey(stickerKey);
    if (soundKind === "xiaohei") {
      setStickerBurst({
        id: Date.now(),
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
    } else {
      setStickerBurst(null);
    }
    window.setTimeout(() => {
      setActiveStickerKey((currentKey) =>
        currentKey === stickerKey ? null : currentKey,
      );
    }, 520);
  };

  const handleStickerKeyDown = (
    stickerKey: string,
    event: KeyboardEvent<HTMLElement>,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleStickerTap(stickerKey, event);
  };

  const stickerClassName = (baseClassName: string, stickerKey: string) =>
    `${baseClassName}${activeStickerKey === stickerKey ? " is-popping" : ""}`;

  const shiftCalendarMonth = (months: number) => {
    playClick();
    setCalendarMonth((current) => addMonths(current, months));
  };

  const selectStatsRange = (range: StatsRange) => {
    playClick();
    setStatsRange(range);
  };

  const selectTrendRange = (range: TrendRange) => {
    playClick();
    setTrendRange(range);
  };

  const titleLabel = editingRecord ? "编辑记录" : "新增记录";
  const submitLabel = editingRecord ? "保存修改" : "新增记录";
  const summaryHeader = (
    <>
      <div className="kitty-card" aria-hidden="true">
        <img src={themeAssets.main} alt="" />
      </div>
      <div className="header-text">
        <p className="eyebrow">Weekend sticker diary</p>
        <h1>周末时间回顾</h1>
        <p className="header-copy">
          把休息、陪伴和小小计划收进粉白贴纸簿。
        </p>
      </div>
      <p className="record-count">
        {records.length}
        <span>条记录</span>
      </p>
    </>
  );
  const profilePanel = (
    <section className="profile-panel" aria-labelledby="profile-title">
      <div className="panel-stickers profile-stickers">
        <img
          className={stickerClassName(
            "sticker sticker-photo profile-sticker-photo",
            "profile-photo",
          )}
          src={themeAssets.bunny}
          alt="点击听猫叫"
          role="button"
          tabIndex={0}
          onClick={(event) => handleStickerTap("profile-photo", event)}
          onKeyDown={(event) => handleStickerKeyDown("profile-photo", event)}
        />
        <span
          className={stickerClassName(
            "sticker-star profile-sticker-star",
            "profile-star",
          )}
          role="button"
          tabIndex={0}
          aria-label="点击星星听猫叫"
          onClick={(event) => handleStickerTap("profile-star", event)}
          onKeyDown={(event) => handleStickerKeyDown("profile-star", event)}
        />
      </div>
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
              onClick={() => selectStatsRange(range.value)}
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
            className="pie-chart-wrap"
            role="img"
            aria-label="分类时间块占比饼状图"
          >
            <svg className="pie-chart" viewBox="0 0 100 100" aria-hidden="true">
              {pieSlices.map((slice) => (
                <path
                  key={slice.category}
                  className="pie-slice"
                  d={slice.path}
                  fill={slice.color}
                />
              ))}
              {pieSlices.map((slice) => (
                <text
                  key={`${slice.category}-label`}
                  className={slice.isTiny ? "pie-label tiny" : "pie-label"}
                  x={slice.labelX}
                  y={slice.labelY}
                  textAnchor="middle"
                >
                  <tspan x={slice.labelX} dy="-0.15em">
                    {slice.category}
                  </tspan>
                  <tspan x={slice.labelX} dy="1.15em">
                    {formatPercentage(slice.percentage)}
                  </tspan>
                </text>
              ))}
            </svg>
          </div>
          <div className="pie-caption">
            <strong>{formatWeight(profileStats.totalTimeBlockWeight)}</strong>
            <span>时间块</span>
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
  );
  const trendPanel = (
    <section className="trend-panel" aria-labelledby="trend-title">
      <div className="panel-stickers trend-stickers">
        <img
          className={stickerClassName(
            "sticker sticker-bow trend-sticker-bow",
            "trend-bow",
          )}
          src={themeAssets.sticker}
          alt="点击听猫叫"
          role="button"
          tabIndex={0}
          onClick={(event) => handleStickerTap("trend-bow", event)}
          onKeyDown={(event) => handleStickerKeyDown("trend-bow", event)}
        />
        <span
          className={stickerClassName(
            "sticker-heart trend-sticker-heart",
            "trend-heart",
          )}
          role="button"
          tabIndex={0}
          aria-label="点击爱心听猫叫"
          onClick={(event) => handleStickerTap("trend-heart", event)}
          onKeyDown={(event) => handleStickerKeyDown("trend-heart", event)}
        />
      </div>
      <div className="panel-header stacked">
        <div>
          <h2 id="trend-title">趋势总结</h2>
          <p>
            {trendSummary.currentStartDate} 至 {trendSummary.currentEndDate}
          </p>
        </div>
        <div className="range-tabs compact" aria-label="趋势范围">
          {TREND_RANGES.map((range) => (
            <button
              key={range.value}
              type="button"
              className={range.value === trendRange ? "active" : ""}
              onClick={() => selectTrendRange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={
          trendSummary.hasEnoughRecords ? "trend-summary" : "trend-summary muted"
        }
      >
        {trendSummary.sentences.map((sentence) => (
          <p key={sentence}>{sentence}</p>
        ))}
      </div>

      <div className="trend-footnote">
        <span>
          当前 {formatWeight(trendSummary.currentStats.totalTimeBlockWeight)} 块
        </span>
        <span>
          上一周期 {formatWeight(trendSummary.previousStats.totalTimeBlockWeight)}{" "}
          块
        </span>
      </div>
    </section>
  );

  if (!hasEntered) {
    return (
      <main
        className={`app-shell welcome-shell ${isEntering ? "is-leaving" : ""}`}
        style={
          {
            "--kitty-asset": `url(${themeAssets.main})`,
          } as CSSProperties
        }
      >
        <section className="welcome-page" aria-labelledby="welcome-title">
          <div className="page-header welcome-summary-card">
            {summaryHeader}
          </div>
          <h1 id="welcome-title">
            李紫怡的朋友你好
            <span>欢迎你！</span>
          </h1>
          <button
            type="button"
            className="welcome-enter-button"
            onClick={enterApp}
            disabled={isEntering}
          >
            我来啦！
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      className="app-shell main-shell"
      style={
        {
          "--kitty-asset": `url(${themeAssets.main})`,
        } as CSSProperties
      }
    >
      <button
        className="theme-switcher-btn"
        onClick={() => setTheme((prev) => (prev === "ocean" ? "default" : "ocean"))}
        aria-label="Toggle theme"
      >
        <span className="theme-switcher-icon">{theme === "ocean" ? "🌸" : "🌊"}</span>
      </button>
      {theme === "ocean" && (
        <div className="ocean-environment" aria-hidden="true">
          <audio ref={bgm1Ref} loop src={`${import.meta.env.BASE_URL}sounds/bgm-1.mp3`} />
          <audio ref={bgm2Ref} loop src={`${import.meta.env.BASE_URL}sounds/bgm-2.mp3`} />
          <audio ref={splashAudioRef} src={`${import.meta.env.BASE_URL}sounds/splash.mp3`} />
          
          <div className={`pull-to-refresh-hint ${pullDistance > 100 ? "visible" : ""}`}>
            🌊 松手跳出海面！
          </div>

          <img src={OCEAN_MERMAID} alt="美人鱼" className="mermaid-bottom-right" />
          
          {/* 上浮的水母和泡泡 */}
          <img src={OCEAN_JELLYFISH_1} alt="" className="anim-float" style={{ left: '10%', animationDuration: '15s', animationDelay: '0s' }} width="80" />
          <img src={OCEAN_JELLYFISH_2} alt="" className="anim-float" style={{ left: '80%', animationDuration: '18s', animationDelay: '2s' }} width="60" />
          <img src={OCEAN_BUBBLE} alt="" className="anim-float" style={{ left: '30%', animationDuration: '10s', animationDelay: '1s' }} width="40" />
          <img src={OCEAN_BUBBLE} alt="" className="anim-float" style={{ left: '60%', animationDuration: '12s', animationDelay: '4s' }} width="30" />
          <img src={OCEAN_BUBBLE} alt="" className="anim-float" style={{ left: '45%', animationDuration: '9s', animationDelay: '7s' }} width="50" />
          
          {/* 左右游动的鱼 */}
          <img src={OCEAN_FISH_2} alt="" className="anim-swim-right" style={{ top: '30%', animationDuration: '20s' }} width="100" />
          <img src={OCEAN_FISH_3} alt="" className="anim-swim-left" style={{ top: '60%', animationDuration: '25s', animationDelay: '5s' }} width="80" />
          <img src={OCEAN_FISH_2} alt="" className="anim-swim-left" style={{ top: '80%', animationDuration: '22s', animationDelay: '12s' }} width="70" />
        </div>
      )}

      {stickerBurst ? (
        <div
          key={stickerBurst.id}
          className="sticker-burst"
          style={
            {
              "--burst-x": `${stickerBurst.x}px`,
              "--burst-y": `${stickerBurst.y}px`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <span>{themeAssets.burstText}</span>
          <i />
          <i />
          <i />
        </div>
      ) : null}
      {saveBurstKey > 0 ? (
        <div key={saveBurstKey} className="save-sparkle" aria-live="polite">
          保存好啦
        </div>
      ) : null}
      <section className="workspace">
        <header className="page-header main-summary-card">
          {summaryHeader}
        </header>

        <div className="planning-grid">
          <div className="calendar-stack">
            <section className="calendar-panel" aria-labelledby="calendar-title">
              <div className="panel-stickers calendar-stickers">
                <img
                  className={stickerClassName(
                    "sticker sticker-bow calendar-sticker-bow",
                    "calendar-bow",
                  )}
                  src={themeAssets.sticker}
                  alt="点击听猫叫"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => handleStickerTap("calendar-bow", event)}
                  onKeyDown={(event) =>
                    handleStickerKeyDown("calendar-bow", event)
                  }
                />
                <span
                  className={stickerClassName(
                    "sticker-heart calendar-sticker-heart",
                    "calendar-heart",
                  )}
                  role="button"
                  tabIndex={0}
                  aria-label="点击爱心听猫叫"
                  onClick={(event) => handleStickerTap("calendar-heart", event)}
                  onKeyDown={(event) =>
                    handleStickerKeyDown("calendar-heart", event)
                  }
                />
              </div>
              <div className="calendar-heading">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="上个月"
                  onClick={() => shiftCalendarMonth(-1)}
                >
                  ‹
                </button>
                <h2 id="calendar-title">{formatMonthTitle(calendarMonth)}</h2>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="下个月"
                  onClick={() => shiftCalendarMonth(1)}
                >
                  ›
                </button>
              </div>

              <div className="calendar-grid" aria-label="周末日历">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className={`weekday-label ${
                      label === "六" || label === "日" ? "weekend-label" : ""
                    }`}
                  >
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
                      day.records.length > 0 ? "has-records" : "",
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
                    {day.isCurrentMonth ? (
                      <>
                        <span className="day-number">{day.dayNumber}</span>
                        <span className="calendar-records">
                          {day.records.slice(0, 3).map((record) => (
                            <span
                              key={record.id}
                              className="calendar-record-pill"
                              style={{
                                "--record-color": CATEGORY_COLORS[record.category],
                                borderColor: CATEGORY_COLORS[record.category],
                                backgroundColor: `${CATEGORY_COLORS[record.category]}26`,
                              } as CSSProperties}
                              title={`${record.weekend_slot} · ${record.category} · ${record.title}`}
                            >
                              <span className="calendar-record-dot" />
                              <span className="calendar-record-text">
                                {getShortSlotLabel(record.weekend_slot)} · {record.title}
                              </span>
                            </span>
                          ))}
                          {day.records.length > 3 ? (
                            <span className="calendar-more">
                              +{day.records.length - 3}
                            </span>
                          ) : null}
                        </span>
                      </>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>

          </div>

          <section className="form-panel" aria-labelledby="record-form-title">
            <div className="panel-stickers form-stickers">
              <img
                className={stickerClassName(
                  "sticker sticker-photo form-sticker-top-photo",
                  "form-top-photo",
                )}
                src={themeAssets.heart}
                alt="点击听猫叫"
                role="button"
                tabIndex={0}
                onClick={(event) => handleStickerTap("form-top-photo", event)}
                onKeyDown={(event) =>
                  handleStickerKeyDown("form-top-photo", event)
                }
              />
              <img
                className={stickerClassName(
                  "sticker sticker-photo form-sticker-photo",
                  "form-photo",
                )}
                src={themeAssets.bigBow}
                alt="点击听猫叫"
                role="button"
                tabIndex={0}
                onClick={(event) => handleStickerTap("form-photo", event)}
                onKeyDown={(event) => handleStickerKeyDown("form-photo", event)}
              />
              <img
                className={stickerClassName(
                  "sticker sticker-bow form-sticker-bow",
                  "form-bow",
                )}
                src={themeAssets.icon}
                alt="点击听猫叫"
                role="button"
                tabIndex={0}
                onClick={(event) => handleStickerTap("form-bow", event)}
                onKeyDown={(event) => handleStickerKeyDown("form-bow", event)}
              />
            </div>
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

              <div className="slot-category-row">
                <div className="field-group slot-group">
                  <span className="field-label">时间块</span>
                  <div className="slot-options" aria-label="时间块">
                    {availableSlots.map((slot) => (
                      <label
                        key={slot}
                        className={`slot-option ${
                          form.weekend_slots.includes(slot) ? "selected" : ""
                        }`}
                      >
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

                <div className="field-group category-group">
                  <label htmlFor="record-category">分类</label>
                  <div className="cute-select-wrap">
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
                    <span className="cute-select-arrow" aria-hidden="true">♡</span>
                  </div>
                  {errors.category ? (
                    <span className="field-error">{errors.category}</span>
                  ) : null}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit">{submitLabel}</button>
              </div>
            </form>

            <div className="selected-records">
              <h3>当天记录</h3>
              {selectedDateRecords.length === 0 ? (
                <p>这一天还空着，等一张新贴纸。</p>
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

        <div className="summary-grid">
          {profilePanel}
          {trendPanel}
        </div>

        <div className="insight-grid">
          <div className="insight-main">
            <section className="list-panel" aria-labelledby="record-list-title">
              <div className="panel-stickers list-stickers">
                <img
                  className={stickerClassName(
                    "sticker sticker-bow list-sticker-bow",
                    "list-bow",
                  )}
                  src={themeAssets.userIcon}
                  alt="点击听猫叫"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => handleStickerTap("list-bow", event)}
                  onKeyDown={(event) => handleStickerKeyDown("list-bow", event)}
                />
              </div>
              <div className="section-heading">
                <h2 id="record-list-title">记录列表</h2>
                <span>按日期和时间块倒序</span>
              </div>

              {records.length === 0 ? (
                <div className="empty-state">
                  <h3>贴纸簿还空着</h3>
                  <p>添加第一条周末记录后，它会显示在这里。</p>
                </div>
              ) : (
                <ul className="record-list">
                  {records.map((record, index) => (
                    <li key={record.id} className="record-item">
                      {index === 0 ? (
                        <img
                          className={stickerClassName(
                            "sticker sticker-photo list-sticker-photo",
                            "list-photo",
                          )}
                          src={themeAssets.bear}
                          alt="点击听猫叫"
                          role="button"
                          tabIndex={0}
                          onClick={(event) =>
                            handleStickerTap("list-photo", event)
                          }
                          onKeyDown={(event) =>
                            handleStickerKeyDown("list-photo", event)
                          }
                        />
                      ) : null}
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

        </div>
      </section>
    </main>
  );
}

export default App;
