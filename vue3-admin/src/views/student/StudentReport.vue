<script setup lang="ts">
/**
 * 学生成长报告 — 抽屉组件，严格对齐 PC 原型 student-report.html
 * 横幅 + 成长树 + 荣誉证书 + "锋"范少年 + 学期成绩 四张卡片。
 * 原型为演示页（mock 数据），本组件沿用原型的确定性 mock 生成（按姓名+学期播种），
 * 横幅使用真实学生姓名与班级全名（一年级1班）。树图/奖章用内联 emoji 替代原型 webp 资源避免破图。
 */
import { computed, ref, watch, nextTick } from 'vue'
import type { StudentListItem } from '@/api/pcStudent'
import TermSelect from '@/components/TermSelect/index.vue'

// 成长树 4 阶段静态图（严格沿用原型 mobile/shared/assets/tree，禁止自绘）
import treeSprout from '@/assets/tree/stage1-mengya.webp'
import treeBranching from '@/assets/tree/stage2-chouzhi.webp'
import treeFlourishing from '@/assets/tree/stage3-fanmao.webp'
import treeFruiting from '@/assets/tree/stage4-shuoguo.webp'
const TREE_IMG_LIST = [treeSprout, treeBranching, treeFlourishing, treeFruiting]

const props = defineProps<{
  visible: boolean
  student: StudentListItem
  termCode?: string
}>()
const emit = defineEmits<{ 'update:visible': [v: boolean] }>()

const drawerVisible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v),
})

const ACCENT = '#2b85e4'

// ===== 学期选项（mock 播种用，与选择器解耦；选择器选项改由后端数据库提供） =====
const TERM_OPTIONS = [
  '2025-2026学年第二学期',
  '2025-2026学年第一学期',
  '2024-2025学年第二学期',
  '2026-2027学年第一学期',
]
const TERM_SEED_OFFSET: Record<string, number> = {}
TERM_OPTIONS.forEach((t, i) => (TERM_SEED_OFFSET[t] = i * 101))

// term 用于 mock 播种（学期显示名）；选择器选项来自后端数据库，选择后回写 term
const term = ref<string>(props.termCode ?? '')
const selectedTermCode = ref<string>('')
function onTermChange(_code: string | undefined, opt?: { name?: string }) {
  if (opt?.name) term.value = opt.name
}

// ── 文案/配色常量（与原型 report-shared.js 对齐） ──
const TREE_PARTS = [
  { part: '根', label: '品德根基', wy: '德', c: '#faad14' },
  { part: '干', label: '综合素养', wy: '智', c: '#722ed1' },
  { part: '枝叶', label: '评价维度', wy: '体', c: '#52c41a' },
  { part: '花果', label: '成长荣誉', wy: '美', c: '#f48583' },
  { part: '新芽', label: '持续生长', wy: '劳', c: '#2b85e4' },
]
const TL_MONTHS = ['3月', '5月', '7月', '目标']
const TL_ICONS = ['🌱', '🌿', '🌳', '🏆']
const RS_GROWTH_STAGES = [
  {
    code: 'sprout',
    n: '萌芽期',
    en: 'Sprout',
    desc: '播种绿色种子，初步养成好习惯',
    thr: 0,
    max: 10,
    tone: '#9bc46a',
  },
  {
    code: 'branching',
    n: '抽枝期',
    en: 'Branching',
    desc: '扎根成长，逐步发展多元素养',
    thr: 10,
    max: 50,
    tone: '#67ab3f',
  },
  {
    code: 'flourishing',
    n: '繁茂期',
    en: 'Flourishing',
    desc: '素养全面发展，朝气蓬勃',
    thr: 50,
    max: 100,
    tone: '#3f9d2e',
  },
  {
    code: 'fruiting',
    n: '硕果期',
    en: 'Fruiting',
    desc: '长成锋范少年，收获成长成果',
    thr: 100,
    max: null as number | null,
    tone: '#2e7d1f',
  },
]
const FENG_NAMES = ['阳光少年章', '爱心少年章', '智慧少年章', '自律少年章', '责任少年章']
const FENG_COLORS: Record<string, string> = {
  阳光少年章: '#faad14',
  智慧少年章: '#722ed1',
  自律少年章: '#52c41a',
  爱心少年章: '#f48583',
  责任少年章: '#2b85e4',
}
const FENG_EMOJI: Record<string, string> = {
  阳光少年章: '☀️',
  智慧少年章: '💡',
  自律少年章: '⏰',
  爱心少年章: '❤️',
  责任少年章: '🌱',
}

