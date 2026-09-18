<script setup lang="ts">
/**
 * 手动同步好公民弹窗：确认五育归属与积分（默认德育 3 分）后执行同步。
 * 缺少班级信息时，红色提示需补充班级，通过「重新选择学生」补全班级行；
 * 确认同步时先把补充的班级保存回奖证记录（不做自动同步），再按所选五育/积分执行同步。
 */
import { ref, computed, useTemplateRef } from 'vue'
import { message } from '@/utils/feedback'
import { syncAwards, saveAward, type AwardListItem } from '@/api/pcAward'
import StudentSelect from '@/components/StudentSelect/index.vue'

const emit = defineEmits<{ success: [] }>()

const WUYU_OPTIONS = [
  { value: 'de', label: '德育' },
  { value: 'zhi', label: '智育' },
  { value: 'ti', label: '体育' },
  { value: 'mei', label: '美育' },
  { value: 'lao', label: '劳育' },
]

const visible = ref(false)
const saving = ref(false)
const row = ref<AwardListItem | null>(null)
const wuyu = ref('de')
const score = ref(3)
/** 弹窗内可编辑的获奖者姓名 / 班级（重新选择学生后更新，用于补充班级） */
const winnerName = ref('')
const winnerClass = ref('')
const studentRef = useTemplateRef('studentRef')

/** 打开弹窗：缺班级时提示补充 */
function open(target: AwardListItem) {
  row.value = target
  winnerName.value = target.winnerName
  winnerClass.value = target.winnerClass || ''
  wuyu.value = 'de'
  score.value = 3
  visible.value = true
}

/** 缺少班级信息（无法定位学生，不能同步） */
const needClass = computed(() => !winnerClass.value)

/** 重新选择学生：补充班级信息（姓名 + 班级全名） */
async function pickStudent() {
  const picked = await studentRef.value?.open()
  if (picked?.length) {
    winnerName.value = picked[0].name
    winnerClass.value = picked[0].className || ''
  }
}

async function handleSync() {
  if (!row.value) return
  if (needClass.value) return
  saving.value = true
  try {
    // 补充班级场景：先把补充的班级保存回奖证记录（autoSync=false，由本次确认同步执行）
    if (!row.value.winnerClass && winnerClass.value) {
      await saveAward({
        id: row.value.id,
        category: row.value.category,
        subCategory: row.value.subCategory,
        winnerName: winnerName.value,
        winnerClass: winnerClass.value,
        awardName: row.value.awardName,
        awardLevel: row.value.awardLevel || '',
        awardGrade: row.value.awardGrade || '',
        awardTime: row.value.awardTime || '',
        awardUnit: row.value.awardUnit || '',
        reward: row.value.reward || '',
        remark: row.value.remark || '',
        attachmentPath: row.value.attachmentPath || '',
        autoSync: false,
      })
    }
    const res = await syncAwards([row.value.id], wuyu.value, score.value)
    if (res.success > 0 && res.fail === 0) {
      message.success('已同步到素养评价好公民')
    } else if (res.success > 0) {
      message.warning(`部分成功：成功 ${res.success} 条，失败 ${res.fail} 条（${res.errors[0] ?? ''}）`)
    } else {
      message.error(res.errors[0] ?? '同步失败')
    }
    visible.value = false
    emit('success')
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" title="同步到好公民" width="440px" destroy-on-close>
    <el-form label-width="90px">
      <el-form-item label="获奖学生">
        <div class="flex w-full items-center gap-2">
          <template v-if="winnerName">
            <span class="text-(--el-text-color-primary)">{{ winnerName }}</span>
            <el-tag v-if="winnerClass" size="small" type="success" effect="plain">
              {{ winnerClass }}
            </el-tag>
          </template>
          <!-- 缺班级：重新选择学生补充 -->
          <el-button v-if="needClass" type="primary" plain size="small" @click="pickStudent">
            <template #icon><IconEpPlus /></template>选择学生补充班级
          </el-button>
        </div>
        <div v-if="needClass" class="w-full text-xs text-red-500">
          该记录缺少班级信息，请重新选择学生补充班级后才能同步到好公民
        </div>
      </el-form-item>
      <el-form-item label="获奖名称">
        <span class="text-(--el-text-color-primary)">{{ row?.awardName }}</span>
      </el-form-item>

      <!-- 五育 / 积分：始终展示（缺班级时仅禁用同步按钮，不隐藏关键信息） -->
      <el-form-item label="归入五育">
        <el-radio-group v-model="wuyu">
          <el-radio-button v-for="w in WUYU_OPTIONS" :key="w.value" :value="w.value">
            {{ w.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="积分">
        <el-input-number v-model="score" :min="0" :max="100" :step="1" step-strictly />
      </el-form-item>
      <div class="text-xs text-gray-400">
        同步将走好公民发奖证流程（评价记录 + 追锋时刻动态）；若获奖时间不在本学期，只同步记录、积分记 0。
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="needClass" @click="handleSync">
        确认同步
      </el-button>
    </template>

    <StudentSelect ref="studentRef" />
  </el-dialog>
</template>
