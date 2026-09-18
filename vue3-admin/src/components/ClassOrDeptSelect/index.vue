<script setup lang="ts">
/**
 * ClassOrDeptSelect 班级/部门选择器
 *
 * 数据源：
 *   - 'class'（默认）= 家校通讯录（年级 → 班级），节点数据源：/PcStudent/GetStudentDepTree
 *   - 'department'   = 企业微信组织架构（部门），节点数据源：/WxWork/GetTreeDepartmentList
 *
 * 形态：树形单选 el-tree-select，传 v-model 拿到节点 id。
 *
 * 用法：
 *   <!-- 默认：班级树 -->
 *   <ClassOrDeptSelect v-model="form.classId" placeholder="选择班级" />
 *   <!-- 显式指定 -->
 *   <ClassOrDeptSelect v-model="form.deptId" data-source="department" placeholder="选择部门" />
 */
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  fetchDepartmentTree,
  orgKeys,
  type DepartmentTreeNode,
} from '@/api/system/wxWork'
import {
  fetchStudentDepTree,
  pcStudentKeys,
  type StudentDepTreeNode,
} from '@/api/pcStudent'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    /** 节点值字段，默认 'id' */
    nodeKey?: string
    /** 显示字段，默认 'name' */
    propsLabel?: string
    /** 渲染时的 props 透传（el-tree-select） */
    treeProps?: Record<string, string>
    /** 树高 */
    height?: number
    /** 数据源：'class' 家校通讯录（年级/班级，默认）| 'department' 组织架构 */
    dataSource?: 'class' | 'department'
  }>(),
  {
    placeholder: '请选择班级',
    clearable: true,
    nodeKey: 'id',
    propsLabel: 'name',
    height: 320,
    dataSource: 'class',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null | undefined]
  change: [value: string | number | null | undefined, node: ClassTreeNode | DepartmentTreeNode | undefined]
}>()

const isClass = computed(() => props.dataSource === 'class')

/** 家校通讯录：年级(type=2) → 班级(type=1) */
const classQuery = useQuery({
  queryKey: pcStudentKeys.depTree(),
  queryFn: ({ signal }) => fetchStudentDepTree(signal),
  enabled: () => isClass.value,
  staleTime: 5 * 60 * 1000,
})

/** 组织架构 */
const deptQuery = useQuery({
  queryKey: orgKeys.departments(),
  queryFn: ({ signal }) => fetchDepartmentTree(undefined, signal),
  enabled: () => !isClass.value,
  staleTime: 5 * 60 * 1000,
})

/** 班级树节点（含 disabled 字段，年级不可选） */
type ClassTreeNode = StudentDepTreeNode & { disabled?: boolean }

const treeData = computed<any[]>(() => {
  if (isClass.value) {
    const raw = classQuery.data.value ?? []
    return raw.map<ClassTreeNode>(g => ({
      ...g,
      // 年级节点不可选，只允许选到班级（叶子）
      disabled: true,
      children: g.children?.map<ClassTreeNode>(c => ({ ...c })),
    }))
  }
  return deptQuery.data.value ?? []
})

const treeProps = computed(() => ({
  value: props.nodeKey,
  label: props.propsLabel,
  children: 'children',
  ...(props.treeProps ?? {}),
}))

const isFetching = computed(
  () => classQuery.isFetching.value || deptQuery.isFetching.value,
)
const isSuccess = computed(
  () => classQuery.isSuccess.value || deptQuery.isSuccess.value,
)

function handleChange(value: string | number | null | undefined) {
  emit('update:modelValue', value)
  const node = findNode(treeData.value, value)
  emit('change', value, node)
}

function findNode(
  nodes: any[],
  id: string | number | null | undefined,
): any | undefined {
  if (id === undefined || id === null || id === '') return undefined
  for (const n of nodes) {
    if (String(n.id) === String(id)) return n
    if (n.children?.length) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return undefined
}
</script>

<template>
  <el-tree-select
    :model-value="modelValue"
    :data="treeData"
    :props="treeProps"
    :placeholder="placeholder"
    :disabled="disabled || isFetching"
    :clearable="clearable"
    :height="height"
    check-strictly
    :render-after-expand="false"
    style="width: 240px"
    @change="handleChange"
  >
    <template v-if="isFetching && !isSuccess" #default>
      <span class="text-xs text-gray-400">加载中…</span>
    </template>
  </el-tree-select>
</template>