// ── 工具 ──
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
function lighten(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + Math.round(255 * amount))
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + Math.round(255 * amount))
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + Math.round(255 * amount))
  return `rgb(${r},${g},${b})`
}
function stageOf(total: number): number {
  const sorted = [...RS_GROWTH_STAGES].sort((a, b) => a.thr - b.thr)
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (total >= sorted[i].thr) return i
  }
  return 0
}

// ── 确定性 mock（与原型 genReportMock 一致） ──
function genReportMock(seed: number) {
  const r = (n: number) => {
    const x = Math.sin(seed * n + 1) * 10000
    return Math.abs(x - Math.floor(x))
  }
  const academicGrades = ['甲', '乙', '丙', '-']
  const pickG = () => academicGrades[Math.floor(r(Math.random()) * academicGrades.length)]
  const healthGrades = ['优秀', '良好', '及格', '不及格']
  const pickH = () => healthGrades[Math.floor(r(Math.random()) * healthGrades.length)]
  const allCerts = [
    { n: '三好学生' },
    { n: '优秀少先队员' },
    { n: '阅读小明星' },
    { n: '数学小达人' },
    { n: '运动小健将' },
    { n: '艺术小明星' },
    { n: '劳动小能手' },
    { n: '文明礼仪标兵' },
    { n: '进步之星' },
    { n: '学习标兵' },
    { n: '志愿服务之星' },
    { n: '科技小达人' },
    { n: '英语小明星' },
    { n: '合唱团优秀团员' },
  ]
  const certCnt = 2 + Math.floor(r(99) * 3)
  const certs: { n: string }[] = []
  const usedIdx = new Set<number>()
  for (let i = 0; i < certCnt; i++) {
    let idx = Math.floor(r(100 + i) * allCerts.length)
    while (usedIdx.has(idx)) idx = (idx + 1) % allCerts.length
    usedIdx.add(idx)
    certs.push(allCerts[idx])
  }
  const feng = FENG_NAMES.map((name, i) => ({ name, got: r(50 + i) * 5 > 1.5 }))
  const allGot = feng.every(x => x.got)
  const shuttleSec = 88 + Math.floor(r(53) * 48)
  const growth = [
    1 + Math.floor(r(61) * 27),
    1 + Math.floor(r(62) * 26),
    1 + Math.floor(r(63) * 28),
    1 + Math.floor(r(64) * 25),
    1 + Math.floor(r(65) * 27),
  ]
  const g = [
    1 + Math.floor(r(61) * 27),
    1 + Math.floor(r(62) * 26),
    1 + Math.floor(r(63) * 28),
    1 + Math.floor(r(64) * 25),
    1 + Math.floor(r(65) * 27),
  ]
  const classAvg = g.map(v => Math.round(v * (0.62 + r(70) * 0.22)))
  return {
    growth,
    classAvg,
    feng,
    allGot,
    grades: {
      morality: pickG(),
      chinese: pickG(),
      math: pickG(),
      english: pickG(),
      pe: pickG(),
      music: pickG(),
      art: pickG(),
      science: pickG(),
      labor: pickG(),
      practice: pickG(),
      it: pickG(),
    },
    vision: { l: (4.5 + r(17) * 0.8).toFixed(1), r: (4.5 + r(18) * 0.8).toFixed(1) },
    health: {
      height: (125 + r(46) * 30).toFixed(1),
      weight: (22 + r(47) * 20).toFixed(1),
      vital: Math.round(1200 + r(48) * 1500),
      sit: (r(49) * 22 - 2).toFixed(1),
      run50: (8 + r(50) * 4).toFixed(1),
      rope: Math.round(60 + r(51) * 120),
      situp: Math.round(20 + r(52) * 30),
      shuttle: Math.floor(shuttleSec / 60) + "'" + String(shuttleSec % 60).padStart(2, '0') + '"',
      grade: pickH(),
    },
    certs,
  }
}

