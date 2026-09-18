<script setup lang="ts">
import { ref, reactive, computed, useTemplateRef } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import type { FormRules, UploadFile, UploadRawFile, UploadRequestOptions } from 'element-plus'
import type { RoleListItem } from '@/api/system/sysRole'
import { roleKeys } from '@/api/system/sysRole'
import * as sysRoleApi from '@/api/system/sysRole'
import type { UserPayload } from '@/api/system/sysUser'
import * as sysUserApi from '@/api/system/sysUser'
import * as wxWorkApi from '@/api/system/wxWork'
import * as sysFileApi from '@/api/system/sysFile'
import { useUserStore } from '@/stores/modules/user'
import { confirm, message, notify, withLoading } from '@/utils/feedback'
import { resolveFileUrl } from '@/utils/file'
import { validateImageFile } from '@/utils/file'
import ContactSelect from '@/components/ContactSelect/index.vue'
const emit = defineEmits<{
  success: []
}>()

const userStore = useUserStore()

const visible = ref(false)
const editingId = ref('')
const formRef = useTemplateRef('formRef')
const contactRef = useTemplateRef('contactRef')
const loading = ref(false)
const fileList = ref<UploadFile[]>([])

/** 角色列表（缓存 1 分钟，避免每次打开抽屉都重新请求） */
const { data: roleOptions } = useQuery<RoleListItem[]>({
  queryKey: roleKeys.lists(),
  queryFn: ({ signal }) =>
    sysRoleApi.fetchRoleList({ page: 1, rows: 999 }, signal).then(res => res.list ?? []),
  staleTime: 60 * 1000,
})

/** 表单初始值，用于 resetForm 整体重置 */
const INITIAL_FORM = {
  userId: '',
  name: '',
  pwd: '',
  pwd1: '',
  avatar: '',
  roleIds: [] as string[],
  status: 1,
  wechat_UserId: null as string | null,
  wechat_DepId: null as string | null,
  wechat_DepName: null as string | null,
}

const formModel = reactive({ ...INITIAL_FORM })

const isEdit = computed(() => !!editingId.value)
const isSuperAdmin = computed(() => userStore.roles.some(role => role.id === '10086'))

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  userId: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  pwd: [
    { required: !isEdit.value, message: '请输入密码', trigger: 'blur' },
    {
      required: !isEdit.value,
      pattern: /^(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,}$/,
      message: '至少6位，且至少包含1个特殊字符（! @ # $ % ^ & *）',
      trigger: 'blur',
    },
  ],
  pwd1: [
    {
      required: !isEdit.value,
      validator: (_rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入确认密码'))
        } else if (value !== formModel.pwd) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  avatar: [{ required: true, message: '请上传头像', trigger: 'change' }],
  roleIds: [{ required: true, type: 'array', message: '请选择角色', trigger: 'change' }],
}))

const saveMutation = useMutation({
  mutationFn: (payload: UserPayload) =>
    isEdit.value ? sysUserApi.updateUser(payload) : sysUserApi.createUser(payload),
  onSuccess: () => {
    message.success('保存成功')
    visible.value = false
    emit('success')
  },
})

function resetForm() {
  Object.assign(formModel, INITIAL_FORM)
  fileList.value = []
  formRef.value?.clearValidate()
}

/** 打开新增/编辑账户抽屉 */
function open(row?: { id: string }) {
  editingId.value = row?.id ?? ''
  resetForm()
  visible.value = true
}

/** 抽屉打开动画结束后加载数据，避免过渡期间更新组件触发 Vue 内部错误 */
async function handleOpened() {
  if (!isEdit.value) return

  loading.value = true
  formRef.value?.clearValidate()

  try {
    const entity = await sysUserApi.fetchUserEntity(editingId.value)
    formModel.name = entity.name
    formModel.userId = entity.id
    formModel.avatar = entity.avatar
    formModel.roleIds = entity.sysRoleUsers.map(role => role.roleId)
    formModel.status = entity.status
    formModel.wechat_UserId = entity.wechatWorkUserId ?? null
    formModel.wechat_DepName = entity.depName ?? null
    formModel.wechat_DepId = entity.depId ?? null
    fileList.value = entity.avatar
      ? [
          {
            name: 'avatar',
            url: resolveFileUrl(entity.avatar),
            status: 'success',
            uid: Date.now(),
          },
        ]
      : []
  } catch {
    message.error('加载失败')
    visible.value = false
  } finally {
    loading.value = false
  }
}

/** 保存账户 */
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: UserPayload = {
    userId: formModel.userId,
    name: formModel.name,
    pwd: isEdit.value ? null : formModel.pwd ? btoa(formModel.pwd) : null,
    status: formModel.status,
    avatar: formModel.avatar,
    roleIds: formModel.roleIds,
    wechat_UserId: formModel.wechat_UserId,
    wechat_DepId: formModel.wechat_DepId,
    wechat_DepName: formModel.wechat_DepName,
  }
  if (isEdit.value) {
    payload.id = editingId.value
  }
  saveMutation.mutate(payload)
}