// ── 渲染报告 HTML（与原型 renderReportHTML 对齐，树图/奖章改为内联 emoji） ──
function buildReportHtml(opts: { name: string; term: string; seed: number }) {
  const { seed } = opts
  const d = genReportMock(seed)
  const certs = d.certs

  const subjectRows = [
    { cat: '国家课程', nm: '道德与法治', v: d.grades.morality },
    { cat: '', nm: '语文', v: d.grades.chinese },
    { cat: '', nm: '数学', v: d.grades.math },
    { cat: '', nm: '英语', v: d.grades.english },
    { cat: '', nm: '体育', v: d.grades.pe },
    { cat: '', nm: '音乐', v: d.grades.music },
    { cat: '', nm: '美术', v: d.grades.art },
    { cat: '', nm: '科学', v: d.grades.science },
    { cat: '', nm: '劳动', v: d.grades.labor },
    { cat: '', nm: '综合实践', v: d.grades.practice },
    { cat: '', nm: '信息技术', v: d.grades.it },
    { cat: '视力', nm: '左眼', v: d.vision.l },
    { cat: '', nm: '右眼', v: d.vision.r },
    { cat: '体质健康', nm: '身高', v: d.health.height + ' cm' },
    { cat: '', nm: '体重', v: d.health.weight + ' kg' },
    { cat: '', nm: '肺活量', v: d.health.vital + ' mL' },
    { cat: '', nm: '坐位体前屈', v: d.health.sit + ' cm' },
    { cat: '', nm: '50米跑', v: d.health.run50 + ' s' },
    { cat: '', nm: '1分钟跳绳', v: d.health.rope + ' 次' },
    { cat: '', nm: '一分钟仰卧起坐', v: d.health.situp + ' 个' },
    { cat: '', nm: '50米×8往返跑', v: d.health.shuttle },
    { cat: '', nm: '总分等级', v: d.health.grade },
  ]
  const catSpan = (cat: string) => {
    const startIdx = subjectRows.findIndex(r => r.cat === cat)
    if (startIdx < 0) return 0
    let n = 1
    for (let i = startIdx + 1; i < subjectRows.length; i++) {
      if (subjectRows[i].cat === '') n++
      else break
    }
    return n
  }
  const thStyle = `border:1px solid #d0d0d0;padding:12px 20px;background:#fff;font-weight:600;color:#333;text-align:center;font-family:Arial,"Microsoft YaHei",sans-serif`
  const tdCatStyle = `text-align:center;vertical-align:middle;font-weight:600;color:#333;border:1px solid #d0d0d0;padding:12px 20px;font-family:Arial,"Microsoft YaHei",sans-serif`
  const tdSubStyle = `text-align:center;vertical-align:middle;color:#333;border:1px solid #d0d0d0;padding:12px 20px;font-family:Arial,"Microsoft YaHei",sans-serif`
  const tdValStyle = `text-align:center;vertical-align:middle;font-weight:600;color:#333;border:1px solid #d0d0d0;padding:12px 20px;font-family:Arial,"Microsoft YaHei",sans-serif`
  const tableBody = subjectRows
    .map(r => {
      const catCell = r.cat
        ? `<td style="${tdCatStyle}" rowspan="${catSpan(r.cat)}">${r.cat}</td>`
        : ''
      const subCell = `<td style="${tdSubStyle}">${r.nm}</td>`
      return `<tr>${catCell}${subCell}<td style="${tdValStyle}">${r.v}</td></tr>`
    })
    .join('')

  const cardStyle = `background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:12px;box-shadow:0 2px 8px ${hexToRgba(ACCENT, 0.08)}`
  const secHStyle = `font-size:14px;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px`
  const icStyle = `width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,${ACCENT},${lighten(ACCENT, 0.2)});color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px`

  const certsHtml = certs
    .map(
      c =>
        `<div style="background:${hexToRgba(ACCENT, 0.05)};border:1px solid ${hexToRgba(ACCENT, 0.2)};border-radius:10px;padding:9px 12px;font-size:12.5px;color:${ACCENT};display:inline-flex;align-items:center;gap:6px;margin:4px"><span style="font-size:14px">🏅</span><span style="font-weight:600">${c.n}</span></div>`,
    )
    .join('')

  const fengGotList = d.feng.filter(x => x.got)
  const fengItemsHtml = fengGotList.length
    ? fengGotList
        .map(x => {
          const tone = FENG_COLORS[x.name] || ACCENT
          return `<div style="background:${hexToRgba(tone, 0.08)};border:1px solid ${hexToRgba(tone, 0.3)};border-radius:12px;padding:12px 10px 11px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;box-sizing:border-box">
          <span style="font-size:34px;line-height:1;filter:drop-shadow(0 3px 6px ${hexToRgba(tone, 0.3)})">${FENG_EMOJI[x.name] || '🏅'}</span>
          <div style="font-size:12.5px;font-weight:700;color:${tone}">${x.name}</div>
        </div>`
        })
        .join('')
    : ''
  const fengTotalHtml = d.allGot
    ? `<div style="margin-top:12px;padding:12px;border-radius:12px;background:linear-gradient(135deg,${hexToRgba(ACCENT, 0.12)},${hexToRgba(ACCENT, 0.05)});border:1px solid ${hexToRgba(ACCENT, 0.25)};display:flex;align-items:center;justify-content:center;gap:10px">
        <span style="font-size:22px">🏆</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:${ACCENT}">已集齐五种锋范，荣获「阳光少年章」称号</div>
          <div style="font-size:11px;color:${hexToRgba('#333', 0.55)};margin-top:2px">Five Youth Badges Completed · Sunlight Youth</div>
        </div>
      </div>`
    : fengGotList.length
      ? `<div style="margin-top:10px;font-size:11px;color:#999;text-align:center">集齐五种"锋"范少年（还差 ${5 - fengGotList.length} 种），即可获得「阳光少年章」总称号</div>`
      : `<div style="font-size:12px;color:#bbb;text-align:center;padding:14px 0">本学期暂未获得"锋"范少年</div>`

  // 成长树
  const gTotal = d.growth.reduce((a, b) => a + b, 0)
  const stageIdx = stageOf(gTotal)
  const stg = RS_GROWTH_STAGES[stageIdx]
  const stgColor = stg.tone
  const thrLo = stg.thr
  const thrHi = stageIdx < 3 ? RS_GROWTH_STAGES[stageIdx + 1].thr : null

  const journeyTexts = [
    '学期刚起步，播下第一颗种子，向抽枝期迈进！',
    '抽枝展叶，继续向上生长，向繁茂期迈进！',
    '枝繁叶茂，朝气蓬勃，向硕果期冲刺！',
    '已抵达最终阶段，硕果累累，恭喜！',
  ]
  const journeyText = journeyTexts[stageIdx]

  const TL_DONE_COLOR = '#67ab3f'
  const TL_GRAY = '#d8d8d8'
  const timelineHtml = RS_GROWTH_STAGES.map((s, i) => {
    const state = i < stageIdx ? 'done' : i === stageIdx ? 'current' : 'future'
    let dotInner: string
    let labelColor: string
    if (state === 'done') {
      dotInner = `<div style="width:18px;height:18px;border-radius:50%;background:${s.tone};box-shadow:0 0 0 3px ${hexToRgba(s.tone, 0.18)};display:flex;align-items:center;justify-content:center"><span style="font-size:10px">${TL_ICONS[i]}</span></div>`
      labelColor = s.tone
    } else if (state === 'current') {
      dotInner = `<div style="width:24px;height:24px;border-radius:50%;background:${s.tone};box-shadow:0 0 0 5px ${hexToRgba(s.tone, 0.25)},0 0 0 10px ${hexToRgba(s.tone, 0.12)};display:flex;align-items:center;justify-content:center;animation:tlPulse 1.6s ease-in-out infinite"><span style="font-size:12px">${TL_ICONS[i]}</span></div>`
      labelColor = s.tone
    } else {
      dotInner = `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2px dashed #cfcfcf"></div>`
      labelColor = '#bbb'
    }
    const nodeHtml = `<div class="tl-node" data-tl-idx="${i}" data-tl-tone="${s.tone}" data-tl-icon="${TL_ICONS[i]}" style="flex:0 0 auto;text-align:center;width:54px;position:relative;z-index:2"><div class="tl-dot" style="width:28px;height:28px;margin:0 auto;display:flex;align-items:center;justify-content:center">${dotInner}</div><div class="tl-label" style="font-size:11px;font-weight:700;color:${labelColor};margin-top:6px">${s.n}</div><div style="font-size:9.5px;color:#999;margin-top:1px">${TL_MONTHS[i]}</div></div>`
    const lineHtml =
      i < 3
        ? `<div class="tl-line" data-tl-idx="${i}" style="flex:1;height:3px;background:${i + 1 <= stageIdx ? TL_DONE_COLOR : TL_GRAY};border-radius:2px;margin:0 -4px;align-self:flex-start;margin-top:12.5px;position:relative;z-index:1"></div>`
        : ''
    return nodeHtml + lineHtml
  }).join('')

  const avg = d.classAvg
  const partRowHtml = TREE_PARTS.map((p, i) => {
    const sc = d.growth[i]
    const av = avg[i]
    const df = sc - av
    const diffStr = df > 0 ? '+' + df : df < 0 ? String(df) : '持平'
    const diffColor = df > 0 ? '#52c41a' : df < 0 ? '#ff4d4f' : '#999'
    return `<div class="rep-part" data-idx="${i}" data-score="${sc}" style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border-radius:10px;background:${hexToRgba(p.c, 0.04)};border:1px solid ${hexToRgba(p.c, 0.12)};cursor:pointer;transition:background .2s,box-shadow .2s;font-size:12px">
      <span style="font-weight:700;color:${p.c}">${p.part}</span>
      <span style="color:#888;font-size:10px">${p.wy}</span>
      <b style="color:${p.c}">${sc} 分</b>
      <span style="color:#aaa;font-size:10px">班均 ${av}</span>
      <span style="font-weight:700;color:${diffColor};font-size:11px">${diffStr}</span>
    </div>`
  }).join('')

  return `
    <style>
    @keyframes tlPulse{0%,100%{box-shadow:0 0 0 5px ${hexToRgba(stgColor, 0.25)},0 0 0 10px ${hexToRgba(stgColor, 0.12)};transform:scale(1)}50%{box-shadow:0 0 0 8px ${hexToRgba(stgColor, 0.32)},0 0 0 14px ${hexToRgba(stgColor, 0.14)};transform:scale(1.08)}}
    .rep-part.on{box-shadow:0 0 0 2px ${ACCENT} inset;background:${hexToRgba(ACCENT, 0.08)}}
    @keyframes repFlash{0%,100%{box-shadow:0 0 0 0 ${ACCENT} inset}50%{box-shadow:0 0 0 3px ${ACCENT} inset}}
    .rep-part.flash{animation:repFlash .4s ease-out}
    .rep-replay-btn{user-select:none;transition:transform .15s,opacity .15s;display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:99px;border:none;background:rgba(255,255,255,.92);color:${ACCENT};font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 7px rgba(60,100,40,.15)}
    .rep-replay-btn:active{transform:scale(.94)}
    .rep-replay-btn:disabled{opacity:.5;cursor:default}
    </style>
    <div style="${cardStyle}" class="tree-card-x">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="${secHStyle};margin-bottom:0"><span style="${icStyle}">🌳</span>成长树</div>
        <div style="font-size:11px;color:#999">本学期成长值 <b class="rep-tree-score" data-total="${gTotal}" data-stage="${stageIdx}" data-cur="${gTotal}" style="color:${stgColor};font-size:16px;font-weight:800">${gTotal}</b></div>
      </div>
      <div class="tree-stage" style="position:relative;background:linear-gradient(180deg,#f4faf0 0%,#e7f3df 100%);border-radius:14px;padding:10px 8px 6px;overflow:hidden;transition:box-shadow .3s">
        <div style="position:absolute;top:10px;left:12px;display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:99px;background:rgba(255,255,255,.9);box-shadow:0 2px 7px rgba(60,100,40,.1);z-index:2">
          <span style="width:8px;height:8px;border-radius:50%;background:${stgColor}"></span>
          <span style="font-size:12px;font-weight:700;color:${stgColor}">${stg.n}</span>
        </div>
        <button class="rep-replay-btn" style="position:absolute;top:10px;right:10px;z-index:3">🎬 成长回放</button>
        <div class="tree-hint" style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.95);padding:5px 12px;border-radius:99px;font-size:11px;color:${ACCENT};font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.1);opacity:0;transition:opacity .25s;pointer-events:none;z-index:3;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis"></div>
        <img class="rep-tree-img" src="${TREE_IMG_LIST[stageIdx]}" alt="${stg.n}成长树" style="display:block;width:78%;max-width:300px;height:220px;object-fit:contain;margin:0 auto;filter:drop-shadow(0 6px 10px rgba(60,100,40,.18))"/>
      </div>
      <div class="rep-journey-text" style="margin-top:10px;font-size:12px;color:#5a7a4a;text-align:center;letter-spacing:.5px;font-style:italic">${journeyText}</div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-top:12px;padding:12px 4px 4px;border-top:1px dashed ${hexToRgba(ACCENT, 0.15)}">${timelineHtml}</div>
      ${stageIdx < 3 ? `<div style="margin-top:6px;font-size:11px;color:#999;text-align:center">当前 ${stg.n}（${thrLo}–${thrHi! - 1}分），距 ${RS_GROWTH_STAGES[stageIdx + 1].n} 还差 ${thrHi! - gTotal} 分</div>` : ''}
      <div style="margin-top:12px;padding:10px 4px 4px;border-top:1px dashed ${hexToRgba(ACCENT, 0.15)}">
        <div style="font-size:11.5px;color:#888;text-align:center;margin-bottom:8px;letter-spacing:.5px">五育贡献度 · 树的部位映射</div>
        <div style="display:flex;gap:6px">${partRowHtml}</div>
      </div>
    </div>
    <div style="${cardStyle}">
      <div style="${secHStyle}"><span style="${icStyle}">🏅</span>荣誉证书（${certs.length}）</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${certsHtml || '<div style="color:#bbb;font-size:12px;text-align:center;padding:14px 0;width:100%">本学期暂无荣誉证书</div>'}</div>
    </div>
    <div style="${cardStyle}">
      <div style="${secHStyle}"><span style="${icStyle}">🌟</span>"锋"范少年（累计获得 ${fengGotList.length}/5）</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${fengItemsHtml}</div>
      ${fengTotalHtml}
    </div>
    <div style="${cardStyle}">
      <div style="${secHStyle}"><span style="${icStyle}">📚</span>学期成绩</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;border:1px solid #d0d0d0;font-family:Arial,'Microsoft YaHei',sans-serif">
        <thead><tr>
          <th style="${thStyle}">类别</th>
          <th style="${thStyle}">学科/项目</th>
          <th style="${thStyle}">成绩</th>
        </tr></thead>
        <tbody>${tableBody}</tbody>
      </table>
    </div>
  `
}

const seed = computed(() => {
  const name = props.student?.name || ''
  const base = (name.charCodeAt(0) + name.length) * 7 + 17
  return base + (TERM_SEED_OFFSET[term.value] || 0)
})

const reportHtml = computed(() =>
  buildReportHtml({ name: props.student?.name || '', term: term.value, seed: seed.value }),
)

// ── 交互绑定（成长回放 + 五育高亮） ──
const bodyRef = ref<HTMLElement | null>(null)

function bindTreeCard(root: HTMLElement | null) {
  if (!root) return
  const btn = root.querySelector('.rep-replay-btn') as HTMLButtonElement | null
  const scoreEl = root.querySelector('.rep-tree-score') as HTMLElement | null
  const treeImgEl = root.querySelector('.rep-tree-img') as HTMLImageElement | null
  const journeyEl = root.querySelector('.rep-journey-text') as HTMLElement | null
  const hint = root.querySelector('.tree-hint') as HTMLElement | null
  const stage = root.querySelector('.tree-stage') as HTMLElement | null
  if (!btn || !scoreEl) return

  const STAGE_IMG = TREE_IMG_LIST
  const journeyTexts = [
    '学期刚起步，播下第一颗种子，向抽枝期迈进！',
    '抽枝展叶，继续向上生长，向繁茂期迈进！',
    '枝繁叶茂，朝气蓬勃，向硕果期冲刺！',
    '已抵达最终阶段，硕果累累，恭喜！',
  ]
  const TL_DONE = '#67ab3f'
  const TL_GRAY = '#d8d8d8'
  const total = parseInt(scoreEl.dataset.total || '0', 10)
  const stageIdx = parseInt(scoreEl.dataset.stage || '0', 10)

  function animateScore(target: number, cb?: () => void) {
    const cur = parseInt(scoreEl!.dataset.cur || '0', 10)
    const diff = target - cur
    if (diff === 0) {
      cb?.()
      return
    }
    const start = performance.now()
    const dur = 500
    function tick(t: number) {
      const p = Math.min(1, (t - start) / dur)
      const v = Math.round(cur + diff * p)
      scoreEl!.textContent = String(v)
      scoreEl!.dataset.cur = String(v)
      if (p < 1) requestAnimationFrame(tick)
      else cb?.()
    }
    requestAnimationFrame(tick)
  }
  function updateTimeline(idx: number) {
    const nodes = root!.querySelectorAll('.tl-node')
    const lines = root!.querySelectorAll('.tl-line')
    nodes.forEach((node, i) => {
      const dot = node.querySelector('.tl-dot')
      const label = node.querySelector('.tl-label')
      const tone = (node as HTMLElement).dataset.tlTone || '#bbb'
      const icon = (node as HTMLElement).dataset.tlIcon || '🌱'
      if (i < idx) {
        dot!.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:${tone};box-shadow:0 0 0 3px ${hexToRgba(tone, 0.18)};display:flex;align-items:center;justify-content:center"><span style="font-size:10px">${icon}</span></div>`
        ;(label as HTMLElement).style.color = tone
      } else if (i === idx) {
        dot!.innerHTML = `<div style="width:24px;height:24px;border-radius:50%;background:${tone};box-shadow:0 0 0 5px ${hexToRgba(tone, 0.25)},0 0 0 10px ${hexToRgba(tone, 0.12)};display:flex;align-items:center;justify-content:center;animation:tlPulse 1.6s ease-in-out infinite"><span style="font-size:12px">${icon}</span></div>`
        ;(label as HTMLElement).style.color = tone
      } else {
        dot!.innerHTML = `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2px dashed #cfcfcf"></div>`
        ;(label as HTMLElement).style.color = '#bbb'
      }
    })
    lines.forEach((line, i) => {
      ;(line as HTMLElement).style.background = i < idx ? TL_DONE : TL_GRAY
    })
  }
  function play() {
    if (btn!.disabled) return
    btn!.disabled = true
    const orig = btn!.innerHTML
    btn!.innerHTML = '▶ 播放中…'
    const stages = STAGE_IMG.slice(0, stageIdx + 1)
    let i = 0
    scoreEl!.dataset.cur = '0'
    scoreEl!.textContent = '0'
    function next() {
      if (i >= stages.length) {
        btn!.disabled = false
        btn!.innerHTML = orig
        return
      }
      if (treeImgEl) treeImgEl.src = stages[i]
      if (journeyEl) journeyEl.textContent = journeyTexts[i]
      updateTimeline(i)
      const tgt = i === stages.length - 1 ? total : Math.floor((total * (i + 1)) / stages.length)
      animateScore(tgt)
      i++
      setTimeout(next, 800)
    }
    next()
  }
  btn.addEventListener('click', play)

  const parts = root.querySelectorAll('.rep-part')
  const PARTS = TREE_PARTS
  let hintTimer: number | undefined
  parts.forEach((p, idx) => {
    p.addEventListener('click', () => {
      parts.forEach(x => {
        x.classList.remove('on')
        x.classList.remove('flash')
      })
      p.classList.add('on')
      void (p as HTMLElement).offsetWidth
      p.classList.add('flash')
      const part = PARTS[idx]
      const sc = (p as HTMLElement).dataset.score
      if (hint) {
        hint.innerHTML = `💡 ${part.wy}育 → <b style="color:${part.c}">${part.part}</b>（${part.label}），<b style="color:${part.c}">${sc}分</b>`
        hint.style.opacity = '1'
      }
      if (stage)
        stage.style.boxShadow = `inset 0 0 0 3px ${part.c}, 0 0 24px ${hexToRgba(part.c, 0.35)}`
      clearTimeout(hintTimer)
      hintTimer = window.setTimeout(() => {
        if (hint) hint.style.opacity = '0'
        if (stage) stage.style.boxShadow = ''
        parts.forEach(x => x.classList.remove('on'))
      }, 2200)
    })
  })
}