function handleBeforeUpload(file: UploadRawFile) {
  return validateImageFile(file)
}

async function handleUpload(options: UploadRequestOptions) {
  const formData = new FormData()
  // 后端 SysFileUploadRequest.File（IFormFile）— 字段名精确匹配首字母大写
  formData.append('File', options.file)
  try {
    const res = await sysFileApi.sysFileUpload(formData)
    formModel.avatar = res.path
    options.onSuccess(res)
    const item = fileList.value.find(f => f.uid === options.file.uid)
    if (item) item.url = resolveFileUrl(res.path)
  } catch {
    message.error('上传失败')
    const error = Object.assign(new Error('上传失败'), {
      status: -1,
      method: options.method,
      url: options.action,
    })
    options.onError(error as Parameters<typeof options.onError>[0])
  }
}

function handleRemove() {
  formModel.avatar = ''
}

/** 打开企业微信联系人选择并回填账号 */
async function handleSearchContact() {
  const picked = await contactRef.value?.open({ selectType: 'user', selectNum: 'min' })
  if (!picked?.length) return
  const entity = await wxWorkApi.fetchWorkUserEntity({ userId: picked[0].id })
  formModel.name = entity.name
  formModel.userId = entity.userid || entity.mobile || ''
  formModel.pwd = formModel.userId + '@123'
  formModel.pwd1 = formModel.userId + '@123'
  formModel.wechat_UserId = entity.userid
  formModel.wechat_DepName = entity.departmentNames?.[0] ?? null
  formModel.wechat_DepId = entity.department?.[0] ? String(entity.department[0]) : null
}

/** 重置账号密码 */
async function handleResetPwd() {
  const ok = await confirm('确认重置此账号密码？', '提示')
  if (!ok) return
  await withLoading(sysUserApi.resetUserPwd({ userId: editingId.value }), '重置中...')
  notify.success('重置成功，新密码为: 账号 + @258   （示例: user@258）')
}

defineExpose({ open })
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="isEdit ? '编辑账户' : '新增账户'"
    direction="rtl"
    size="560px"
    :close-on-click-modal="false"
    @opened="handleOpened"
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="formModel"
      :rules="rules"
      label-width="100px"
      :validate-on-rule-change="false"
      :disabled="saveMutation.isPending.value"
    >
      <div class="mt-4 mb-3 text-base font-bold">基本信息</div>

      <el-form-item label="姓名" prop="name">
        <div class="flex items-center gap-2">
          <el-input v-model="formModel.name" placeholder="请输入姓名" class="flex-1" />
          <el-button v-if="!isEdit" @click="handleSearchContact">关联人员</el-button>
        </div>
      </el-form-item>

      <el-form-item label="账号" prop="userId">
        <el-input v-model="formModel.userId" :disabled="isEdit" placeholder="请输入账号" />
      </el-form-item>

      <el-form-item v-if="!isEdit" label="密码" prop="pwd">
        <el-input v-model="formModel.pwd" type="password" show-password placeholder="请输入密码" />
      </el-form-item>

      <el-form-item v-if="!isEdit" label="确认密码" prop="pwd1">
        <el-input
          v-model="formModel.pwd1"
          type="password"
          show-password
          placeholder="请再次输入密码"
        />
      </el-form-item>

      <el-form-item v-if="isSuperAdmin && isEdit" label="重置密码">
        <el-button type="warning" @click="handleResetPwd">重置密码</el-button>
      </el-form-item>
      <el-form-item label="头像" prop="avatar">
        <div :class="{ 'is-full': fileList.length >= 1 }">
          <el-upload
            v-model:file-list="fileList"
            list-type="picture-card"
            :limit="1"
            :before-upload="handleBeforeUpload"
            :http-request="handleUpload"
            :on-remove="handleRemove"
          >
            <IconEpPlus v-if="fileList.length < 1" />
          </el-upload>
        </div>
      </el-form-item>

      <div class="mt-6 mb-3 text-base font-bold">权限配置</div>

      <el-form-item label="角色" prop="roleIds">
        <el-select v-model="formModel.roleIds" multiple placeholder="请选择角色">
          <el-option
            v-for="role in roleOptions"
            :key="role.id"
            :label="role.name"
            :value="role.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="状态">
        <el-switch
          v-model="formModel.status"
          :active-value="1"
          :inactive-value="-1"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>
    </el-form>
    <ContactSelect ref="contactRef" />
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saveMutation.isPending.value" @click="handleSave"
        >确定</el-button
      >
    </template>
  </el-drawer>
</template>

<style lang="scss" scoped>
.is-full :deep(.el-upload--picture-card) {
  display: none;
}
</style>