watch(
  [() => props.visible, reportHtml],
  async () => {
    if (props.visible) {
      await nextTick()
      bindTreeCard(bodyRef.value)
    }
  },
  { immediate: true },
)
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    size="780px"
    direction="rtl"
    :with-header="false"
    destroy-on-close
  >
    <div class="flex h-full flex-col">
      <!-- 顶部信息条（纯净风格，去掉冗余渐变横幅） -->
      <div class="flex items-center gap-3 border-b border-gray-100 px-8 py-4">
        <div class="min-w-0 flex-1">
          <div class="truncate text-lg font-bold text-gray-800">{{ student?.name }}</div>
          <div class="mt-0.5 text-xs text-gray-400">
            {{ student?.studentDepName || '' }} · 成长报告册
          </div>
        </div>
        <el-button link class="!text-gray-400" @click="drawerVisible = false">
          <template #icon><IconEpClose /></template>
        </el-button>
      </div>

      <!-- 学期切换（选项来自后端数据库） -->
      <div class="flex items-center gap-3 border-b border-gray-100 px-8 py-3">
        <span class="text-sm text-gray-500">学期</span>
        <TermSelect v-model="selectedTermCode" @change="onTermChange" />
        <span class="ml-auto text-xs text-gray-400">成长报告册 · 演示数据</span>
      </div>

      <!-- 报告主体（居中收窄、加大内边距，内容更聚拢） -->
      <div
        ref="bodyRef"
        class="rep-body mx-auto w-full max-w-[640px] flex-1 overflow-y-auto bg-[#f5f7fa] px-4 py-6"
        v-html="reportHtml"
      ></div>
    </div>
  </el-drawer>
</template>

<style scoped>
.rep-body :deep(table) {
  border-collapse: collapse;
}
</style>
